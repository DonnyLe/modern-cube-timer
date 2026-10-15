import { useEffect, useState } from 'react';
import type { Appearance, Theme } from './types';

export function resolveTheme(mode: Appearance['theme']): Theme {
  if (mode === 'system')
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  if (mode === 'auto') {
    const hour = new Date().getHours();

    return hour >= 7 && hour < 19 ? 'light' : 'dark';
  }

  return mode;
}

export function useTheme(mode: Appearance['theme']): Theme {
  const [current, setCurrent] = useState(() => ({ mode, theme: resolveTheme(mode) }));

  useEffect(() => {
    const update = () => {
      const theme = resolveTheme(mode);

      setCurrent((previous) =>
        previous.mode === mode && previous.theme === theme ? previous : { mode, theme },
      );
    };

    update();
    if (mode === 'light' || mode === 'dark') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    // Recheck local time on wake and while open, including after clock/time-zone changes.
    const interval = mode === 'auto' ? window.setInterval(update, 1000) : undefined;

    if (mode === 'system') media.addEventListener('change', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);

    return () => {
      window.clearInterval(interval);
      media.removeEventListener('change', update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [mode]);

  return current.mode === mode ? current.theme : resolveTheme(mode);
}
