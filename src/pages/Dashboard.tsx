import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useMicrosoftCalendar } from '@/hooks/useMicrosoftCalendar';
import { Task, STATUSES } from '@/lib/supabase';
import { useAllUnreadCounts } from '@/hooks/useTaskMessages';
import { parseUTC } from '@/lib/graphApi';
import AppSidebar from '@/components/AppSidebar';
import MobileNav from '@/components/MobileNav';
import StatsCards from '@/components/StatsCards';
import ProgressBar from '@/components/ProgressBar';
import FilterPills from '@/components/FilterPills';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';
import DeleteDialog from '@/components/DeleteDialog';
import TaskDetailPanel from '@/components/TaskDetailPanel';
import InviteModal from '@/components/InviteModal';
import CountdownBanner from '@/components/CountdownBanner';
import KanbanView from '@/components/KanbanView';
import GlobalAIAssistant from '@/components/GlobalAIAssistant';
import { Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const PRIORITY_ORDER: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

export default function Dashboard() {
  const { tasks, isLoading, createTask, updateTask, deleteTask } = useTasks();
  const { isConnected, todayMeetings } = useMicrosoftCalendar();
  const [filter, setFilter] = useState<{ status: string | null; area: string | null; responsavel: string | null }>({ status: null, area: null, responsavel: null });
  const [pillFilter, setPillFilter] = useState('todas');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('lista');
  const [hideCompleted, setHideCompleted] = useState(() => localStorage.getItem('hideCompleted') === 'true');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [inviteTask, setInviteTask] = useState<Task | null>(null);

  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);
  const unreadCounts = useAllUnreadCounts(taskIds);

  const uniqueResponsaveis = useMemo(() => {
    const set = new Set(tasks.map(t => t.responsavel).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [tasks]);

  const counts = useMemo(() => ({
    total: tasks.length,
    pendente: tasks.filter(t => t.status === 'pendente').length,
    emCurso: tasks.filter(t => t.status === 'em-curso').length,
    concluido: tasks.filter(t => t.status === 'concluido').length,
    bloqueado: tasks.filter(t => t.status === 'bloqueado').length,
  }), [tasks]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (filter.status) result = result.filter(t => t.status === filter.status);
    if (filter.area) result = result.filter(t => t.area === filter.area);
    if (pillFilter.startsWith('p:')) {
      result = result.filter(t => t.priority === pillFilter.slice(2));
    } else if (pillFilter.startsWith('a:')) {
      result = result.filter(t => t.area === pillFilter.slice(2));
    }
    if (filter.responsavel) result = result.filter(t => t.responsavel === filter.responsavel);
    if (hideCompleted) result = result.filter(t => t.status !== 'concluido');
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.responsavel?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 1;
      const pb = PRIORITY_ORDER[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return b.created_at.localeCompare(a.created_at);
    });
    return result;
  }, [tasks, filter, pillFilter, search, hideCompleted]);

  const pageTitle = filter.area
    ? tasks.find(t => t.area === filter.area)
      ? `${filter.area.charAt(0).toUpperCase() + filter.area.slice(1)}`
      : 'Todas as Tarefas'
    : filter.status
      ? STATUSES.find(s => s.value === filter.status)?.label ?? 'Todas as Tarefas'
      : 'Todas as Tarefas';

  const handleStatusCycle = (task: Task) => {
    const idx = STATUSES.findIndex(s => s.value === task.status);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    updateTask.mutate({ id: task.id, status: next.value });
  };

  const handleSave = (data: any) => {
    if (editTask) {
      updateTask.mutate({ id: editTask.id, ...data });
    } else {
      createTask.mutate(data);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#080808' }}>
      <AppSidebar filter={filter} setFilter={setFilter} counts={counts} />
      <MobileNav filter={filter} setFilter={setFilter} />

      <div className="md:ml-[240px]">
        {/* Top bar */}
        <div
          className="flex items-center justify-between"
          style={{
            height: 60,
            padding: '0 28px',
            background: '#080808',
            borderBottom: '1px solid var(--glass-divider)',
          }}
        >
          <h2
            className="text-white"
            style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            {pageTitle}
          </h2>
          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar..."
                className="outline-none transition-all duration-200"
                style={{
                  width: 220,
                  paddingLeft: 32,
                  paddingRight: 12,
                  paddingTop: 8,
                  paddingBottom: 8,
                  borderRadius: 99,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: 13,
                  color: 'white',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.25)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.06)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* View toggle */}
            <div className="flex overflow-hidden" style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => setViewMode('lista')}
                className="transition-all duration-150"
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: viewMode === 'lista' ? 'white' : 'transparent',
                  color: viewMode === 'lista' ? 'black' : 'rgba(255,255,255,0.5)',
                }}
              >
                ☰ Lista
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className="transition-all duration-150"
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: viewMode === 'kanban' ? 'white' : 'transparent',
                  color: viewMode === 'kanban' ? 'black' : 'rgba(255,255,255,0.5)',
                }}
              >
                ⬜ Kanban
              </button>
            </div>

            {/* Hide completed toggle */}
            <label className="hidden lg:flex items-center gap-1.5 cursor-pointer whitespace-nowrap" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={() => { const v = !hideCompleted; setHideCompleted(v); localStorage.setItem('hideCompleted', String(v)); }}
                className="sr-only"
              />
              <div
                className="w-7 h-4 rounded-full transition-colors relative"
                style={{ background: hideCompleted ? 'white' : 'rgba(255,255,255,0.15)' }}
              >
                <div
                  className="w-3 h-3 rounded-full absolute top-0.5 transition-transform"
                  style={{
                    background: hideCompleted ? 'black' : 'rgba(255,255,255,0.6)',
                    transform: hideCompleted ? 'translateX(14px)' : 'translateX(2px)',
                  }}
                />
              </div>
              Esconder concluídas
            </label>

            {/* Claude button */}
            <button
              onClick={() => window.open('https://claude.ai', '_blank')}
              title="Abrir assistente Claude"
              className="flex items-center gap-1.5 whitespace-nowrap transition-all duration-150 active:scale-[0.98]"
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                background: 'transparent',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid white',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              🤖 Abrir Claude
            </button>

            {/* New task button */}
            <button
              onClick={() => { setEditTask(null); setModalOpen(true); }}
              className="flex items-center gap-1.5 whitespace-nowrap transition-all duration-150 active:scale-[0.98]"
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: 'white',
                color: 'black',
                fontSize: 13,
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              <Plus size={15} />
              Nova Tarefa
            </button>
          </div>
        </div>

        {/* Countdown banner */}
        <CountdownBanner />

        {/* Content area */}
        <main style={{ padding: '24px 28px', paddingBottom: 80 }}>
          {/* Stats */}
          <StatsCards total={counts.total} pendente={counts.pendente} emCurso={counts.emCurso} concluido={counts.concluido} />

          {/* Today's meetings strip */}
          {isConnected && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Hoje</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                  {new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}
                </p>
              </div>
              {todayMeetings.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Sem reuniões hoje</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {todayMeetings.map((meeting) => {
                    const startUTC = parseUTC(meeting.start.dateTime);
                    const startTime = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hour12: false }).format(startUTC);
                    const now = Date.now();
                    const startMs = startUTC.getTime();
                    const isSoon = startMs > now && startMs - now <= 15 * 60 * 1000;
                    const url = meeting.onlineMeeting?.joinUrl || meeting.webLink;
                    return (
                      <a
                        key={meeting.id}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 whitespace-nowrap transition-colors flex-shrink-0"
                        style={{
                          padding: '6px 12px',
                          borderRadius: 10,
                          fontSize: 12,
                          color: 'white',
                          background: 'rgba(255,255,255,0.03)',
                          border: isSoon ? '1px solid rgba(96,165,250,0.5)' : '1px solid var(--glass-border)',
                        }}
                      >
                        {meeting.onlineMeeting && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#60a5fa' }} />
                        )}
                        <span>{startTime} {meeting.subject}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          <div className="mt-4 mb-5">
            <ProgressBar total={counts.total} concluido={counts.concluido} />
          </div>

          {/* Filter pills */}
          <div className="mb-3">
            <FilterPills activeFilter={pillFilter} setActiveFilter={setPillFilter} />
          </div>

          {/* Responsável filter */}
          <div className="mb-5 flex items-center gap-2">
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>👤 Responsável:</span>
            <select
              value={filter.responsavel ?? ''}
              onChange={e => setFilter(f => ({ ...f, responsavel: e.target.value || null }))}
              className="outline-none"
              style={{
                fontSize: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '4px 8px',
                color: 'white',
              }}
            >
              <option value="">Todos</option>
              {uniqueResponsaveis.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Task list / kanban */}
          {isLoading ? (
            <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>A carregar...</div>
          ) : filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <span className="text-5xl mb-4 block">📭</span>
              <h3 className="text-lg font-bold text-white">Nenhuma tarefa encontrada</h3>
              <p className="mt-1" style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Comece por criar a sua primeira tarefa.</p>
              <button
                onClick={() => { setEditTask(null); setModalOpen(true); }}
                className="mt-4 transition-all duration-150 active:scale-[0.98]"
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  background: 'white',
                  color: 'black',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Nova Tarefa
              </button>
            </motion.div>
          ) : viewMode === 'kanban' ? (
            <KanbanView
              tasks={filteredTasks}
              onEdit={(t) => { setEditTask(t); setModalOpen(true); }}
              onDelete={setDeleteTarget}
              onStatusCycle={handleStatusCycle}
              onOpenDetail={setDetailTask}
              onInvite={setInviteTask}
              unreadCounts={unreadCounts}
            />
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={i}
                  onEdit={(t) => { setEditTask(t); setModalOpen(true); }}
                  onDelete={setDeleteTarget}
                  onStatusCycle={handleStatusCycle}
                  onOpenDetail={setDetailTask}
                  onInvite={setInviteTask}
                  unreadCount={unreadCounts[task.id]}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTask(null); }}
        onSave={handleSave}
        task={editTask}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteTask.mutate(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title={deleteTarget?.title ?? ''}
      />

      <TaskDetailPanel
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onUpdate={(updates) => updateTask.mutate(updates)}
      />

      {inviteTask && (
        <InviteModal
          open={!!inviteTask}
          onClose={() => setInviteTask(null)}
          taskId={inviteTask.id}
        />
      )}

      <GlobalAIAssistant tasks={tasks} />
    </div>
  );
}
