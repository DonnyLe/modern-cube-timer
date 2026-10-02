import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, Trash2 } from 'lucide-react';
import { db, id } from '../data/db';
import { safeWrite, useStore } from '../data/store';
import { presetWorkspace } from '../layout/defaults';
import type { Workspace } from '../core/types';
export function Gallery() {
  const { workspace, setWorkspace } = useStore(),
    presets = useLiveQuery(() => db.presets.toArray(), []) || [],
    [name, setName] = useState(''),
    [notice, setNotice] = useState('');
  const apply = (w: Workspace, label: string) => {
    setWorkspace(structuredClone(w));
    setNotice(`${label} applied. Your solves are unchanged.`);
  };
  return (
    <main className="settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">A DIFFERENT PERSPECTIVE</p>
          <h1>Find your focus.</h1>
          <p className="subtle">Start with a style. Make it your own.</p>
        </div>
      </div>
      <div className="preset-grid">
        {['Liquid Studio', 'Editorial', 'Precision'].map((label, i) => (
          <button
            key={label}
            className={`preset-card preset-${i}`}
            onClick={() => {
              const w = presetWorkspace(label);
              w.appearance.theme = workspace.appearance.theme;
              apply(w, label);
            }}
          >
            <div className="preset-mini">
              <span>12.84</span>
              <div>
                <i />
                <i />
                <i />
              </div>
            </div>
            <h2>{label}</h2>
            <p>
              {
                [
                  'Light, open, and quietly expressive.',
                  'A considered space with a printed feel.',
                  'Clean lines. Nothing in the way.',
                ][i]
              }
            </p>
          </button>
        ))}
      </div>
      <section className="settings-card glass">
        <h2>Saved spaces</h2>
        <form
          className="save-preset"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            void safeWrite(() =>
              db.presets.add({
                id: id(),
                name: name.trim(),
                workspace: structuredClone(workspace),
              }),
            ).then((ok) => {
              if (ok) {
                setName('');
                setNotice('Your workspace has been saved.');
              }
            });
          }}
        >
          <label>
            Preset name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My evening setup"
              required
            />
          </label>
          <button type="submit" className="primary">
            Save current workspace
          </button>
        </form>
        {presets.map((p) => (
          <div className="saved-preset" key={p.id}>
            <button className="text-button" onClick={() => apply(p.workspace, p.name)}>
              {p.name}
            </button>
            <div>
              <button
                aria-label={`Duplicate ${p.name}`}
                className="icon-button small"
                onClick={() =>
                  void safeWrite(() => db.presets.add({ ...p, id: id(), name: `${p.name} copy` }))
                }
              >
                <Copy size={16} />
              </button>
              <button
                aria-label={`Delete ${p.name}`}
                className="icon-button small"
                onClick={() => void safeWrite(() => db.presets.delete(p.id))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </section>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
    </main>
  );
}
