import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type TaskMember = {
  id: string;
  task_id: string | null;
  email: string;
  invited_by: string | null;
  joined_at: string | null;
};

export function useTaskMembers(taskId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['task_members', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await (supabase as any)
        .from('task_members')
        .select('*')
        .eq('task_id', taskId)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TaskMember[];
    },
    enabled: !!taskId,
  });

  const addMember = useMutation({
    mutationFn: async ({ taskId, email }: { taskId: string; email: string }) => {
      const { error } = await (supabase as any).from('task_members').insert({
        task_id: taskId,
        email,
        invited_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_members', taskId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase as any).from('task_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_members', taskId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { members: query.data ?? [], isLoading: query.isLoading, addMember, removeMember };
}
