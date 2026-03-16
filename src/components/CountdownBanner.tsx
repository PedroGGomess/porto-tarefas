export default function CountdownBanner() {
  const target = new Date('2026-06-01T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const isUrgent = days <= 14 && days >= 0;
  const bg = isUrgent
    ? 'linear-gradient(135deg, #1a0000, #2d0000)'
    : 'linear-gradient(135deg, #1a0a00, #2d1200)';

  if (days < 0) {
    return (
      <div
        className="text-center py-3 px-4 text-sm font-semibold text-[#f59e0b]"
        style={{ background: bg }}
      >
        🎉 Loja aberta!
      </div>
    );
  }

  if (days === 0) {
    return (
      <div
        className={`text-center py-3 px-4 text-sm font-semibold text-[#f59e0b] ${isUrgent ? 'animate-pulse' : ''}`}
        style={{ background: bg }}
      >
        🎉 Hoje é o dia da abertura!
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 py-3 px-4 text-sm ${isUrgent ? 'animate-pulse' : ''}`}
      style={{ background: bg }}
    >
      <span className="text-[#f59e0b]">🏪  Abertura da loja em</span>
      <span className="text-2xl font-bold text-white">{days}</span>
      <span className="text-[#f59e0b]">dias  —  1 de Junho de 2026,  Rua Sá da Bandeira 150, Porto</span>
    </div>
  );
}
