import { Task, getAreaColor, getAreaLabel, getPriorityColor, getStatusInfo, STATUSES } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Pencil, Trash2, User, CalendarDays, UserPlus } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { useTaskMembers } from '@/hooks/useTaskMembers';

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

type Props = {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusCycle: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  onInvite: (task: Task) => void;
  unreadCount?: number;
};

export default function TaskCard({ task, index, onEdit, onDelete, onStatusCycle, onOpenDetail, onInvite, unreadCount }: Props) {
  const statusInfo = getStatusInfo(task.status);
  const areaColor = getAreaColor(task.area);
  const priorityColor = getPriorityColor(task.priority);
  const isOverdue = task.deadline && task.status !== 'concluido' && isPast(parseISO(task.deadline));
  const isDone = task.status === 'concluido';

  const { members } = useTaskMembers(task.id);
  const visibleMembers = members.slice(0, 3);
  const extraCount = members.length - 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={`bg-card border rounded-[14px] px-4 py-3.5 hover:border-border-hover hover:-translate-y-px transition-all duration-200 group relative ${
        isOverdue ? 'border-l-[3px] border-l-destructive border-t-border border-r-border border-b-border' : 'border-border'
      }`}
      style={isOverdue ? { boxShadow: 'inset 3px 0 12px -6px rgba(239,68,68,0.15)' } : undefined}
    >
      {/* Unread badge */}
      {unreadCount != null && unreadCount > 0 && (
        <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center z-10">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      <div className="flex items-start gap-3">
        {/* Status icon */}
        <button
          onClick={() => onStatusCycle(task)}
          className="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-sm leading-none hover:scale-110 transition-transform"
          style={{ color: statusInfo.color }}
          title={`Estado: ${statusInfo.label}`}
        >
          {statusInfo.icon}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`text-sm font-semibold leading-snug cursor-pointer hover:underline underline-offset-2 ${
                isDone ? 'line-through text-muted-foreground' : 'text-foreground'
              }`}
              onClick={() => onOpenDetail(task)}
              title="Abrir detalhes"
            >
              {task.title}
            </h3>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => onEdit(task)}
                className="p-1.5 rounded-md bg-surface-raised hover:bg-border-hover transition-colors"
              >
                <Pencil size={12} className="text-muted-foreground" />
              </button>
              <button
                onClick={() => onDelete(task)}
                className="p-1.5 rounded-md bg-surface-raised hover:bg-destructive/20 transition-colors"
              >
                <Trash2 size={12} className="text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{task.description}</p>
          )}

          {/* Meta row + avatar stack */}
          <div className="flex items-center justify-between mt-2.5 gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {/* Area tag */}
              <span
                className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                style={{
                  backgroundColor: `${areaColor}1a`,
                  color: areaColor,
                  border: `1px solid ${areaColor}40`,
                }}
              >
                {getAreaLabel(task.area)}
              </span>

              {/* Priority */}
              <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: priorityColor }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priorityColor }} />
                {task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Média' : 'Baixa'}
              </span>

              {/* Responsavel */}
              {task.responsavel && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <User size={10} />
                  {task.responsavel}
                </span>
              )}

              {/* Deadline */}
              {task.deadline && (
                <span className={`flex items-center gap-1 text-[11px] ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                  <CalendarDays size={10} />
                  {format(parseISO(task.deadline), 'dd/MM/yyyy')}
                  {isOverdue && <span className="text-destructive text-[10px]">⚠️ Atrasada</span>}
                </span>
              )}
            </div>

            {/* Avatar stack + invite button */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {visibleMembers.length > 0 && (
                <div className="flex items-center">
                  {visibleMembers.map((m) => (
                    <div
                      key={m.id}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-card -ml-1 first:ml-0"
                      style={{ backgroundColor: emailToColor(m.email) }}
                      title={m.email}
                    >
                      {m.email.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {extraCount > 0 && (
                    <div className="w-6 h-6 rounded-full bg-surface-raised border-2 border-card flex items-center justify-center text-[9px] font-bold text-muted-foreground -ml-1">
                      +{extraCount}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onInvite(task); }}
                className="w-6 h-6 rounded-full bg-surface-raised border border-border flex items-center justify-center hover:bg-border-hover transition-colors"
                title="Convidar membro"
              >
                <UserPlus size={10} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
