import { ListTodo, Clock, RefreshCw, CheckCircle2, Ban } from 'lucide-react';

type Filter = { status: string | null; area: string | null; responsavel: string | null };

const tabs = [
  { label: 'Todas', status: null, icon: ListTodo },
  { label: 'Pendentes', status: 'pendente', icon: Clock },
  { label: 'Em Curso', status: 'em-curso', icon: RefreshCw },
  { label: 'Concluídas', status: 'concluido', icon: CheckCircle2 },
  { label: 'Bloqueadas', status: 'bloqueado', icon: Ban },
];

export default function MobileNav({ filter, setFilter }: { filter: Filter; setFilter: (f: Filter) => void }) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        background: '#080808',
        borderTop: '1px solid var(--glass-divider)',
      }}
    >
      {tabs.map((tab) => {
        const active = filter.status === tab.status && !filter.area;
        return (
          <button
            key={tab.label}
            onClick={() => setFilter({ status: tab.status, area: null, responsavel: null })}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors"
            style={{
              fontSize: 10,
              color: active ? 'white' : 'rgba(255,255,255,0.4)',
            }}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
