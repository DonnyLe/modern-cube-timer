import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowUpRight,
  CheckSquare,
  SlidersHorizontal,
  Maximize2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import type { Session, Solve } from '../core/types';
import { puzzles, puzzleEvents, type PuzzleEvent } from '../core/puzzles';
import { formatTime, statistics, value } from '../core/statistics';
import { useScramble } from '../core/useScramble';
import { db } from '../data/db';
import {
  deleteSessions,
  newSession,
  renameSession,
  selectPuzzleSession,
} from '../data/sessionActions';
import { formatSessionDate, formatElapsedTime } from '../utils/date';
import { safeWrite, useStore } from '../data/store';
import { Select } from './Select';
import { PuzzleArtwork } from './PuzzleArtwork';
import { PuzzlePreview } from './PuzzlePreview';

export function SessionManager({
  sessions,
  activeId,
  selectedId,
  onSelect,
  onPuzzleChange,
  onViewAll,
  onOpenSolve,
  precision,
}: {
  sessions: Session[];
  activeId: string;
  selectedId: string;
  onSelect: (id: string) => void;
  onPuzzleChange: (puzzle: PuzzleEvent) => void;
  onViewAll: (id: string) => void;
  onOpenSolve: (solve: Solve) => void;
  precision: number;
}) {
  const appearance = useStore((state) => state.workspace.appearance);
  const breakHours = useStore((state) => state.preferences.sessionBreakHours);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 5000);

    return () => clearTimeout(timeout);
  }, [notice]);
  const accent = appearance[appearance.theme].accent;
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(accent.slice(offset, offset + 2), 16) / 255;

    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const buttonColor = luminance > 0.179 ? '#000000' : '#ffffff';
  const selected = sessions.find((session) => session.id === selectedId);
  const [puzzle, setPuzzle] = useState<PuzzleEvent>(selected?.puzzle || '333');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [puzzleFilter, setPuzzleFilter] = useState<PuzzleEvent | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selecting, setSelecting] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [menuId, setMenuId] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuId) return;
    menuRef.current?.querySelector('button')?.focus();

    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target) &&
        !menuButtonRef.current?.contains(event.target)
      )
        setMenuId('');
    };

    document.addEventListener('pointerdown', dismiss);

    return () => document.removeEventListener('pointerdown', dismiss);
  }, [menuId]);
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
  const cutoff = dateFilter === 'all' ? 0 : Date.now() - Number(dateFilter) * 86400000;
  const shown = [...sessions]
    .reverse()
    .filter((session) =>
      `${session.name} ${puzzles[session.puzzle].label}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
    )
    .filter((session) => puzzleFilter === 'all' || session.puzzle === puzzleFilter)
    .filter((session) => session.createdAt >= cutoff);
  const allChecked = shown.length > 0 && shown.every((session) => checkedIds.includes(session.id));
  const toggleChecked = (id: string) =>
    setCheckedIds((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));

  const select = (session: Session) => {
    setNotice('');
    onSelect(session.id);
    setPuzzle(session.puzzle);
    onPuzzleChange(session.puzzle);
    setRenaming(false);
    setDeleteIds([]);
    setMenuId('');
  };

  const mutate = async (action: () => Promise<void>) => {
    setWorking(true);
    const ok = await safeWrite(action);

    setWorking(false);

    return ok;
  };

  return (
    <div
      className="session-manager-body"
      aria-busy={working}
      style={{ '--manager-on-accent': buttonColor } as CSSProperties}
    >
      <section className="manager-art">
        <div className="manager-column-header puzzle-selector">
          <span>Puzzle</span>
          <Select
            label="Puzzle"
            value={puzzle}
            disabled={working}
            options={puzzleEvents.map((event) => ({ value: event, label: puzzles[event].label }))}
            onValueChange={(event) => {
              if (event === puzzle) return;
              void mutate(async () => {
                const { session: next, created } = await selectPuzzleSession(event, breakHours);

                select(next);

                if (created) {
                  const label = /^[2-7]{3}$/.test(event)
                    ? `${event[0]}x${event[0]}`
                    : puzzles[event].label;

                  setNotice(`Made a new ${label} session titled “${next.name}”.`);
                }
              });
            }}
          />
        </div>
        <PuzzleArtwork
          key={puzzle}
          puzzle={puzzle}
          scramble={solves.at(-1)?.scramble || preview.scramble}
        />
      </section>
      {notice && (
        <div className="manager-notice" role="status">
          {notice}
        </div>
      )}
      <section className="manager-details" aria-label="Selected session">
        <div className="manager-column-header">
          <h3>{selected?.name || `New ${puzzles[puzzle].label} session`}</h3>
        </div>
        <p className="manager-metadata">
          {selected
            ? `${formatSessionDate(selected.createdAt)} · ${solves.length} ${solves.length === 1 ? 'solve' : 'solves'}`
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
                setDeleteIds([]);
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
                await renameSession(selected.id, name);
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
                  <small title={new Date(solve.timestamp).toLocaleString()}>
                    {formatElapsedTime(solve.timestamp)}
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

                select(next);
              })
            }
          >
            <Plus size={16} /> New
          </button>
        </div>
        <div className="manager-session-toolbar">
          <div className="manager-search">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search sessions"
              placeholder="Search sessions…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="manager-search-actions">
              <button
                className="icon-button small"
                aria-label="Filter sessions"
                aria-expanded={filtersOpen}
                aria-pressed={puzzleFilter !== 'all' || dateFilter !== 'all'}
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <SlidersHorizontal size={16} />
              </button>
              <button
                className="icon-button small"
                aria-label="Select sessions"
                aria-pressed={selecting}
                onClick={() => {
                  setSelecting(!selecting);
                  setCheckedIds([]);
                }}
              >
                <CheckSquare size={16} />
              </button>
            </div>
          </div>
          {filtersOpen && (
            <div className="manager-filters" aria-label="Session filters">
              <label>
                Puzzle
                <Select
                  label="Filter by puzzle"
                  value={puzzleFilter}
                  options={[
                    { value: 'all', label: 'All puzzles' },
                    ...puzzleEvents.map((event) => ({ value: event, label: puzzles[event].label })),
                  ]}
                  onValueChange={setPuzzleFilter}
                />
              </label>
              <label>
                Created
                <Select
                  label="Filter by date"
                  value={dateFilter}
                  options={[
                    { value: 'all', label: 'Any time' },
                    { value: '1', label: 'Past 24 hours' },
                    { value: '7', label: 'Past week' },
                    { value: '30', label: 'Past month' },
                  ]}
                  onValueChange={setDateFilter}
                />
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setPuzzleFilter('all');
                  setDateFilter('all');
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          {selecting && (
            <div className="manager-selection-controls">
              <label>
                <input
                  type="checkbox"
                  aria-label="Select all visible sessions"
                  checked={allChecked}
                  disabled={!shown.length || working}
                  ref={(element) => {
                    if (element)
                      element.indeterminate =
                        !allChecked && shown.some((session) => checkedIds.includes(session.id));
                  }}
                  onChange={(event) =>
                    setCheckedIds((ids) =>
                      event.target.checked
                        ? [...new Set([...ids, ...shown.map((session) => session.id)])]
                        : ids.filter((id) => !shown.some((session) => session.id === id)),
                    )
                  }
                />
                Select all
              </label>
              <small>{checkedIds.length} selected</small>
              <button
                className="icon-button small danger"
                aria-label="Delete selected sessions"
                disabled={!checkedIds.length || working}
                onClick={() => setDeleteIds(checkedIds)}
              >
                <Trash2 size={16} />
              </button>
              <button
                className="text-button"
                disabled={!checkedIds.length}
                onClick={() => setCheckedIds([])}
              >
                Clear
              </button>
            </div>
          )}
        </div>
        {deleteIds.length > 0 && (
          <div className="manager-delete-confirmation" role="alert">
            <p>
              {deleteIds.length === 1
                ? `Delete “${sessions.find((session) => session.id === deleteIds[0])?.name}” and all its solves?`
                : `Delete ${deleteIds.length} selected sessions and all their solves?`}
            </p>
            <div className="button-row">
              <button disabled={working} onClick={() => setDeleteIds([])}>
                Cancel
              </button>
              <button
                className="danger"
                disabled={working}
                onClick={() =>
                  void mutate(async () => {
                    const fallback = await deleteSessions(deleteIds, selectedId, puzzle);

                    if (deleteIds.includes(selectedId)) select(fallback);
                    setCheckedIds((ids) => ids.filter((id) => !deleteIds.includes(id)));
                    setDeleteIds([]);
                  })
                }
              >
                Delete {deleteIds.length === 1 ? 'session' : 'sessions'}
              </button>
            </div>
          </div>
        )}
        <div className="manager-session-list">
          {shown.map((session) => (
            <div
              className={`manager-session-entry ${selecting ? 'is-selecting' : ''}`}
              key={session.id}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && menuId === session.id) {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenuId('');
                  event.currentTarget
                    .querySelector<HTMLButtonElement>('.manager-session-menu')
                    ?.focus();
                }
              }}
            >
              {selecting && (
                <input
                  className="manager-session-checkbox"
                  type="checkbox"
                  aria-label={`Select ${session.name}`}
                  checked={checkedIds.includes(session.id)}
                  disabled={working}
                  onChange={() => toggleChecked(session.id)}
                />
              )}
              <button
                className={`manager-session-row ${(selecting ? checkedIds.includes(session.id) : session.id === selectedId) ? 'chosen' : ''}`}
                aria-pressed={
                  selecting ? checkedIds.includes(session.id) : session.id === selectedId
                }
                disabled={working}
                onClick={() => (selecting ? toggleChecked(session.id) : select(session))}
              >
                <PuzzlePreview
                  event={session.puzzle}
                  faceOnly
                  randomized
                  className="manager-puzzle-icon"
                />
                <span className="manager-session-copy">
                  <strong>{session.name}</strong>
                  <span className="manager-session-meta">
                    <small>
                      {formatSessionDate(session.createdAt)} · {counts.get(session.id) ?? 0} solves
                    </small>
                    {session.id === activeId && <span className="manager-current">Current</span>}
                  </span>
                </span>
              </button>
              <button
                className="icon-button small manager-session-menu"
                aria-label={`Session actions for ${session.name}`}
                aria-haspopup="menu"
                aria-expanded={menuId === session.id}
                disabled={working}
                onClick={(event) => {
                  menuButtonRef.current = event.currentTarget;
                  setMenuId(menuId === session.id ? '' : session.id);
                }}
              >
                <MoreHorizontal size={16} />
              </button>
              {menuId === session.id && (
                <div
                  className="manager-row-menu"
                  ref={menuRef}
                  role="menu"
                  aria-label={`Actions for ${session.name}`}
                >
                  <button
                    role="menuitem"
                    className="danger"
                    onClick={() => {
                      setDeleteIds([session.id]);
                      setMenuId('');
                    }}
                  >
                    <Trash2 size={16} /> Delete session
                  </button>
                </div>
              )}
            </div>
          ))}
          {!shown.length && <p className="subtle manager-empty">No matching sessions.</p>}
        </div>
      </aside>
    </div>
  );
}
