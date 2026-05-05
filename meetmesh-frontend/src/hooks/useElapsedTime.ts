import { useState, useEffect } from 'react';

export function useElapsedTime(startedAt: string | undefined): string {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!startedAt) return;

    const start  = new Date(startedAt).getTime();
    const update = () => {
      const diff = Date.now() - start;
      const h    = Math.floor(diff / 3_600_000);
      const m    = Math.floor((diff % 3_600_000) / 60_000);
      const s    = Math.floor((diff % 60_000) / 1000);
      setElapsed(h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return elapsed;
}
