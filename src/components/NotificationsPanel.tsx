import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, Check, CheckCheck, X, UserPlus, Link2, AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  task_assigned: <UserPlus size={14} />,
  task_completed: <Check size={14} />,
  dependency_resolved: <Link2 size={14} />,
  dependency_blocked: <AlertTriangle size={14} />,
  approval_needed: <Clock size={14} />,
  deadline_approaching: <AlertTriangle size={14} />,
  task_overdue: <AlertTriangle size={14} />,
  mention: <Bell size={14} />,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  task_assigned: '#60a5fa',
  task_completed: '#22c55e',
  dependency_resolved: '#22c55e',
  dependency_blocked: '#ef4444',
  approval_needed: '#f59e0b',
  deadline_approaching: '#f59e0b',
  task_overdue: '#ef4444',
  mention: '#a78bfa',
};

export default function NotificationsPanel() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center transition-all duration-150"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: isOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: 'white',
              padding: '0 4px',
            }}
          >
            {unreadCount}
          </motion.div>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                width: 380,
                maxHeight: 480,
                borderRadius: 14,
                background: '#151515',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                overflow: 'hidden',
                zIndex: 50,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between" style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Notificações</span>
                  {unreadCount > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 6, background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>
                      {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead.mutate()}
                      className="flex items-center gap-1 transition-colors"
                      style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', padding: '4px 8px', borderRadius: 6 }}
                    >
                      <CheckCheck size={12} />
                      Marcar todas
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    style={{ color: 'rgba(255,255,255,0.3)', padding: 4 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Notifications list */}
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div className="text-center" style={{ padding: '32px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                    Sem notificações
                  </div>
                ) : (
                  notifications.map(notif => {
                    const color = NOTIFICATION_COLORS[notif.type] ?? '#94a3b8';
                    const icon = NOTIFICATION_ICONS[notif.type] ?? <Bell size={14} />;
                    const timeAgo = getTimeAgo(notif.created_at);

                    return (
                      <button
                        key={notif.id}
                        onClick={() => {
                          if (!notif.is_read) markAsRead.mutate(notif.id);
                        }}
                        className="w-full text-left flex gap-3 transition-colors hover:bg-white/[0.03]"
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          background: notif.is_read ? 'transparent' : 'rgba(96,165,250,0.03)',
                        }}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: `${color}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color,
                            flexShrink: 0,
                          }}
                        >
                          {icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div style={{ fontSize: 12, fontWeight: notif.is_read ? 400 : 600, color: notif.is_read ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)' }}>
                            {notif.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {notif.message}
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                            {timeAgo}
                          </div>
                        </div>

                        {/* Unread dot */}
                        {!notif.is_read && (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa', flexShrink: 0, marginTop: 4 }} />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}
