import * as React from 'react';
import { Clock3 } from 'lucide-react';

interface ElectionCountdownCardProps {
  election: {
    title?: string;
    endAt?: string;
    endDate?: string;
  } | null;
  language?: 'ar' | 'en';
}

function getRemainingTime(target?: string | null) {
  if (!target) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const total = Math.max(new Date(target).getTime() - Date.now(), 0);

  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

export function ElectionCountdownCard({
  election,
  language = 'ar',
}: ElectionCountdownCardProps) {
  const endAt = election?.endAt || election?.endDate || '';
  const [remaining, setRemaining] = React.useState(() => getRemainingTime(endAt));

  React.useEffect(() => {
    setRemaining(getRemainingTime(endAt));

    if (!endAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemaining(getRemainingTime(endAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [endAt]);

  if (!election || !endAt) {
    return null;
  }

  const t =
    language === 'ar'
      ? { ended: 'انتهى وقت الانتخابات', units: ['Days', 'Hours', 'Minutes', 'Seconds'] }
      : { ended: 'The election has ended', units: ['Days', 'Hours', 'Minutes', 'Seconds'] };

  const blocks = [
    { label: t.units[0], value: remaining.days },
    { label: t.units[1], value: remaining.hours },
    { label: t.units[2], value: remaining.minutes },
    { label: t.units[3], value: remaining.seconds },
  ];

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-amber-300 bg-amber-50/95 px-2.5 py-2.5 shadow-sm">
      {remaining.total > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {blocks.map((block) => (
            <div key={block.label} className="text-center">
              <div className="mb-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                {block.label}
              </div>
              <div className="rounded-lg border border-black/10 bg-neutral-900 px-1 py-2 shadow-sm">
                <div className="text-xl font-black leading-none tracking-[0.03em] text-white">
                  {String(block.value).padStart(2, '0')}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-neutral-900 px-3 py-3 text-center text-sm font-black text-white">
          {t.ended}
        </div>
      )}
    </section>
  );
}
