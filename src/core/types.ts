import type { PuzzleEvent } from './puzzles';
export type Penalty = 'none' | '+2' | 'DNF';
export interface Solve {
  id: string;
  sessionId: string;
  duration: number;
  penalty: Penalty;
  scramble: string;
  timestamp: number;
  note: string;
}
export interface Session {
  puzzle: PuzzleEvent;
  id: string;
  name: string;
  createdAt: number;
}
export type WidgetType = 'scramble' | 'timer' | 'stats' | 'recent' | 'trend' | 'preview';
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Surface {
  opacity: number;
  blur: number;
  radius: number;
  border: number;
  fontScale: number;
}
export interface Widget extends Rect {
  id: string;
  type: WidgetType;
  visible: boolean;
  anchor: 'left' | 'center' | 'right';
  style: string;
  overrides: Partial<Surface>;
}
export interface Group {
  id: string;
  members: string[];
  mode: 'free' | 'row' | 'column';
  gap: number;
  sizing: 'fixed' | 'fill';
}
export interface Palette {
  text: string;
  accent: string;
  tint: string;
  outline: string;
  background: string;
  colorA: string;
  colorB: string;
}
export interface Appearance extends Surface {
  controlRadius: number;
  theme: 'light' | 'dark';
  font: 'system' | 'editorial' | 'mono';
  shadow: number;
  glass: number;
  background: 'gradient' | 'solid';
  softness: number;
  intensity: number;
  distortion: number;
  motion: boolean;
  light: Palette;
  dark: Palette;
  timerSize: number;
  timerWeight: number;
  timerFont: 'system' | 'mono';
  precision: 1 | 2 | 3;
  autoFit: boolean;
  showStats: boolean;
}
export interface Workspace {
  version: 1;
  width: number;
  widgets: Widget[];
  groups: Group[];
  mobile: { order: string[]; hidden: string[]; heights: Record<string, number> };
  appearance: Appearance;
  snap: boolean;
}
export interface Preferences {
  hideWidgetsInFocus: boolean;
  inspection: boolean;
  holdMs: number;
  activeSessionId: string;
}
export interface Preset {
  id: string;
  name: string;
  workspace: Workspace;
}
