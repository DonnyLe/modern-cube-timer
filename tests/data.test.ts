import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, initialize, migrateWorkspace } from '../src/data/db';
import { parseImport, backup, commitImport, csv } from '../src/data/transfer';
import { defaultWorkspace } from '../src/layout/defaults';
beforeEach(async () => {
  await db.delete();
  await db.open();
});
describe('local records', () => {
  it('initializes one session even with concurrent boots', async () => {
    await Promise.all([initialize(), initialize()]);
    expect(await db.sessions.count()).toBe(1);
  });
  it('backs up and imports solves without changing existing data', async () => {
    const { preferences } = await initialize();
    await db.solves.put({
      id: 'test',
      sessionId: preferences.activeSessionId,
      duration: 12840,
      penalty: '+2',
      scramble: "R U R'",
      timestamp: 1700000000000,
      note: 'practice',
    });
    const file = await backup(defaultWorkspace());
    const preview = parseImport(file);
    expect(preview.issues).toEqual([]);
    await commitImport(preview);
    expect(await db.solves.count()).toBe(2);
    expect(preview.solves[0].duration).toBe(12840);
    expect(preview.solves[0].penalty).toBe('+2');
  });
  it('reports unsupported csTimer rows and preserves valid penalties and comments', () => {
    const p = parseImport({
      properties: { sessionData: JSON.stringify({ '1': { name: 'Practice' } }) },
      session1: [
        [[2000, 12340], 'R U', 'note', 1700000000],
        [[-1, 15000], 'L U', '', 1700000001],
        [[0, 12000, 6000], 'R', '', 1],
        [[0, -2], 'R', '', 1],
      ],
    });
    expect(p.sessions[0].name).toBe('Practice');
    expect(p.solves.map((s) => s.penalty)).toEqual(['+2', 'DNF']);
    expect(p.solves[0].timestamp).toBe(1700000000000);
    expect(p.issues).toHaveLength(2);
  });
  it('rejects invalid imported appearance without losing valid solves', () => {
    const p = parseImport({
      app: 'turn',
      version: 1,
      sessions: [],
      solves: [],
      workspace: { version: 1, appearance: { theme: 'wrong' } },
    });
    expect(p.workspace).toBeUndefined();
    expect(p.issues).toHaveLength(1);
    expect(() => migrateWorkspace({ version: 2 })).toThrow();
  });
  it('does not accept arbitrary CSS in restored appearance', () => {
    const w = defaultWorkspace();
    w.appearance.light.text = 'url(https://example.com)';
    expect(() => migrateWorkspace(w)).toThrow();
  });
  it('escapes spreadsheet formulas and quotes in CSV notes', () => {
    expect(
      csv([
        {
          id: 'x',
          sessionId: 's',
          duration: 12000,
          penalty: 'none',
          scramble: 'R',
          timestamp: 0,
          note: '=HYPERLINK("x")',
        },
      ]),
    ).toContain('"\'=HYPERLINK(""x"")"');
  });
});

describe('Zod boundaries', () => {
  it('defaults missing v1 appearance values and strips unknown properties', () => {
    const w = migrateWorkspace({
      version: 1,
      appearance: { theme: 'dark', light: { accent: '#123456' }, unsafe: 'ignored' },
    });
    expect(w.appearance.theme).toBe('dark');
    expect(w.appearance.light.accent).toBe('#123456');
    expect(w.appearance.blur).toBe(defaultWorkspace().appearance.blur);
    expect(w.appearance).not.toHaveProperty('unsafe');
  });
  it.each([NaN, Infinity, -1, 41, '12'])('rejects malformed blur %s without coercion', (blur) => {
    expect(() => migrateWorkspace({ version: 1, appearance: { blur } })).toThrow();
  });
  it('recovers invalid saved preferences while preserving the existing session', async () => {
    const initial = await initialize();
    await db.settings.put({
      key: 'preferences',
      value: {
        inspection: 'yes',
        holdMs: -1,
        activeSessionId: initial.preferences.activeSessionId,
      },
    });
    const recovered = await initialize();
    expect(recovered.preferences).toEqual(initial.preferences);
    expect(recovered.warning).toContain('preferences');
    expect(await db.sessions.count()).toBe(1);
  });
  it('previews invalid native rows and orphaned solves alongside a valid row', () => {
    const row = { sessionId: 's', duration: 12000, penalty: 'none', scramble: 'R', timestamp: 0 };
    const p = parseImport({
      app: 'turn',
      version: 1,
      sessions: [{ id: 's', name: 'Practice' }],
      solves: [
        row,
        { ...row, duration: '12000' },
        { ...row, timestamp: Infinity },
        { ...row, sessionId: 'missing' },
      ],
    });
    expect(p.solves).toHaveLength(1);
    expect(p.solves[0].note).toBe('');
    expect(p.issues).toHaveLength(3);
  });
});
