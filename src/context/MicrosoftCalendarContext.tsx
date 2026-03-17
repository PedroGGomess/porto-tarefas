import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest, msalInstance } from '@/lib/msalConfig';
import { getUpcomingMeetings, MsEvent, parseUTC } from '@/lib/graphApi';

interface MicrosoftCalendarContextType {
  isConnected: boolean;
  meetings: MsEvent[];
  todayMeetings: MsEvent[];
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  retry: () => void;
}

export const MicrosoftCalendarContext = createContext<MicrosoftCalendarContextType | null>(null);

function formatDateLisbon(d: Date): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function MicrosoftCalendarProvider({ children }: { children: React.ReactNode }) {
  const { instance, accounts } = useMsal();
  const [isConnected, setIsConnected] = useState(false);
  const [meetings, setMeetings] = useState<MsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  const fetchMeetingsWithToken = useCallback(async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUpcomingMeetings(token);
      setMeetings(data);
    } catch {
      setError('Não foi possível carregar o calendário. Tenta novamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMeetings = useCallback(async () => {
    const account = instance.getAllAccounts()[0];
    if (!account) return;

    let token: string;
    try {
      const result = await instance.acquireTokenSilent({ ...loginRequest, account });
      token = result.accessToken;
    } catch {
      try {
        const result = await instance.acquireTokenPopup({ ...loginRequest, account });
        token = result.accessToken;
      } catch {
        setError('Não foi possível carregar o calendário. Tenta novamente.');
        return;
      }
    }
    await fetchMeetingsWithToken(token);
  }, [instance, fetchMeetingsWithToken]);

  // Auto-restore session from MSAL cache on mount
  useEffect(() => {
    if (hasInitialized.current || accounts.length === 0) return;
    hasInitialized.current = true;

    const initSession = async () => {
      try {
        const result = await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        });
        setIsConnected(true);
        await fetchMeetingsWithToken(result.accessToken);
      } catch {
        // Token expired or unavailable – stay disconnected, user can reconnect
      }
    };

    initSession();
  }, [accounts, instance, fetchMeetingsWithToken]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await msalInstance.initialize();

      // Trigger redirect login — navigates away from the page.
      // The redirect response is handled in main.tsx bootstrap, which runs
      // before the app renders and sets the active account; the auto-restore
      // useEffect then picks it up to fetch meetings.
      await msalInstance.loginRedirect({
        scopes: ['Calendars.Read', 'User.Read'],
        prompt: 'select_account',
      });
    } catch (error: any) {
      console.error('[MS Calendar] Login error:', error);
      if (!String(error?.message).includes('interaction_in_progress')) {
        setError('Não foi possível ligar a conta Microsoft. Tenta novamente.');
      }
    }
  }, [fetchMeetingsWithToken]);

  const disconnect = useCallback(() => {
    instance.clearCache();
    setIsConnected(false);
    setMeetings([]);
    setError(null);
    hasInitialized.current = false;
  }, [instance]);

  const retry = useCallback(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const todayStr = formatDateLisbon(new Date());
  const todayMeetings = meetings.filter(
    (m) => formatDateLisbon(parseUTC(m.start.dateTime)) === todayStr
  );

  return (
    <MicrosoftCalendarContext.Provider
      value={{ isConnected, meetings, todayMeetings, isLoading, error, connect, disconnect, retry }}
    >
      {children}
    </MicrosoftCalendarContext.Provider>
  );
}

export function useMicrosoftCalendar() {
  const ctx = useContext(MicrosoftCalendarContext);
  if (!ctx) throw new Error('useMicrosoftCalendar must be used within MicrosoftCalendarProvider');
  return ctx;
}
