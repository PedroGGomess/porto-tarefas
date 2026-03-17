export default function CountdownBanner() {
  const openingDate = new Date('2026-06-01');
  const today = new Date();
  const diffDays = Math.ceil((openingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const isUrgent = diffDays <= 14 && diffDays > 0;

  if (diffDays <= 0) {
    return (
      <div
        style={{
          padding: '10px 28px',
          background: 'linear-gradient(90deg, rgba(245,158,11,0.07), rgba(245,158,11,0.03), transparent)',
          borderBottom: '1px solid rgba(245,158,11,0.12)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
        }}
      >
        🎉 Hoje é o dia da abertura! Bem-vindo à The 100's.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '10px 28px',
        background: 'linear-gradient(90deg, rgba(245,158,11,0.07), rgba(245,158,11,0.03), transparent)',
        borderBottom: '1px solid rgba(245,158,11,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>🏪</span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Abertura da loja em</span>
      <span
        className={isUrgent ? 'countdown-pulse' : ''}
        style={{
          background: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 6,
          padding: '1px 8px',
          color: '#f59e0b',
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        {diffDays}
      </span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
        dia{diffDays !== 1 ? 's' : ''} — 1 de Junho de 2026 · Rua Sá da Bandeira 150, Porto
      </span>
    </div>
  );
}
