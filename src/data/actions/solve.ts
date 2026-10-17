import type { Penalty, Solve } from '../../core/types';
import { db } from '../db';

export async function editSolve(
  id: string,
  edits: { duration: number; penalty: Penalty; note: string },
) {
  if (!Number.isFinite(edits.duration) || edits.duration < 0)
    throw new Error('Enter a valid solve time.');
  if (!(await db.solves.update(id, edits))) throw new Error('This solve no longer exists.');
}

export async function deleteSolve(id: string) {
  return db.transaction('rw', db.solves, async () => {
    const solve = await db.solves.get(id);

    await db.solves.delete(id);

    return solve;
  });
}

export async function restoreSolve(solve: Solve) {
  await db.transaction('rw', db.sessions, db.solves, async () => {
    if (!(await db.sessions.get(solve.sessionId)))
      throw new Error('This session no longer exists.');
    await db.solves.add(solve);
  });
}

export async function deleteSolves(sessionId: string, ids: string[]) {
  return db.transaction('rw', db.solves, async () => {
    const records = await db.solves.bulkGet(ids);
    const deleted = records.filter(
      (solve): solve is Solve => !!solve && solve.sessionId === sessionId,
    );

    await db.solves.bulkDelete(deleted.map((solve) => solve.id));

    return deleted;
  });
}

export async function restoreSolves(solves: Solve[]) {
  await db.transaction('rw', db.sessions, db.solves, async () => {
    for (const sessionId of new Set(solves.map((solve) => solve.sessionId))) {
      if (!(await db.sessions.get(sessionId))) throw new Error('This session no longer exists.');
    }

    await db.solves.bulkAdd(solves);
  });
}
