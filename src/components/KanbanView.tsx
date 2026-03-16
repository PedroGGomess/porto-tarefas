// Note: Drag-and-drop between columns is planned for a future iteration.
// Currently, status changes are done by clicking the status icon on each card.
import { Task, STATUSES, getAreaColor, getAreaLabel, getPriorityColor, getStatusInfo } from '@/lib/supabase';
import { format, isPast, parseISO } from 'date-fns';
import { CalendarDays, User } from 'lucide-react';

type Props = {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onStatusCycle: (t: Task) => void;
  onOpenDetail: (t: Task) => void;
  onInvite: (t: Task) => void;
  unreadCounts: Record<string, number>;
};

function KanbanCard({
  task,
  onStatusCycle,
  onOpenDetail,
  unreadCount,
}: {
  task: Task;
  onStatusCycle: (t: Task) => void;
  onOpenDetail: (t: Task) => void;
  unreadCount?: number;
}) {
  const statusInfo = getStatusInfo(task.status);
  const areaColor = getAreaColor(task.area);
  const priorityColor = getPriorityColor(task.priority);
  const isOverdue = task.deadline && task.status !== 'concluido' && isPast(parseISO(task.deadline));
  const isDone = task.status === 'concluido';

  return (
    <div
      className={`bg-card border rounded-xl px-3 py-3 cursor-pointer hover:border-border-hover transition-all duration-150 relative ${
        isOverdue ? 'border-l-[3px] border-l-destructive border-t-border border-r-border border-b-border' : 'border-border'
      }`}
      onClick={() => onOpenDetail(task)}
    >
      {unreadCount != null && unreadCount > 0 && (
        <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      <div className="flex items-start gap-2 mb-2">
        <button
          onClick={e => { e.stopPropagation(); onStatusCycle(task); }}
          className="mt-0.5 flex-shrink-0 w-4 h-4 flex items-center justify-center text-xs hover:scale-110 transition-transform"
          style={{ color: statusInfo.color }}
          title={`Estado: ${statusInfo.label}`}
        >
          {statusInfo.icon}
        </button>
        <h3 className={`text-xs font-semibold leading-snug flex-1 ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {task.title}
        </h3>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 ml-6">
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
          style={{ backgroundColor: `${areaColor}1a`, color: areaColor, border: `1px solid ${areaColor}40` }}
        >
          {getAreaLabel(task.area)}
        </span>
        <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: priorityColor }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priorityColor }} />
          {task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Média' : 'Baixa'}
        </span>
        {task.responsavel && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <User size={9} />
            {task.responsavel}
          </span>
        )}
        {task.deadline && (
          <span className={`flex items-center gap-0.5 text-[10px] ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
            <CalendarDays size={9} />
            {format(parseISO(task.deadline), 'dd/MM/yy')}
          </span>
        )}
      </div>
    </div>
  );
}

export default function KanbanView({ tasks, onStatusCycle, onOpenDetail, unreadCounts }: Props) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {STATUSES.map(status => {
          const columnTasks = tasks.filter(t => t.status === status.value);
          return (
            <div key={status.value} className="min-w-[280px] flex-1 flex flex-col gap-2">
              {/* Column header */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                style={{
                  backgroundColor: `${status.color}11`,
                  borderColor: `${status.color}33`,
                }}
              >
                <span className="text-sm" style={{ color: status.color }}>{status.icon}</span>
                <span className="text-xs font-semibold text-foreground">{status.label}</span>
                <span
                  className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${status.color}22`, color: status.color }}
                >
                  {columnTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {columnTasks.length === 0 ? (
                  <div
                    className="border border-dashed rounded-xl px-3 py-6 text-center text-xs text-muted-foreground"
                    style={{ borderColor: `${status.color}22` }}
                  >
                    Sem tarefas
                  </div>
                ) : (
                  columnTasks.map(task => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      onStatusCycle={onStatusCycle}
                      onOpenDetail={onOpenDetail}
                      unreadCount={unreadCounts[task.id]}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
