import { useState } from 'react';
import { useStore, safeWrite } from '../data/store';
import { db } from '../data/db';
import {
  backup,
  csv,
  download,
  parseImport,
  commitImport,
  type ImportPreview,
} from '../data/transfer';
import { Dialog } from './Dialog';
export function DataControls() {
  const { workspace, setWorkspace, setError } = useStore(),
    [preview, setPreview] = useState<ImportPreview | null>(null),
    [restore, setRestore] = useState(false),
    [working, setWorking] = useState(false),
    [notice, setNotice] = useState('');
  return (
    <>
      <p className="subtle">
        Solves stay on this device. Save a backup before clearing browser data.
      </p>
      <div className="button-row">
        <button
          onClick={() =>
            void backup(workspace)
              .then((v) =>
                download(JSON.stringify(v, null, 2), 'turn-backup.json', 'application/json'),
              )
              .catch((e) => setError(e.message))
          }
        >
          Export backup
        </button>
        <button
          onClick={() =>
            void db.solves
              .orderBy('timestamp')
              .toArray()
              .then((v) => download(csv(v), 'turn-solves.csv', 'text/csv'))
              .catch((e) => setError(e.message))
          }
        >
          Export CSV
        </button>
      </div>
      <label>
        Import turn or csTimer backup
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            if (file.size > 25 * 1024 * 1024) {
              setError('Choose a backup smaller than 25 MB.');
              return;
            }
            void file
              .text()
              .then((s) => {
                setPreview(parseImport(JSON.parse(s)));
                setRestore(false);
              })
              .catch((e) => setError(`Import could not be read: ${e.message}`));
          }}
        />
      </label>
      {notice && <p role="status">{notice}</p>}
      {preview && (
        <Dialog
          title="Review import"
          onClose={() => {
            if (!working) setPreview(null);
          }}
        >
          <p>
            {preview.solves.length} solves across {preview.sessions.length} sessions.
          </p>
          <p className="subtle">This adds separate sessions. Your existing solves will be kept.</p>
          {preview.issues.length > 0 && (
            <details open>
              <summary>{preview.issues.length} records need attention</summary>
              <ul>
                {preview.issues.slice(0, 50).map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </details>
          )}
          {preview.workspace && (
            <label className="toggle-row">
              Also restore appearance and layout
              <input
                type="checkbox"
                checked={restore}
                onChange={(e) => setRestore(e.target.checked)}
              />
            </label>
          )}
          <div className="button-row">
            <button onClick={() => setPreview(null)} disabled={working}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={working || !preview.sessions.length}
              onClick={() => {
                setWorking(true);
                void safeWrite(() => commitImport(preview)).then((ok) => {
                  if (ok) {
                    if (restore && preview.workspace) setWorkspace(preview.workspace);
                    setNotice(`${preview.solves.length} solves imported.`);
                    setPreview(null);
                  }
                  setWorking(false);
                });
              }}
            >
              {working ? 'Importing…' : 'Import valid records'}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
