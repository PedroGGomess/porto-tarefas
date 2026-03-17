import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type TeamMessage = {
  id: string;
  user_id: string | null;
  sender_email: string;
  sender_name: string | null;
  content: string;
  is_ai: boolean | null;
  mentions_task_id: string | null;
  created_at: string | null;
};

export function useTeamMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['team_messages'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('team_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TeamMessage[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('team_messages_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['team_messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const sendMessage = useMutation({
    mutationFn: async ({ content, mentions_task_id }: { content: string; mentions_task_id?: string | null }) => {
      if (!user) throw new Error('Sem sessão');
      const { error } = await (supabase as any).from('team_messages').insert({
        user_id: user.id,
        sender_email: user.email ?? 'Utilizador',
        sender_name: user.email?.split('@')[0] ?? 'Utilizador',
        content,
        is_ai: false,
        mentions_task_id: mentions_task_id ?? null,
      });
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendAiMessage = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!user) throw new Error('Sem sessão');
      const { error } = await (supabase as any).from('team_messages').insert({
        user_id: user.id,
        sender_email: 'ai@sistema',
        sender_name: "The 100's AI",
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
