import type { Appearance, Workspace, WidgetType } from '../core/types';
export const appearance: Appearance = {
  theme: 'light',
  font: 'system',
  opacity: 0.58,
  blur: 14,
  radius: 20,
  controlRadius: 10,
  border: 0.7,
  fontScale: 1,
  glass: 0.35,
  shadow: 0,
  background: 'gradient',
  softness: 0.42,
  intensity: 0.35,
  distortion: 0.35,
  motion: true,
  light: {
    text: '#172f52',
    accent: '#247cf2',
    tint: '#ffffff',
    outline: '#c4d4ec',
    background: '#f6f8fc',
    colorA: '#b4d8ff',
    colorB: '#f8dcd6',
  },
  dark: {
    text: '#e2eafb',
    accent: '#85b7ff',
    tint: '#17243a',
    outline: '#536683',
    background: '#0c1525',
    colorA: '#203c63',
    colorB: '#3b2d42',
  },
  timerSize: 144,
  timerWeight: 350,
  timerFont: 'system',
  precision: 2,
  autoFit: true,
  showStats: true,
};
export const definitions: Record<WidgetType, { title: string; minW: number; minH: number }> = {
  scramble: { title: 'Scramble', minW: 320, minH: 90 },
  timer: { title: 'Timer', minW: 260, minH: 180 },
  stats: { title: 'Averages', minW: 260, minH: 84 },
  recent: { title: 'Recent solves', minW: 240, minH: 200 },
  trend: { title: 'Session trend', minW: 280, minH: 200 },
  preview: { title: 'Scramble preview', minW: 240, minH: 200 },
};
export function defaultWorkspace(): Workspace {
  const rects = {
    scramble: [0, 0, 1320, 96],
    timer: [240, 126, 840, 228],
    stats: [400, 364, 520, 88],
    recent: [0, 492, 396, 270],
    trend: [408, 492, 504, 270],
    preview: [924, 492, 396, 270],
  };
  return {
    version: 1,
    width: 1320,
    widgets: Object.entries(rects).map(([type, [x, y, w, h]]) => ({
      id: type,
      type: type as WidgetType,
      x,
      y,
      w,
      h,
      visible: true,
      anchor: type === 'timer' || type === 'stats' ? 'center' : 'left',
      style: 'compact',
      overrides: {},
    })),
    groups: [],
    mobile: { order: Object.keys(rects), hidden: [], heights: {} },
    appearance: structuredClone(appearance),
    snap: true,
  };
}
export function presetWorkspace(name: string): Workspace {
  const w = defaultWorkspace();
  if (name === 'Editorial')
    Object.assign(w.appearance, {
      font: 'editorial',
      background: 'solid',
      opacity: 0.7,
      radius: 12,
      controlRadius: 6,
      blur: 0,
      border: 0.6,
      timerWeight: 300,
    });
  if (name === 'Precision')
    Object.assign(w.appearance, {
      font: 'mono',
      background: 'solid',
      theme: 'dark',
      opacity: 0.8,
      radius: 8,
      controlRadius: 4,
      blur: 0,
      border: 1,
      timerFont: 'mono',
      timerWeight: 400,
    });
  return w;
}
