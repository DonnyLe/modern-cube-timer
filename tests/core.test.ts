import { describe, it, expect } from 'vitest';
import { TimerEngine } from '../src/core/timer';
import { average, formatTime, parseTime } from '../src/core/statistics';
import { defaultWorkspace } from '../src/layout/defaults';
import { validLayout, anchoredWidgets } from '../src/layout/geometry';
import type { Solve } from '../src/core/types';
const solves = (v: number[]) => v.map((duration,i) => ({ id: `${i}`, sessionId:'s', duration, penalty: duration === Infinity ? 'DNF' : 'none', scramble:'', timestamp:i, note:'' } as Solve));
describe('timer', () => {
  it('requires a complete hold, ignores repeat press and consumes stop release', () => { const t = new TimerEngine(); t.press(0); t.release(299); expect(t.phase).toBe('idle'); t.press(400); t.press(500); t.release(700); expect(t.phase).toBe('running'); expect(t.press(10700)?.duration).toBe(10000); t.release(10701); expect(t.phase).toBe('idle'); });
  it.each([[14999,'none'],[15000,'+2'],[16999,'+2'],[17000,'DNF']])('inspection at %i ms gives %s', (time, penalty) => { const t = new TimerEngine(true); t.press(0); t.release(10); t.press(Number(time)-300); t.release(Number(time)); expect(t.press(Number(time)+12000)).toEqual({duration:12000,penalty}); });
  it('uses the clock even without rendering', () => { const t = new TimerEngine(); t.press(0); t.release(300); expect(t.press(50000)?.duration).toBe(49700); });
});
describe('statistics', () => {
  it('trims one DNF and fastest for ao5; two DNFs remain DNF', () => { expect(average(solves([10,20,30,40,Infinity]),5)).toBe(30); expect(average(solves([10,20,30,Infinity,Infinity]),5)).toBe(Infinity); });
  it('trims five values at either end for ao100', () => expect(average(solves(Array.from({length:100},(_,i)=>i+1)),100)).toBe(50.5));
  it('formats minute boundaries and parses explicit seconds', () => { expect(formatTime(59999)).toBe('59.99'); expect(formatTime(60000)).toBe('1:00.00'); expect(parseTime('1:02.34')).toBe(62340); expect(parseTime('-1')).toBeNull(); });
});
describe('geometry', () => {
  it('rejects collisions, bounds and undersized cards', () => { const w=defaultWorkspace(); expect(validLayout(w.widgets,w.width)).toBe(true); w.widgets[3].x=500; expect(validLayout(w.widgets,w.width)).toBe(false); });
  it('preserves centered anchors without changing saved geometry', () => { const w=defaultWorkspace(); expect(anchoredWidgets(w,1420)[1].x).toBe(w.widgets[1].x+50); expect(w.widgets[1].x).toBe(240); });
});
