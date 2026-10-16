import type { Penalty } from '../../core/types';
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
