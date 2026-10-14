import type { Session, Solve, Preferences } from '../core/types';
import type { PuzzleEvent } from '../core/puzzles';
import { db, id } from './db';
import { useStore } from './store';
import { sessionName } from '../utils/sessionName';

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

export async function renameSession(sessionId: string, name: string) {
  await db.sessions.update(sessionId, { name: name.trim(), automaticName: false });
}

export async function selectPuzzleSession(puzzle: PuzzleEvent, breakHours: number) {
  const recent = await recentSessionForPuzzle(puzzle, breakHours);

  return { session: recent || (await newSession(puzzle)), created: !recent };
}

export async function activateSession(sessionId: string, puzzle: PuzzleEvent) {
  const session = (await db.sessions.get(sessionId)) || (await sessionForPuzzle(puzzle));

  useStore.getState().setPreferences({ activeSessionId: session.id });
}

export async function deleteSessions(
  sessionIds: string[],
  selectedId: string,
  puzzle: PuzzleEvent,
) {
  const currentId = useStore.getState().preferences.activeSessionId;
  const fallback = await db.transaction('rw', db.sessions, db.solves, async () => {
    const existing = await db.sessions.orderBy('createdAt').toArray();
    const remaining = existing.filter((session) => !sessionIds.includes(session.id));
    const next =
      remaining.find((session) => session.id === selectedId) ||
      remaining.find((session) => session.id === currentId) ||
      remaining.at(-1) ||
      (await newSession(existing.find((session) => session.id === currentId)?.puzzle || puzzle));

    await db.solves.where('sessionId').anyOf(sessionIds).delete();
    await db.sessions.bulkDelete(sessionIds);

    return next;
  });

  if (sessionIds.includes(currentId))
    useStore.getState().setPreferences({ activeSessionId: fallback.id });

  return fallback;
}
