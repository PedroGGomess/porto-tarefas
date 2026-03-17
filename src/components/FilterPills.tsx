import { AREAS, PRIORITIES } from '@/lib/supabase';

type Props = {
  activeFilter: string;
  setActiveFilter: (f: string) => void;
};

const pills = [
  { value: 'todas', label: 'Todas' },
  ...PRIORITIES.map(p => ({ value: `p:${p.value}`, label: p.label })),
  ...AREAS.map(a => ({ value: `a:${a.value}`, label: a.label })),
];

export default function FilterPills({ activeFilter, setActiveFilter }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {pills.map((pill) => {
        const active = activeFilter === pill.value;
        return (
          <button
            key={pill.value}
            onClick={() => setActiveFilter(pill.value)}
            className="whitespace-nowrap flex-shrink-0 transition-all duration-150"
            style={{
              padding: '6px 14px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              background: active ? 'white' : 'rgba(255,255,255,0.05)',
              color: active ? 'black' : 'rgba(255,255,255,0.5)',
              border: active ? '1px solid white' : '1px solid rgba(255,255,255,0.08)',
            }}
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
