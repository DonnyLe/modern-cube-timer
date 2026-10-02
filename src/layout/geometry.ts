import type { Rect, Widget, Workspace } from '../core/types';
import { definitions } from './defaults';
export const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w - .1 && a.x + a.w > b.x + .1 && a.y < b.y + b.h - .1 && a.y + a.h > b.y + .1;
export function validLayout(widgets: Widget[], width: number): boolean {
  const shown = widgets.filter(w => w.visible);
  return shown.every((w, i) => { const min = definitions[w.type]; return [w.x,w.y,w.w,w.h].every(Number.isFinite) && w.x >= 0 && w.y >= 0 && w.w >= min.minW && w.h >= min.minH && w.x + w.w <= width + .1 && w.y + w.h <= 3000 && !shown.slice(i + 1).some(b => overlaps(w, b)); });
}
export function anchoredWidgets(workspace: Workspace, width: number): Widget[] {
  const delta = width - workspace.width;
  return workspace.widgets.map(w => ({ ...w, x: w.x + (w.anchor === 'center' ? delta / 2 : w.anchor === 'right' ? delta : 0) }));
}
export function snapRect(rect: Rect, enabled: boolean): Rect {
  return enabled ? Object.fromEntries(Object.entries(rect).map(([k,v]) => [k, Math.round(v / 8) * 8])) as unknown as Rect : rect;
}
export function bounds(widgets: Rect[]): Rect { const x = Math.min(...widgets.map(w => w.x)), y = Math.min(...widgets.map(w => w.y)); return { x, y, w: Math.max(...widgets.map(w => w.x + w.w)) - x, h: Math.max(...widgets.map(w => w.y + w.h)) - y }; }
