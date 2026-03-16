import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { Task, getStatusInfo, getAreaLabel } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { isPast, parseISO } from 'date-fns';

type Props = {
  tasks: Task[];
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const GLOBAL_SYSTEM_PROMPT = `És o assistente de IA da The 100's — uma loja de vinho premium do Porto, Portugal, com abertura prevista para 1 de Junho de 2026.

A tua função é ajudar a equipa a gerir o projeto de abertura da loja. Responde sempre em português europeu, de forma concisa e prática.

Tens acesso ao estado atual das tarefas e podes ajudar com:
- Resumos do estado do projeto
- Identificar tarefas em risco
- Sugerir próximas ações
- Responder a perguntas sobre o projeto`;

const MAX_TASKS_FOR_AI_CONTEXT = 30; // limit context size to manage token usage

function buildProjectContext(tasks: Task[]): string {
  const total = tasks.length;
  const byStatus = {
    pendente: tasks.filter(t => t.status === 'pendente').length,
    'em-curso': tasks.filter(t => t.status === 'em-curso').length,
    concluido: tasks.filter(t => t.status === 'concluido').length,
    bloqueado: tasks.filter(t => t.status === 'bloqueado').length,
  };
  const overdue = tasks.filter(t => t.deadline && t.status !== 'concluido' && isPast(parseISO(t.deadline)));
  const blocked = tasks.filter(t => t.status === 'bloqueado');

  const taskList = tasks.slice(0, MAX_TASKS_FOR_AI_CONTEXT).map(t =>
    `- [${getStatusInfo(t.status).label}] ${t.title} (${getAreaLabel(t.area)}${t.deadline ? `, prazo: ${t.deadline}` : ''}${t.responsavel ? `, resp: ${t.responsavel}` : ''})`
  ).join('\n');

  return `
ESTADO DO PROJETO (${total} tarefas total):
- Pendentes: ${byStatus.pendente}
- Em curso: ${byStatus['em-curso']}
- Concluídas: ${byStatus.concluido}
- Bloqueadas: ${byStatus.bloqueado}
- Atrasadas: ${overdue.length}

TAREFAS BLOQUEADAS: ${blocked.map(t => t.title).join(', ') || 'Nenhuma'}
TAREFAS ATRASADAS: ${overdue.map(t => t.title).join(', ') || 'Nenhuma'}

LISTA DE TAREFAS:
${taskList}`;
}

async function callAI(tasks: Task[], messages: Message[], userMessage: string): Promise<string> {
  const context = buildProjectContext(tasks);
  const systemPrompt = `${GLOBAL_SYSTEM_PROMPT}\n\n${context}`;

  const msgHistory = messages.slice(-20).map(m => ({
    role: m.role,
    content: m.content,
  }));

  const { data, error } = await supabase.functions.invoke('ask-ai', {
    body: { systemPrompt, messages: msgHistory, userMessage },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return (data as { text?: string })?.text ?? 'Sem resposta da AI.';
}

export default function GlobalAIAssistant({ tasks }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Olá! Sou o assistente AI da The 100\'s. Como posso ajudar?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hasOverdue = tasks.some(t => t.deadline && t.status !== 'concluido' && isPast(parseISO(t.deadline)));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await callAI(tasks, [...messages, userMsg], trimmed);
      setMessages(m => [...m, { id: Date.now().toString() + '_ai', role: 'assistant', content: response }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setMessages(m => [...m, { id: Date.now().toString() + '_err', role: 'assistant', content: `Erro: ${msg}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickActions = [
    { label: '📋 Pendentes', prompt: 'Quais são as tarefas pendentes mais importantes?' },
    { label: '🚫 Bloqueadas', prompt: 'Que tarefas estão bloqueadas e como as desbloquear?' },
    { label: '📅 Hoje', prompt: 'O que deve ser feito hoje com base nas prioridades e prazos?' },
    { label: '➕ Nova tarefa', prompt: 'Que tarefas importantes podem estar em falta no projeto?' },
    { label: '📊 Resumo', prompt: 'Dá-me um resumo do estado atual do projeto de abertura da loja.' },
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-black text-white flex items-center justify-center text-xl shadow-lg z-40 hover:scale-105 transition-transform ${hasOverdue ? 'ring-2 ring-destructive ring-offset-2 ring-offset-background animate-pulse' : ''}`}
        title="Assistente AI"
      >
        ✦
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="ai-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="ai-panel"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 z-50 h-full w-full sm:w-[380px] bg-card border-l border-border flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex-shrink-0 px-4 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">✦ Assistente AI</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">The 100's · Porto</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 hover:bg-surface-raised rounded-md transition-colors"
                >
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>

              {/* Quick actions */}
              <div className="flex-shrink-0 px-3 py-2.5 border-b border-border flex gap-1.5 overflow-x-auto scrollbar-none">
                {quickActions.map(a => (
                  <button
                    key={a.label}
                    onClick={() => sendMessage(a.prompt)}
                    disabled={isTyping}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-surface-raised border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-border-hover transition-colors disabled:opacity-50"
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-background">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.role === 'assistant' ? 'items-start' : 'items-end'} gap-0.5`}>
                    {msg.role === 'assistant' && (
                      <span className="text-[10px] text-muted-foreground ml-1">✦ AI</span>
                    )}
                    <div
                      className="max-w-[85%] px-3.5 py-2.5 text-xs leading-relaxed"
                      style={{
                        backgroundColor: msg.role === 'assistant' ? '#1a1a1a' : '#ffffff',
                        color: msg.role === 'assistant' ? '#ffffff' : '#000000',
                        borderRadius: msg.role === 'assistant' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[10px] text-muted-foreground ml-1">✦ AI está a pensar...</span>
                    <div className="px-4 py-3 flex gap-1 items-center" style={{ backgroundColor: '#1a1a1a', borderRadius: '16px 16px 16px 4px' }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-white opacity-60" style={{ animation: `ai-bounce 1.2s ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 border-t border-border p-3 flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  rows={1}
                  placeholder="Pergunta ao assistente AI..."
                  className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border-hover transition-colors resize-none"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isTyping}
                  className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-40 flex-shrink-0"
                >
                  <Send size={13} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes ai-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
