export { supabase } from '@/integrations/supabase/client';

// ============================================================
// Core Types
// ============================================================

export type Task = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  area: string;
  priority: string;
  status: string;
  deadline: string | null;
  start_date: string | null;
  responsavel: string | null;
  responsavel_email: string | null;
  parent_task_id: string | null;
  owner_externo: string | null;
  dependency_notes: string | null;
  order_index: number;
  estimated_hours: number | null;
  completed_at: string | null;
  is_milestone: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields (from views/queries)
  assignees?: TaskAssignee[];
  dependencies?: TaskDependency[];
  subtasks?: Task[];
  subtask_count?: number;
  subtask_completed_count?: number;
  is_overdue?: boolean;
  has_unresolved_dependencies?: boolean;
};

export type TaskAssignee = {
  id: string;
  task_id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  role: 'responsavel' | 'colaborador' | 'aprovador' | 'observador';
  assigned_by: string | null;
  assigned_at: string;
};

export type TaskDependency = {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: 'blocks' | 'requires_approval' | 'requires_input' | 'finish_to_start';
  description: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  created_by: string | null;
};

export type Notification = {
  id: string;
  user_id: string | null;
  user_email: string;
  type: 'task_assigned' | 'task_completed' | 'dependency_resolved' | 'dependency_blocked' | 'approval_needed' | 'deadline_approaching' | 'task_overdue' | 'mention';
  title: string;
  message: string;
  task_id: string | null;
  related_user_email: string | null;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
};

export type TaskActivity = {
  id: string;
  task_id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type FileShareToken = {
  id: string;
  file_id: string;
  token: string;
  created_by: string | null;
  expires_at: string;
  max_views: number | null;
  view_count: number;
  is_active: boolean;
  created_at: string;
};

export type Area = {
  id: string;
  slug: string;
  label: string;
  color: string;
  icon: string | null;
  description: string | null;
  order_index: number;
  is_active: boolean;
};

export type DigestPreferences = {
  id: string;
  user_id: string;
  email: string;
  send_daily_digest: boolean;
  digest_time: string;
  timezone: string;
  notify_task_assigned: boolean;
  notify_dependency_resolved: boolean;
  notify_deadline_approaching: boolean;
  notify_task_overdue: boolean;
  notify_approval_needed: boolean;
};

// ============================================================
// Constants
// ============================================================

export const AREAS = [
  { value: 'obras', label: 'Obras & Espaço', color: '#f59e0b', icon: 'building' },
  { value: 'tech', label: 'Tech & IT', color: '#60a5fa', icon: 'cpu' },
  { value: 'data', label: 'Analytics & Data', color: '#a78bfa', icon: 'bar-chart' },
  { value: 'crm', label: 'CRM & Digital', color: '#34d399', icon: 'users' },
  { value: 'loja', label: 'Experiência Loja', color: '#f472b6', icon: 'store' },
  { value: 'stock', label: 'Stock & Produto', color: '#4ade80', icon: 'package' },
  { value: 'ops', label: 'Pessoas & Ops', color: '#fb923c', icon: 'briefcase' },
  { value: 'marketing', label: 'Marketing & Brand', color: '#c084fc', icon: 'megaphone' },
  { value: 'finance', label: 'Financeiro', color: '#38bdf8', icon: 'wallet' },
  { value: 'outro', label: 'Outro', color: '#94a3b8', icon: 'folder' },
] as const;

export const PRIORITIES = [
  { value: 'critico', label: 'Crítico', color: '#dc2626' },
  { value: 'alta', label: 'Alto', color: '#ef4444' },
  { value: 'media', label: 'Médio', color: '#f59e0b' },
  { value: 'baixa', label: 'Baixo', color: '#22c55e' },
] as const;

export const STATUSES = [
  { value: 'pendente', label: 'Pendente', icon: '○', color: '#555555' },
  { value: 'em-curso', label: 'Em Curso', icon: '◑', color: '#60a5fa' },
  { value: 'aguarda-decisao', label: 'Aguarda Decisão', icon: '◔', color: '#f59e0b' },
  { value: 'aguarda-resposta', label: 'Aguarda Resposta', icon: '◔', color: '#fb923c' },
  { value: 'bloqueado', label: 'Bloqueado', icon: '✕', color: '#ef4444' },
  { value: 'concluido', label: 'Concluído', icon: '●', color: '#22c55e' },
] as const;

export const DEPENDENCY_TYPES = [
  { value: 'blocks', label: 'Bloqueia', description: 'Esta tarefa bloqueia a outra até ser concluída' },
  { value: 'requires_approval', label: 'Requer Aprovação', description: 'Precisa de aprovação para continuar' },
  { value: 'requires_input', label: 'Requer Input', description: 'Precisa de informação/dados de outra pessoa' },
  { value: 'finish_to_start', label: 'Fim-para-Início', description: 'A tarefa seguinte só começa quando esta terminar' },
] as const;

export const ASSIGNEE_ROLES = [
  { value: 'responsavel', label: 'Responsável' },
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'aprovador', label: 'Aprovador' },
  { value: 'observador', label: 'Observador' },
] as const;

// ============================================================
// Helper Functions
// ============================================================

export function getAreaColor(area: string): string {
  return AREAS.find(a => a.value === area)?.color ?? '#94a3b8';
}

export function getAreaLabel(area: string): string {
  return AREAS.find(a => a.value === area)?.label ?? area;
}

export function getAreaIcon(area: string): string {
  return AREAS.find(a => a.value === area)?.icon ?? 'folder';
}

export function getPriorityColor(priority: string): string {
  return PRIORITIES.find(p => p.value === priority)?.color ?? '#f59e0b';
}

export function getPriorityLabel(priority: string): string {
  return PRIORITIES.find(p => p.value === priority)?.label ?? priority;
}

export function getStatusInfo(status: string) {
  return STATUSES.find(s => s.value === status) ?? STATUSES[0];
}

export function isTaskOverdue(task: Task): boolean {
  if (!task.deadline || task.status === 'concluido') return false;
  return new Date(task.deadline) < new Date(new Date().toDateString());
}

export function isDeadlineApproaching(task: Task, days = 3): boolean {
  if (!task.deadline || task.status === 'concluido') return false;
  const deadline = new Date(task.deadline);
  const now = new Date(new Date().toDateString());
  const diff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}
