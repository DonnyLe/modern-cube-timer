import Dexie, { type Table } from 'dexie';
import type { Session, Solve, Workspace, Preset } from '../core/types';
import { defaultWorkspace } from '../layout/defaults';
import { validateWorkspace } from './validate';
import { preferencesSchema } from './schemas';
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
  const storedPreferences = (await db.settings.get('preferences'))?.value;
  const parsedPreferences = preferencesSchema.safeParse(storedPreferences);
  const preferences = parsedPreferences.success
    ? parsedPreferences.data
    : { inspection: false, holdMs: 300, activeSessionId: first!.id };
  if (!(await db.sessions.get(preferences.activeSessionId)))
    preferences.activeSessionId = first!.id;
  let workspace: Workspace,
    warning =
      storedPreferences !== undefined && !parsedPreferences.success
        ? 'Saved timer preferences were invalid; defaults have been restored.'
        : '';
  try {
    workspace = migrateWorkspace((await db.settings.get('workspace'))?.value);
  } catch {
    workspace = defaultWorkspace();
    warning =
      'Saved appearance settings could not be read. Default styling is shown; your solves are safe.';
  }
  return { workspace, preferences, warning };
}
export function migrateWorkspace(raw: unknown): Workspace {
  if (raw === undefined || raw === null) return defaultWorkspace();
  return validateWorkspace(raw);
}
export async function saveSetting(key: string, value: unknown) {
  const validated =
    key === 'workspace'
      ? validateWorkspace(value)
      : key === 'preferences'
        ? preferencesSchema.parse(value)
        : value;
  await db.settings.put({ key, value: structuredClone(validated) });
}
