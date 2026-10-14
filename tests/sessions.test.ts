import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db, initialize } from '../src/data/db';
import { newSession, recentSessionForPuzzle, saveSessionSolve } from '../src/data/sessionActions';
import { sessionName } from '../src/utils/sessionName';
import type { Solve } from '../src/core/types';

const hour = 3_600_000;
const base = new Date(2026, 9, 13, 9).getTime();
const solve = (sessionId: string, timestamp: number, id = crypto.randomUUID()): Solve => ({
  id,
  sessionId,
  timestamp,
  duration: 12000,
  penalty: 'none',
  scramble: 'R U',
  note: '',
});

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('automatic sessions', () => {
  it('resumes the most recently used puzzle session only within the configured break', async () => {
    const older = await newSession('222', base);

    await newSession('222', base + hour);

    await db.solves.add(solve(older.id, base + 2 * hour));
    expect((await recentSessionForPuzzle('222', 4, base + 5 * hour))?.id).toBe(older.id);
    expect((await recentSessionForPuzzle('222', 4, base + 6 * hour))?.id).toBe(older.id);
    expect(await recentSessionForPuzzle('222', 4, base + 6 * hour + 1)).toBeUndefined();
    expect(await recentSessionForPuzzle('222', 2, base + 5 * hour)).toBeUndefined();
    expect(await recentSessionForPuzzle('444', 4, base)).toBeUndefined();
    const empty = await newSession('333', base);

    expect((await recentSessionForPuzzle('333', 4, base + 3 * hour))?.id).toBe(empty.id);
  });
  it.each([
    [0, 'Night'],
    [5, 'Morning'],
    [12, 'Afternoon'],
    [17, 'Evening'],
    [22, 'Night'],
  ])('names sessions using local time at %s', (h, period) => {
    expect(sessionName('333', new Date(2026, 9, 13, Number(h)).getTime())).toBe(
      `${period} 3x3 session`,
    );
    expect(sessionName('pyram', new Date(2026, 9, 13, Number(h)).getTime())).toBe(
      `${period} Pyraminx session`,
    );
  });

  it('continues at exactly four hours and rolls over only beyond the limit', async () => {
    const { preferences } = await initialize();
    const sid = preferences.activeSessionId;

    await saveSessionSolve(solve(sid, base), preferences);
    const continuous = await saveSessionSolve(solve(sid, base + 4 * hour), preferences);

    expect(continuous.sessionId).toBe(sid);
    const next = await saveSessionSolve(solve(sid, base + 8 * hour + 1), preferences);

    expect(next.sessionId).not.toBe(sid);
    expect((await db.sessions.get(next.sessionId))?.name).toBe('Evening 3x3 session');
    expect(await db.solves.where('sessionId').equals(sid).count()).toBe(2);
  });

  it('uses the configurable interval and supports disabling rollover', async () => {
    const { preferences } = await initialize();
    const sid = preferences.activeSessionId;

    await saveSessionSolve(solve(sid, base), preferences);
    expect(
      (
        await saveSessionSolve(solve(sid, base + 2 * hour), {
          ...preferences,
          automaticSessions: false,
        })
      ).sessionId,
    ).toBe(sid);
    expect(
      (
        await saveSessionSolve(solve(sid, base + 4 * hour), {
          ...preferences,
          sessionBreakHours: 1,
        })
      ).sessionId,
    ).not.toBe(sid);
  });

  it('does not count solving time as a break or roll over when the clock moves backwards', async () => {
    const { preferences } = await initialize();
    const sid = preferences.activeSessionId;

    await saveSessionSolve(solve(sid, base), preferences);
    expect(
      (await saveSessionSolve(solve(sid, base + 5 * hour), preferences, base + hour)).sessionId,
    ).toBe(sid);
    expect((await saveSessionSolve(solve(sid, base - hour), preferences)).sessionId).toBe(sid);
    expect(await db.sessions.count()).toBe(1);
  });

  it('reuses a single rollover for concurrent saves and retries', async () => {
    const { preferences } = await initialize();
    const sid = preferences.activeSessionId;

    await saveSessionSolve(solve(sid, base), preferences);
    const a = solve(sid, base + 5 * hour);
    const b = solve(sid, base + 5 * hour + 1000);
    const results = await Promise.all([
      saveSessionSolve(a, preferences),
      saveSessionSolve(b, preferences),
    ]);

    expect(results[0].sessionId).toBe(results[1].sessionId);
    expect(await db.sessions.count()).toBe(2);
    expect((await saveSessionSolve(a, preferences)).sessionId).toBe(results[0].sessionId);
    expect(await db.solves.count()).toBe(3);
  });

  it('keeps custom names, updates an empty automatic session at first solve, and preserves puzzle context', async () => {
    const { preferences } = await initialize();
    const empty = await newSession('222', base);

    expect((await saveSessionSolve(solve(empty.id, base + 5 * hour), preferences)).sessionId).toBe(
      empty.id,
    );
    expect((await db.sessions.get(empty.id))?.name).toBe('Afternoon 2x2 session');
    await db.sessions.update(empty.id, { name: 'My training', automaticName: false });
    await saveSessionSolve(solve(empty.id, base + 6 * hour), preferences);
    expect((await db.sessions.get(empty.id))?.name).toBe('My training');
    const rolled = await saveSessionSolve(solve(empty.id, base + 11 * hour), preferences);

    expect((await db.sessions.get(rolled.sessionId))?.puzzle).toBe('222');
    expect((await db.sessions.get(empty.id))?.name).toBe('My training');
  });

  it('rolls back the new session when storing the solve fails', async () => {
    const { preferences } = await initialize();
    const sid = preferences.activeSessionId;

    await saveSessionSolve(solve(sid, base), preferences);
    const add = vi.spyOn(db.solves, 'add').mockRejectedValueOnce(new Error('Storage full'));

    await expect(saveSessionSolve(solve(sid, base + 5 * hour), preferences)).rejects.toThrow(
      'Storage full',
    );
    add.mockRestore();
    expect(await db.sessions.count()).toBe(1);
    expect(await db.solves.count()).toBe(1);
  });
});
