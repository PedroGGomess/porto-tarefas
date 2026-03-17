import { Task, getAreaColor, getAreaLabel, getPriorityColor, getStatusInfo } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Pencil, Trash2, UserPlus, Mail, CalendarPlus } from 'lucide-react';
import { isPast, parseISO, differenceInDays, isToday } from 'date-fns';
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

function getRelativeDeadline(deadline: string, status: string): { text: string; color: string } {
  const date = parseISO(deadline);
  if (isToday(date)) return { text: 'hoje', color: '#f59e0b' };
  const diff = differenceInDays(date, new Date());
  if (diff > 0) return { text: `em ${diff} dia${diff !== 1 ? 's' : ''}`, color: diff <= 3 ? '#f59e0b' : 'rgba(255,255,255,0.4)' };
  if (status === 'concluido') return { text: `há ${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? 's' : ''}`, color: 'rgba(255,255,255,0.3)' };
  return { text: `há ${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? 's' : ''}`, color: '#ef4444' };
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

  const deadlineInfo = task.deadline ? getRelativeDeadline(task.deadline, task.status) : null;

  const handleScheduleMeeting = (e: React.MouseEvent) => {
    e.stopPropagation();
    const subject = encodeURIComponent(`Reunião: ${task.title}`);
    const body = encodeURIComponent(`Reunião sobre a tarefa "${task.title}"\n\nÁrea: ${getAreaLabel(task.area)}\nResponsável: ${task.responsavel ?? 'N/A'}\n`);
    window.open(`https://calendar.google.com/calendar/r/eventedit?text=${subject}&details=${body}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group relative transition-all duration-200 hover:-translate-y-px"
      style={{
        background: isOverdue ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.02)',
        border: '1px solid var(--glass-border)',
        borderLeft: `3px solid ${isOverdue ? '#ef4444' : areaColor}`,
        borderRadius: 14,
        padding: '16px 18px',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = isOverdue ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.02)';
      }}
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
          className="mt-0.5 flex-shrink-0 w-[18px] h-[18px] flex items-center justify-center rounded-full text-sm leading-none transition-transform duration-150 hover:scale-125"
          style={{ color: statusInfo.color }}
          title={`Estado: ${statusInfo.label}`}
        >
          {statusInfo.icon}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <h3
              className="cursor-pointer hover:underline underline-offset-2"
              style={{
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: isDone ? 'rgba(255,255,255,0.3)' : 'white',
                textDecoration: isDone ? 'line-through' : 'none',
              }}
              onClick={() => onOpenDetail(task)}
              title="Abrir detalhes"
            >
              {task.title}
            </h3>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => onEdit(task)}
                className="p-1.5 rounded-md transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
              >
                <Pencil size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
              <button
                onClick={() => onDelete(task)}
                className="p-1.5 rounded-md transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
              >
                <Trash2 size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className="mt-1 line-clamp-2" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {task.description}
            </p>
          )}

          {/* Meta row + avatar stack */}
          <div className="flex items-center justify-between mt-2.5 gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {/* Area tag */}
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  backgroundColor: `${areaColor}1a`,
                  color: areaColor,
                  border: `1px solid ${areaColor}40`,
                }}
              >
                {getAreaLabel(task.area)}
              </span>

              {/* Priority */}
              <span className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 500, color: priorityColor }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priorityColor }} />
                {task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Média' : 'Baixa'}
              </span>

              {/* Responsavel with avatar + email + schedule */}
              {task.responsavel && (
                <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: emailToColor(task.responsavel_email ?? task.responsavel) }}
                    title={task.responsavel}
                  >
                    {task.responsavel.slice(0, 2).toUpperCase()}
                  </span>
                  <span>{task.responsavel}</span>
                  {task.responsavel_email && (
                    <>
                      <a
                        href={`mailto:${task.responsavel_email}?subject=Re: ${encodeURIComponent(task.title)}&body=${encodeURIComponent(`Olá,\n\nEm relação à tarefa "${task.title}":\n\n`)}`}
                        onClick={e => e.stopPropagation()}
                        title={`Enviar email para ${task.responsavel}`}
                        className="transition-colors"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#f59e0b'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.3)'; }}
                      >
                        <Mail size={11} />
                      </a>
                      <button
                        onClick={handleScheduleMeeting}
                        title="Agendar reunião"
                        className="transition-colors"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#60a5fa'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; }}
                      >
                        <CalendarPlus size={11} />
                      </button>
                    </>
                  )}
                </span>
              )}

              {/* Deadline — relative */}
              {deadlineInfo && (
                <span
                  className="flex items-center gap-1"
                  style={{
                    fontSize: 11,
                    color: deadlineInfo.color,
                    fontWeight: isOverdue ? 600 : 400,
                  }}
                >
                  📅 {deadlineInfo.text}
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
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white -ml-1 first:ml-0"
                      style={{
                        backgroundColor: emailToColor(m.email),
                        border: '2px solid #080808',
                      }}
                      title={m.email}
                    >
                      {m.email.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {extraCount > 0 && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold -ml-1"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.5)',
                        border: '2px solid #080808',
                      }}
                    >
                      +{extraCount}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onInvite(task); }}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                title="Convidar membro"
              >
                <UserPlus size={10} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
