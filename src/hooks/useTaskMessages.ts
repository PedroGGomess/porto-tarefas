import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type TaskMessage = {
  id: string;
  task_id: string | null;
  user_id: string | null;
  sender_email: string;
  content: string;
  is_ai: boolean | null;
  created_at: string | null;
};

export function useTaskMessages(taskId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['task_messages', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await (supabase as any)
        .from('task_messages')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TaskMessage[];
    },
    enabled: !!taskId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task_messages:${taskId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_messages', filter: `task_id=eq.${taskId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['task_messages', taskId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!taskId || !user) throw new Error('Sem sessão');
      const { error } = await supabase.from('task_messages').insert({
        task_id: taskId,
        user_id: user.id,
        sender_email: user.email ?? 'Utilizador',
        content,
        is_ai: false,
      });
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendAiMessage = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!taskId || !user) throw new Error('Sem sessão');
      const { error } = await supabase.from('task_messages').insert({
        task_id: taskId,
        user_id: user.id,
        sender_email: 'ai@sistema',
        content,
        is_ai: true,
      });
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    sendMessage,
    sendAiMessage,
  };
}

export function useAllUnreadCounts(taskIds: string[]) {
  const query = useQuery({
    queryKey: ['task_messages_counts', taskIds.join(',')],
    queryFn: async () => {
      if (taskIds.length === 0) return {};
      const { data, error } = await supabase
        .from('task_messages')
        .select('task_id, created_at')
        .in('task_id', taskIds)
        .eq('is_ai', false);
      if (error) throw error;

      const lastRead: Record<string, string> = {};
      try {
        const stored = localStorage.getItem('task_last_read');
        if (stored) Object.assign(lastRead, JSON.parse(stored));
      } catch (_e) {
        // ignore parse errors
      }

      const counts: Record<string, number> = {};
      for (const msg of data ?? []) {
        if (!msg.task_id) continue;
        const lastReadTime = lastRead[msg.task_id];
        if (!lastReadTime || (msg.created_at && msg.created_at > lastReadTime)) {
          counts[msg.task_id] = (counts[msg.task_id] ?? 0) + 1;
        }
      }
      return counts;
    },
    enabled: taskIds.length > 0,
  });

  return query.data ?? {};
}

export function markTaskAsRead(taskId: string) {
  try {
    const stored = localStorage.getItem('task_last_read');
    const lastRead = stored ? JSON.parse(stored) : {};
    lastRead[taskId] = new Date().toISOString();
    localStorage.setItem('task_last_read', JSON.stringify(lastRead));
  } catch (_e) {
    // ignore storage errors
  }
}
