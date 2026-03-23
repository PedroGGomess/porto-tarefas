import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type Meeting = {
  id: string;
  user_id: string | null;
  title: string;
  meeting_date: string;
  meeting_time: string;
  duration_minutes: number;
  location: string | null;
  notes: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
  meeting_link: string | null;
  participants: string[] | null;
  is_synced: boolean;
  recurrence: string | null;
  color: string | null;
  created_at: string;
};

export function useGoogleCalendar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all meetings from Supabase
  const meetingsQuery = useQuery({
    queryKey: ['meetings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: true })
        .order('meeting_time', { ascending: true });
      if (error) throw error;
      return data as Meeting[];
    },
    enabled: !!user,
  });

  // Create a meeting
  const createMeeting = useMutation({
    mutationFn: async (meeting: Partial<Meeting>) => {
      const { error } = await supabase.from('meetings').insert({
        ...meeting,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Reunião criada');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Update a meeting
  const updateMeeting = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Meeting> & { id: string }) => {
      const { error } = await supabase.from('meetings').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Reunião atualizada');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete a meeting
  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meetings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Reunião eliminada');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Filtered meetings
  const todayMeetings = (meetingsQuery.data ?? []).filter(m => {
    const today = new Date().toISOString().split('T')[0];
    return m.meeting_date === today;
  });

  const upcomingMeetings = (meetingsQuery.data ?? []).filter(m => {
    const today = new Date().toISOString().split('T')[0];
    return m.meeting_date >= today;
  });

  return {
    meetings: meetingsQuery.data ?? [],
    todayMeetings,
    upcomingMeetings,
    isLoading: meetingsQuery.isLoading,
    createMeeting,
    updateMeeting,
    deleteMeeting,
  };
}
