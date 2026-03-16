import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus } from 'lucide-react';
import { Task, AREAS, PRIORITIES, STATUSES, getStatusInfo, getAreaColor } from '@/lib/supabase';
import { useTaskMembers } from '@/hooks/useTaskMembers';
import { markTaskAsRead } from '@/hooks/useTaskMessages';
import InviteModal from './InviteModal';
import TaskChat from './TaskChat';

type Props = {
  task: Task | null;
  onClose: () => void;
  onUpdate: (updates: Partial<Task> & { id: string }) => void;
};

const AVATAR_COLORS = [
  '#60a5fa', '#f472b6', '#34d399', '#a78bfa', '#f59e0b',
  '#fb923c', '#38bdf8', '#4ade80', '#c084fc', '#ef4444',
];

function emailToColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

type Tab = 'chat' | 'detalhes';

export default function TaskDetailPanel({ task, onClose, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('detalhes');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<Partial<Task>>({});
  const [editingTitle, setEditingTitle] = useState(false);

  const { members } = useTaskMembers(task?.id ?? null);

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
      });
      // Mark as read when opened
      markTaskAsRead(task.id);
    }
  }, [task]);

  if (!task) return null;

  const statusInfo = getStatusInfo(form.status ?? task.status);
  const areaColor = getAreaColor(form.area ?? task.area);

  const handleFieldBlur = (field: keyof Task, value: string) => {
    if (value !== String((task as Record<string, unknown>)[field] ?? '')) {
      onUpdate({ id: task.id, [field]: value || null });
    }
  };

  const handleSelectChange = (field: keyof Task, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    onUpdate({ id: task.id, [field]: value });
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-border-hover transition-colors';

  const visibleMembers = members.slice(0, 3);
  const extraCount = members.length - 3;

  return (
    <>
      <AnimatePresence>
        {task && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.4)]"
              onClick={onClose}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 z-50 h-full w-full md:w-[480px] bg-card border-l border-border flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex-shrink-0 px-5 py-4 border-b border-border">
                <div className="flex items-start gap-3">
                  {/* Status badge */}
                  <button
                    onClick={() => {
                      const idx = STATUSES.findIndex(s => s.value === (form.status ?? task.status));
                      const next = STATUSES[(idx + 1) % STATUSES.length];
                      handleSelectChange('status', next.value);
                    }}
                    className="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-sm hover:scale-110 transition-transform"
                    style={{ color: statusInfo.color }}
                    title={`Estado: ${statusInfo.label}`}
                  >
                    {statusInfo.icon}
                  </button>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    {editingTitle ? (
                      <input
                        autoFocus
                        value={form.title ?? ''}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        onBlur={() => {
                          setEditingTitle(false);
                          if (form.title && form.title !== task.title) {
                            onUpdate({ id: task.id, title: form.title });
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            setEditingTitle(false);
                            if (form.title && form.title !== task.title) {
                              onUpdate({ id: task.id, title: form.title });
                            }
                          }
                          if (e.key === 'Escape') {
                            setEditingTitle(false);
                            setForm(f => ({ ...f, title: task.title }));
                          }
                        }}
                        className="w-full text-sm font-bold text-foreground bg-background border border-border rounded-lg px-2 py-1 focus:outline-none focus:border-border-hover"
                      />
                    ) : (
                      <h2
                        className="text-sm font-bold text-foreground cursor-pointer hover:text-muted-foreground transition-colors leading-snug"
                        onClick={() => setEditingTitle(true)}
                        title="Clica para editar"
                      >
                        {form.title ?? task.title}
                      </h2>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${statusInfo.color}22`, color: statusInfo.color }}
                      >
                        {statusInfo.label}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${areaColor}1a`,
                          color: areaColor,
                          border: `1px solid ${areaColor}40`,
                        }}
                      >
                        {AREAS.find(a => a.value === (form.area ?? task.area))?.label ?? form.area}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-surface-raised rounded-md transition-colors flex-shrink-0"
                  >
                    <X size={14} className="text-muted-foreground" />
                  </button>
                </div>

                {/* Members row */}
                <div className="flex items-center gap-2 mt-3 ml-8">
                  <div className="flex items-center">
                    {visibleMembers.map((m) => (
                      <div
                        key={m.id}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-card -ml-1 first:ml-0"
                        style={{ backgroundColor: emailToColor(m.email), zIndex: 0 }}
                        title={m.email}
                      >
                        {getInitials(m.email)}
                      </div>
                    ))}
                    {extraCount > 0 && (
                      <div className="w-6 h-6 rounded-full bg-surface-raised border-2 border-card flex items-center justify-center text-[9px] font-bold text-muted-foreground -ml-1">
                        +{extraCount}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setInviteOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <UserPlus size={12} />
                    Convidar
                  </button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex-shrink-0 flex border-b border-border">
                {(['chat', 'detalhes'] as Tab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      if (tab === 'chat') markTaskAsRead(task.id);
                    }}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                      activeTab === tab
                        ? 'text-foreground border-b-2 border-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'chat' ? '💬 Chat' : '📋 Detalhes'}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === 'chat' ? (
                  <TaskChat task={{ ...task, ...form } as Task} />
                ) : (
                  <div className="h-full overflow-y-auto p-5 space-y-4">
                    {/* Area + Priority */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                          Área
                        </label>
                        <select
                          value={form.area ?? task.area}
                          onChange={e => handleSelectChange('area', e.target.value)}
                          className={inputClass}
                        >
                          {AREAS.map(a => (
                            <option key={a.value} value={a.value}>{a.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                          Prioridade
                        </label>
                        <select
                          value={form.priority ?? task.priority}
                          onChange={e => handleSelectChange('priority', e.target.value)}
                          className={inputClass}
                        >
                          {PRIORITIES.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Status + Deadline */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                          Estado
                        </label>
                        <select
                          value={form.status ?? task.status}
                          onChange={e => handleSelectChange('status', e.target.value)}
                          className={inputClass}
                        >
                          {STATUSES.map(s => (
                            <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                          Prazo
                        </label>
                        <input
                          type="date"
                          value={form.deadline ?? ''}
                          onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                          onBlur={e => handleFieldBlur('deadline', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Responsavel */}
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                        Responsável
                      </label>
                      <input
                        value={form.responsavel ?? ''}
                        onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                        onBlur={e => handleFieldBlur('responsavel', e.target.value)}
                        placeholder="Nome do responsável"
                        className={inputClass}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                        Descrição
                      </label>
                      <textarea
                        rows={5}
                        value={form.description ?? ''}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        onBlur={e => handleFieldBlur('description', e.target.value)}
                        placeholder="Descrição da tarefa"
                        className={inputClass + ' resize-none'}
                      />
                    </div>

                    {/* Members section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Membros
                        </label>
                        <button
                          onClick={() => setInviteOpen(true)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <UserPlus size={11} />
                          Convidar
                        </button>
                      </div>
                      {members.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhum membro convidado.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {members.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-raised"
                            >
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                                style={{ backgroundColor: emailToColor(m.email) }}
                              >
                                {getInitials(m.email)}
                              </div>
                              <span className="text-[11px] text-foreground">{m.email.split('@')[0]}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        taskId={task.id}
      />
    </>
  );
}
