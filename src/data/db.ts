import Dexie, { type Table } from 'dexie';
import type { Session, Solve, Workspace, Preferences, Preset } from '../core/types';
import { defaultWorkspace } from '../layout/defaults';
class TurnDB extends Dexie {
  solves!: Table<Solve, string>;
  sessions!: Table<Session, string>;
  settings!: Table<{ key: string; value: unknown }, string>;
  presets!: Table<Preset, string>;
  constructor() {
    super('turn-timer');
    this.version(1).stores({
      solves: 'id,sessionId,timestamp,[sessionId+timestamp]',
      sessions: 'id,createdAt',
      settings: 'key',
      presets: 'id,name',
    });
  }
}
export const db = new TurnDB();
export const id = () => crypto.randomUUID();
export async function initialize() {
  await db.transaction('rw', db.sessions, db.settings, async () => {
    if (!(await db.sessions.count())) {
      const session: Session = { id: id(), name: 'Afternoon practice', createdAt: Date.now() };
      await db.sessions.add(session);
      await db.settings.put({
        key: 'preferences',
        value: { inspection: false, holdMs: 300, activeSessionId: session.id },
      });
    }
  });
  const first = await db.sessions.orderBy('createdAt').first();
  const prefs = (await db.settings.get('preferences'))?.value as Preferences | undefined;
  const preferences = {
    inspection: false,
    holdMs: 300,
    ...prefs,
    activeSessionId: prefs?.activeSessionId || first!.id,
  };
  if (!(await db.sessions.get(preferences.activeSessionId)))
    preferences.activeSessionId = first!.id;
  return { workspace: migrateWorkspace((await db.settings.get('workspace'))?.value), preferences };
}
export function migrateWorkspace(raw: unknown): Workspace {
  if (!raw || typeof raw !== 'object') return defaultWorkspace();
  const w = raw as Workspace;
  if (w.version !== 1)
    throw new Error('This workspace uses an unsupported version. Your solves are still saved.');
  return w;
}
export async function saveSetting(key: string, value: unknown) {
  await db.settings.put({ key, value: structuredClone(value) });
}
