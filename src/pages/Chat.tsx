import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import AppSidebar from '@/components/AppSidebar';

interface Message {
  id: string;
  sender_email: string;
  sender_name: string;
  content: string;
  is_ai: boolean;
  created_at: string;
}

export default function Chat() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    // Load last 50 messages
    supabase
      .from('team_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => { if (data) setMessages(data); });

    // Realtime subscription
    const channel = supabase
      .channel('team_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' },
        (payload) => setMessages(prev => [...prev, payload.new as Message]))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string, isAi = false) => {
    if (!user || !content.trim()) return;
    await supabase.from('team_messages').insert({
      user_id: user.id,
      sender_email: user.email,
      sender_name: user.email?.split('@')[0] ?? 'Utilizador',
      content: content.trim(),
      is_ai: isAi,
    });
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    await sendMessage(msg);
    setSending(false);
  };

  const handleAsk = async () => {
    if (!input.trim() || sending) return;
    const question = input.trim();
    setInput('');
    setSending(true);
    await sendMessage(question);

    // Call Claude API
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          system: 'És o assistente AI da The 100\'s, marca premium de vinho do Porto. Responde sempre em português europeu, de forma concisa e profissional.',
          messages: [{ role: 'user', content: question }],
        }),
      });
      const data = await res.json();
      const aiText = data?.content?.[0]?.text ?? 'Não foi possível obter resposta.';
      await sendMessage(aiText, true);
    } catch {
      await sendMessage('Erro ao contactar a AI. Tenta novamente.', true);
    }
    setSending(false);
  };

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/" replace />;

  const getInitials = (email: string) => email.slice(0, 2).toUpperCase();
  const getColor = (email: string) => {
    const colors = ['#60a5fa','#a78bfa','#34d399','#f472b6','#fb923c','#38bdf8'];
    return colors[email.charCodeAt(0) % colors.length];
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <main className="md:ml-[220px] flex flex-col flex-1 h-screen">
        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>💬 Chat de Equipa</h2>
            <p style={{ color: '#555', fontSize: 12, marginTop: 2 }}>Conversa com a equipa e pede ajuda à AI</p>
          </div>
          <span style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 99, padding: '4px 10px', fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
            ✦ AI disponível
          </span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#555', marginTop: 60, fontSize: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              Sem mensagens ainda. Começa a conversa!
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: m.sender_email === user.email && !m.is_ai ? 'row-reverse' : 'row' }}>
              {/* Avatar */}
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.is_ai ? '#f59e0b' : getColor(m.sender_email), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                {m.is_ai ? '✦' : getInitials(m.sender_email)}
              </div>
              {/* Bubble */}
              <div style={{ maxWidth: '70%' }}>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 3, textAlign: m.sender_email === user.email && !m.is_ai ? 'right' : 'left' }}>
                  {m.is_ai ? 'The 100\'s AI' : m.sender_name}
                </div>
                <div style={{
                  background: m.is_ai ? 'rgba(245,158,11,0.06)' : m.sender_email === user.email ? '#fff' : '#1a1a1a',
                  color: m.sender_email === user.email && !m.is_ai ? '#000' : '#fff',
                  border: m.is_ai ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: m.sender_email === user.email && !m.is_ai ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '10px 14px', fontSize: 13, lineHeight: 1.5,
                  borderLeft: m.is_ai ? '3px solid #f59e0b' : undefined,
                }}>
                  {m.content}
                </div>
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#555', fontSize: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#f59e0b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#000', fontWeight: 700 }}>✦</span>
              A escrever...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Escreve uma mensagem..."
              style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 99, padding: '10px 16px', color: '#fff', fontSize: 13, outline: 'none' }}
            />
            <button onClick={handleSend} disabled={!input.trim() || sending}
              style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 99, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: !input.trim() ? 0.4 : 1 }}>
              Enviar
            </button>
          </div>
          <button onClick={handleAsk} disabled={!input.trim() || sending}
            style={{ alignSelf: 'flex-start', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 99, padding: '6px 14px', color: '#f59e0b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ✦ Perguntar à AI
          </button>
        </div>
      </main>
    </div>
  );
}
