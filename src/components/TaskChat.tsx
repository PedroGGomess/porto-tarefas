import { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown, ChevronUp, Copy, Mail } from 'lucide-react';
import { Task, getAreaLabel, getStatusInfo } from '@/lib/supabase';
import { useTaskMessages, TaskMessage } from '@/hooks/useTaskMessages';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type Props = {
  task: Task;
};

const BRAND_SYSTEM_PROMPT = `És o assistente de IA da The 100's — uma loja de vinho premium do Porto, Portugal, com abertura prevista para 1 de Junho de 2026.

A tua função é ajudar a equipa a gerir, discutir e resolver as tarefas do projeto de abertura da loja. Responde sempre em português europeu, de forma concisa e prática.

Ao responder sobre uma tarefa específica:
- Analisa o contexto completo da tarefa
- Sugere soluções concretas e acionáveis
- Identifica bloqueios e como os resolver
- Ajuda a escrever atualizações e comunicações
- Mantém sempre o foco no objetivo: abrir a loja com sucesso`;

function buildTaskContext(task: Task): string {
  return `
TAREFA: ${task.title}
ÁREA: ${getAreaLabel(task.area)}
ESTADO: ${getStatusInfo(task.status).label}
PRIORIDADE: ${task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Média' : 'Baixa'}
PRAZO: ${task.deadline ?? 'Sem prazo definido'}
DESCRIÇÃO: ${task.description ?? 'Sem descrição'}
RESPONSÁVEL: ${task.responsavel ?? 'Não atribuído'}
EMAIL: ${task.responsavel_email ?? 'Sem email'}

Responde às perguntas sobre esta tarefa, sugere soluções, ajuda a desbloqueá-la ou a escrever atualizações. Sê conciso e prático.`;
}

async function callClaude(
  task: Task,
  messages: TaskMessage[],
  userQuestion: string
): Promise<string> {
  const recentMessages = messages.slice(-20).map(m => ({
    role: m.is_ai ? 'assistant' as const : 'user' as const,
    content: m.content,
  }));

  const systemPrompt = `${BRAND_SYSTEM_PROMPT}\n\n${buildTaskContext(task)}`;

  const { data, error } = await supabase.functions.invoke('ask-ai', {
    body: { systemPrompt, messages: recentMessages, userMessage: userQuestion },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return (data as { text?: string })?.text ?? 'Sem resposta da AI.';
}

type EmailDraft = { subject: string; body: string } | null;

function parseEmailDraft(content: string): EmailDraft {
  const subjectMatch = content.match(/Assunto:\s*(.+)/i);
  const bodyMatch = content.match(/Corpo:\s*([\s\S]+)/i) || content.match(/---\s*([\s\S]+)/);
  if (subjectMatch && bodyMatch) {
    return { subject: subjectMatch[1].trim(), body: bodyMatch[1].trim() };
  }
  return null;
}

function MessageBubble({ msg, task }: { msg: TaskMessage; task: Task }) {
  const isAI = msg.is_ai;
  const [emailExpanded, setEmailExpanded] = useState(false);
  const time = msg.created_at
    ? format(parseISO(msg.created_at), 'HH:mm', { locale: pt })
    : '';

  const isEmailDraft = isAI && (msg.content.toLowerCase().includes('assunto:') || msg.content.toLowerCase().includes('rascunho de email'));
  const emailDraft = isEmailDraft ? parseEmailDraft(msg.content) : null;

  if (isAI) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-[10px] ml-1 mb-0.5" style={{ color: '#f59e0b' }}>✦ The 100's AI</span>
        {isEmailDraft && emailDraft ? (
          <div
            style={{
              background: '#0f0f0f',
              border: '1px solid rgba(245,158,11,0.2)',
              borderLeft: '3px solid #f59e0b',
              borderRadius: '0 14px 14px 14px',
              padding: '12px 16px',
              maxWidth: '85%',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Mail size={14} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>Rascunho de email</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Para: {task.responsavel_email ?? task.responsavel ?? 'destinatário'}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>Assunto: {emailDraft.subject}</p>
            <button
              onClick={() => setEmailExpanded(!emailExpanded)}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)', marginBottom: emailExpanded ? 8 : 0 }}
            >
              {emailExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {emailExpanded ? 'Fechar pré-visualização' : 'Ver corpo do email'}
            </button>
            {emailExpanded && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
                {emailDraft.body}
              </p>
            )}
            <div className="flex gap-2 mt-2">
              <a
                href={`mailto:${task.responsavel_email ?? ''}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`}
                style={{
                  padding: '5px 10px',
                  borderRadius: 8,
                  background: 'rgba(245,158,11,0.15)',
                  color: '#f59e0b',
                  fontSize: 11,
                  fontWeight: 600,
                  textDecoration: 'none',
                  border: '1px solid rgba(245,158,11,0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Mail size={11} /> Abrir no Mail
              </a>
              <button
                onClick={() => { navigator.clipboard.writeText(`${emailDraft.subject}\n\n${emailDraft.body}`); toast.success('Email copiado!'); }}
                style={{
                  padding: '5px 10px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 11,
                  fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Copy size={11} /> Copiar
              </button>
            </div>
          </div>
        ) : (
          <div
            className="max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed"
            style={{
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              borderLeft: '3px solid #f59e0b',
              borderRadius: '0 14px 14px 14px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {msg.content}
          </div>
        )}
        <span className="text-[10px] text-muted-foreground px-1">AI · {time}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div
        className="max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed"
        style={{
          backgroundColor: '#ffffff',
          color: '#000000',
          borderRadius: '14px 14px 4px 14px',
        }}
      >
        {msg.content}
      </div>
      <span className="text-[10px] text-muted-foreground px-1">
        {msg.sender_email.split('@')[0]} · {time}
      </span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="text-[10px] ml-1 mb-0.5" style={{ color: '#f59e0b' }}>✦ AI está a pensar...</span>
      <div
        className="px-4 py-3 flex gap-1 items-center"
        style={{
          backgroundColor: '#1a1a1a',
          borderLeft: '3px solid #f59e0b',
          borderRadius: '0 14px 14px 14px',
        }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#f59e0b', animation: `bounce 1.2s ${i * 0.2}s infinite`, opacity: 0.7 }}
          />
        ))}
      </div>
    </div>
  );
}

const QUICK_PROMPTS = [
  { label: '💡 Sugerir próximos passos', prompt: 'Quais são os próximos passos concretos para avançar nesta tarefa?' },
  { label: '⚠️ Identificar riscos', prompt: 'Quais são os principais riscos e bloqueios desta tarefa?' },
  { label: '📝 Resumir tarefa', prompt: 'Faz um resumo executivo desta tarefa para partilhar com a equipa.' },
  { label: '📧 Redigir email', prompt: `Redige um email profissional para o responsável sobre esta tarefa. Formato:\nAssunto: [assunto]\nCorpo:\n[corpo do email]` },
];

export default function TaskChat({ task }: Props) {
  const { user } = useAuth();
  const { messages, sendMessage, sendAiMessage } = useTaskMessages(task.id);
  const [input, setInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  const handleSend = async (askAI = false, customPrompt?: string) => {
    const text = customPrompt ?? input.trim();
    if (!text || !user) return;

    if (!customPrompt) setInput('');

    const isAiRequest = askAI || text.toLowerCase().startsWith('@ai');
    const userContent = isAiRequest && text.toLowerCase().startsWith('@ai')
      ? text.slice(3).trim()
      : text;

    if (!userContent) return;

    await sendMessage.mutateAsync({ content: userContent });

    if (isAiRequest || customPrompt) {
      setIsAiTyping(true);
      try {
        const aiText = await callClaude(task, messages, userContent);
        await sendAiMessage.mutateAsync({ content: aiText });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        await sendAiMessage.mutateAsync({
          content: `Erro ao contactar AI: ${message}`,
        });
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

  const statusInfo = getStatusInfo(task.status);
  const deadlineText = task.deadline ? new Date(task.deadline).toLocaleDateString('pt-PT') : 'Sem prazo';

  return (
    <div className="flex flex-col h-full">
      {/* AI Context bar */}
      <div
        style={{
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 10,
          margin: '8px 12px 0',
          padding: '8px 12px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setContextExpanded(!contextExpanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span style={{ color: '#f59e0b', fontSize: 13 }}>✦</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              AI tem acesso a esta tarefa
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{getAreaLabel(task.area)}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontSize: 11, color: statusInfo.color }}>{statusInfo.label}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{deadlineText}</span>
          </div>
          {contextExpanded ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.4)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />}
        </button>
        <AnimatePresence>
          {contextExpanded && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}
            >
              "Pergunta-me qualquer coisa sobre esta tarefa"
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Quick AI prompts */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto flex-shrink-0">
        {QUICK_PROMPTS.map(qp => (
          <button
            key={qp.label}
            onClick={() => handleSend(true, qp.prompt)}
            disabled={isAiTyping}
            style={{
              padding: '5px 10px',
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              opacity: isAiTyping ? 0.4 : 1,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLButtonElement).style.color = 'white';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)';
            }}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background min-h-0">
        {messages.length === 0 && !isAiTyping && (
          <div className="text-center py-8">
            <span className="text-3xl block mb-2">💬</span>
            <p className="text-xs text-muted-foreground">
              Sem mensagens ainda. Usa os atalhos acima ou faz uma pergunta à AI.
            </p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} task={task} />
        ))}
        {isAiTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex-shrink-0 border-t border-border p-3 flex gap-2 items-end">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreve uma mensagem ou pergunta à AI..."
          className="flex-1 px-4 py-2.5 rounded-full bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border-hover transition-colors"
        />
        <button
          onClick={() => handleSend(false)}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 flex-shrink-0"
        >
          <Send size={14} />
        </button>
        <button
          onClick={() => handleSend(true)}
          disabled={!input.trim() || isAiTyping}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#111] border border-[#333] text-white text-xs font-semibold hover:bg-[#1a1a1a] transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          ✦ Perguntar à AI
        </button>
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
