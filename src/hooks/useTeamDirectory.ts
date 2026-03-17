import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type TeamMember = {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  avatar_color: string | null;
};

export function useTeamDirectory() {
  const query = useQuery({
    queryKey: ['team_directory'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('team_directory')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  return { team: query.data ?? [], isLoading: query.isLoading };
}
