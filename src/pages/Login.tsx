import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Conta criada! Verifique o seu email.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: '#080808',
      }}
    >
      {/* Radial glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(245,158,11,0.06) 0%, transparent 70%)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full relative z-10"
        style={{ maxWidth: 400 }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            borderRadius: 24,
            backdropFilter: 'blur(40px)',
            boxShadow: '0 40px 80px rgba(0, 0, 0, 0.5)',
            padding: 40,
          }}
        >
          {/* Logo area */}
          <div className="flex flex-col items-center" style={{ marginBottom: 28 }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: 10,
                background: '#000',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <span className="text-white font-bold" style={{ fontSize: 14, letterSpacing: '-0.5px' }}>100</span>
            </div>
            <h1
              className="text-white font-semibold uppercase"
              style={{ fontSize: 12, letterSpacing: '0.25em' }}
            >
              THE 100'S
            </h1>
            <p
              className="mt-1"
              style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 11, letterSpacing: '0.05em' }}
            >
              Gestor de Tarefas
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <label
                className="block mb-1.5 uppercase"
                style={{
                  fontSize: 11,
                  color: 'rgba(255, 255, 255, 0.5)',
                  letterSpacing: '0.08em',
                  fontWeight: 500,
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nome@empresa.pt"
                className="w-full text-white transition-all duration-200 outline-none"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 10,
                  padding: '13px 16px',
                  fontSize: 13,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.05)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              <label
                className="block mb-1.5 uppercase"
                style={{
                  fontSize: 11,
                  color: 'rgba(255, 255, 255, 0.5)',
                  letterSpacing: '0.08em',
                  fontWeight: 500,
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full text-white transition-all duration-200 outline-none"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 10,
                  padding: '13px 16px',
                  fontSize: 13,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.05)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="pt-2"
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-black font-semibold transition-all duration-150 active:scale-[0.99]"
                style={{
                  height: 46,
                  borderRadius: 12,
                  background: loading ? 'rgba(255, 255, 255, 0.85)' : 'white',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={(e) => {
                  if (!loading) (e.target as HTMLButtonElement).style.transform = 'scale(1.01)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'scale(1)';
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    A entrar...
                  </>
                ) : isSignUp ? (
                  'Criar Conta'
                ) : (
                  'Entrar'
                )}
              </button>
            </motion.div>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
            {isSignUp ? 'Já tem conta?' : 'Não tem conta?'}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-white hover:underline underline-offset-2"
            >
              {isSignUp ? 'Entrar' : 'Criar conta'}
            </button>
          </p>

          <p
            className="text-center mt-8"
            style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: 11 }}
          >
            The 100's — Plataforma interna
          </p>
        </div>
      </motion.div>
    </div>
  );
}
