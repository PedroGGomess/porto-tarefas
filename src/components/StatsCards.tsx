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
  { key: 'total', label: 'TOTAL DE TAREFAS', emoji: '📋', barColor: 'rgba(255,255,255,0.3)' },
  { key: 'pendente', label: 'PENDENTES', emoji: '⏳', barColor: '#555555' },
  { key: 'emCurso', label: 'EM CURSO', emoji: '🔄', barColor: '#60a5fa' },
  { key: 'concluido', label: 'CONCLUÍDAS', emoji: '✅', barColor: '#22c55e' },
];

export default function StatsCards(props: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="group cursor-default transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: 20,
            backdropFilter: 'blur(10px)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--glass-border-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--glass-border)';
          }}
        >
          <span className="text-xl">{card.emoji}</span>
          <p
            className="text-white mt-2"
            style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' }}
          >
            <AnimatedNumber value={props[card.key as keyof Props]} />
          </p>
          <p
            className="mt-1"
            style={{
              fontSize: 11,
              color: 'var(--glass-text-muted)',
              fontWeight: 500,
              letterSpacing: '0.05em',
            }}
          >
            {card.label}
          </p>
          <div
            className="mt-4"
            style={{
              height: 3,
              borderRadius: 99,
              background: card.barColor,
              opacity: 0.6,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}
