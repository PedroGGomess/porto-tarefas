import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Task } from '@/lib/supabase';

type Props = {
  open: boolean;
  onClose: () => void;
  task: Task;
};

const DURATION_OPTIONS = [
  { value: '15', label: '15 minutos' },
  { value: '30', label: '30 minutos' },
  { value: '45', label: '45 minutos' },
  { value: '60', label: '1 hora' },
  { value: '90', label: '1 hora 30 minutos' },
  { value: '120', label: '2 horas' },
];

function formatDatePT(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function generateMeetingEmailBody(task: Task, form: { title: string; date: string; time: string; duration: string; notes: string; location: string }): string {
  const durationLabel = DURATION_OPTIONS.find(d => d.value === form.duration)?.label ?? `${form.duration} minutos`;
  const datePT = formatDatePT(form.date);
  return `Olá,\n\nFicou agendada uma reunião no âmbito da tarefa "${task.title}".\n\n📅 Data: ${datePT}\n🕐 Hora: ${form.time} (${durationLabel})\n📍 Local: ${form.location || 'A definir'}\n\nAgenda:\n${form.notes || 'A definir'}\n\nCumprimentos,\nThe 100's`;
}

export default function MeetingModal({ open, onClose, task }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: `Reunião — ${task.title}`,
    date: today,
    time: '09:00',
    duration: '30',
    notes: '',
    location: '',
  });

  const handleSendEmail = () => {
    const datePT = formatDatePT(form.date);
    const subject = `${task.title} — Reunião ${datePT}`;
    const body = generateMeetingEmailBody(task, form);
    const mailto = `mailto:${task.responsavel_email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-border-hover transition-colors';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(0,0,0,0.7)] backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-[460px] max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-foreground">📅 Agendar Reunião</h2>
              <button onClick={onClose} className="p-1 hover:bg-surface-raised rounded-md transition-colors">
                <X size={15} className="text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-5 truncate">{task.title}</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Título da reunião</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Data</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Hora início</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Duração</label>
                <select
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  className={inputClass}
                >
                  {DURATION_OPTIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Localização</label>
                <input
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Teams / Presencial / Rua Sá da Bandeira 150"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Notas / agenda <span className="font-normal">(opcional)</span></label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Pontos a discutir..."
                  className={inputClass + ' resize-none'}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSendEmail}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  📧 Enviar convite por email
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:bg-surface-raised transition-colors"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
