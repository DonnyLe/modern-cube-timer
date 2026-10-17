import { db } from './db';

export function loadSessionDetails(sessionId: string) {
  return db.transaction('r', db.sessions, db.solves, async () => ({
    sessionId,
    session: await db.sessions.get(sessionId),
    solves: await db.solves.where('sessionId').equals(sessionId).sortBy('timestamp'),
  }));
}

export type SessionDetails = Awaited<ReturnType<typeof loadSessionDetails>>;
