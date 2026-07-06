import { useState, useEffect } from 'react';
import { MAX_SESSION_MINUTES } from '../types';

interface Props {
  active: boolean;
  startedAt: number;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SessionTimer({ active, startedAt }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);

  const maxSeconds = MAX_SESSION_MINUTES * 60;
  const warning = elapsed >= (maxSeconds - 5 * 60);
  const exceeded = elapsed >= maxSeconds;

  return (
    <div className={`session-timer ${warning ? 'session-timer--warning' : ''}`}>
      ⏱️ {formatTime(elapsed)} / {MAX_SESSION_MINUTES}:00
      {exceeded && ' – הפסקה!'}
    </div>
  );
}
