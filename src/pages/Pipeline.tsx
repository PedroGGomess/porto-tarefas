import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { Task, PRIORITIES, AREAS, getAreaColor, getPriorityColor, getStatusInfo, isTaskOverdue, isDeadlineApproaching, getPriorityLabel } from '@/lib/supabase';
import AppSidebar from '@/components/AppSidebar';
import MobileNav from '@/components/MobileNav';
import { AlertTriangle, Clock, CheckCircle2, ArrowRight, Calendar, Link2, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRIORITY_ORDER: Record<string, number> = { critico: 0, alta: 1, media: 2, baixa: 3 };

type PipelineSection = 'overdue' | 'today' | 'this_week' | 'upcoming' | 'no_deadline';

export default function Pipeline() {
  const { tasks, updateTask } = useTasks();
  const [filter, setFilter] = useState<{ status: string | null; area: string | null; responsavel: string | null }>({ status: null, area: null, responsavel: null });
  const [expandedSections, setExpandedSections] = useState<Set<PipelineSection>>(new Set(['overdue', 'today', 'this_week', 'upcoming']));
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const counts = useMemo(() => ({
    total: tasks.length,
    pendente: tasks.filter(t => t.status === 'pendente').length,
    emCurso: tasks.filter(t => t.status === 'em-curso').length,
    concluido: tasks.filter(t => t.status === 'concluido').length,
    bloqueado: tasks.filter(t => t.status === 'bloqueado').length,
  }), [tasks]);

  // Active (non-completed) tasks only
  const activeTasks = useMemo(() => {
    let result = tasks.filter(t => t.status !== 'concluido');
    if (selectedPriority) result = result.filter(t => t.priority === selectedPriority);
    if (selectedArea) result = result.filter(t => t.area === selectedArea);
    return result;
  }, [tasks, selectedPriority, selectedArea]);

  // Organize tasks into pipeline sections
  const pipeline = useMemo(() => {
    const now = new Date();
    const today = new Date(now.toDateString());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

    const sections: Record<PipelineSection, Task[]> = {
      overdue: [],
      today: [],
      this_week: [],
      upcoming: [],
      no_deadline: [],
    };

    activeTasks.forEach(task => {
      if (!task.deadline) {
        sections.no_deadline.push(task);
        return;
      }

      const deadline = new Date(task.deadline);
      if (deadline < today) {
        sections.overdue.push(task);
      } else if (deadline.toDateString() === today.toDateString()) {
        sections.today.push(task);
      } else if (deadline <= endOfWeek) {
        sections.this_week.push(task);
      } else {
        sections.upcoming.push(task);
      }
    });

    // Sort each section by priority then deadline
    Object.values(sections).forEach(arr => {
      arr.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 2;
        const pb = PRIORITY_ORDER[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
        return 0;
      });
    });

    return sections;
  }, [activeTasks]);

  const sectionConfig: { key: PipelineSection; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
    { key: 'overdue', label: 'Em Atraso', icon: <AlertTriangle size={14} />, color: '#ef4444', bgColor: 'rgba(239,68,68,0.08)' },
    { key: 'today', label: 'Hoje', icon: <Clock size={14} />, color: '#60a5fa', bgColor: 'rgba(96,165,250,0.08)' },
    { key: 'this_week', label: 'Esta Semana', icon: <Calendar size={14} />, color: '#f59e0b', bgColor: 'rgba(245,158,11,0.08)' },
    { key: 'upcoming', label: 'Próximas', icon: <ArrowRight size={14} />, color: '#22c55e', bgColor: 'rgba(34,197,94,0.08)' },
    { key: 'no_deadline', label: 'Sem Deadline', icon: <Clock size={14} />, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.08)' },
  ];

  const toggleSection = (section: PipelineSection) => {
    const next = new Set(expandedSections);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    setExpandedSections(next);
  };

  // Priority summary cards
  const prioritySummary = useMemo(() => {
    return PRIORITIES.map(p => ({
      ...p,
      count: activeTasks.filter(t => t.priority === p.value).length,
      overdue: activeTasks.filter(t => t.priority === p.value && isTaskOverdue(t)).length,
    }));
  }, [activeTasks]);

  return (
    <div className="min-h-screen" style={{ background: '#080808' }}>
      <AppSidebar filter={filter} setFilter={setFilter} counts={counts} />
      <MobileNav filter={filter} setFilter={setFilter} />

      <div className="md:ml-[240px]">
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            height: 60,
            padding: '0 28px',
            background: '#080808',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <h2 className="text-white" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Pipeline
          </h2>

          <div className="flex items-center gap-2">
            <select
              value={selectedArea ?? ''}
              onChange={e => setSelectedArea(e.target.value || null)}
              style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 8px', color: 'white' }}
            >
              <option value="">Todas as áreas</option>
              {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>

        <main style={{ padding: '24px 28px', paddingBottom: 80 }}>
          {/* Priority summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {prioritySummary.map(p => (
              <button
                key={p.value}
                onClick={() => setSelectedPriority(selectedPriority === p.value ? null : p.value)}
                className="text-left transition-all duration-150"
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: selectedPriority === p.value ? `${p.color}15` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selectedPriority === p.value ? `${p.color}40` : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: 11, fontWeight: 600, color: p.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {p.label}
                  </span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span style={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1 }}>{p.count}</span>
                  {p.overdue > 0 && (
                    <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                      {p.overdue} atrasada{p.overdue > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Pipeline sections */}
          <div className="space-y-3">
            {sectionConfig.map(section => {
              const sectionTasks = pipeline[section.key];
              const isExpanded = expandedSections.has(section.key);

              if (sectionTasks.length === 0) return null;

              return (
                <div key={section.key} style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(section.key)}
                    className="w-full flex items-center justify-between transition-colors hover:bg-white/[0.02]"
                    style={{
                      padding: '12px 16px',
                      background: section.bgColor,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: section.color }}>{section.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: section.color }}>{section.label}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '1px 8px',
                        borderRadius: 10,
                        background: `${section.color}20`,
                        color: section.color,
                      }}>
                        {sectionTasks.length}
                      </span>
                    </div>
                    {isExpanded ? <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                  </button>

                  {/* Section tasks */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {sectionTasks.map((task, i) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
                            style={{
                              padding: '10px 16px',
                              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                            }}
                          >
                            {/* Priority indicator */}
                            <div style={{ width: 4, height: 24, borderRadius: 2, background: getPriorityColor(task.priority), flexShrink: 0 }} />

                            {/* Status icon */}
                            <button
                              onClick={() => {
                                const statusOrder = ['pendente', 'em-curso', 'aguarda-decisao', 'aguarda-resposta', 'bloqueado', 'concluido'];
                                const idx = statusOrder.indexOf(task.status);
                                const next = statusOrder[(idx + 1) % statusOrder.length];
                                updateTask.mutate({ id: task.id, status: next });
                              }}
                              style={{ color: getStatusInfo(task.status).color, fontSize: 14, flexShrink: 0 }}
                              title={getStatusInfo(task.status).label}
                            >
                              {getStatusInfo(task.status).icon}
                            </button>

                            {/* Task info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {task.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span style={{ fontSize: 10, color: getAreaColor(task.area), fontWeight: 600 }}>
                                  {AREAS.find(a => a.value === task.area)?.label}
                                </span>
                                {task.responsavel && (
                                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                                    {task.responsavel}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Deadline */}
                            {task.deadline && (
                              <span style={{
                                fontSize: 11,
                                fontWeight: 500,
                                color: isTaskOverdue(task) ? '#ef4444' : isDeadlineApproaching(task) ? '#f59e0b' : 'rgba(255,255,255,0.3)',
                                flexShrink: 0,
                              }}>
                                {new Date(task.deadline).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                              </span>
                            )}

                            {/* Status badge */}
                            <span style={{
                              fontSize: 10,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: `${getStatusInfo(task.status).color}15`,
                              color: getStatusInfo(task.status).color,
                              fontWeight: 600,
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                            }}>
                              {getStatusInfo(task.status).label}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Completed tasks summary */}
          {tasks.filter(t => t.status === 'concluido').length > 0 && (
            <div className="mt-6" style={{ padding: '16px', borderRadius: 12, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>
                  {tasks.filter(t => t.status === 'concluido').length} tarefa{tasks.filter(t => t.status === 'concluido').length > 1 ? 's' : ''} concluída{tasks.filter(t => t.status === 'concluido').length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
