import { useEffect, useState } from 'react';
let queued: Promise<string> | null = null;
const generate = () =>
  import('cubing/scramble').then((m) => m.randomScrambleForEvent('333')).then((a) => a.toString());
function nextScramble() {
  const next = queued || generate();
  queued = null;
  return next;
}
export function useScramble() {
  const [scramble, setScramble] = useState(''),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const next = async () => {
    setLoading(true);
    try {
      const s = await nextScramble();
      setScramble(s);
      setError('');
      queued = generate();
      queued.catch(() => {
        queued = null;
      });
    } catch {
      setError('Scramble could not load. Retry to continue.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void next();
  }, []);
  return { scramble, loading, error, next };
}
