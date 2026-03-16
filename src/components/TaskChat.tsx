import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Task, getAreaLabel, getStatusInfo } from '@/lib/supabase';
import { useTaskMessages, TaskMessage } from '@/hooks/useTaskMessages';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

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

function MessageBubble({ msg }: { msg: TaskMessage }) {
  const isAI = msg.is_ai;
  const time = msg.created_at
    ? format(parseISO(msg.created_at), 'HH:mm', { locale: pt })
    : '';

  return (
    <div className={`flex flex-col ${isAI ? 'items-start' : 'items-end'} gap-0.5`}>
      {isAI && (
        <span className="text-[10px] text-muted-foreground ml-1 mb-0.5">✦ AI</span>
      )}
      <div
        className="max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed"
        style={{
          backgroundColor: isAI ? '#1a1a1a' : '#ffffff',
          color: isAI ? '#ffffff' : '#000000',
          borderRadius: isAI
            ? '18px 18px 18px 4px'
            : '18px 18px 4px 18px',
        }}
      >
        {msg.content}
      </div>
      <span className="text-[10px] text-muted-foreground px-1">
        {isAI ? 'AI' : msg.sender_email.split('@')[0]} · {time}
      </span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="text-[10px] text-muted-foreground ml-1 mb-0.5">✦ AI está a pensar...</span>
      <div
        className="px-4 py-3 flex gap-1 items-center"
        style={{ backgroundColor: '#1a1a1a', borderRadius: '18px 18px 18px 4px' }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white opacity-60"
            style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function TaskChat({ task }: Props) {
  const { user } = useAuth();
  const { messages, sendMessage, sendAiMessage } = useTaskMessages(task.id);
  const [input, setInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  const handleSend = async (askAI = false) => {
    const text = input.trim();
    if (!text || !user) return;

    setInput('');

    // Detect @ai prefix
    const isAiRequest = askAI || text.toLowerCase().startsWith('@ai');
    const userContent = isAiRequest && text.toLowerCase().startsWith('@ai')
      ? text.slice(3).trim()
      : text;

    if (!userContent) return;

    // Send user message
    await sendMessage.mutateAsync({ content: userContent });

    if (isAiRequest) {
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background min-h-0">
        {messages.length === 0 && !isAiTyping && (
          <div className="text-center py-12">
            <span className="text-3xl block mb-2">💬</span>
            <p className="text-xs text-muted-foreground">
              Sem mensagens ainda. Começa a discussão ou pergunta à AI.
            </p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
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
