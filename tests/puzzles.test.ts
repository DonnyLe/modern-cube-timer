import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db, initialize, sessionForPuzzle } from '../src/data/db';
import { backup, csv, parseImport } from '../src/data/transfer';
import { defaultWorkspace } from '../src/layout/defaults';
import { ScrambleQueue } from '../src/core/scrambleQueue';
beforeEach(async () => {
  await db.delete();
  await db.open();
});
describe('puzzle sessions', () => {
  it('migrates existing sessions to 3×3 without changing their solves', async () => {
    await db.delete();
    const legacy = new Dexie('turn-timer');
    legacy.version(1).stores({
      solves: 'id,sessionId,timestamp,[sessionId+timestamp]',
      sessions: 'id,createdAt',
      settings: 'key',
      presets: 'id,name',
    });
    await legacy.table('sessions').put({ id: 'old', name: 'Old session', createdAt: 0 });
    await legacy.table('solves').put({
      id: 'old-solve',
      sessionId: 'old',
      duration: 10000,
      penalty: 'none',
      scramble: 'R',
      timestamp: 1,
      note: '',
    });
    legacy.close();
    await db.open();
    expect((await db.sessions.get('old'))?.puzzle).toBe('333');
    expect((await db.solves.get('old-solve'))?.duration).toBe(10000);
  });
  it('reuses puzzle-specific sessions without duplicating concurrent requests', async () => {
    await initialize();
    const [a, b] = await Promise.all([sessionForPuzzle('222'), sessionForPuzzle('222')]);
    expect(a.id).toBe(b.id);
    expect(a.puzzle).toBe('222');
    expect((await sessionForPuzzle('333')).id).not.toBe(a.id);
    expect(await db.sessions.count()).toBe(2);
  });
  it('round-trips puzzle labels and marks exports as version 2', async () => {
    const s = await sessionForPuzzle('pyram');
    await db.solves.add({
      id: 'p',
      sessionId: s.id,
      duration: 12000,
      penalty: 'none',
      scramble: 'R U',
      timestamp: 1,
      note: '',
    });
    const file = await backup(defaultWorkspace());
    expect(file.version).toBe(2);
    const imported = parseImport(file);
    expect(imported.sessions[0].puzzle).toBe('pyram');
    expect(imported.solves[0].sessionId).toBe(imported.sessions[0].id);
    expect(csv(file.solves, file.sessions)).toContain('"pyram"');
  });
  it('defaults old backups to 3×3 but rejects unlabeled version 2 sessions', () => {
    const file = { app: 'turn', version: 1, sessions: [{ id: 's', name: 'Legacy' }], solves: [] };
    expect(parseImport(file).sessions[0].puzzle).toBe('333');
    expect(parseImport({ ...file, version: 2 }).sessions).toHaveLength(0);
  });
  it('imports known csTimer puzzle types and flags unsupported sessions', () => {
    const p = parseImport({
      properties: {
        sessionData: JSON.stringify({
          '1': { name: 'Small', opt: { scrType: '222so' } },
          '2': { name: 'Training', opt: { scrType: 'pll' } },
          '3': { name: 'Square', opt: { scrType: 'sqrs' } },
        }),
      },
      session1: [],
      session2: [],
      session3: [],
    });
    expect(p.sessions.map((s) => s.puzzle)).toEqual(['222', 'sq1']);
    expect(p.issues[0]).toContain('unsupported puzzle');
  });
});
describe('scramble prefetch', () => {
  it('keeps caches separated by puzzle', async () => {
    const generate = vi.fn(async (event) => `${event} scramble`);
    const queue = new ScrambleQueue(generate);
    expect(await queue.next('222')).toBe('222 scramble');
    expect(await queue.next('333')).toBe('333 scramble');
    expect(await queue.next('222')).toBe('222 scramble');
  });
  it('recovers after a failed generation', async () => {
    const generate = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('R U');
    const queue = new ScrambleQueue(generate);
    await expect(queue.next('333')).rejects.toThrow('offline');
    expect(await queue.next('333')).toBe('R U');
  });
});
