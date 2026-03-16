import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type Props = {
  total: number;
  pendente: number;
  emCurso: number;
  concluido: number;
};

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 600;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(Math.round(progress * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <>{display}</>;
}

const cards = [
  { key: 'total', label: 'Total de Tarefas', emoji: '📋', colorClass: 'text-foreground' },
  { key: 'pendente', label: 'Pendentes', emoji: '⏳', colorClass: 'text-status-pendente' },
  { key: 'emCurso', label: 'Em Curso', emoji: '🔄', colorClass: 'text-status-em-curso' },
  { key: 'concluido', label: 'Concluídas', emoji: '✅', colorClass: 'text-status-concluido' },
];

export default function StatsCards(props: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="bg-card border border-border rounded-xl p-5 hover:border-border-hover hover:-translate-y-0.5 transition-all duration-200"
        >
          <span className="text-2xl">{card.emoji}</span>
          <p className={`text-3xl font-extrabold mt-2 ${card.colorClass}`}>
            <AnimatedNumber value={props[card.key as keyof Props]} />
          </p>
          <p className="text-muted-foreground text-xs mt-1">{card.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
