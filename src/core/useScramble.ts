import { useCallback, useEffect, useRef, useState } from 'react';
import type { PuzzleEvent } from './puzzles';
import { ScrambleQueue } from './scrambleQueue';
const queue = new ScrambleQueue((event) =>
  import('cubing/scramble').then((m) => m.randomScrambleForEvent(event)).then((a) => a.toString()),
);
export function useScramble(event: PuzzleEvent | null) {
  const [state, setState] = useState<{
    event: PuzzleEvent | null;
    scramble: string;
    loading: boolean;
    error: string;
  }>({ event: null, scramble: '', loading: true, error: '' });
  const active = useRef<object | null>(null);
  const next = useCallback(async () => {
    if (!event || active.current) return;
    const request = {};
    active.current = request;
    setState((previous) => ({
      event,
      scramble: previous.event === event ? previous.scramble : '',
      loading: true,
      error: '',
    }));
    try {
      const scramble = await queue.next(event);
      if (active.current === request) setState({ event, scramble, loading: false, error: '' });
    } catch {
      if (active.current === request)
        setState((previous) => ({
          ...previous,
          loading: false,
          error: 'Scramble could not load. Retry to continue.',
        }));
    } finally {
      if (active.current === request) active.current = null;
    }
  }, [event]);
  useEffect(() => {
    active.current = null;
    void next();
    return () => {
      active.current = null;
    };
  }, [next]);
  // Never expose a previous puzzle's scramble during a selection change.
  return {
    scramble: state.event === event ? state.scramble : '',
    loading: !event || state.event !== event || state.loading,
    error: state.event === event ? state.error : '',
    next,
  };
}
