import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
};

export default function DeleteDialog({ open, onClose, onConfirm, title }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.7)] backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card border border-border rounded-2xl p-7 w-full max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-4xl">🗑️</span>
            <h3 className="text-lg font-bold text-foreground mt-3">Eliminar tarefa?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              "{title}" será eliminada permanentemente.
            </p>
            <div className="flex gap-2 justify-center mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:bg-surface-raised transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="px-5 py-2 rounded-lg bg-destructive text-foreground text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
