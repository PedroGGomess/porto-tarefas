import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useTeamMessages, TeamMessage } from '@/hooks/useTeamMessages';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/lib/supabase';
import { getAreaLabel, getStatusInfo } from '@/lib/supabase';
import AppSidebar from '@/components/AppSidebar';
import MobileNav from '@/components/MobileNav';

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

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

const BRAND_SYSTEM_PROMPT = `És o assistente de IA da The 100's — uma loja de vinho premium do Porto, Portugal, com abertura prevista para 1 de Junho de 2026.

A tua função é ajudar a equipa a gerir, discutir e resolver as tarefas do projeto de abertura da loja. Responde sempre em português europeu, de forma concisa e prática.

Ao responder sobre tarefas e tópicos da equipa:
- Analisa o contexto completo fornecido
- Sugere soluções concretas e acionáveis
- Identifica bloqueios e como os resolver
- Mantém sempre o foco no objetivo: abrir a loja com sucesso`;

async function callClaudeWithTasks(
  tasks: { title: string; area: string; status: string; responsavel?: string | null; deadline?: string | null }[],
  recentMessages: TeamMessage[],
  userQuestion: string
): Promise<string> {
  const tasksContext = tasks.slice(0, 50).map(t =>
    `- [${getAreaLabel(t.area)}] ${t.title} | Estado: ${getStatusInfo(t.status).label} | Responsável: ${t.responsavel ?? 'N/A'} | Prazo: ${t.deadline ?? 'N/A'}`
  ).join('\n');

  const systemPrompt = `${BRAND_SYSTEM_PROMPT}

TAREFAS ATUAIS DA EQUIPA:
${tasksContext}`;

  const history = recentMessages.slice(-30).map(m => ({
    role: m.is_ai ? 'assistant' as const : 'user' as const,
    content: m.content,
  }));

  const { data, error } = await supabase.functions.invoke('ask-ai', {
    body: { systemPrompt, messages: history, userMessage: userQuestion },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return (data as { text?: string })?.text ?? 'Sem resposta da AI.';
}

function MessageBubble({ msg, isOwn, showHeader }: { msg: TeamMessage; isOwn: boolean; showHeader: boolean }) {
  const isAI = msg.is_ai;
  const time = msg.created_at
    ? format(parseISO(msg.created_at), 'HH:mm', { locale: pt })
    : '';
  const senderName = msg.sender_name ?? msg.sender_email.split('@')[0];

  if (isAI) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex gap-3 max-w-[85%]"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}
        >
          ✦
        </div>
        <div>
          {showHeader && (
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>✦ The 100's AI</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{time}</span>
            </div>
          )}
          <div
            style={{
              background: 'rgba(20,15,5,0.9)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderLeft: '3px solid #f59e0b',
              borderRadius: '0 14px 14px 14px',
              padding: '12px 16px',
              fontSize: 14,
              color: 'white',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {msg.content}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} max-w-[80%] ${isOwn ? 'ml-auto' : ''}`}
    >
      {!isOwn && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-1"
          style={{ backgroundColor: emailToColor(msg.sender_email) }}
        >
          {getInitials(msg.sender_email)}
        </div>
      )}
      <div className={isOwn ? 'items-end flex flex-col' : ''}>
        {showHeader && !isOwn && (
          <div className="flex items-center gap-2 mb-1 ml-1">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{senderName}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{time}</span>
          </div>
        )}
        <div
          style={{
            background: isOwn ? 'white' : 'rgba(255,255,255,0.07)',
            color: isOwn ? 'black' : 'white',
            borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            padding: '10px 14px',
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: '100%',
            whiteSpace: 'pre-wrap',
          }}
        >
          {msg.content}
        </div>
        {isOwn && (
          <span className="mt-1 mr-1" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{time}</span>
        )}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}
      >
        ✦
      </div>
      <div
        className="px-4 py-3 flex gap-1.5 items-center"
        style={{
          background: 'rgba(20,15,5,0.9)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderLeft: '3px solid #f59e0b',
          borderRadius: '0 14px 14px 14px',
        }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: '#f59e0b',
              opacity: 0.7,
              animation: `bounce 1.2s ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const { messages, sendMessage, sendAiMessage } = useTeamMessages();
  const { tasks } = useTasks();
  const [input, setInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showTaskSearch, setShowTaskSearch] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [mentionedTask, setMentionedTask] = useState<{ id: string; title: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(taskSearch.toLowerCase())
  ).slice(0, 8);

  const handleSend = async (askAI = false) => {
    const text = input.trim();
    if (!text || !user) return;
    setInput('');
    setMentionedTask(null);

    const isAiRequest = askAI || text.toLowerCase().startsWith('/ai');
    const userContent = isAiRequest && text.toLowerCase().startsWith('/ai')
      ? text.slice(3).trim()
      : text;

    if (!userContent) return;

    await sendMessage.mutateAsync({ content: userContent, mentions_task_id: mentionedTask?.id });

    if (isAiRequest) {
      setIsAiTyping(true);
      try {
        const aiText = await callClaudeWithTasks(tasks, messages, userContent);
        await sendAiMessage.mutateAsync({ content: aiText });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        await sendAiMessage.mutateAsync({ content: `Erro ao contactar AI: ${message}` });
      } finally {
        setIsAiTyping(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(false);
    }
  };

  // Group consecutive messages from same user
  const groupedMessages = messages.map((msg, i) => {
    const prev = messages[i - 1];
    const showHeader = !prev || prev.sender_email !== msg.sender_email || prev.is_ai !== msg.is_ai;
    return { msg, showHeader };
  });

  const uniqueSenders = Array.from(new Set(messages.slice(-50).map(m => m.sender_email).filter(e => e !== 'ai@sistema')));

  return (
    <div className="min-h-screen" style={{ background: '#080808' }}>
      <AppSidebar />
      <MobileNav />

      <div className="md:ml-[240px] flex flex-col h-screen">
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{
            height: 60,
            padding: '0 28px',
            background: '#080808',
            borderBottom: '1px solid var(--glass-divider)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💬</span>
            <h2 className="text-white" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Chat de Equipa
            </h2>
            {/* Members online */}
            <div className="flex items-center gap-1.5 ml-2">
              {uniqueSenders.slice(0, 4).map(email => (
                <div
                  key={email}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ backgroundColor: emailToColor(email) }}
                  title={email}
                >
                  {getInitials(email)}
                </div>
              ))}
            </div>
          </div>
          {/* AI badge */}
          <div
            className="flex items-center gap-2"
            style={{
              padding: '6px 12px',
              borderRadius: 99,
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#f59e0b', boxShadow: '0 0 6px #f59e0b', animation: 'pulse 2s infinite' }}
            />
            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>✦ AI está disponível</span>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '24px 28px' }}>
          {messages.length === 0 && !isAiTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <span className="text-5xl block mb-4">💬</span>
              <h3 style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>Ainda sem mensagens</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 8 }}>
                Começa a conversa com a equipa ou usa <strong>/ai</strong> para perguntar ao assistente.
              </p>
            </motion.div>
          )}
          <div className="space-y-2 max-w-4xl mx-auto">
            {groupedMessages.map(({ msg, showHeader }) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isOwn={msg.sender_email === user?.email}
                showHeader={showHeader}
              />
            ))}
            {isAiTyping && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input area */}
        <div
          className="flex-shrink-0"
          style={{
            borderTop: '1px solid var(--glass-divider)',
            padding: '12px 28px 16px',
            background: '#080808',
          }}
        >
          {/* Mentioned task chip */}
          {mentionedTask && (
            <div className="flex items-center gap-2 mb-2">
              <div
                className="flex items-center gap-2"
                style={{
                  padding: '4px 10px',
                  background: 'rgba(96,165,250,0.1)',
                  border: '1px solid rgba(96,165,250,0.2)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#60a5fa',
                }}
              >
                <span>#</span>
                <span>{mentionedTask.title}</span>
                <button onClick={() => setMentionedTask(null)} style={{ color: 'rgba(96,165,250,0.6)', marginLeft: 4 }}>×</button>
              </div>
            </div>
          )}

          {/* Task search dropdown */}
          <AnimatePresence>
            {showTaskSearch && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mb-2"
                style={{
                  background: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: 8,
                }}
              >
                <input
                  autoFocus
                  value={taskSearch}
                  onChange={e => setTaskSearch(e.target.value)}
                  placeholder="Pesquisar tarefa..."
                  className="outline-none"
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: 13,
                    padding: '4px 8px',
                    marginBottom: 4,
                  }}
                />
                {filteredTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setMentionedTask({ id: t.id, title: t.title });
                      setShowTaskSearch(false);
                      setTaskSearch('');
                    }}
                    className="w-full text-left"
                    style={{
                      padding: '6px 8px',
                      borderRadius: 8,
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.8)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    # {t.title}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            {/* User avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: emailToColor(user?.email ?? '') }}
            >
              {getInitials(user?.email ?? 'U')}
            </div>

            <div className="flex-1">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escreve uma mensagem... (usa /ai para perguntar ao assistente)"
                rows={1}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.5,
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.25)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              />
              {/* Quick action pills */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => { setShowTaskSearch(!showTaskSearch); setTaskSearch(''); }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 600,
                    background: showTaskSearch ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${showTaskSearch ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    color: showTaskSearch ? '#60a5fa' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  # tarefa
                </button>
                <button
                  onClick={() => handleSend(true)}
                  disabled={!input.trim() || isAiTyping}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 600,
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    color: '#f59e0b',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    opacity: !input.trim() || isAiTyping ? 0.4 : 1,
                  }}
                >
                  ✦ Perguntar à AI
                </button>
              </div>
            </div>

            {/* Send button */}
            <button
              onClick={() => handleSend(false)}
              disabled={!input.trim()}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'white',
                color: 'black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                transition: 'opacity 0.15s',
                opacity: !input.trim() ? 0.3 : 1,
                flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
