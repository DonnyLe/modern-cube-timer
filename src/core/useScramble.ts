import { useCallback, useEffect, useRef, useState } from 'react';
import { loadScramble } from './cubing';
let queued: Promise<string> | null = null;
const generate = () =>
  loadScramble()
    .then((m) => m.randomScrambleForEvent('333'))
    .then((a) => a.toString());
function prefetch() {
  const pending = generate();
  queued = pending;
  void pending.catch(() => {
    if (queued === pending) queued = null;
  });
}
export function useScramble() {
  const [scramble, setScramble] = useState(''),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const inFlight = useRef(false);
  const next = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const pending = queued || generate();
      queued = null;
      const result = await pending;
      setScramble(result);
      setError('');
      prefetch();
    } catch {
      setError('Scramble could not load. Retry to continue.');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void next();
  }, [next]);
  return { scramble, loading, error, next };
}
