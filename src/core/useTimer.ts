import { useCallback, useEffect, useRef, useState } from 'react';
import { TimerEngine, type Phase, type Result } from './timer';
export function useTimer(
  inspection: boolean,
  holdMs: number,
  disabled: boolean,
  onSolve: (r: Result) => void,
) {
  const engine = useRef(new TimerEngine(inspection, holdMs));
  const spaceHeld = useRef(false);
  const spaceConsumed = useRef(false);
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
    const ignored = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      if (target.closest('dialog,[role="dialog"],[role="alertdialog"]')) return true;
      if (target.closest('[data-timer]')) return false;
      return (
        (target instanceof HTMLElement && target.isContentEditable) ||
        !!target.closest(
          'input,textarea,select,button,a[href],summary,[role="button"],[role="link"],[role="combobox"],[role="listbox"],[role="option"],[role="checkbox"],[role="radio"],[role="switch"],[role="slider"],[role="spinbutton"],[role="textbox"],[role="searchbox"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="tab"],[role="treeitem"]',
        )
      );
    };
    const modified = (e: KeyboardEvent) => e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
    const cancelSpace = () => {
      if (!spaceHeld.current) return;
      spaceHeld.current = false;
      if (engine.current.phase === 'running') engine.current.release(performance.now());
      else engine.current.cancel();
      update();
    };
    const down = (e: KeyboardEvent) => {
      if (e.defaultPrevented || modified(e)) return;
      if (e.code === 'Escape' && !ignored(e.target) && engine.current.phase !== 'running') {
        spaceHeld.current = false;
        engine.current.cancel();
        update();
      }
      if (e.code !== 'Space' || ignored(e.target)) return;
      // Saving a stopped solve temporarily disables timing, but repeats from
      // that same gesture must still be consumed until the physical keyup.
      if (e.repeat && spaceConsumed.current) {
        e.preventDefault();
        return;
      }
      if (disabled) return;
      if (e.repeat && !spaceHeld.current) return;
      e.preventDefault();
      if (e.repeat || spaceHeld.current) return;
      spaceHeld.current = true;
      spaceConsumed.current = true;
      press();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const consumed = spaceConsumed.current;
      spaceConsumed.current = false;
      if (e.defaultPrevented || modified(e) || ignored(e.target)) {
        cancelSpace();
        return;
      }
      if (consumed) e.preventDefault();
      if (!spaceHeld.current) return;
      if (disabled) {
        cancelSpace();
        return;
      }
      spaceHeld.current = false;
      release();
    };
    const focus = (e: FocusEvent) => {
      if (ignored(e.target)) cancelSpace();
    };
    const blur = () => {
      spaceConsumed.current = false;
      cancelSpace();
      if (engine.current.phase !== 'running') {
        engine.current.cancel();
        update();
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    window.addEventListener('focusin', focus);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      window.removeEventListener('focusin', focus);
      cancelSpace();
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
