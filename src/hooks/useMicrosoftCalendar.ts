import { useContext } from 'react';
import { MicrosoftCalendarContext } from '@/context/MicrosoftCalendarContext';
import type { MsEvent } from '@/lib/graphApi';

const clientId = import.meta.env.VITE_MS_CLIENT_ID as string | undefined;
const tenantId = import.meta.env.VITE_MS_TENANT_ID as string | undefined;

const DEFAULTS = {
  isConnected: false,
  accessToken: null as string | null,
  meetings: [] as MsEvent[],
  todayMeetings: [] as MsEvent[],
  isLoading: false,
  error: null as string | null,
  login: async () => {},
  logout: () => {},
  connect: async () => {},
  disconnect: () => {},
  retry: () => {},
};

/**
 * Hook for Microsoft Calendar integration.
 *
 * - Returns safe defaults (isConnected: false) if env vars are missing or the
 *   MicrosoftCalendarProvider is not in the tree — never throws.
 * - When connected, exposes isConnected, accessToken, login(), logout() and
 *   meetings[] / todayMeetings alongside the full context API.
 */
export function useMicrosoftCalendar() {
  const ctx = useContext(MicrosoftCalendarContext);

  // If Microsoft env vars are not configured, degrade gracefully.
  if (!clientId || !tenantId) return DEFAULTS;

  // If the hook is called outside of MicrosoftCalendarProvider, return defaults.
  if (!ctx) return DEFAULTS;

  return {
    ...ctx,
    /**
     * Access token is not stored in the context (it is used internally for API
     * calls but not exposed). Consumers that need the raw token should extend
     * MicrosoftCalendarContext to surface it.
     */
    accessToken: null as string | null,
    /** Alias for context's connect() to match the required hook interface. */
    login: ctx.connect,
    /** Alias for context's disconnect() to match the required hook interface. */
    logout: ctx.disconnect,
  };
}
