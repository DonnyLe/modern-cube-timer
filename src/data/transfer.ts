import type { Session, Solve, Workspace } from '../core/types';
import { db, id } from './db';
import { validateWorkspace } from './validate';
import {
  backupEnvelopeSchema,
  sessionSchema,
  importedSolveSchema,
  objectSchema,
  rowsSchema,
  csTimerMetadataSchema,
  csTimerRowSchema,
} from './schemas';
export interface ImportPreview {
  sessions: Session[];
  solves: Solve[];
  issues: string[];
  workspace?: Workspace;
}
export function parseImport(raw: unknown): ImportPreview {
  const envelope = objectSchema.safeParse(raw);
  if (!envelope.success) throw new Error('Choose a turn backup or a standard csTimer JSON export.');
  const input = envelope.data;
  const result: ImportPreview = { sessions: [], solves: [], issues: [] };
  if (input.app === 'turn') {
    const parsed = backupEnvelopeSchema.safeParse(input);
    if (!parsed.success) throw new Error('Unsupported or incomplete turn backup.');
    const native = parsed.data;
    const map = new Map<string, string>();
    for (const row of native.sessions) {
      const parsedSession = sessionSchema.safeParse(row);
      if (!parsedSession.success || map.has(parsedSession.data.id)) {
        result.issues.push('Skipped an invalid or duplicate session.');
        continue;
      }
      const session = parsedSession.data;
      const next = id();
      map.set(session.id, next);
      result.sessions.push({ ...session, id: next });
    }
    for (const [i, row] of native.solves.entries()) {
      const parsedSolve = importedSolveSchema.safeParse(row);
      if (!parsedSolve.success || !map.has(parsedSolve.data.sessionId)) {
        result.issues.push(`Skipped invalid solve ${i + 1}.`);
        continue;
      }
      const solve = parsedSolve.data;
      result.solves.push({ ...solve, id: id(), sessionId: map.get(solve.sessionId)! });
    }
    if (native.workspace !== undefined) {
      try {
        result.workspace = validateWorkspace(native.workspace);
      } catch {
        result.issues.push('Workspace settings were unsupported; solves can still be imported.');
      }
    }
  } else {
    let names: Record<string, unknown> = {};
    try {
      if (input.properties !== undefined) {
        const properties = objectSchema.parse(
          typeof input.properties === 'string' ? JSON.parse(input.properties) : input.properties,
        );
        if (properties.sessionData !== undefined) {
          names = objectSchema.parse(
            typeof properties.sessionData === 'string'
              ? JSON.parse(properties.sessionData)
              : properties.sessionData,
          );
        }
      }
    } catch {
      result.issues.push('Session labels could not be read.');
    }
    const entries = Object.entries(input).filter(([key]) => /^session\d+$/.test(key));
    if (!entries.length) throw new Error('No supported csTimer sessions were found.');
    for (const [key, rawRows] of entries) {
      const sid = id();
      const meta = csTimerMetadataSchema.safeParse(names[key.slice(7)]);
      result.sessions.push({
        id: sid,
        name: meta.success ? meta.data.name : `Imported ${key}`,
        createdAt: Date.now(),
      });
      const rows = rowsSchema.safeParse(rawRows);
      if (!rows.success) {
        result.issues.push(`${key}: invalid session data.`);
        continue;
      }
      rows.data.forEach((rawRow, index) => {
        const parsed = csTimerRowSchema.safeParse(rawRow);
        if (!parsed.success) {
          result.issues.push(
            `${key}, solve ${index + 1}: invalid or unsupported multi-phase record.`,
          );
          return;
        }
        const [time, scramble, note, seconds] = parsed.data;
        result.solves.push({
          id: id(),
          sessionId: sid,
          duration: time[1],
          penalty: time[0] === -1 ? 'DNF' : time[0] === 2000 ? '+2' : 'none',
          scramble,
          note,
          timestamp: seconds * 1000,
        });
      });
    }
  }
  return result;
}
export async function backup(workspace: Workspace) {
  return db.transaction('r', db.sessions, db.solves, async () => ({
    app: 'turn',
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions: await db.sessions.toArray(),
    solves: await db.solves.toArray(),
    workspace,
  }));
}
export async function commitImport(preview: ImportPreview) {
  await db.transaction('rw', db.sessions, db.solves, async () => {
    await db.sessions.bulkAdd(preview.sessions);
    await db.solves.bulkAdd(preview.solves);
  });
}
export function csv(solves: Solve[]) {
  const cell = (s: unknown) => `"${String(s).replaceAll('"', '""')}"`;
  return [
    'time_ms,penalty,scramble,timestamp,note',
    ...solves.map((s) =>
      [
        s.duration,
        s.penalty,
        s.scramble,
        new Date(s.timestamp).toISOString(),
        /^[=+@\-\t\r]/.test(s.note) ? `'${s.note}` : s.note,
      ]
        .map(cell)
        .join(','),
    ),
  ].join('\r\n');
}
export function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
