import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useAnimationControls, useReducedMotion } from 'motion/react';

export function useFocusMode(exitBlocked: boolean) {
  const [focused, setFocused] = useState(false);
  const focusFade = useAnimationControls();
  const reducedMotion = useReducedMotion();
  const latestRequest = useRef(0);

  const changeFocus = useCallback(
    async (next: boolean) => {
      const request = ++latestRequest.current;
      if (reducedMotion) {
        focusFade.stop();
        focusFade.set({ opacity: 1 });
        setFocused(next);
        return;
      }

      await focusFade.start({ opacity: 0, transition: { duration: 0.12 } });
      // A newer entry or exit request takes precedence over this transition.
      if (request !== latestRequest.current) return;
      // Commit the new layout while hidden, before starting the fade in.
      flushSync(() => setFocused(next));
      await focusFade.start({ opacity: 1, transition: { duration: 0.2 } });
    },
    [focusFade, reducedMotion],
  );

  useEffect(() => {
    if (!focused || exitBlocked) return;
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) void changeFocus(false);
    };
    window.addEventListener('keydown', exitOnEscape);
    return () => window.removeEventListener('keydown', exitOnEscape);
  }, [focused, exitBlocked, changeFocus]);

  return { focused, changeFocus, focusFade };
}
