import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface Meeting {
  id: string;
  user_id: string | null;
  title: string;
  meeting_date: string;
  meeting_time: string;
  duration_minutes: number;
  location: string | null;
  notes: string | null;
  created_at: string;
}

export interface NewMeetingInput {
  title: string;
  meeting_date: string;
  meeting_time: string;
  duration_minutes: number;
  location?: string;
  notes?: string;
}

export function useMeetings() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMeetings = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', user.id)
      .order('meeting_date', { ascending: true })
      .order('meeting_time', { ascending: true });
    setMeetings(data ?? []);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const createMeeting = useCallback(
    async (input: NewMeetingInput): Promise<boolean> => {
      if (!user) return false;
      const { error } = await supabase.from('meetings').insert({
        ...input,
        user_id: user.id,
      });
      if (error) {
        console.error('[useMeetings] insert error:', error);
        return false;
      }
      await fetchMeetings();
      return true;
    },
    [user, fetchMeetings]
  );

  const deleteMeeting = useCallback(
    async (id: string): Promise<void> => {
      await supabase.from('meetings').delete().eq('id', id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    },
    []
  );

  return { meetings, isLoading, createMeeting, deleteMeeting, refetch: fetchMeetings };
}
