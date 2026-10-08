import { useCallback, useEffect, useRef, useState } from 'react';
import { TimerEngine, type Phase, type Result } from './timer';
export function useTimer(
  inspection: boolean,
  holdMs: number,
  disabled: boolean,
  onSolve: (r: Result) => void,
) {
  const engine = useRef(new TimerEngine(inspection, holdMs));
  const callback = useRef(onSolve);
  callback.current = onSolve;
  const [display, setDisplay] = useState({
    phase: 'idle' as Phase,
    elapsed: 0,
    inspectionPenalty: 'none',
  });
  useEffect(() => {
    engine.current.inspection = inspection;
    engine.current.holdMs = holdMs;
  }, [inspection, holdMs]);
  const update = useCallback(() => {
    const now = performance.now();
    const elapsed = engine.current.tick(now);
    setDisplay((previous) => {
      const next = {
        phase: engine.current.phase,
        elapsed,
        inspectionPenalty: engine.current.inspectionPenalty(now),
      };
      return previous.phase === next.phase &&
        previous.elapsed === next.elapsed &&
        previous.inspectionPenalty === next.inspectionPenalty
        ? previous
        : next;
    });
  }, []);
  const press = useCallback(() => {
    if (disabled) return;
    const result = engine.current.press(performance.now());
    if (result) callback.current(result);
    update();
  }, [disabled, update]);
  const release = useCallback(() => {
    engine.current.release(performance.now());
    update();
  }, [update]);
  useEffect(() => {
    let frame: number;
    const loop = () => {
      update();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [update]);
  useEffect(() => {
    const ignored = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      !!target.closest(
        'input,textarea,select,button,a,[contenteditable="true"],[role="dialog"],[role="combobox"],[role="listbox"],[role="option"]',
      ) &&
      !(target instanceof HTMLElement && target.closest('[data-timer]'));
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && engine.current.phase !== 'running') {
        engine.current.cancel();
        update();
      }
      if (e.code !== 'Space' || e.repeat || ignored(e.target) || disabled) return;
      e.preventDefault();
      press();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (!ignored(e.target) && !disabled) e.preventDefault();
      release();
    };
    const blur = () => {
      if (engine.current.phase !== 'running') {
        engine.current.cancel();
        update();
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [disabled, press, release, update]);
  useEffect(() => {
    if (disabled && engine.current.phase !== 'running') engine.current.cancel();
  }, [disabled]);
  return {
    ...display,
    press,
    release,
    cancel: () => {
      engine.current.cancel();
      update();
    },
  };
}
