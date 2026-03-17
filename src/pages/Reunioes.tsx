import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMicrosoftCalendar } from '@/context/MicrosoftCalendarContext';
import { useMeetings, Meeting } from '@/hooks/useMeetings';
import { MsEvent, parseUTC } from '@/lib/graphApi';
import { isMsConfigured } from '@/lib/msalConfig';
import AppSidebar from '@/components/AppSidebar';
import NewMeetingModal from '@/components/NewMeetingModal';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatTimeLisbon(dateTimeStr: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',        
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parseUTC(dateTimeStr));
}

function formatDateLisbon(d: Date): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function getDayLabel(dateTimeStr: string): string {
  const d = parseUTC(dateTimeStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const df = formatDateLisbon(d);
  if (df === formatDateLisbon(today)) return 'HOJE';
  if (df === formatDateLisbon(tomorrow)) return 'AMANHÃ';

  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    weekday: 'long',
  })
    .format(d)
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Same as getDayLabel but takes a YYYY-MM-DD string (manual meetings). */
function getDayLabelFromDate(dateStr: string): string {
  // Parse as local noon to avoid off-by-one due to timezone
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const df = formatDateLisbon(d);
  if (df === formatDateLisbon(today)) return 'HOJE';
  if (df === formatDateLisbon(tomorrow)) return 'AMANHÃ';
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    weekday: 'long',
  })
    .format(d)
    .replace(/^\w/, (c) => c.toUpperCase());
}

function getFullDayLabel(dateTimeStr: string): string {
  const d = parseUTC(dateTimeStr);
  const weekday = new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    weekday: 'long',
  })
    .format(d)
    .replace(/^\w/, (c) => c.toUpperCase());
  const day = new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: 'numeric',
    month: 'short',
  }).format(d);
  return `${weekday}, ${day}`;
}

/** Same as getFullDayLabel but takes a YYYY-MM-DD string (manual meetings). */
function getFullDayLabelFromDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const weekday = new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    weekday: 'long',
  })
    .format(d)
    .replace(/^\w/, (c) => c.toUpperCase());
  const day = new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: 'numeric',
    month: 'short',
  }).format(d);
  return `${weekday}, ${day}`;
}

function getDuration(startStr: string, endStr: string): string {
  const diffMin = Math.round(
    (parseUTC(endStr).getTime() - parseUTC(startStr).getTime()) / 60000
  );
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function getGreeting(): string {
  const hour = new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    hour: 'numeric',
    hour12: false,
  })
    .format(new Date())
    .replace(/\D/g, '');
  const h = parseInt(hour, 10);
  if (h < 12) return 'Bom dia 👋';
  if (h < 19) return 'Boa tarde 👋';
  return 'Boa noite 👋';
}

function isStartingSoon(startStr: string): boolean {
  const now = Date.now();
  const start = parseUTC(startStr).getTime();
  return start > now && start - now <= 15 * 60 * 1000;
}

function isOngoing(startStr: string, endStr: string): boolean {
  const now = Date.now();
  return parseUTC(startStr).getTime() <= now && now < parseUTC(endStr).getTime();
}

// ─── Group meetings by day key ────────────────────────────────────────────────

function groupByDay(meetings: MsEvent[]): Map<string, MsEvent[]> {
  const map = new Map<string, MsEvent[]>();
  for (const m of meetings) {
    const key = formatDateLisbon(parseUTC(m.start.dateTime));
    const arr = map.get(key) ?? [];
    arr.push(m);
    map.set(key, arr);
  }
  return map;
}

function groupManualByDay(meetings: Meeting[]): Map<string, Meeting[]> {
  const map = new Map<string, Meeting[]>();
  for (const m of meetings) {
    const arr = map.get(m.meeting_date) ?? [];
    arr.push(m);
    map.set(m.meeting_date, arr);
  }
  return map;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MeetingCard({ meeting }: { meeting: MsEvent }) {
  const soon = isStartingSoon(meeting.start.dateTime);
  const ongoing = isOngoing(meeting.start.dateTime, meeting.end.dateTime);
  const startTime = formatTimeLisbon(meeting.start.dateTime);
  const endTime = formatTimeLisbon(meeting.end.dateTime);
  const duration = getDuration(meeting.start.dateTime, meeting.end.dateTime);
  const joinUrl = meeting.onlineMeeting?.joinUrl;

  return (
    <div
      className={`bg-card rounded-[14px] px-4 py-3.5 flex items-center gap-3 transition-all duration-300 ${
        soon ? 'border border-blue-500/70 animate-[pulse-border_2s_ease-in-out_infinite]' : 'border border-border hover:border-border-hover'
      }`}
    >
      {/* Time */}
      <div className="flex-shrink-0 text-right min-w-[52px]">
        <p className="text-sm font-bold text-foreground leading-tight">{startTime}</p>
        <p className="text-xs text-muted-foreground leading-tight">– {endTime}</p>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-border flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate" style={{ fontWeight: 600 }}>
          {meeting.subject}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          {meeting.onlineMeeting ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
              Teams
            </span>
          ) : meeting.location?.displayName ? (
            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
              📍 {meeting.location.displayName}
            </span>
          ) : null}
          {meeting.organizer && (
            <span className="text-[11px] text-muted-foreground truncate">
              👤 {meeting.organizer.emailAddress.name}
            </span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
        {ongoing && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/15 text-green-400 border border-green-500/30 whitespace-nowrap">
            A decorrer
          </span>
        )}
        <span className="px-2 py-0.5 rounded-md text-[11px]" style={{ backgroundColor: '#1f1f1f', color: '#888' }}>
          {duration}
        </span>
        {joinUrl && (
          <a
            href={joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-lg text-xs font-semibold text-white whitespace-nowrap hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#3b82f6' }}
          >
            Entrar
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ManualMeetingCard({ meeting, onDelete }: { meeting: Meeting; onDelete: (id: string) => void }) {
  const [h, m] = meeting.meeting_time.split(':').map(Number);
  const endMin = h * 60 + m + meeting.duration_minutes;
  const endH = Math.floor(endMin / 60) % 24;
  const endM = endMin % 60;
  const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  const durationLabel =
    meeting.duration_minutes < 60
      ? `${meeting.duration_minutes}min`
      : meeting.duration_minutes % 60 === 0
      ? `${meeting.duration_minutes / 60}h`
      : `${Math.floor(meeting.duration_minutes / 60)}h ${meeting.duration_minutes % 60}min`;

  return (
    <div className="bg-card rounded-[14px] px-4 py-3.5 flex items-center gap-3 border border-border hover:border-border-hover transition-all duration-300">
      {/* Time */}
      <div className="flex-shrink-0 text-right min-w-[52px]">
        <p className="text-sm font-bold text-foreground leading-tight">{startTime}</p>
        <p className="text-xs text-muted-foreground leading-tight">– {endTime}</p>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-border flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{meeting.title}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-raised text-muted-foreground border border-border">
            Manual
          </span>
          {meeting.location && (
            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
              📍 {meeting.location}
            </span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
        <span className="px-2 py-0.5 rounded-md text-[11px]" style={{ backgroundColor: '#1f1f1f', color: '#888' }}>
          {durationLabel}
        </span>
        <button
          onClick={() => onDelete(meeting.id)}
          className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
        >
          Remover
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Reunioes() {
  const { user, loading } = useAuth();
  const { isConnected, meetings, todayMeetings, isLoading, error, connect, disconnect, retry } =
    useMicrosoftCalendar();
  const { meetings: manualMeetings, createMeeting, deleteMeeting } = useMeetings();
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm animate-pulse">A carregar...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  // Next meeting today (not yet started) — from Microsoft calendar
  const now = Date.now();
  const nextMsMeeting = todayMeetings.find(
    (m) => parseUTC(m.start.dateTime).getTime() > now
  );

  const grouped = groupByDay(meetings);
  const groupedManual = groupManualByDay(manualMeetings);

  // Collect all unique day keys across both sources (next 7 days)
  const allDayKeys = Array.from(
    new Set([...Array.from(grouped.keys()), ...Array.from(groupedManual.keys())])
  ).sort();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <main className="md:ml-[220px] p-4 md:p-6 pb-20 md:pb-6">
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{getGreeting()}</h2>
            {isConnected && (
              <p className="text-muted-foreground text-sm mt-1">
                Tens {todayMeetings.length}{' '}
                {todayMeetings.length === 1 ? 'reunião Microsoft' : 'reuniões Microsoft'} hoje.
                {nextMsMeeting && (
                  <>{' '}Próxima: {nextMsMeeting.subject} às {formatTimeLisbon(nextMsMeeting.start.dateTime)}</>
                )}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowNewMeetingModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white whitespace-nowrap hover:opacity-90 transition-opacity flex-shrink-0"
            style={{ backgroundColor: '#3b82f6' }}
          >
            <Plus size={14} />
            Nova Reunião
          </button>
        </div>

        {/* ── Microsoft Calendar connection card (when not connected) ─── */}
        {!isConnected && (
          <div
            className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl mb-6"
            style={{ backgroundColor: '#111', border: '1px solid #1f1f1f' }}
          >
            <div className="flex items-center gap-3 flex-1">
              <svg width="28" height="28" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              <div>
                <p className="text-foreground text-sm font-semibold">Ligar o Microsoft Calendar</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Vê as tuas reuniões do Outlook e Teams aqui.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!isMsConfigured) {
                  alert('Configuração Microsoft em falta. Contacta o administrador.');
                  return;
                }
                connect();
              }}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: '#ffffff', color: '#000000' }}
            >
              Ligar conta Microsoft
            </button>
          </div>
        )}

        {/* ── Error banner (Microsoft) ──────────────────────────────────── */}
        {isConnected && error && (
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl mb-4" style={{ backgroundColor: '#1a0000', border: '1px solid #ef444433' }}>
            <p className="text-red-400 text-xs">{error}</p>
            <button
              onClick={retry}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* ── Connection error (login failed) ─────────────────────────── */}
        {!isConnected && error && (
          <p className="text-red-400 text-xs mb-4">{error}</p>
        )}

        {/* ── Loading Microsoft meetings ───────────────────────────────── */}
        {isConnected && isLoading && (
          <p className="text-center py-4 text-muted-foreground text-sm animate-pulse">
            A carregar reuniões Microsoft...
          </p>
        )}

        {/* ── Meetings list (both sources) ─────────────────────────────── */}
        {allDayKeys.length === 0 && !isLoading ? (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">📅</span>
            <p className="text-foreground font-semibold">Sem reuniões agendadas</p>
            <p className="text-muted-foreground text-sm mt-1">
              Usa o botão "Nova Reunião" para agendar a tua primeira reunião.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {allDayKeys.map((dayKey) => {
              const msMeetings = grouped.get(dayKey) ?? [];
              const manualDay = groupedManual.get(dayKey) ?? [];
              const firstMs = msMeetings[0];
              const firstManual = manualDay[0];
              // Use first available meeting for day label
              const prefix = firstMs
                ? getDayLabel(firstMs.start.dateTime)
                : getDayLabelFromDate(dayKey);
              const fullDay = firstMs
                ? getFullDayLabel(firstMs.start.dateTime)
                : getFullDayLabelFromDate(dayKey);

              return (
                <div key={dayKey}>
                  <p
                    className="text-[10px] font-semibold uppercase mb-2 tracking-widest"
                    style={{ color: '#555' }}
                  >
                    {prefix} · {fullDay}
                  </p>
                  <div className="space-y-2">
                    {msMeetings.map((m) => (
                      <MeetingCard key={m.id} meeting={m} />
                    ))}
                    {manualDay.map((m) => (
                      <ManualMeetingCard key={m.id} meeting={m} onDelete={deleteMeeting} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Disconnect Microsoft ──────────────────────────────────────── */}
        {isConnected && (
          <div className="mt-10 text-center">
            <button
              onClick={disconnect}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Desligar conta Microsoft
            </button>
          </div>
        )}
      </main>

      <NewMeetingModal
        open={showNewMeetingModal}
        onClose={() => setShowNewMeetingModal(false)}
        onCreate={createMeeting}
      />
    </div>
  );
}
