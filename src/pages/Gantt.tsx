import { useState, useMemo, useRef, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useAllDependencies } from '@/hooks/useTaskDependencies';
import { Task, AREAS, PRIORITIES, getAreaColor, getPriorityColor, getStatusInfo, isTaskOverdue } from '@/lib/supabase';
import AppSidebar from '@/components/AppSidebar';
import MobileNav from '@/components/MobileNav';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Filter, Calendar, AlertTriangle, Link2 } from 'lucide-react';
import { motion } from 'framer-motion';

type ViewScale = 'day' | 'week' | 'month';

const PRIORITY_ORDER: Record<string, number> = { critico: 0, alta: 1, media: 2, baixa: 3 };

export default function Gantt() {
  const { tasks } = useTasks();
  const allDepsQuery = useAllDependencies();
  const allDeps = allDepsQuery.data ?? [];

  const [viewScale, setViewScale] = useState<ViewScale>('week');
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<{ status: string | null; area: string | null; responsavel: string | null }>({ status: null, area: null, responsavel: null });

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => !t.parent_task_id); // Only top-level tasks
    if (filterArea) result = result.filter(t => t.area === filterArea);
    if (filterPriority) result = result.filter(t => t.priority === filterPriority);
    if (showOverdueOnly) result = result.filter(t => isTaskOverdue(t));

    // Sort by area, then priority, then deadline
    result.sort((a, b) => {
      if (a.area !== b.area) return a.area.localeCompare(b.area);
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });

    return result;
  }, [tasks, filterArea, filterPriority, showOverdueOnly]);

  // Calculate date range for the chart
  const { startDate, endDate, totalDays } = useMemo(() => {
    const now = new Date();
    let minDate = new Date(now);
    let maxDate = new Date(now);
    maxDate.setMonth(maxDate.getMonth() + 3);

    filteredTasks.forEach(t => {
      if (t.start_date) {
        const d = new Date(t.start_date);
        if (d < minDate) minDate = new Date(d);
      }
      if (t.deadline) {
        const d = new Date(t.deadline);
        if (d > maxDate) maxDate = new Date(d);
      }
    });

    // Add 2 weeks buffer
    minDate.setDate(minDate.getDate() - 14);
    maxDate.setDate(maxDate.getDate() + 14);

    // Align to Monday
    const day = minDate.getDay();
    minDate.setDate(minDate.getDate() - (day === 0 ? 6 : day - 1));

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

    return { startDate: minDate, endDate: maxDate, totalDays };
  }, [filteredTasks]);

  // Day width based on view scale
  const dayWidth = viewScale === 'day' ? 40 : viewScale === 'week' ? 16 : 5;
  const rowHeight = 36;
  const headerHeight = 60;
  const sidebarWidth = 320;

  // Generate date columns
  const dateColumns = useMemo(() => {
    const cols: { date: Date; label: string; isWeekend: boolean; isToday: boolean; isMonthStart: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isToday = d.toDateString() === today.toDateString();
      const isMonthStart = d.getDate() === 1;

      let label = '';
      if (viewScale === 'day') {
        label = d.getDate().toString();
      } else if (viewScale === 'week' && d.getDay() === 1) {
        label = `${d.getDate()}/${d.getMonth() + 1}`;
      } else if (viewScale === 'month' && isMonthStart) {
        label = new Intl.DateTimeFormat('pt-PT', { month: 'short' }).format(d);
      }

      cols.push({ date: d, label, isWeekend, isToday, isMonthStart });
    }
    return cols;
  }, [startDate, totalDays, viewScale]);

  // Calculate bar position for a task
  const getBarStyle = (task: Task) => {
    const taskStart = task.start_date ? new Date(task.start_date) : task.created_at ? new Date(task.created_at) : new Date();
    const taskEnd = task.deadline ? new Date(task.deadline) : new Date(taskStart);
    if (!task.deadline) taskEnd.setDate(taskEnd.getDate() + 7); // Default 1 week

    const startOffset = Math.max(0, (taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24));

    return {
      left: startOffset * dayWidth,
      width: Math.max(duration * dayWidth, 20),
    };
  };

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const today = new Date();
      const daysFromStart = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const scrollTo = Math.max(0, daysFromStart * dayWidth - 200);
      scrollRef.current.scrollLeft = scrollTo;
    }
  }, [startDate, dayWidth]);

  // Group tasks by area
  const tasksByArea = useMemo(() => {
    const groups: { area: string; label: string; color: string; tasks: Task[] }[] = [];
    const areaMap = new Map<string, Task[]>();

    filteredTasks.forEach(t => {
      if (!areaMap.has(t.area)) areaMap.set(t.area, []);
      areaMap.get(t.area)!.push(t);
    });

    areaMap.forEach((tasks, area) => {
      const areaInfo = AREAS.find(a => a.value === area);
      groups.push({
        area,
        label: areaInfo?.label ?? area,
        color: areaInfo?.color ?? '#94a3b8',
        tasks,
      });
    });

    return groups;
  }, [filteredTasks]);

  const todayOffset = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return ((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
  }, [startDate, dayWidth]);

  return (
    <div className="min-h-screen" style={{ background: '#080808' }}>
      <AppSidebar filter={filter} setFilter={setFilter} counts={{ total: tasks.length, pendente: 0, emCurso: 0, concluido: 0, bloqueado: 0 }} />
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
          <div className="flex items-center gap-3">
            <Calendar size={18} style={{ color: 'rgba(255,255,255,0.5)' }} />
            <h2 className="text-white" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Cronograma
            </h2>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)' }}>
              {filteredTasks.length} tarefas
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View scale */}
            <div className="flex overflow-hidden" style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['day', 'week', 'month'] as ViewScale[]).map(scale => (
                <button
                  key={scale}
                  onClick={() => setViewScale(scale)}
                  className="transition-all duration-150"
                  style={{
                    padding: '5px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    background: viewScale === scale ? 'white' : 'transparent',
                    color: viewScale === scale ? 'black' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {scale === 'day' ? 'Dia' : scale === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>

            {/* Area filter */}
            <select
              value={filterArea ?? ''}
              onChange={e => setFilterArea(e.target.value || null)}
              style={{
                fontSize: 11,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '5px 8px',
                color: 'white',
              }}
            >
              <option value="">Todas as áreas</option>
              {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>

            {/* Priority filter */}
            <select
              value={filterPriority ?? ''}
              onChange={e => setFilterPriority(e.target.value || null)}
              style={{
                fontSize: 11,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '5px 8px',
                color: 'white',
              }}
            >
              <option value="">Todas as prioridades</option>
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>

            {/* Overdue toggle */}
            <button
              onClick={() => setShowOverdueOnly(!showOverdueOnly)}
              className="flex items-center gap-1 transition-all"
              style={{
                padding: '5px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 8,
                background: showOverdueOnly ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${showOverdueOnly ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: showOverdueOnly ? '#ef4444' : 'rgba(255,255,255,0.5)',
              }}
            >
              <AlertTriangle size={12} />
              Atrasadas
            </button>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="flex" style={{ height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
          {/* Left sidebar - task names */}
          <div style={{ width: sidebarWidth, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', overflow: 'auto' }}>
            {/* Header */}
            <div
              style={{
                height: headerHeight,
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tarefa
              </span>
            </div>

            {/* Task rows */}
            {tasksByArea.map(group => (
              <div key={group.area}>
                {/* Area header */}
                <div
                  style={{
                    height: 28,
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: group.color }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {group.label}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                    ({group.tasks.length})
                  </span>
                </div>

                {group.tasks.map(task => {
                  const overdue = isTaskOverdue(task);
                  const statusInfo = getStatusInfo(task.status);
                  return (
                    <div
                      key={task.id}
                      style={{
                        height: rowHeight,
                        padding: '0 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                      }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <span style={{ color: statusInfo.color, fontSize: 12 }}>{statusInfo.icon}</span>
                      <span
                        style={{
                          fontSize: 12,
                          color: overdue ? '#ef4444' : 'rgba(255,255,255,0.7)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                        title={task.title}
                      >
                        {task.title}
                      </span>
                      {overdue && <AlertTriangle size={12} style={{ color: '#ef4444', flexShrink: 0 }} />}
                      <span
                        style={{
                          fontSize: 9,
                          padding: '1px 5px',
                          borderRadius: 4,
                          background: `${getPriorityColor(task.priority)}20`,
                          color: getPriorityColor(task.priority),
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {task.priority.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Right side - timeline */}
          <div ref={scrollRef} style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ width: totalDays * dayWidth, minHeight: '100%', position: 'relative' }}>
              {/* Date headers */}
              <div style={{ height: headerHeight, display: 'flex', position: 'sticky', top: 0, background: '#080808', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {dateColumns.map((col, i) => (
                  <div
                    key={i}
                    style={{
                      width: dayWidth,
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRight: col.isMonthStart ? '1px solid rgba(255,255,255,0.1)' : 'none',
                      background: col.isToday ? 'rgba(96,165,250,0.1)' : col.isWeekend ? 'rgba(255,255,255,0.015)' : 'transparent',
                    }}
                  >
                    {col.label && (
                      <span style={{
                        fontSize: viewScale === 'month' ? 11 : 9,
                        fontWeight: col.isToday ? 700 : 500,
                        color: col.isToday ? '#60a5fa' : 'rgba(255,255,255,0.35)',
                      }}>
                        {col.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Task bars */}
              <div style={{ position: 'relative' }}>
                {/* Today line */}
                <div
                  style={{
                    position: 'absolute',
                    left: todayOffset,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: '#60a5fa',
                    zIndex: 5,
                    opacity: 0.6,
                  }}
                />

                {/* Weekend stripes */}
                {dateColumns.map((col, i) => col.isWeekend ? (
                  <div
                    key={`weekend-${i}`}
                    style={{
                      position: 'absolute',
                      left: i * dayWidth,
                      top: 0,
                      width: dayWidth,
                      height: '100%',
                      background: 'rgba(255,255,255,0.015)',
                    }}
                  />
                ) : null)}

                {/* Render task bars grouped by area */}
                {(() => {
                  let rowIndex = 0;
                  return tasksByArea.map(group => (
                    <div key={group.area}>
                      {/* Area header spacer */}
                      <div style={{ height: 28 }} />
                      {(() => { rowIndex++; return null; })()}

                      {group.tasks.map(task => {
                        const bar = getBarStyle(task);
                        const statusInfo = getStatusInfo(task.status);
                        const overdue = isTaskOverdue(task);
                        const progress = task.status === 'concluido' ? 100 : task.status === 'em-curso' ? 50 : 0;

                        return (
                          <div key={task.id} style={{ height: rowHeight, position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            {/* Task bar */}
                            <motion.div
                              initial={{ opacity: 0, scaleX: 0 }}
                              animate={{ opacity: 1, scaleX: 1 }}
                              transition={{ duration: 0.3, ease: 'easeOut' }}
                              style={{
                                position: 'absolute',
                                left: bar.left,
                                top: 6,
                                width: bar.width,
                                height: rowHeight - 12,
                                borderRadius: 6,
                                background: overdue
                                  ? 'rgba(239,68,68,0.15)'
                                  : `${getAreaColor(task.area)}15`,
                                border: `1px solid ${overdue ? 'rgba(239,68,68,0.3)' : `${getAreaColor(task.area)}30`}`,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transformOrigin: 'left center',
                              }}
                              className="hover:brightness-125 transition-all"
                              title={`${task.title}\n${task.deadline ? `Deadline: ${task.deadline}` : 'Sem deadline'}\nStatus: ${statusInfo.label}`}
                            >
                              {/* Progress fill */}
                              <div
                                style={{
                                  height: '100%',
                                  width: `${progress}%`,
                                  background: overdue
                                    ? 'rgba(239,68,68,0.3)'
                                    : `${getAreaColor(task.area)}40`,
                                  borderRadius: 5,
                                  transition: 'width 0.3s ease',
                                }}
                              />
                              {/* Bar label */}
                              {bar.width > 60 && (
                                <span
                                  style={{
                                    position: 'absolute',
                                    left: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: overdue ? '#ef4444' : 'rgba(255,255,255,0.6)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: bar.width - 16,
                                  }}
                                >
                                  {task.title}
                                </span>
                              )}
                              {/* Milestone diamond */}
                              {task.is_milestone && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: -4,
                                    top: '50%',
                                    transform: 'translateY(-50%) rotate(45deg)',
                                    width: 8,
                                    height: 8,
                                    background: getAreaColor(task.area),
                                  }}
                                />
                              )}
                            </motion.div>

                            {/* Deadline marker */}
                            {task.deadline && (
                              <div
                                style={{
                                  position: 'absolute',
                                  left: bar.left + bar.width - 1,
                                  top: 4,
                                  width: 2,
                                  height: rowHeight - 8,
                                  background: overdue ? '#ef4444' : getAreaColor(task.area),
                                  borderRadius: 1,
                                  opacity: 0.5,
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}

                {/* Dependency arrows */}
                <svg
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 4,
                  }}
                >
                  {allDeps.map(dep => {
                    const fromTask = filteredTasks.find(t => t.id === dep.depends_on_task_id);
                    const toTask = filteredTasks.find(t => t.id === dep.task_id);
                    if (!fromTask || !toTask) return null;

                    const fromBar = getBarStyle(fromTask);
                    const toBar = getBarStyle(toTask);
                    const fromIdx = filteredTasks.indexOf(fromTask);
                    const toIdx = filteredTasks.indexOf(toTask);

                    // Account for area headers
                    let fromY = 0, toY = 0;
                    let areaCount = 0;
                    tasksByArea.forEach(group => {
                      areaCount++;
                      group.tasks.forEach((t, i) => {
                        if (t.id === fromTask.id) fromY = (areaCount * 28) + ((i + areaCount - 1) * rowHeight) + rowHeight / 2;
                        if (t.id === toTask.id) toY = (areaCount * 28) + ((i + areaCount - 1) * rowHeight) + rowHeight / 2;
                      });
                    });

                    if (fromY === 0 || toY === 0) return null;

                    const x1 = fromBar.left + fromBar.width;
                    const x2 = toBar.left;

                    return (
                      <g key={dep.id}>
                        <path
                          d={`M ${x1} ${fromY} C ${x1 + 20} ${fromY}, ${x2 - 20} ${toY}, ${x2} ${toY}`}
                          fill="none"
                          stroke={dep.is_resolved ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}
                          strokeWidth={1.5}
                          strokeDasharray={dep.is_resolved ? 'none' : '4 3'}
                          markerEnd="url(#arrowhead)"
                        />
                      </g>
                    );
                  })}
                  <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.3)" />
                    </marker>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
