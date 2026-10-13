import Dexie, { type Table } from 'dexie';
import type { Session, Solve, Workspace, Preset, Preferences } from '../core/types';
import { defaultWorkspace } from '../layout/defaults';
import { validateWorkspace } from './validate';
import { preferencesSchema } from './schemas';
import { puzzles, type PuzzleEvent } from '../core/puzzles';

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
    this.version(2)
      .stores({ sessions: 'id,createdAt,puzzle' })
      .upgrade(async (transaction) => {
        await transaction.table('sessions').toCollection().modify({ puzzle: '333' });
      });
  }
}

export const db = new TurnDB();
export const id = () => crypto.randomUUID();

export function sessionName(puzzle: PuzzleEvent, timestamp = Date.now()) {
  const hour = new Date(timestamp).getHours();
  const period =
    hour < 5
      ? 'Night'
      : hour < 12
        ? 'Morning'
        : hour < 17
          ? 'Afternoon'
          : hour < 22
            ? 'Evening'
            : 'Night';
  const label = /^[2-7]{3}$/.test(puzzle) ? `${puzzle[0]}x${puzzle[0]}` : puzzles[puzzle].label;

  return `${period} ${label} session`;
}

export async function newSession(puzzle: PuzzleEvent, timestamp = Date.now()): Promise<Session> {
  const session: Session = {
    id: id(),
    name: sessionName(puzzle, timestamp),
    automaticName: true,
    puzzle,
    createdAt: timestamp,
  };

  await db.sessions.add(session);

  return session;
}

// Save the rollover and solve together. IndexedDB serializes competing tabs' writes.
export async function saveSessionSolve(
  solve: Solve,
  preferences: Preferences,
  startedAt = solve.timestamp,
) {
  return db.transaction('rw', db.sessions, db.solves, async () => {
    const saved = await db.solves.get(solve.id);

    if (saved) return saved; // Retrying a successful write must not create another session.
    let session = await db.sessions.get(solve.sessionId);

    if (!session) throw new Error('This session no longer exists. Choose another session.');
    const previous = await db.solves
      .where('[sessionId+timestamp]')
      .between([session.id, 0], [session.id, Infinity])
      .last();
    const breakMs = preferences.sessionBreakHours * 60 * 60 * 1000;

    if (preferences.automaticSessions && previous && startedAt - previous.timestamp > breakMs) {
      const sessions = await db.sessions.where('puzzle').equals(session.puzzle).sortBy('createdAt');
      const latest = sessions.at(-1);
      const recent =
        latest && latest.id !== session.id
          ? await db.solves
              .where('[sessionId+timestamp]')
              .between([latest.id, 0], [latest.id, Infinity])
              .last()
          : undefined;

      // Reuse a rollover already made in another tab, including an empty manual session.
      session =
        latest &&
        latest.id !== session.id &&
        latest.createdAt >= previous.timestamp &&
        (!recent || startedAt - recent.timestamp <= breakMs)
          ? latest
          : await newSession(session.puzzle, startedAt);
    }

    if (session.automaticName && !(await db.solves.where('sessionId').equals(session.id).count())) {
      await db.sessions.update(session.id, {
        name: sessionName(session.puzzle, startedAt),
        createdAt: startedAt,
      });
    }

    const result = { ...solve, sessionId: session.id };

    await db.solves.add(result);

    return result;
  });
}

export async function initialize() {
  await db.transaction('rw', db.sessions, db.settings, async () => {
    if (!(await db.sessions.count())) {
      const session: Session = {
        id: id(),
        name: sessionName('333'),
        automaticName: true,
        createdAt: Date.now(),
        puzzle: '333',
      };

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
    : preferencesSchema.parse({ activeSessionId: first!.id });

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

export async function sessionForPuzzle(puzzle: PuzzleEvent): Promise<Session> {
  return db.transaction('rw', db.sessions, async () => {
    const existing = await db.sessions.where('puzzle').equals(puzzle).sortBy('createdAt');

    if (existing.length) return existing[existing.length - 1];
    const session: Session = {
      id: id(),
      name: sessionName(puzzle),
      automaticName: true,
      puzzle,
      createdAt: Date.now(),
    };

    await db.sessions.add(session);

    return session;
  });
}

export async function recentSessionForPuzzle(
  puzzle: PuzzleEvent,
  breakHours: number,
  now = Date.now(),
): Promise<Session | undefined> {
  return db.transaction('r', db.sessions, db.solves, async () => {
    const sessions = await db.sessions.where('puzzle').equals(puzzle).toArray();
    const activity = await Promise.all(
      sessions.map(async (session) => {
        const last = await db.solves
          .where('[sessionId+timestamp]')
          .between([session.id, 0], [session.id, Infinity])
          .last();

        return { session, timestamp: last?.timestamp ?? session.createdAt };
      }),
    );
    const latest = activity.sort((a, b) => b.timestamp - a.timestamp)[0];

    return latest && now - latest.timestamp <= breakHours * 3_600_000 ? latest.session : undefined;
  });
}
