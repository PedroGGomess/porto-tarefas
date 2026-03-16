import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check } from 'lucide-react';
import { useTeamDirectory } from '@/hooks/useTeamDirectory';
import { useTaskMembers } from '@/hooks/useTaskMembers';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onClose: () => void;
  taskId: string;
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(' ');
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function InviteModal({ open, onClose, taskId }: Props) {
  const [search, setSearch] = useState('');
  const { team } = useTeamDirectory();
  const { members, addMember, removeMember } = useTaskMembers(taskId);
  const [saving, setSaving] = useState(false);

  // Track pending changes (email → add or remove)
  const [pending, setPending] = useState<Record<string, 'add' | 'remove'>>({});

  const memberEmails = new Set(members.map(m => m.email));

  const filtered = team.filter(member => {
    const q = search.toLowerCase();
    return (
      !q ||
      member.name?.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q)
    );
  });

  const isAdded = (email: string) => {
    if (pending[email] === 'add') return true;
    if (pending[email] === 'remove') return false;
    return memberEmails.has(email);
  };

  const toggle = (email: string) => {
    const currentlyAdded = isAdded(email);
    if (currentlyAdded) {
      if (memberEmails.has(email)) {
        setPending(p => ({ ...p, [email]: 'remove' }));
      } else {
        // Was pending add, cancel it
        setPending(p => { const next = { ...p }; delete next[email]; return next; });
      }
    } else {
      if (!memberEmails.has(email)) {
        setPending(p => ({ ...p, [email]: 'add' }));
      } else {
        // Was pending remove, cancel it
        setPending(p => { const next = { ...p }; delete next[email]; return next; });
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [email, action] of Object.entries(pending)) {
        if (action === 'add') {
          await addMember.mutateAsync({ taskId, email });
        } else {
          const member = members.find(m => m.email === email);
          if (member) await removeMember.mutateAsync(member.id);
        }
      }
      setPending({});
      toast.success('Membros atualizados');
      onClose();
    } catch {
      // errors handled in hook
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setPending({});
    setSearch('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(0,0,0,0.7)] backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="bg-card border border-border rounded-2xl w-full max-w-[420px] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Convidar para tarefa</h2>
              <button onClick={handleClose} className="p-1 hover:bg-surface-raised rounded-md transition-colors">
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pesquisar membro da equipa..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border-hover transition-colors"
                />
              </div>
            </div>

            {/* Team list */}
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-muted-foreground text-xs py-8">Nenhum membro encontrado</p>
              ) : (
                filtered.map(member => {
                  const added = isAdded(member.email);
                  return (
                    <button
                      key={member.id}
                      onClick={() => toggle(member.email)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-raised transition-colors text-left"
                    >
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: member.avatar_color ?? '#60a5fa' }}
                      >
                        {getInitials(member.name, member.email)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{member.name ?? member.email}</p>
                        {member.name && (
                          <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                        )}
                      </div>

                      {/* Check */}
                      {added && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <Check size={11} className="text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:bg-surface-raised transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || Object.keys(pending).length === 0}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
