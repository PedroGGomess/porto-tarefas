import { motion } from 'framer-motion';

export default function ProgressBar({ total, concluido }: { total: number; concluido: number }) {
  const pct = total > 0 ? Math.round((concluido / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4">
      <span className="text-xs text-muted-foreground whitespace-nowrap">Progresso Geral</span>
      <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: pct >= 100
              ? 'linear-gradient(90deg, #22c55e, #4ade80)'
              : 'linear-gradient(90deg, #ffffff, #cccccc)',
          }}
        />
      </div>
      <span className="text-xs text-foreground font-semibold min-w-[32px] text-right">{pct}%</span>
    </div>
  );
}
