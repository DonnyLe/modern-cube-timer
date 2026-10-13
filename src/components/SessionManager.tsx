import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUpRight, Check, Maximize2, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import type { Session, Solve } from '../core/types';
import { puzzles, puzzleEvents, type PuzzleEvent } from '../core/puzzles';
import { formatTime, statistics, value } from '../core/statistics';
import { useScramble } from '../core/useScramble';
import { db, newSession, sessionForPuzzle } from '../data/db';
import { safeWrite, useStore } from '../data/store';
import { Select } from './Select';
import { PuzzleArtwork } from './PuzzleArtwork';

export function SessionManager({
  sessions,
  activeId,
  selectedId,
  onSelect,
  onContinue,
  onViewAll,
  onOpenSolve,
  onSettings,
  precision,
}: {
  sessions: Session[];
  activeId: string;
  selectedId: string;
  onSelect: (id: string) => void;
  onContinue: (id: string) => void;
  onViewAll: (id: string) => void;
  onOpenSolve: (solve: Solve) => void;
  onSettings: () => void;
  precision: number;
}) {
  const selected = sessions.find((session) => session.id === selectedId);
  const [puzzle, setPuzzle] = useState<PuzzleEvent>(selected?.puzzle || '333');
  const [search, setSearch] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [working, setWorking] = useState(false);
  const preview = useScramble(puzzle);
  const storedSolves =
    useLiveQuery(
      () => (selectedId ? db.solves.where('sessionId').equals(selectedId).sortBy('timestamp') : []),
      [selectedId],
    ) || [];
  const solves = storedSolves.filter((solve) => solve.sessionId === selectedId);
  const counts =
    useLiveQuery(
      async () =>
        new Map(
          await Promise.all(
            sessions.map(
              async (session) =>
                [
                  session.id,
                  await db.solves.where('sessionId').equals(session.id).count(),
                ] as const,
            ),
          ),
        ),
      [sessions],
    ) || new Map<string, number>();
  const stats = statistics(solves);
  const shown = [...sessions]
    .reverse()
    .filter((session) =>
      `${session.name} ${puzzles[session.puzzle].label}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
    );

  const select = (session: Session) => {
    onSelect(session.id);
    setPuzzle(session.puzzle);
    setRenaming(false);
    setDeleting(false);
  };

  const mutate = async (action: () => Promise<void>) => {
    setWorking(true);
    const ok = await safeWrite(action);

    setWorking(false);

    return ok;
  };

  const date = (timestamp: number) =>
    new Date(timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="session-manager-body" aria-busy={working}>
      <section className="manager-art">
        <div className="manager-column-header puzzle-selector">
          <span>Puzzle</span>
          <Select
            label="Puzzle"
            value={puzzle}
            disabled={working}
            options={puzzleEvents.map((event) => ({ value: event, label: puzzles[event].label }))}
            onValueChange={(event) => {
              setPuzzle(event);
              const latest = sessions.filter((session) => session.puzzle === event).at(-1);

              onSelect(latest?.id || '');
              setRenaming(false);
              setDeleting(false);
            }}
          />
        </div>
        <PuzzleArtwork
          key={`${puzzle}:${solves.at(-1)?.scramble || preview.scramble}`}
          puzzle={puzzle}
          scramble={solves.at(-1)?.scramble || preview.scramble}
        />
      </section>
      <section className="manager-details" aria-label="Selected session">
        <div className="manager-column-header">
          <h3>{selected?.name || `New ${puzzles[puzzle].label} session`}</h3>
        </div>
        <p className="manager-metadata">
          {selected
            ? `${date(selected.createdAt)} · ${solves.length} solves`
            : 'No sessions for this puzzle yet.'}
        </p>
        {selected && (
          <div className="manager-actions">
            <button
              className="text-button"
              disabled={working}
              onClick={() => {
                setName(selected.name);
                setRenaming(!renaming);
                setDeleting(false);
              }}
            >
              <Pencil size={14} /> Rename
            </button>
            <button
              className="text-button"
              onClick={() => onViewAll(selected.id)}
              disabled={working}
            >
              <Maximize2 size={14} /> Expand session
            </button>
          </div>
        )}
        {renaming && selected && (
          <form
            className="manager-rename"
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) return;
              void mutate(async () => {
                await db.sessions.update(selected.id, { name: name.trim(), automaticName: false });
              }).then((ok) => {
                if (ok) setRenaming(false);
              });
            }}
          >
            <label>
              Session name
              <input autoFocus value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <div className="button-row">
              <button type="button" onClick={() => setRenaming(false)}>
                Cancel
              </button>
              <button type="submit" disabled={working || !name.trim()}>
                Rename current
              </button>
            </div>
          </form>
        )}
        <div className="manager-statistics">
          {(['best', 'ao5', 'ao12'] as const).map((key) => (
            <div key={key}>
              <span>{key === 'best' ? 'Best' : key}</span>
              <strong>{formatTime(stats[key], precision)}</strong>
            </div>
          ))}
        </div>
        <div className="manager-solves-heading">
          <h4>Recent solves</h4>
          <button
            className="text-button"
            disabled={!selected || working}
            onClick={() => selected && onViewAll(selected.id)}
          >
            View all <ArrowUpRight size={14} />
          </button>
        </div>
        {solves.length ? (
          <div className="manager-solves">
            {solves
              .slice(-5)
              .reverse()
              .map((solve, index) => (
                <button
                  key={solve.id}
                  className="solve-row"
                  disabled={working}
                  onClick={() => onOpenSolve(solve)}
                >
                  <span>{solves.length - index}</span>
                  <strong>{formatTime(value(solve), precision)}</strong>
                  <small>
                    {new Date(solve.timestamp).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </small>
                  {Number.isFinite(stats.best) && value(solve) === stats.best && (
                    <Star size={13} aria-label="Session best" />
                  )}
                </button>
              ))}
          </div>
        ) : (
          <p className="manager-empty subtle">Your solves will appear here.</p>
        )}
        {selected && (
          <details className="manager-management">
            <summary>Manage session</summary>
            {!deleting ? (
              <button
                className="text-button danger"
                disabled={working || sessions.length < 2}
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={14} /> Delete session
              </button>
            ) : (
              <div className="manager-delete-confirmation" role="alert">
                <p>
                  Delete “{selected.name}” and its {solves.length} solves?
                </p>
                <div className="button-row">
                  <button onClick={() => setDeleting(false)}>Keep session</button>
                  <button
                    className="danger"
                    disabled={working}
                    onClick={() => {
                      const fallback = sessions.find((session) => session.id !== selected.id);

                      if (!fallback) return;
                      void mutate(async () => {
                        await db.transaction('rw', db.sessions, db.solves, async () => {
                          await db.solves.where('sessionId').equals(selected.id).delete();
                          await db.sessions.delete(selected.id);
                        });
                        if (selected.id === activeId)
                          useStore.getState().setPreferences({ activeSessionId: fallback.id });
                        select(fallback);
                      });
                    }}
                  >
                    Delete session
                  </button>
                </div>
              </div>
            )}
          </details>
        )}
      </section>
      <aside className="manager-sidebar" aria-label="All sessions">
        <div className="manager-column-header manager-sidebar-heading">
          <h3>All sessions</h3>
          <button
            disabled={working}
            className="primary"
            aria-label="Start new session"
            onClick={() =>
              void mutate(async () => {
                const next = await newSession(puzzle);

                onContinue(next.id);
              })
            }
          >
            <Plus size={16} /> New
          </button>
        </div>
        <label className="manager-search">
          <Search size={16} aria-hidden="true" />
          <input
            aria-label="Search sessions"
            placeholder="Search sessions…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="manager-session-list">
          {shown.map((session) => (
            <button
              key={session.id}
              className={`manager-session-row ${session.id === selectedId ? 'chosen' : ''}`}
              aria-pressed={session.id === selectedId}
              disabled={working}
              onClick={() => select(session)}
            >
              <span className="manager-puzzle-icon" aria-hidden="true">
                {puzzles[session.puzzle].label}
              </span>
              <span className="manager-session-copy">
                <strong>{session.name}</strong>
                <small>
                  {date(session.createdAt)} · {counts.get(session.id) ?? 0} solves
                </small>
                {session.id === activeId && (
                  <span className="manager-current">
                    <Check size={12} /> Current
                  </span>
                )}
              </span>
            </button>
          ))}
          {!shown.length && <p className="subtle manager-empty">No matching sessions.</p>}
        </div>
      </aside>
      <footer className="manager-footer">
        <button className="text-button" onClick={onSettings} disabled={working}>
          Automatic session settings <ArrowUpRight size={14} />
        </button>
        <button
          className="primary"
          disabled={working}
          onClick={() =>
            void mutate(async () => {
              const next = selected || (await sessionForPuzzle(puzzle));

              onContinue(next.id);
            })
          }
        >
          Continue session <ArrowUpRight size={16} />
        </button>
      </footer>
    </div>
  );
}
