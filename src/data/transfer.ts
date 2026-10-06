import type { Session, Solve, Workspace } from '../core/types';
import { db, id, migrateWorkspace } from './db';
export interface ImportPreview {
  sessions: Session[];
  solves: Solve[];
  issues: string[];
  workspace?: Workspace;
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export function parseImport(raw: unknown): ImportPreview {
  if (!record(raw)) throw new Error('Choose a turn backup or a standard csTimer JSON export.');
  const result: ImportPreview = { sessions: [], solves: [], issues: [] };
  if (raw.app === 'turn') {
    if (raw.version !== 1 || !Array.isArray(raw.sessions) || !Array.isArray(raw.solves))
      throw new Error('Unsupported or incomplete turn backup.');
    const map = new Map<string, string>();
    for (const s of raw.sessions) {
      if (!record(s) || typeof s.id !== 'string' || typeof s.name !== 'string' || map.has(s.id)) {
        result.issues.push('Skipped an invalid or duplicate session.');
        continue;
      }
      const next = id();
      map.set(s.id, next);
      result.sessions.push({
        id: next,
        name: s.name,
        createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
      });
    }
    for (const [i, s] of raw.solves.entries()) {
      if (
        !record(s) ||
        typeof s.sessionId !== 'string' ||
        !map.has(s.sessionId) ||
        typeof s.duration !== 'number' ||
        !Number.isFinite(s.duration) ||
        s.duration < 0 ||
        s.duration >= 86400000 ||
        !['none', '+2', 'DNF'].includes(String(s.penalty)) ||
        typeof s.scramble !== 'string' ||
        typeof s.timestamp !== 'number' ||
        !Number.isFinite(s.timestamp)
      ) {
        result.issues.push(`Skipped invalid solve ${i + 1}.`);
        continue;
      }
      result.solves.push({
        id: id(),
        sessionId: map.get(s.sessionId)!,
        duration: s.duration,
        penalty: s.penalty as Solve['penalty'],
        scramble: s.scramble,
        timestamp: s.timestamp,
        note: typeof s.note === 'string' ? s.note : '',
      });
    }
    if (raw.workspace)
      try {
        result.workspace = migrateWorkspace(raw.workspace);
      } catch {
        result.issues.push('Workspace settings were unsupported; solves can still be imported.');
      }
  } else {
    let names: Record<string, unknown> = {};
    try {
      const properties =
        typeof raw.properties === 'string' ? JSON.parse(raw.properties) : raw.properties;
      if (record(properties)) {
        const data =
          typeof properties.sessionData === 'string'
            ? JSON.parse(properties.sessionData)
            : properties.sessionData;
        if (record(data)) names = data;
      }
    } catch {
      result.issues.push('Session labels could not be read.');
    }
    const entries = Object.entries(raw).filter(([key]) => /^session\d+$/.test(key));
    if (!entries.length) throw new Error('No supported csTimer sessions were found.');
    for (const [key, rows] of entries) {
      const sid = id(),
        meta = names[key.slice(7)];
      result.sessions.push({
        id: sid,
        name: record(meta) && typeof meta.name === 'string' ? meta.name : `Imported ${key}`,
        createdAt: Date.now(),
      });
      if (!Array.isArray(rows)) {
        result.issues.push(`${key}: invalid session data.`);
        continue;
      }
      rows.forEach((row, index) => {
        if (
          !Array.isArray(row) ||
          !Array.isArray(row[0]) ||
          row[0].length !== 2 ||
          ![-1, 0, 2000].includes(row[0][0]) ||
          typeof row[0][1] !== 'number' ||
          !Number.isFinite(row[0][1]) ||
          row[0][1] < 0 ||
          row[0][1] >= 86400000 ||
          typeof row[1] !== 'string' ||
          typeof row[3] !== 'number' ||
          !Number.isFinite(row[3])
        ) {
          result.issues.push(
            `${key}, solve ${index + 1}: invalid or unsupported multi-phase record.`,
          );
          return;
        }
        result.solves.push({
          id: id(),
          sessionId: sid,
          duration: row[0][1],
          penalty: row[0][0] === -1 ? 'DNF' : row[0][0] === 2000 ? '+2' : 'none',
          scramble: row[1],
          note: typeof row[2] === 'string' ? row[2] : '',
          timestamp: row[3] * 1000,
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
