import { motion } from 'framer-motion';

export default function ProgressBar({ total, concluido }: { total: number; concluido: number }) {
  const pct = total > 0 ? Math.round((concluido / total) * 100) : 0;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        padding: '16px 20px',
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
          Progresso Geral
        </span>
        <span style={{ fontSize: 13, color: 'white', fontWeight: 700 }}>{pct}%</span>
      </div>
      <div
        style={{
          height: 4,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 99,
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: 99,
            background: pct >= 100
              ? 'linear-gradient(90deg, #22c55e, #4ade80)'
              : 'white',
          }}
        />
      </div>
    </div>
  );
}
