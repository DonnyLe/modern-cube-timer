import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { db } from '../src/data/db';
import {
  editSolve,
  deleteSolve,
  restoreSolve,
  deleteSolves,
  restoreSolves,
} from '../src/data/actions/solve';
import type { Solve } from '../src/core/types';

const solve: Solve = {
  id: 'solve',
  sessionId: 'session',
  duration: 12000,
  penalty: 'none',
  scramble: 'R U',
  timestamp: 1,
  note: '',
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  await db.sessions.add({ id: 'session', name: 'Practice', puzzle: '333', createdAt: 1 });
  await db.solves.add(solve);
});

it('edits only mutable fields and does not recreate a deleted solve', async () => {
  await editSolve('solve', { duration: 13000, penalty: '+2', note: 'Clean finish' });
  expect(await db.solves.get('solve')).toEqual({
    ...solve,
    duration: 13000,
    penalty: '+2',
    note: 'Clean finish',
  });
  await deleteSolve('solve');
  await expect(editSolve('solve', { duration: 13000, penalty: 'none', note: '' })).rejects.toThrow(
    'no longer exists',
  );
  expect(await db.solves.count()).toBe(0);
});

it('undo restores the exact record but cannot orphan it after session deletion', async () => {
  expect(await deleteSolve('solve')).toEqual(solve);
  await restoreSolve(solve);
  expect(await db.solves.get('solve')).toEqual(solve);
  await deleteSolve('solve');
  await db.sessions.delete('session');
  await expect(restoreSolve(solve)).rejects.toThrow('no longer exists');
  expect(await db.solves.count()).toBe(0);
});

it('bulk deletion stays in its session and undo restores all records atomically', async () => {
  const other = { ...solve, id: 'other', sessionId: 'other-session' };
  const second = { ...solve, id: 'second', note: 'Keep this note' };

  await db.solves.bulkAdd([other, second]);
  const deleted = await deleteSolves('session', ['solve', 'second', 'other', 'missing']);

  expect(deleted).toEqual([solve, second]);
  expect(await db.solves.toArray()).toEqual([other]);
  await restoreSolves(deleted);
  expect(await db.solves.bulkGet(['solve', 'second'])).toEqual([solve, second]);
  await deleteSolves('session', ['solve', 'second']);
  await db.sessions.delete('session');
  await expect(restoreSolves(deleted)).rejects.toThrow('no longer exists');
  expect(await db.solves.toArray()).toEqual([other]);
});
