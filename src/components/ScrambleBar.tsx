import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { layout, prepare, type PreparedText } from '@chenglou/pretext';

export function ScrambleBar({ scramble, children }: { scramble: string; children: ReactNode }) {
  const barRef = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let cached:
      { font: string; letterSpacing: number; text: string; prepared: PreparedText } | undefined;
    const measure = () => {
      const text = bar.querySelector<HTMLElement>('.scramble-text');
      const selector = bar.querySelector<HTMLElement>('.custom-select-trigger');
      const actions = bar.querySelector<HTMLElement>('.scramble-actions');
      if (!text || !selector || !actions) return;
      const style = getComputedStyle(bar);
      const contentWidth =
        bar.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      // Measure the original layout, even while expanded, so it cannot toggle back and forth.
      const availableWidth = window.matchMedia('(max-width: 767px)').matches
        ? contentWidth
        : contentWidth -
          selector.offsetWidth -
          actions.offsetWidth -
          2 * parseFloat(style.columnGap);
      const textStyle = getComputedStyle(text);
      const font = `${textStyle.fontStyle} ${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`;
      const letterSpacing = parseFloat(textStyle.letterSpacing) || 0;
      const content = text.textContent || '';
      if (
        !cached ||
        cached.font !== font ||
        cached.letterSpacing !== letterSpacing ||
        cached.text !== content
      ) {
        cached = {
          font,
          letterSpacing,
          text: content,
          prepared: prepare(content, font, { whiteSpace: 'pre-wrap', letterSpacing }),
        };
      }
      const { lineCount } = layout(
        cached.prepared,
        Math.max(1, availableWidth),
        parseFloat(textStyle.lineHeight),
      );
      setExpanded(lineCount > 2);
    };
    // Resolve new scramble content before paint, rather than waiting for the observer.
    measure();
    const observer = new ResizeObserver(() => {
      // ResizeObserver runs before paint, but React may otherwise defer its state update.
      flushSync(measure);
    });
    observer.observe(bar);
    return () => observer.disconnect();
  }, [scramble]);

  return (
    <section
      ref={barRef}
      className={`scramble-bar glass${expanded ? ' scramble-bar-expanded' : ''}`}
    >
      {children}
    </section>
  );
}
