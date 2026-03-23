import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, TaskDependency } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useTaskDependencies(taskId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Dependencies where this task depends on others
  const dependsOn = useQuery({
    queryKey: ['task-dependencies', taskId, 'depends-on'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_dependencies')
        .select(`
          *,
          depends_on_task:depends_on_task_id(id, title, status, priority, area)
        `)
        .eq('task_id', taskId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!taskId && !!user,
  });

  // Tasks that depend on this task
  const blockedBy = useQuery({
    queryKey: ['task-dependencies', taskId, 'blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_dependencies')
        .select(`
          *,
          dependent_task:task_id(id, title, status, priority, area)
        `)
        .eq('depends_on_task_id', taskId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!taskId && !!user,
  });

  const addDependency = useMutation({
    mutationFn: async (dep: {
      task_id: string;
      depends_on_task_id: string;
      dependency_type?: string;
      description?: string;
    }) => {
      const { error } = await supabase.from('task_dependencies').insert({
        ...dep,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Dependência adicionada');
    },
    onError: (e: any) => {
      if (e.message?.includes('unique')) {
        toast.error('Esta dependência já existe');
      } else if (e.message?.includes('check')) {
        toast.error('Uma tarefa não pode depender de si mesma');
      } else {
        toast.error(e.message);
      }
    },
  });

  const resolveDependency = useMutation({
    mutationFn: async (depId: string) => {
      const { error } = await supabase.from('task_dependencies').update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user!.id,
      }).eq('id', depId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Dependência resolvida');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeDependency = useMutation({
    mutationFn: async (depId: string) => {
      const { error } = await supabase.from('task_dependencies').delete().eq('id', depId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Dependência removida');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    dependsOn: dependsOn.data ?? [],
    blockedBy: blockedBy.data ?? [],
    isLoading: dependsOn.isLoading || blockedBy.isLoading,
    addDependency,
    resolveDependency,
    removeDependency,
  };
}

// Hook to get all dependencies for Gantt chart
export function useAllDependencies() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-dependencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_dependencies')
        .select(`
          *,
          depends_on_task:depends_on_task_id(id, title, status),
          dependent_task:task_id(id, title, status)
        `)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
