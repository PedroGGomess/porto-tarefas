import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getAreaColor, getAreaLabel } from '@/lib/supabase';
import AppSidebar from '@/components/AppSidebar';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string | null;
  avatar_color: string;
  created_at: string;
  members?: ConversationMember[];
  lastMessage?: Message | null;
}

interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  joined_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  user_id: string | null;
  sender_email: string;
  sender_name: string | null;
  content: string | null;
  type: string;
  task_id: string | null;
  file_id: string | null;
  is_ai: boolean;
  created_at: string;
  task?: TaskSnippet | null;
  file?: FileSnippet | null;
}

interface TaskSnippet {
  id: string;
  title: string;
  area: string;
  status: string;
  deadline: string | null;
  description: string | null;
}

interface FileSnippet {
  id: string;
  name: string;
  size_bytes: number | null;
  mime_type: string | null;
  storage_path: string | null;
}

interface TeamMember {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  avatar_color: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#f472b6', '#fb923c', '#38bdf8', '#4ade80', '#c084fc'];

function emailToColor(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

function getInitials(nameOrEmail: string): string {
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  if (diff < 60_000) return 'agora';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const msgDay = new Date(dateStr); msgDay.setHours(0, 0, 0, 0);
  if (msgDay.getTime() === today.getTime()) return new Date(dateStr).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (msgDay.getTime() === yesterday.getTime()) return 'ontem';
  return new Date(dateStr).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

function dateSeparatorLabel(dateStr: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const msgDay = new Date(dateStr); msgDay.setHours(0, 0, 0, 0);
  if (msgDay.getTime() === today.getTime()) return 'HOJE';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (msgDay.getTime() === yesterday.getTime()) return 'ONTEM';
  return new Date(dateStr).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }).toUpperCase();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Avatar({ name, color, size = 32 }: { name: string; color?: string; size?: number }) {
  const bg = color || emailToColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  );
}

function AIMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div style={{ fontSize: 13, lineHeight: 1.6, color: '#fff' }}>
      {lines.map((line, i) => {
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <div key={i} style={{ paddingLeft: 12, marginBottom: 2 }}>• {line.slice(2)}</div>;
        }
        if (line === '') return <div key={i} style={{ height: 6 }} />;
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={i} style={{ marginBottom: 2 }}>
            {parts.map((p, j) => p.startsWith('**') && p.endsWith('**')
              ? <strong key={j}>{p.slice(2, -2)}</strong>
              : p
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskCardMessage({ task }: { task: TaskSnippet }) {
  const areaColor = getAreaColor(task.area);
  const statusColors: Record<string, string> = {
    'pendente': '#555', 'em-curso': '#60a5fa', 'concluido': '#22c55e', 'bloqueado': '#ef4444',
  };
  const statusLabels: Record<string, string> = {
    'pendente': 'Pendente', 'em-curso': 'Em curso', 'concluido': 'Concluído', 'bloqueado': 'Bloqueado',
  };
  return (
    <div style={{
      background: '#111', border: `1px solid ${areaColor}40`, borderRadius: 12,
      padding: '12px 14px', minWidth: 220, maxWidth: 280,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ background: `${areaColor}20`, color: areaColor, border: `1px solid ${areaColor}40`, borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
          {getAreaLabel(task.area)}
        </span>
        <span style={{ background: `${(statusColors[task.status] ?? '#555')}20`, color: statusColors[task.status] ?? '#555', border: `1px solid ${(statusColors[task.status] ?? '#555')}40`, borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
          {statusLabels[task.status] ?? task.status}
        </span>
        {task.deadline && (
          <span style={{ color: '#666', fontSize: 10 }}>
            {new Date(task.deadline).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
          </span>
        )}
      </div>
      {task.description && (
        <p style={{ color: '#666', fontSize: 11, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
          {task.description}
        </p>
      )}
      <span style={{ color: areaColor, fontSize: 11, fontWeight: 600 }}>Abrir tarefa →</span>
    </div>
  );
}

function FileCardMessage({ file }: { file: FileSnippet }) {
  const handleDownload = async () => {
    if (!file.storage_path) return;
    const { data } = await (supabase as any).storage.from('user-files').createSignedUrl(file.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };
  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', minWidth: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>📄</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
          <p style={{ color: '#555', fontSize: 10 }}>
            {file.size_bytes ? formatSize(file.size_bytes) : ''}{file.mime_type ? ` · ${file.mime_type.split('/')[1]?.toUpperCase() ?? ''}` : ''}
          </p>
        </div>
      </div>
      <button onClick={handleDownload} style={{ color: '#60a5fa', fontSize: 11, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        ⬇ Descarregar
      </button>
    </div>
  );
}

export default function Chat() {
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [convSearch, setConvSearch] = useState('');
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [convType, setConvType] = useState<'direct' | 'group'>('direct');
  const [newConvEmail, setNewConvEmail] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#60a5fa');
  const [teamDir, setTeamDir] = useState<TeamMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([]);
  const [emailSearch, setEmailSearch] = useState('');
  const [creatingConv, setCreatingConv] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [tasks, setTasks] = useState<TaskSnippet[]>([]);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;

  // Upsert user into team_directory
  useEffect(() => {
    if (!user) return;
    const name = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Utilizador';
    (supabase as any).from('team_directory').upsert({
      user_id: user.id,
      email: user.email,
      name,
      avatar_color: emailToColor(user.email ?? ''),
      last_seen: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  }, [user]);

  // Load team directory
  useEffect(() => {
    if (!user) return;
    (supabase as any).from('team_directory').select('*').then(({ data }: { data: TeamMember[] | null }) => {
      if (data) setTeamDir(data.filter(m => m.email !== user.email));
    });
  }, [user]);

  // Load tasks
  useEffect(() => {
    if (!user) return;
    (supabase as any).from('tasks').select('id, title, area, status, deadline, description')
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }: { data: TaskSnippet[] | null }) => { if (data) setTasks(data); });
  }, [user]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data: convs } = await (supabase as any)
      .from('conversations')
      .select('*, conversation_members(*)')
      .order('created_at', { ascending: false });
    if (!convs) return;

    const enriched: Conversation[] = await Promise.all(
      (convs as any[]).map(async (c: any) => {
        const { data: lastMsgs } = await (supabase as any)
          .from('messages')
          .select('*')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1);
        return { ...c, members: c.conversation_members ?? [], lastMessage: lastMsgs?.[0] ?? null };
      })
    );
    setConversations(enriched);
    if (enriched.length > 0 && !activeConvId) {
      setActiveConvId(enriched[0].id);
    }
  }, [user, activeConvId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvId || !user) return;
    setMessages([]);

    (supabase as any)
      .from('messages')
      .select('*, tasks(id, title, area, status, deadline, description), user_files(id, name, size_bytes, mime_type, storage_path)')
      .eq('conversation_id', activeConvId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }: { data: any[] | null }) => {
        if (data) {
          setMessages(data.map(m => ({ ...m, task: m.tasks ?? null, file: m.user_files ?? null })));
        }
      });

    const channel = supabase.channel(`messages:${activeConvId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConvId}`,
      }, async (payload) => {
        const m = payload.new as Message;
        let task = null, file = null;
        if (m.task_id) {
          const { data } = await (supabase as any).from('tasks').select('id, title, area, status, deadline, description').eq('id', m.task_id).single();
          task = data;
        }
        if (m.file_id) {
          const { data } = await (supabase as any).from('user_files').select('id, name, size_bytes, mime_type, storage_path').eq('id', m.file_id).single();
          file = data;
        }
        setMessages(prev => {
          if (prev.find(p => p.id === m.id)) return prev;
          return [...prev, { ...m, task, file }];
        });
        loadConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConvId, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const getUserName = () =>
    user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Utilizador';

  const sendMessage = async (
    content: string,
    opts: { isAi?: boolean; type?: string; taskId?: string; fileId?: string } = {}
  ) => {
    if (!user || !activeConvId) return;
    await (supabase as any).from('messages').insert({
      conversation_id: activeConvId,
      user_id: opts.isAi ? null : user.id,
      sender_email: opts.isAi ? 'ai@the100s' : (user.email ?? ''),
      sender_name: opts.isAi ? "The 100's AI" : getUserName(),
      content: content.trim(),
      type: opts.type ?? (opts.isAi ? 'ai' : 'text'),
      task_id: opts.taskId ?? null,
      file_id: opts.fileId ?? null,
      is_ai: opts.isAi ?? false,
    });
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !activeConvId) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    await sendMessage(msg);
    setSending(false);
  };

  const handleAsk = async () => {
    if (!input.trim() || sending || !activeConvId) return;
    const question = input.trim();
    setInput('');
    setSending(true);
    await sendMessage(question);
    setAiTyping(true);
    try {
      const context = messages.slice(-20).map(m => ({
        role: m.sender_email === 'ai@the100s' ? 'assistant' as const : 'user' as const,
        content: m.content ?? '',
      }));
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        await sendMessage('Chave da API não configurada. Contacta o administrador.', { isAi: true });
        setAiTyping(false);
        setSending(false);
        return;
      }
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey ?? '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          system: "És o assistente AI da The 100's, marca premium de vinho do Porto. Responde sempre em português europeu, de forma concisa e profissional.",
          messages: [...context, { role: 'user', content: question }],
        }),
      });
      const data = await res.json();
      const aiText = data?.content?.[0]?.text ?? 'Não foi possível obter resposta.';
      await sendMessage(aiText, { isAi: true });
    } catch {
      await sendMessage('Erro ao contactar a AI. Tenta novamente.', { isAi: true });
    }
    setAiTyping(false);
    setSending(false);
  };

  const handleShareTask = async (task: TaskSnippet) => {
    if (!activeConvId || !user) return;
    setShowTaskPicker(false);
    await (supabase as any).from('messages').insert({
      conversation_id: activeConvId,
      user_id: user.id,
      sender_email: user.email ?? '',
      sender_name: getUserName(),
      content: `📋 Tarefa partilhada: ${task.title}`,
      type: 'task',
      task_id: task.id,
      is_ai: false,
    });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user || !activeConvId) return;
    const file = files[0];
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await (supabase as any).storage.from('user-files').upload(path, file, { upsert: false });
    if (uploadErr) { toast.error('Erro ao carregar ficheiro'); return; }
    const { data: fileData } = await (supabase as any).from('user_files').insert({
      user_id: user.id,
      name: file.name,
      size_bytes: file.size,
      mime_type: file.type,
      storage_path: path,
      conversation_id: activeConvId,
    }).select().single();
    if (fileData) {
      await (supabase as any).from('messages').insert({
        conversation_id: activeConvId,
        user_id: user.id,
        sender_email: user.email ?? '',
        sender_name: getUserName(),
        content: `📎 Ficheiro: ${file.name}`,
        type: 'file',
        file_id: fileData.id,
        is_ai: false,
      });
      toast.success('Ficheiro partilhado');
    }
  };

  const handleCreateConversation = async () => {
    if (!user) return;
    setCreatingConv(true);
    try {
      if (convType === 'direct') {
        const target = teamDir.find(m => m.email === newConvEmail) ??
          (newConvEmail.includes('@') ? { id: '', user_id: null, email: newConvEmail, name: newConvEmail.split('@')[0], avatar_color: '#60a5fa' } : null);
        if (!target) { toast.error('Email inválido'); return; }
        const { data: conv } = await (supabase as any).from('conversations').insert({
          is_group: false, created_by: user.id, avatar_color: emailToColor(target.email),
        }).select().single();
        if (!conv) { toast.error('Erro ao criar conversa'); return; }
        await (supabase as any).from('conversation_members').insert([
          { conversation_id: conv.id, user_id: user.id, email: user.email, name: getUserName() },
          { conversation_id: conv.id, user_id: target.user_id, email: target.email, name: target.name },
        ]);
        await (supabase as any).from('messages').insert({
          conversation_id: conv.id, user_id: null, sender_email: 'system', sender_name: 'Sistema',
          content: `${getUserName()} iniciou uma conversa`, type: 'text', is_ai: false,
        });
        await loadConversations();
        setActiveConvId(conv.id);
        setMobileShowChat(true);
      } else {
        if (!newGroupName.trim()) { toast.error('Nome do grupo obrigatório'); return; }
        if (selectedMembers.length === 0) { toast.error('Adiciona pelo menos um membro'); return; }
        const { data: conv } = await (supabase as any).from('conversations').insert({
          name: newGroupName.trim(), is_group: true, created_by: user.id, avatar_color: newGroupColor,
        }).select().single();
        if (!conv) { toast.error('Erro ao criar grupo'); return; }
        await (supabase as any).from('conversation_members').insert([
          { conversation_id: conv.id, user_id: user.id, email: user.email, name: getUserName() },
          ...selectedMembers.map(m => ({ conversation_id: conv.id, user_id: m.user_id, email: m.email, name: m.name })),
        ]);
        await (supabase as any).from('messages').insert({
          conversation_id: conv.id, user_id: null, sender_email: 'system', sender_name: 'Sistema',
          content: `${getUserName()} criou o grupo "${newGroupName}"`, type: 'text', is_ai: false,
        });
        await loadConversations();
        setActiveConvId(conv.id);
        setMobileShowChat(true);
      }
      setShowNewConvModal(false);
      setNewConvEmail(''); setNewGroupName(''); setSelectedMembers([]);
    } finally {
      setCreatingConv(false);
    }
  };

  const handleOpenAI = async () => {
    if (!user) return;
    const existing = conversations.find(c => !c.is_group && c.members?.some(m => m.email === 'ai@the100s'));
    if (existing) { setActiveConvId(existing.id); setMobileShowChat(true); return; }
    const { data: conv } = await (supabase as any).from('conversations').insert({
      name: '✦ Assistente AI', is_group: false, created_by: user.id, avatar_color: '#f59e0b',
    }).select().single();
    if (!conv) return;
    await (supabase as any).from('conversation_members').insert([
      { conversation_id: conv.id, user_id: user.id, email: user.email, name: getUserName() },
      { conversation_id: conv.id, user_id: null, email: 'ai@the100s', name: '✦ Assistente AI' },
    ]);
    await loadConversations();
    setActiveConvId(conv.id);
    setMobileShowChat(true);
  };

  const convDisplayName = (conv: Conversation): string => {
    if (conv.is_group || conv.name) return conv.name ?? 'Grupo';
    const other = conv.members?.find(m => m.email !== user?.email);
    return other?.name ?? other?.email ?? 'Conversa';
  };

  const convDisplaySub = (conv: Conversation): string => {
    if (conv.is_group) return `${conv.members?.length ?? 0} membros`;
    const other = conv.members?.find(m => m.email !== user?.email);
    return other?.email ?? '';
  };

  const groupedMessages = (() => {
    const groups: { date: string; messages: Message[] }[] = [];
    for (const msg of messages) {
      const day = new Date(msg.created_at).toDateString();
      const last = groups[groups.length - 1];
      if (last && last.date === day) last.messages.push(msg);
      else groups.push({ date: day, messages: [msg] });
    }
    return groups;
  })();

  const filteredConvs = conversations.filter(c => {
    const q = convSearch.toLowerCase();
    return convDisplayName(c).toLowerCase().includes(q) || convDisplaySub(c).toLowerCase().includes(q);
  });

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex" style={{ background: '#080808' }}>
      <AppSidebar />
      <div className="md:ml-[240px] flex flex-1 h-screen overflow-hidden">

        {/* Conversations list */}
        <div
          className={`flex flex-col ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}
          style={{ width: 300, minWidth: 300, height: '100vh', borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a', flexShrink: 0 }}
        >
          <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Mensagens</span>
              <button
                onClick={() => { setShowNewConvModal(true); setConvType('direct'); setNewConvEmail(''); setNewGroupName(''); setSelectedMembers([]); }}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '4px 8px', color: '#fff', fontSize: 14, cursor: 'pointer' }}
                title="Nova conversa"
              >✏️</button>
            </div>
            <input
              value={convSearch}
              onChange={e => setConvSearch(e.target.value)}
              placeholder="Pesquisar conversas..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 99, padding: '8px 14px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConvs.length === 0 && (
              <div style={{ textAlign: 'center', color: '#555', padding: '40px 16px', fontSize: 13 }}>
                Sem conversas. Cria uma nova!
              </div>
            )}
            {filteredConvs.map(conv => {
              const isActive = conv.id === activeConvId;
              const name = convDisplayName(conv);
              const lastMsg = conv.lastMessage;
              const preview = lastMsg?.content ? (lastMsg.content.length > 40 ? lastMsg.content.slice(0, 40) + '…' : lastMsg.content) : '';
              const time = lastMsg ? relativeTime(lastMsg.created_at) : '';
              return (
                <button
                  key={conv.id}
                  onClick={() => { setActiveConvId(conv.id); setMobileShowChat(true); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '12px 16px',
                    background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: 'none', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s',
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {conv.is_group
                      ? <div style={{ width: 40, height: 40, borderRadius: '50%', background: conv.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👥</div>
                      : <Avatar name={name} color={conv.avatar_color} size={40} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: isActive ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{name}</span>
                      {time && <span style={{ color: '#555', fontSize: 10, flexShrink: 0 }}>{time}</span>}
                    </div>
                    {preview && <p style={{ color: '#666', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{preview}</p>}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={handleOpenAI}
              style={{ width: '100%', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '8px 12px', color: '#f59e0b', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <span>✦</span> Assistente AI
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div
          className={`flex flex-col flex-1 ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}
          style={{ height: '100vh', minWidth: 0 }}
        >
          {!activeConv ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 48 }}>💬</span>
              <p style={{ fontSize: 14 }}>Seleciona uma conversa para começar</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, background: '#0a0a0a', flexShrink: 0 }}>
                <button className="md:hidden" onClick={() => setMobileShowChat(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>←</button>
                {activeConv.is_group
                  ? <div style={{ width: 36, height: 36, borderRadius: '50%', background: activeConv.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👥</div>
                  : <Avatar name={convDisplayName(activeConv)} color={activeConv.avatar_color} size={36} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{convDisplayName(activeConv)}</p>
                  <p style={{ color: '#555', fontSize: 11 }}>{convDisplaySub(activeConv)}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setShowTaskPicker(true)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#ccc', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>📋 Partilhar tarefa</button>
                  <button onClick={() => fileInputRef.current?.click()} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#ccc', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>📎 Partilhar ficheiro</button>
                  <button onClick={handleOpenAI} style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '6px 10px', color: '#f59e0b', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✦ AI</button>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {groupedMessages.map(group => (
                  <div key={group.date}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                      <span style={{ color: '#555', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}>{dateSeparatorLabel(group.messages[0].created_at)}</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                    {group.messages.map((msg, idx) => {
                      const isOwn = msg.sender_email === user.email && !msg.is_ai;
                      const isAi = msg.is_ai;
                      const prev = idx > 0 ? group.messages[idx - 1] : null;
                      const isFirstInSeq = !prev || prev.sender_email !== msg.sender_email;
                      return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
                          <div style={{ width: 28, flexShrink: 0 }}>
                            {!isOwn && isFirstInSeq && (
                              isAi
                                ? <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#000', fontWeight: 700 }}>✦</div>
                                : <Avatar name={msg.sender_name ?? msg.sender_email} color={emailToColor(msg.sender_email)} size={28} />
                            )}
                          </div>
                          <div style={{ maxWidth: isAi ? '75%' : '65%', minWidth: 0 }}>
                            {activeConv.is_group && isFirstInSeq && !isOwn && (
                              <p style={{ color: '#666', fontSize: 10, marginBottom: 3, marginLeft: 4 }}>{msg.sender_name ?? msg.sender_email}</p>
                            )}
                            {isAi && isFirstInSeq && (
                              <p style={{ color: '#f59e0b', fontSize: 10, fontWeight: 600, marginBottom: 3, marginLeft: 4 }}>✦ The 100's AI</p>
                            )}
                            {msg.type === 'task' && msg.task ? (
                              <TaskCardMessage task={msg.task} />
                            ) : msg.type === 'file' && msg.file ? (
                              <FileCardMessage file={msg.file} />
                            ) : (
                              <div style={{
                                background: isAi ? 'rgba(245,158,11,0.06)' : isOwn ? '#fff' : '#1a1a1a',
                                color: isOwn && !isAi ? '#000' : '#fff',
                                border: isAi ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(255,255,255,0.06)',
                                borderLeft: isAi ? '3px solid #f59e0b' : undefined,
                                borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                padding: '10px 14px', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word',
                              }}>
                                {isAi ? <AIMessage content={msg.content ?? ''} /> : (msg.content ?? '')}
                              </div>
                            )}
                            <p style={{ color: '#444', fontSize: 10, marginTop: 3, textAlign: isOwn ? 'right' : 'left', marginLeft: isOwn ? 0 : 4 }}>
                              {new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {aiTyping && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#f59e0b', fontSize: 12, padding: '8px 0' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#000', fontWeight: 700 }}>✦</div>
                    <span>✦ AI está a escrever...</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', flexShrink: 0, background: '#0a0a0a' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                  <button onClick={() => fileInputRef.current?.click()} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px', color: '#aaa', fontSize: 16, cursor: 'pointer', flexShrink: 0 }} title="Anexar ficheiro">📎</button>
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => handleFileUpload(e.target.files)} />
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Escreve uma mensagem..."
                    rows={1}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', resize: 'none', minHeight: 40, maxHeight: 120, overflowY: 'auto', lineHeight: 1.5, fontFamily: 'inherit' }}
                  />
                  <button onClick={handleSend} disabled={!input.trim() || sending} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: !input.trim() ? 0.4 : 1, flexShrink: 0 }}>Enviar</button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowTaskPicker(!showTaskPicker)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 10px', color: '#888', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>📋 Partilhar tarefa</button>
                  <button onClick={handleAsk} disabled={!input.trim() || sending} style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '5px 10px', color: '#f59e0b', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: !input.trim() ? 0.5 : 1 }}>✦ Perguntar à AI</button>
                </div>
                {showTaskPicker && (
                  <div style={{ marginTop: 10, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, maxHeight: 200, overflowY: 'auto' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <input value={taskSearch} onChange={e => setTaskSearch(e.target.value)} placeholder="Pesquisar tarefas..." style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: 12, outline: 'none' }} />
                    </div>
                    {tasks.filter(t => t.title.toLowerCase().includes(taskSearch.toLowerCase())).map(t => (
                      <button key={t.id} onClick={() => handleShareTask(t)} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: getAreaColor(t.area), flexShrink: 0 }} />
                        <span style={{ color: '#fff', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.title}</span>
                        <span style={{ color: '#555', fontSize: 10 }}>{getAreaLabel(t.area)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      <AnimatePresence>
        {showNewConvModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) setShowNewConvModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Nova Conversa</h3>
                <button onClick={() => setShowNewConvModal(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3, marginBottom: 20 }}>
                {(['direct', 'group'] as const).map(type => (
                  <button key={type} onClick={() => setConvType(type)}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: convType === type ? 'rgba(255,255,255,0.1)' : 'transparent', color: convType === type ? '#fff' : '#555', transition: 'all 0.15s' }}>
                    {type === 'direct' ? 'Direto' : 'Grupo'}
                  </button>
                ))}
              </div>
              {convType === 'direct' ? (
                <div>
                  <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 6 }}>Email ou nome</label>
                  <input value={newConvEmail} onChange={e => setNewConvEmail(e.target.value)} placeholder="email@exemplo.com"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                  {teamDir.filter(m => (m.email.toLowerCase().includes(newConvEmail.toLowerCase()) || (m.name ?? '').toLowerCase().includes(newConvEmail.toLowerCase())) && newConvEmail.length > 0).slice(0, 5).map(m => (
                    <button key={m.id} onClick={() => setNewConvEmail(m.email)}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Avatar name={m.name ?? m.email} color={m.avatar_color} size={24} />
                      <span style={{ color: '#fff', fontSize: 12 }}>{m.name ?? m.email}</span>
                      <span style={{ color: '#555', fontSize: 11 }}>{m.email}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 6 }}>Nome do grupo</label>
                  <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Nome do grupo..."
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
                  <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 6 }}>Cor do grupo</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setNewGroupColor(c)}
                        style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: newGroupColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                    ))}
                  </div>
                  <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 6 }}>Adicionar membros</label>
                  <input value={emailSearch} onChange={e => setEmailSearch(e.target.value)} placeholder="Pesquisar equipa..."
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                  {selectedMembers.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {selectedMembers.map(m => (
                        <span key={m.id} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, padding: '3px 10px', fontSize: 11, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {m.name ?? m.email}
                          <button onClick={() => setSelectedMembers(prev => prev.filter(p => p.id !== m.id))} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 10, padding: 0 }}>✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                    {teamDir.filter(m => !selectedMembers.find(s => s.id === m.id) && (m.email.toLowerCase().includes(emailSearch.toLowerCase()) || (m.name ?? '').toLowerCase().includes(emailSearch.toLowerCase()))).map(m => (
                      <button key={m.id} onClick={() => setSelectedMembers(prev => [...prev, m])}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Avatar name={m.name ?? m.email} color={m.avatar_color} size={24} />
                        <span style={{ color: '#fff', fontSize: 12 }}>{m.name ?? m.email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={handleCreateConversation} disabled={creatingConv}
                style={{ width: '100%', background: '#fff', color: '#000', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 20, opacity: creatingConv ? 0.6 : 1 }}>
                {creatingConv ? 'A criar...' : 'Criar'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
