import { useEffect, useState } from 'react';

export function useRetryCountdown(retryAt: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = Math.max(0, Math.ceil(((retryAt ?? 0) - now) / 1000));

  useEffect(() => {
    if (!retryAt || secondsLeft === 0) return;
    const initialTick = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => {
      clearTimeout(initialTick);
      clearInterval(timer);
    };
  }, [retryAt, secondsLeft]);

  return secondsLeft;
}
