import { useState, useEffect } from 'react';
import { Task, AREAS, PRIORITIES, STATUSES } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  task?: Task | null;
};

const emptyForm = {
  title: '',
  description: '',
  area: 'outro',
  priority: 'media',
  status: 'pendente',
  deadline: '',
  responsavel: '',
  responsavel_email: '',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.4)',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: 'white',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

function StyledInput({ value, onChange, placeholder, type = 'text', required }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      style={{ ...inputStyle, colorScheme: 'dark' } as React.CSSProperties}
      onFocus={e => {
        e.target.style.borderColor = 'rgba(255,255,255,0.3)';
        e.target.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.05)';
      }}
      onBlur={e => {
        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
        e.target.style.boxShadow = 'none';
      }}
    />
  );
}

function StyledTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle, resize: 'none' } as React.CSSProperties}
      onFocus={e => {
        e.target.style.borderColor = 'rgba(255,255,255,0.3)';
        e.target.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.05)';
      }}
      onBlur={e => {
        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
        e.target.style.boxShadow = 'none';
      }}
    />
  );
}

function StyledSelect({ value, onChange, children }: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputStyle, colorScheme: 'dark', cursor: 'pointer' } as React.CSSProperties}
      onFocus={e => {
        (e.target as HTMLSelectElement).style.borderColor = 'rgba(255,255,255,0.3)';
        (e.target as HTMLSelectElement).style.boxShadow = '0 0 0 3px rgba(255,255,255,0.05)';
      }}
      onBlur={e => {
        (e.target as HTMLSelectElement).style.borderColor = 'rgba(255,255,255,0.1)';
        (e.target as HTMLSelectElement).style.boxShadow = 'none';
      }}
    >
      {children}
    </select>
  );
}

export default function TaskModal({ open, onClose, onSave, task }: Props) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        area: task.area,
        priority: task.priority,
        status: task.status,
        deadline: task.deadline ?? '',
        responsavel: task.responsavel ?? '',
        responsavel_email: task.responsavel_email ?? '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [task, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      description: form.description || null,
      deadline: form.deadline || null,
      responsavel: form.responsavel || null,
      responsavel_email: form.responsavel_email || null,
    } as Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#0f0f0f',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              boxShadow: '0 40px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
              padding: 32,
              backdropFilter: 'blur(40px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 style={{ color: 'white', fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
                  {task ? 'Editar Tarefa' : 'Nova Tarefa'}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 4 }}>
                  Preenche os detalhes abaixo
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title */}
              <div>
                <label style={labelStyle}>Título da Tarefa *</label>
                <StyledInput
                  required
                  value={form.title}
                  onChange={v => setForm({ ...form, title: v })}
                  placeholder="Título da tarefa"
                />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Descrição</label>
                <StyledTextarea
                  value={form.description}
                  onChange={v => setForm({ ...form, description: v })}
                  placeholder="Descrição opcional"
                  rows={3}
                />
              </div>

              {/* Area selector — visual pills */}
              <div>
                <label style={labelStyle}>Área</label>
                <div className="flex flex-wrap gap-2">
                  {AREAS.map(a => {
                    const selected = form.area === a.value;
                    return (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => setForm({ ...form, area: a.value })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 99,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          background: selected ? `${a.color}26` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${selected ? a.color : 'rgba(255,255,255,0.1)'}`,
                          color: selected ? a.color : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: a.color,
                            flexShrink: 0,
                          }}
                        />
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority selector — 3 large toggle buttons */}
              <div>
                <label style={labelStyle}>Prioridade</label>
                <div className="flex gap-2">
                  {PRIORITIES.map(p => {
                    const selected = form.priority === p.value;
                    const emoji = p.value === 'alta' ? '🔴' : p.value === 'media' ? '🟡' : '🟢';
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm({ ...form, priority: p.value })}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          background: selected ? `${p.color}22` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${selected ? p.color : 'rgba(255,255,255,0.1)'}`,
                          color: selected ? p.color : 'rgba(255,255,255,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <span>{emoji}</span>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Estado + Prazo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Estado</label>
                  <StyledSelect value={form.status} onChange={v => setForm({ ...form, status: v })}>
                    {STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                    ))}
                  </StyledSelect>
                </div>
                <div>
                  <label style={labelStyle}>Prazo</label>
                  <StyledInput
                    type="date"
                    value={form.deadline}
                    onChange={v => setForm({ ...form, deadline: v })}
                  />
                </div>
              </div>

              {/* Responsável + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Responsável</label>
                  <StyledInput
                    value={form.responsavel}
                    onChange={v => setForm({ ...form, responsavel: v })}
                    placeholder="Nome do responsável"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <StyledInput
                    type="email"
                    value={form.responsavel_email}
                    onChange={v => setForm({ ...form, responsavel_email: v })}
                    placeholder="email@the-100s.com"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    height: 44,
                    padding: '0 20px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.08)',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.13)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    height: 44,
                    padding: '0 24px',
                    borderRadius: 10,
                    background: 'white',
                    color: 'black',
                    fontSize: 14,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >
                  {task ? 'Guardar Alterações' : 'Adicionar Tarefa'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
