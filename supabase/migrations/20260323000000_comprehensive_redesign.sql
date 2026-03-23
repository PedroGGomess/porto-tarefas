-- ============================================================
-- THE 100's - Comprehensive Database Redesign
-- Adds: subtasks, dependencies, notifications, Gantt support,
-- multi-assignee, daily digest, file tokens, areas, Google Cal
-- ============================================================

-- ============================================================
-- 1. ENHANCE TASKS TABLE
-- ============================================================

-- Add new priority level "critico" and new statuses
-- Add start_date for Gantt chart, parent_task_id for subtasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS owner_externo TEXT,
  ADD COLUMN IF NOT EXISTS dependency_notes TEXT,
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT FALSE;

-- Update RLS to allow viewing tasks assigned to you (not just created by you)
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view accessible tasks" ON public.tasks
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id = tasks.id
      AND ta.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id = tasks.id
      AND ta.user_id = auth.uid()
    )
  );

-- Allow assigned users to update tasks
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update accessible tasks" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id = tasks.id
      AND (ta.user_id = auth.uid() OR ta.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  );

-- Index for subtask queries
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_area ON public.tasks(area);

-- ============================================================
-- 2. TASK ASSIGNEES (multi-user assignment)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'responsavel', -- responsavel, colaborador, aprovador, observador
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, email)
);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view task assignees"
  ON public.task_assignees FOR SELECT TO authenticated USING (true);

CREATE POLICY "Task owners can manage assignees"
  ON public.task_assignees FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.user_id = auth.uid())
    OR auth.uid() = assigned_by
  );

CREATE POLICY "Task owners can remove assignees"
  ON public.task_assignees FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.user_id = auth.uid())
    OR auth.uid() = assigned_by
  );

CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_email ON public.task_assignees(email);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON public.task_assignees(user_id);

-- ============================================================
-- 3. TASK DEPENDENCIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,        -- the dependent task
  depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, -- the blocking task
  dependency_type TEXT NOT NULL DEFAULT 'blocks',  -- blocks, requires_approval, requires_input, finish_to_start
  description TEXT,                                -- e.g. "Rute needs Luis to specify furniture"
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dependencies"
  ON public.task_dependencies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create dependencies"
  ON public.task_dependencies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update dependencies"
  ON public.task_dependencies FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Creators can delete dependencies"
  ON public.task_dependencies FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_task_deps_task ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_depends ON public.task_dependencies(depends_on_task_id);

-- ============================================================
-- 4. NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL, -- task_assigned, task_completed, dependency_resolved, dependency_blocked, approval_needed, deadline_approaching, task_overdue, mention
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  related_user_email TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_email ON public.notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_task ON public.notifications(task_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- 5. DAILY DIGEST PREFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.digest_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  send_daily_digest BOOLEAN DEFAULT TRUE,
  digest_time TIME DEFAULT '08:00:00',
  timezone TEXT DEFAULT 'Europe/Lisbon',
  notify_task_assigned BOOLEAN DEFAULT TRUE,
  notify_dependency_resolved BOOLEAN DEFAULT TRUE,
  notify_deadline_approaching BOOLEAN DEFAULT TRUE,
  notify_task_overdue BOOLEAN DEFAULT TRUE,
  notify_approval_needed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.digest_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own digest preferences"
  ON public.digest_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 6. FILE SHARE TOKENS (temporary access)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.file_share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  max_views INTEGER DEFAULT NULL,
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.file_share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Token creators can manage tokens"
  ON public.file_share_tokens FOR ALL TO authenticated
  USING (created_by = auth.uid());

-- Anonymous access for shared files via token
CREATE POLICY "Anyone can view active tokens"
  ON public.file_share_tokens FOR SELECT
  USING (is_active = true AND expires_at > now());

CREATE INDEX IF NOT EXISTS idx_file_tokens_token ON public.file_share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_file_tokens_file ON public.file_share_tokens(file_id);

-- ============================================================
-- 7. AREAS TABLE (structured area management)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#94a3b8',
  icon TEXT,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view areas"
  ON public.areas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage areas"
  ON public.areas FOR ALL TO authenticated USING (true);

-- Seed areas from existing config
INSERT INTO public.areas (slug, label, color, icon, order_index) VALUES
  ('obras', 'Obras & Espaço', '#f59e0b', 'building', 1),
  ('tech', 'Tech & IT', '#60a5fa', 'cpu', 2),
  ('data', 'Analytics & Data', '#a78bfa', 'bar-chart', 3),
  ('crm', 'CRM & Digital', '#34d399', 'users', 4),
  ('loja', 'Experiência Loja', '#f472b6', 'store', 5),
  ('stock', 'Stock & Produto', '#4ade80', 'package', 6),
  ('ops', 'Pessoas & Ops', '#fb923c', 'briefcase', 7),
  ('marketing', 'Marketing & Brand', '#c084fc', 'megaphone', 8),
  ('finance', 'Financeiro', '#38bdf8', 'wallet', 9),
  ('outro', 'Outro', '#94a3b8', 'folder', 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 8. ENHANCE MEETINGS TABLE (Google Calendar integration)
-- ============================================================

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS participants TEXT[],
  ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_meetings_google_event ON public.meetings(google_event_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON public.meetings(meeting_date);

-- ============================================================
-- 9. ENHANCE TEAM DIRECTORY
-- ============================================================

ALTER TABLE public.team_directory
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- ============================================================
-- 10. TASK ACTIVITY LOG (for audit trail & Gantt updates)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action TEXT NOT NULL, -- created, updated, status_changed, assigned, dependency_added, dependency_resolved, comment
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view activity"
  ON public.task_activity FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can log activity"
  ON public.task_activity FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_task_activity_task ON public.task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_created ON public.task_activity(created_at);

-- Enable realtime for task_activity
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_activity;

-- ============================================================
-- 11. FUNCTIONS: Auto-notification on task assignment
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_email, type, title, message, task_id, related_user_email)
  SELECT
    NEW.email,
    'task_assigned',
    'Nova tarefa atribuída',
    'Foi-te atribuída a tarefa: ' || t.title,
    NEW.task_id,
    (SELECT email FROM auth.users WHERE id = NEW.assigned_by)
  FROM public.tasks t
  WHERE t.id = NEW.task_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_task_assignee_added
  AFTER INSERT ON public.task_assignees
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

-- ============================================================
-- 12. FUNCTION: Auto-notification on dependency resolved
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_dependency_resolved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_resolved = TRUE AND (OLD.is_resolved IS NULL OR OLD.is_resolved = FALSE) THEN
    -- Notify all assignees of the dependent task
    INSERT INTO public.notifications (user_email, type, title, message, task_id)
    SELECT
      ta.email,
      'dependency_resolved',
      'Dependência resolvida',
      'A dependência da tarefa "' || t.title || '" foi resolvida. Podes continuar!',
      NEW.task_id
    FROM public.task_assignees ta
    JOIN public.tasks t ON t.id = NEW.task_id
    WHERE ta.task_id = NEW.task_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_dependency_resolved
  AFTER UPDATE ON public.task_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.notify_dependency_resolved();

-- ============================================================
-- 13. FUNCTION: Auto-set completed_at when status = concluido
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status != 'concluido') THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'concluido' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_task_completed_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_completed_at();

-- ============================================================
-- 14. VIEW: Tasks with dependency status for Gantt
-- ============================================================

CREATE OR REPLACE VIEW public.tasks_gantt_view AS
SELECT
  t.*,
  COALESCE(
    (SELECT json_agg(json_build_object(
      'id', td.id,
      'depends_on_task_id', td.depends_on_task_id,
      'dependency_type', td.dependency_type,
      'is_resolved', td.is_resolved,
      'description', td.description
    )) FROM public.task_dependencies td WHERE td.task_id = t.id),
    '[]'::json
  ) AS dependencies,
  COALESCE(
    (SELECT json_agg(json_build_object(
      'id', ta.id,
      'email', ta.email,
      'name', ta.name,
      'role', ta.role
    )) FROM public.task_assignees ta WHERE ta.task_id = t.id),
    '[]'::json
  ) AS assignees,
  COALESCE(
    (SELECT COUNT(*) FROM public.tasks st WHERE st.parent_task_id = t.id),
    0
  ) AS subtask_count,
  COALESCE(
    (SELECT COUNT(*) FROM public.tasks st WHERE st.parent_task_id = t.id AND st.status = 'concluido'),
    0
  ) AS subtask_completed_count,
  CASE
    WHEN t.deadline IS NOT NULL AND t.deadline < CURRENT_DATE AND t.status NOT IN ('concluido') THEN TRUE
    ELSE FALSE
  END AS is_overdue,
  CASE
    WHEN t.deadline IS NOT NULL AND t.deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days' AND t.status NOT IN ('concluido') THEN TRUE
    ELSE FALSE
  END AS is_deadline_approaching,
  EXISTS (
    SELECT 1 FROM public.task_dependencies td
    WHERE td.task_id = t.id AND td.is_resolved = FALSE
  ) AS has_unresolved_dependencies
FROM public.tasks t
WHERE t.parent_task_id IS NULL; -- Only top-level tasks

-- ============================================================
-- 15. FUNCTION: Daily digest email (to be called by cron/edge function)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_daily_digest(p_email TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'overdue_tasks', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', t.id, 'title', t.title, 'deadline', t.deadline, 'priority', t.priority, 'area', t.area
      )), '[]'::json)
      FROM public.tasks t
      JOIN public.task_assignees ta ON ta.task_id = t.id
      WHERE ta.email = p_email
        AND t.deadline < CURRENT_DATE
        AND t.status NOT IN ('concluido')
    ),
    'today_tasks', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', t.id, 'title', t.title, 'deadline', t.deadline, 'priority', t.priority, 'area', t.area, 'status', t.status
      ) ORDER BY
        CASE t.priority WHEN 'critico' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 WHEN 'baixa' THEN 3 END,
        t.deadline NULLS LAST
      ), '[]'::json)
      FROM public.tasks t
      JOIN public.task_assignees ta ON ta.task_id = t.id
      WHERE ta.email = p_email
        AND t.status NOT IN ('concluido')
    ),
    'pending_approvals', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', td.id, 'task_title', t.title, 'description', td.description, 'dependency_type', td.dependency_type
      )), '[]'::json)
      FROM public.task_dependencies td
      JOIN public.tasks t ON t.id = td.task_id
      JOIN public.task_assignees ta ON ta.task_id = td.depends_on_task_id
      WHERE ta.email = p_email
        AND td.is_resolved = FALSE
        AND td.dependency_type IN ('requires_approval', 'requires_input')
    ),
    'upcoming_deadlines', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', t.id, 'title', t.title, 'deadline', t.deadline, 'priority', t.priority
      )), '[]'::json)
      FROM public.tasks t
      JOIN public.task_assignees ta ON ta.task_id = t.id
      WHERE ta.email = p_email
        AND t.deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND t.status NOT IN ('concluido')
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- DONE: Enable realtime for key tables
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_dependencies;
