import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { Task, STATUSES } from '@/lib/supabase';
import { useAllUnreadCounts } from '@/hooks/useTaskMessages';
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
import { Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const PRIORITY_ORDER: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

export default function Dashboard() {
  const { tasks, isLoading, createTask, updateTask, deleteTask } = useTasks();
  const [filter, setFilter] = useState<{ status: string | null; area: string | null }>({ status: null, area: null });
  const [pillFilter, setPillFilter] = useState('todas');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [inviteTask, setInviteTask] = useState<Task | null>(null);

  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);
  const unreadCounts = useAllUnreadCounts(taskIds);

  const counts = useMemo(() => ({
    total: tasks.length,
    pendente: tasks.filter(t => t.status === 'pendente').length,
    emCurso: tasks.filter(t => t.status === 'em-curso').length,
    concluido: tasks.filter(t => t.status === 'concluido').length,
    bloqueado: tasks.filter(t => t.status === 'bloqueado').length,
  }), [tasks]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Sidebar filter
    if (filter.status) result = result.filter(t => t.status === filter.status);
    if (filter.area) result = result.filter(t => t.area === filter.area);

    // Pill filter
    if (pillFilter.startsWith('p:')) {
      result = result.filter(t => t.priority === pillFilter.slice(2));
    } else if (pillFilter.startsWith('a:')) {
      result = result.filter(t => t.area === pillFilter.slice(2));
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.responsavel?.toLowerCase().includes(q)
      );
    }

    // Sort: priority → deadline → created_at
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
  }, [tasks, filter, pillFilter, search]);

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
    <div className="min-h-screen bg-background">
      <AppSidebar filter={filter} setFilter={setFilter} counts={counts} />
      <MobileNav filter={filter} setFilter={setFilter} />

      <main className="md:ml-[220px] p-4 md:p-6 pb-20 md:pb-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h2 className="text-xl font-bold text-foreground">{pageTitle}</h2>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full sm:w-52 pl-8 pr-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border-hover transition-colors"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setEditTask(null); setModalOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Plus size={15} />
              Nova Tarefa
            </motion.button>
          </div>
        </div>

        {/* Stats */}
        <StatsCards total={counts.total} pendente={counts.pendente} emCurso={counts.emCurso} concluido={counts.concluido} />

        {/* Progress */}
        <div className="mt-4 mb-5">
          <ProgressBar total={counts.total} concluido={counts.concluido} />
        </div>

        {/* Filter pills */}
        <div className="mb-5">
          <FilterPills activeFilter={pillFilter} setActiveFilter={setPillFilter} />
        </div>

        {/* Task list */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">A carregar...</div>
        ) : filteredTasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <span className="text-5xl mb-4 block">📭</span>
            <h3 className="text-lg font-bold text-foreground">Nenhuma tarefa encontrada</h3>
            <p className="text-sm text-muted-foreground mt-1">Comece por criar a sua primeira tarefa.</p>
            <button
              onClick={() => { setEditTask(null); setModalOpen(true); }}
              className="mt-4 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Nova Tarefa
            </button>
          </motion.div>
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
    </div>
  );
}
