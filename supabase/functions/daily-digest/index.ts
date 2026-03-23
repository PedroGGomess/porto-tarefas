// Daily Digest Edge Function
// Called by a cron job every morning at 8:00 AM Lisbon time
// Sends a personalized email to each team member with their tasks for the day

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DigestData {
  overdue_tasks: Array<{ id: string; title: string; deadline: string; priority: string; area: string }>;
  today_tasks: Array<{ id: string; title: string; deadline: string; priority: string; area: string; status: string }>;
  pending_approvals: Array<{ id: string; task_title: string; description: string; dependency_type: string }>;
  upcoming_deadlines: Array<{ id: string; title: string; deadline: string; priority: string }>;
}

const PRIORITY_EMOJI: Record<string, string> = {
  critico: '🔴',
  alta: '🟠',
  media: '🟡',
  baixa: '🟢',
};

const PRIORITY_LABEL: Record<string, string> = {
  critico: 'Crítico',
  alta: 'Alto',
  media: 'Médio',
  baixa: 'Baixo',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all team members with digest enabled
    const { data: preferences } = await supabase
      .from('digest_preferences')
      .select('*')
      .eq('send_daily_digest', true);

    // Also get all team directory members if no preferences exist yet
    const { data: teamMembers } = await supabase
      .from('team_directory')
      .select('email, name')
      .eq('is_active', true);

    const emailsToProcess = new Set<string>();
    const nameMap = new Map<string, string>();

    // Add from preferences
    preferences?.forEach(p => {
      emailsToProcess.add(p.email);
    });

    // Add from team directory (default all active)
    teamMembers?.forEach(m => {
      emailsToProcess.add(m.email);
      if (m.name) nameMap.set(m.email, m.name);
    });

    const results: { email: string; status: string; taskCount: number }[] = [];

    for (const email of emailsToProcess) {
      // Get digest data using the database function
      const { data: digestData, error } = await supabase.rpc('get_daily_digest', { p_email: email });

      if (error) {
        results.push({ email, status: `error: ${error.message}`, taskCount: 0 });
        continue;
      }

      const digest = digestData as DigestData;

      // Skip if nothing to report
      const totalItems = (digest.overdue_tasks?.length ?? 0) +
        (digest.today_tasks?.length ?? 0) +
        (digest.pending_approvals?.length ?? 0);

      if (totalItems === 0) {
        results.push({ email, status: 'skipped (no tasks)', taskCount: 0 });
        continue;
      }

      const name = nameMap.get(email) ?? email.split('@')[0];
      const today = new Date().toLocaleDateString('pt-PT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      // Build email HTML
      const html = buildEmailHtml(name, today, digest);

      // Send email via Resend (if API key available)
      if (resendApiKey) {
        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'The 100s <tarefas@the-100s.com>',
              to: email,
              subject: `📋 Resumo do dia — ${new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}`,
              html,
            }),
          });

          const result = await response.json();
          results.push({ email, status: response.ok ? 'sent' : `error: ${JSON.stringify(result)}`, taskCount: totalItems });
        } catch (sendError) {
          results.push({ email, status: `send error: ${sendError.message}`, taskCount: totalItems });
        }
      } else {
        // Log only mode
        results.push({ email, status: 'logged (no Resend key)', taskCount: totalItems });
      }

      // Create a notification too
      await supabase.from('notifications').insert({
        user_email: email,
        type: 'task_overdue',
        title: 'Resumo diário',
        message: `Tens ${totalItems} tarefa${totalItems > 1 ? 's' : ''} para hoje. ${digest.overdue_tasks?.length ? `${digest.overdue_tasks.length} em atraso!` : ''}`,
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildEmailHtml(name: string, today: string, digest: DigestData): string {
  let sections = '';

  // Overdue tasks
  if (digest.overdue_tasks?.length) {
    sections += `
      <div style="margin-bottom: 24px; padding: 16px; background: #fef2f2; border-radius: 12px; border-left: 4px solid #ef4444;">
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #ef4444;">
          ⚠️ Em Atraso (${digest.overdue_tasks.length})
        </h3>
        ${digest.overdue_tasks.map(t => `
          <div style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
            <div style="font-size: 14px; font-weight: 600; color: #1a1a1a;">${PRIORITY_EMOJI[t.priority] || '⚪'} ${t.title}</div>
            <div style="font-size: 12px; color: #666; margin-top: 2px;">Deadline: ${t.deadline} · ${PRIORITY_LABEL[t.priority] || t.priority}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Today's tasks
  if (digest.today_tasks?.length) {
    sections += `
      <div style="margin-bottom: 24px; padding: 16px; background: #f0f9ff; border-radius: 12px; border-left: 4px solid #60a5fa;">
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #2563eb;">
          📋 As tuas tarefas (${digest.today_tasks.length})
        </h3>
        ${digest.today_tasks.map(t => `
          <div style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
            <div style="font-size: 14px; font-weight: 600; color: #1a1a1a;">${PRIORITY_EMOJI[t.priority] || '⚪'} ${t.title}</div>
            <div style="font-size: 12px; color: #666; margin-top: 2px;">${t.deadline ? `Deadline: ${t.deadline}` : 'Sem deadline'} · ${PRIORITY_LABEL[t.priority] || t.priority}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Pending approvals
  if (digest.pending_approvals?.length) {
    sections += `
      <div style="margin-bottom: 24px; padding: 16px; background: #fffbeb; border-radius: 12px; border-left: 4px solid #f59e0b;">
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #d97706;">
          ⏳ A aguardar aprovação/input teu (${digest.pending_approvals.length})
        </h3>
        ${digest.pending_approvals.map(t => `
          <div style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
            <div style="font-size: 14px; font-weight: 600; color: #1a1a1a;">${t.task_title}</div>
            <div style="font-size: 12px; color: #666; margin-top: 2px;">${t.description || 'Sem descrição'}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Upcoming deadlines
  if (digest.upcoming_deadlines?.length) {
    sections += `
      <div style="margin-bottom: 24px; padding: 16px; background: #f0fdf4; border-radius: 12px; border-left: 4px solid #22c55e;">
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #16a34a;">
          📅 Deadlines esta semana (${digest.upcoming_deadlines.length})
        </h3>
        ${digest.upcoming_deadlines.map(t => `
          <div style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
            <div style="font-size: 14px; font-weight: 600; color: #1a1a1a;">${PRIORITY_EMOJI[t.priority] || '⚪'} ${t.title}</div>
            <div style="font-size: 12px; color: #666; margin-top: 2px;">Deadline: ${t.deadline}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <!-- Header -->
        <div style="background: #080808; padding: 24px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: white; letter-spacing: -0.02em;">THE 100'S</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.5);">Resumo diário de tarefas</p>
        </div>

        <!-- Content -->
        <div style="background: white; padding: 24px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          <p style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0 0 4px;">Bom dia, ${name}! 👋</p>
          <p style="font-size: 13px; color: #666; margin: 0 0 24px;">${today}</p>

          ${sections}

          <!-- CTA -->
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://the100s-tasks.lovable.app" style="display: inline-block; padding: 12px 32px; background: #080808; color: white; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px;">
              Ver Dashboard
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 16px; font-size: 11px; color: #999;">
          The 100's · Porto · Portugal
        </div>
      </div>
    </body>
    </html>
  `;
}
