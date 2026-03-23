import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, TaskAssignee } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useTaskAssignees(taskId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['task-assignees', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_assignees')
        .select('*')
        .eq('task_id', taskId!)
        .order('assigned_at', { ascending: true });
      if (error) throw error;
      return data as TaskAssignee[];
    },
    enabled: !!taskId && !!user,
  });

  const addAssignee = useMutation({
    mutationFn: async (assignee: { task_id: string; email: string; name?: string; role?: string }) => {
      const { error } = await supabase.from('task_assignees').insert({
        ...assignee,
        assigned_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-assignees', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Colaborador adicionado');
    },
    onError: (e: any) => {
      if (e.message?.includes('unique')) {
        toast.error('Este colaborador já está atribuído a esta tarefa');
      } else {
        toast.error(e.message);
      }
    },
  });

  const removeAssignee = useMutation({
    mutationFn: async (assigneeId: string) => {
      const { error } = await supabase.from('task_assignees').delete().eq('id', assigneeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-assignees', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Colaborador removido');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    assignees: query.data ?? [],
    isLoading: query.isLoading,
    addAssignee,
    removeAssignee,
  };
}
