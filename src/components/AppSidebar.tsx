import { useAuth } from '@/hooks/useAuth';
import { AREAS } from '@/lib/supabase';
import { LogOut, ListTodo, Clock, RefreshCw, CheckCircle2, Ban } from 'lucide-react';

type Filter = {
  status: string | null;
  area: string | null;
};

type Props = {
  filter: Filter;
  setFilter: (f: Filter) => void;
  counts: { total: number; pendente: number; emCurso: number; concluido: number; bloqueado: number };
};

const navItems = [
  { label: 'Todas as Tarefas', status: null, icon: ListTodo },
  { label: 'Pendentes', status: 'pendente', icon: Clock },
  { label: 'Em Curso', status: 'em-curso', icon: RefreshCw },
  { label: 'Concluídas', status: 'concluido', icon: CheckCircle2 },
  { label: 'Bloqueadas', status: 'bloqueado', icon: Ban },
];

export default function AppSidebar({ filter, setFilter, counts }: Props) {
  const { user, signOut } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-[220px] min-h-screen bg-[#0d0d0d] border-r border-[#1a1a1a] fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-foreground font-bold text-sm tracking-[0.25em] uppercase">
          The 100's
        </h1>
        <p className="text-muted-foreground text-[11px] mt-0.5 tracking-wider">Gestor de Tarefas</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        <div className="mb-3">
          {navItems.map((item) => {
            const active = filter.status === item.status && !filter.area;
            return (
              <button
                key={item.label}
                onClick={() => setFilter({ status: item.status, area: null })}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all ${
                  active
                    ? 'bg-[rgba(255,255,255,0.06)] text-foreground border-l-2 border-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <item.icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Area filters */}
        <div className="pt-3 border-t border-[#1a1a1a]">
          <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Áreas</p>
          {AREAS.map((area) => (
            <button
              key={area.value}
              onClick={() => setFilter({ status: null, area: filter.area === area.value ? null : area.value })}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] transition-all ${
                filter.area === area.value
                  ? 'bg-[rgba(255,255,255,0.06)] text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.03)]'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: area.color }}
              />
              <span className="truncate">{area.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-[#1a1a1a]">
        <p className="text-[11px] text-muted-foreground truncate mb-2">{user?.email}</p>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut size={12} />
          Sair
        </button>
      </div>
    </aside>
  );
}
