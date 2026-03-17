import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMicrosoftCalendar } from '@/context/MicrosoftCalendarContext';
import { AREAS } from '@/lib/supabase';
import { LogOut, ListTodo, Clock, RefreshCw, CheckCircle2, Ban } from 'lucide-react';

type Filter = {
  status: string | null;
  area: string | null;
  responsavel: string | null;
};

type Props = {
  filter?: Filter;
  setFilter?: (f: Filter) => void;
  counts?: { total: number; pendente: number; emCurso: number; concluido: number; bloqueado: number };
};

const navItems = [
  { label: 'Todas as Tarefas', status: null, icon: ListTodo },
  { label: 'Pendentes', status: 'pendente', icon: Clock },
  { label: 'Em Curso', status: 'em-curso', icon: RefreshCw },
  { label: 'Concluídas', status: 'concluido', icon: CheckCircle2 },
  { label: 'Bloqueadas', status: 'bloqueado', icon: Ban },
];

const defaultFilter: Filter = { status: null, area: null, responsavel: null };
const defaultCounts = { total: 0, pendente: 0, emCurso: 0, concluido: 0, bloqueado: 0 };

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#60a5fa', '#f472b6', '#34d399', '#a78bfa', '#f59e0b'];
function emailToColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function AppSidebar({ filter = defaultFilter, setFilter = () => {}, counts = defaultCounts }: Props) {
  const { user, signOut } = useAuth();
  const { todayMeetings, isConnected } = useMicrosoftCalendar();
  const navigate = useNavigate();
  const location = useLocation();

  const isTasksPage = location.pathname === '/';
  const isReunioes = location.pathname === '/reunioes';

  const handleNavItemClick = (item: typeof navItems[number]) => {
    if (isTasksPage) {
      setFilter({ status: item.status, area: null, responsavel: null });
    } else {
      navigate('/');
    }
  };

  const handleAreaClick = (areaValue: string) => {
    if (isTasksPage) {
      setFilter({ status: null, area: filter.area === areaValue ? null : areaValue, responsavel: null });
    } else {
      navigate('/');
    }
  };

  return (
    <aside
      className="hidden md:flex flex-col w-[240px] min-h-screen fixed left-0 top-0 z-30"
      style={{
        background: '#080808',
        borderRight: '1px solid var(--glass-divider)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <span className="text-white text-xs font-bold tracking-tight">100</span>
          </div>
          <div>
            <h1
              className="text-white font-bold uppercase"
              style={{ fontSize: 12, letterSpacing: '0.2em' }}
            >
              The 100's
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Gestor de Tarefas</p>
          </div>
        </div>
        <div className="mt-4" style={{ height: 1, background: 'var(--glass-divider)' }} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = isTasksPage && filter.status === item.status && !filter.area;
            return (
              <button
                key={item.label}
                onClick={() => handleNavItemClick(item)}
                className="w-full flex items-center gap-2.5 rounded-[10px] transition-all duration-150"
                style={{
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? 'white' : 'rgba(255,255,255,0.5)',
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
                  }
                }}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Reuniões */}
          <button
            onClick={() => navigate('/reunioes')}
            className="w-full flex items-center gap-2.5 rounded-[10px] transition-all duration-150"
            style={{
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: isReunioes ? 600 : 500,
              color: isReunioes ? 'white' : 'rgba(255,255,255,0.5)',
              background: isReunioes ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}
          >
            <span className="text-base leading-none">📅</span>
            <span className="flex-1 text-left">Reuniões</span>
            {isConnected && todayMeetings.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none bg-white text-black min-w-[18px] text-center">
                {todayMeetings.length}
              </span>
            )}
          </button>

          {/* Chat de Equipa */}
          <button
            onClick={() => navigate('/chat')}
            className="w-full flex items-center gap-2.5 rounded-[10px] transition-all duration-150"
            style={{
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: location.pathname === '/chat' ? 600 : 500,
              color: location.pathname === '/chat' ? 'white' : 'rgba(255,255,255,0.5)',
              background: location.pathname === '/chat' ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== '/chat') {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)';
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== '/chat') {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
              }
            }}
          >
            <span className="text-base leading-none">💬</span>
            <span className="flex-1 text-left">Chat de Equipa</span>
          </button>

          {/* Ficheiros */}
          <button
            onClick={() => navigate('/ficheiros')}
            className="w-full flex items-center gap-2.5 rounded-[10px] transition-all duration-150"
            style={{
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: location.pathname === '/ficheiros' ? 600 : 500,
              color: location.pathname === '/ficheiros' ? 'white' : 'rgba(255,255,255,0.5)',
              background: location.pathname === '/ficheiros' ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== '/ficheiros') {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)';
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== '/ficheiros') {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
              }
            }}
          >
            <span className="text-base leading-none">📁</span>
            <span className="flex-1 text-left">Ficheiros</span>
          </button>
        </div>

        {/* Area filters */}
        <div className="pt-4">
          <div className="mt-2 mb-2" style={{ height: 1, background: 'var(--glass-divider)' }} />
          <p
            className="px-3 mb-2 uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.15em',
              color: 'rgba(255,255,255,0.25)',
              fontWeight: 600,
            }}
          >
            Áreas
          </p>
          {AREAS.map((area) => {
            const active = isTasksPage && filter.area === area.value;
            return (
              <button
                key={area.value}
                onClick={() => handleAreaClick(area.value)}
                className="w-full flex items-center gap-2.5 rounded-[10px] transition-all duration-150"
                style={{
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? 'white' : 'rgba(255,255,255,0.5)',
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
                  }
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: area.color }}
                />
                <span className="truncate">{area.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Claude AI card */}
      <div className="px-4 pb-3">
        <button
          onClick={() => window.open('https://claude.ai', '_blank')}
          className="w-full text-left transition-all duration-150"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(245,158,11,0.3)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(245,158,11,0.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          <span style={{ fontSize: 16, color: '#f59e0b', flexShrink: 0 }}>✦</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.3 }}>Claude AI</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>Abrir assistente</p>
          </div>
        </button>
      </div>

      {/* User */}
      <div
        className="px-4 py-4"
        style={{ borderTop: '1px solid var(--glass-divider)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ backgroundColor: emailToColor(user?.email ?? '') }}
          >
            {getInitials(user?.email ?? 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 mt-2 transition-colors duration-150"
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; }}
        >
          <LogOut size={12} />
          Sair
        </button>
      </div>
    </aside>
  );
}
