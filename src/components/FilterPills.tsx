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
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {pills.map((pill) => {
        const active = activeFilter === pill.value;
        return (
          <button
            key={pill.value}
            onClick={() => setActiveFilter(pill.value)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all flex-shrink-0 ${
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface-raised border-border text-text-subtle hover:text-foreground hover:border-border-hover'
            }`}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
