export default function CountdownBanner() {
  const target = new Date('2026-06-01T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const isUrgent = days <= 14 && days >= 0;

  if (days < 0) {
    return (
      <div
        className="text-center"
        style={{
          padding: '10px 28px',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))',
          borderBottom: '1px solid rgba(245,158,11,0.15)',
          fontSize: 12,
          color: 'rgba(245,158,11,0.8)',
        }}
      >
        🎉 Loja aberta!
      </div>
    );
  }

  if (days === 0) {
    return (
      <div
        className="text-center countdown-pulse"
        style={{
          padding: '10px 28px',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))',
          borderBottom: '1px solid rgba(245,158,11,0.15)',
          fontSize: 12,
          color: 'rgba(245,158,11,0.8)',
        }}
      >
        🎉 Hoje é o dia da abertura!
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: '10px 28px',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))',
        borderBottom: '1px solid rgba(245,158,11,0.15)',
        fontSize: 12,
        color: 'rgba(245,158,11,0.8)',
      }}
    >
      <span>🏪</span>
      <span>Abertura da loja em</span>
      <span
        className={isUrgent ? 'countdown-pulse' : ''}
        style={{ fontWeight: 800, color: '#f59e0b', fontSize: 14 }}
      >
        {days}
      </span>
      <span>dias — 1 de Junho de 2026 · Rua Sá da Bandeira 150, Porto</span>
    </div>
  );
}
