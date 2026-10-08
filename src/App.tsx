import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Copy,
  RefreshCw,
  Sun,
  Moon,
  Waves,
  Plus,
  ArrowUpRight,
  ChevronDown,
  Trash2,
  Pencil,
  Check,
  Scan,
} from 'lucide-react';
import { useStore, safeWrite } from './data/store';
import { db, id, sessionForPuzzle } from './data/db';
import { puzzles, puzzleEvents, type PuzzleEvent } from './core/puzzles';
import type { Solve, Penalty } from './core/types';
import { formatTime, parseTime, statistics, value } from './core/statistics';
import { useTimer } from './core/useTimer';
import { useScramble } from './core/useScramble';
import { Background } from './components/Background';
import { Trend } from './components/Trend';
import { Preview } from './components/Preview';
import { Select } from './components/Select';
import { Dialog } from './components/Dialog';
import { Settings } from './components/Settings';
import { Gallery } from './components/Gallery';
import { DataControls } from './components/DataControls';
import { UpdateNotice } from './components/UpdateNotice';
import { download } from './data/transfer';
export default function App() {
  const store = useStore(),
    { workspace, preferences } = store,
    a = workspace.appearance,
    palette = a[a.theme];
  const [view, setView] = useState('Timer'),
    [dialog, setDialog] = useState(''),
    [selectedSolve, setSelectedSolve] = useState<Solve | null>(null),
    [manual, setManual] = useState(''),
    [inputError, setInputError] = useState(''),
    [name, setName] = useState(''),
    [deleted, setDeleted] = useState<Solve | null>(null),
    [copied, setCopied] = useState(false),
    [pendingSolve, setPendingSolve] = useState<Solve | null>(null),
    [saving, setSaving] = useState(false),
    [switchingPuzzle, setSwitchingPuzzle] = useState(false),
    [puzzlePickerOpen, setPuzzlePickerOpen] = useState(false),
    [focused, setFocused] = useState(false);
  const brandRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!focused) return;
    const exitFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !dialog && !puzzlePickerOpen)
        setFocused(false);
    };
    window.addEventListener('keydown', exitFocus);
    return () => window.removeEventListener('keydown', exitFocus);
  }, [focused, dialog, puzzlePickerOpen]);
  const sessions = useLiveQuery(() => db.sessions.orderBy('createdAt').toArray(), []) || [];
  const solves =
    useLiveQuery(
      () => db.solves.where('sessionId').equals(preferences.activeSessionId).sortBy('timestamp'),
      [preferences.activeSessionId],
    ) || [];
  const session = sessions.find((s) => s.id === preferences.activeSessionId),
    stats = statistics(solves),
    last = solves.at(-1);
  const puzzle = session?.puzzle || '333';
  const scramble = useScramble(session?.puzzle || null);
  const changePuzzle = async (event: PuzzleEvent) => {
    setSwitchingPuzzle(true);
    await safeWrite(async () => {
      const next = await sessionForPuzzle(event);
      store.setPreferences({ activeSessionId: next.id });
    });
    setSwitchingPuzzle(false);
  };
  useEffect(() => {
    void useStore.getState().boot();
  }, []);
  const persistSolve = async (solve: Solve) => {
    setSaving(true);
    setPendingSolve(solve);
    const ok = await safeWrite(() => db.solves.put(solve));
    setSaving(false);
    if (ok) {
      setPendingSolve(null);
      void scramble.next();
    }
    return ok;
  };
  const saveSolve = async (duration: number, penalty: Penalty = 'none') => {
    const solve: Solve = {
      id: id(),
      duration: Math.round(duration),
      penalty,
      sessionId: preferences.activeSessionId,
      scramble: scramble.scramble,
      timestamp: Date.now(),
      note: '',
    };
    return persistSolve(solve);
  };
  const timer = useTimer(
    preferences.inspection,
    preferences.holdMs,
    !!dialog ||
      view !== 'Timer' ||
      !!pendingSolve ||
      saving ||
      switchingPuzzle ||
      puzzlePickerOpen ||
      !session ||
      !scramble.scramble ||
      scramble.loading ||
      !preferences.activeSessionId,
    (r) => void saveSolve(r.duration, r.penalty),
  );
  const running = timer.phase === 'running',
    busy = timer.phase !== 'idle';
  const variables = {
    '--ink': palette.text,
    '--accent': palette.accent,
    '--tint': palette.tint,
    '--outline': palette.outline,
    '--surface': `color-mix(in srgb, ${palette.tint} ${a.opacity * 100}%, transparent)`,
    '--radius': `${a.radius}px`,
    '--blur': `${a.blur}px`,
    '--border': `${a.border}px`,
    '--font-scale': a.fontScale,
    '--glass': a.glass,
    '--shadow': `0 ${a.shadow * 12}px ${a.shadow * 32}px color-mix(in srgb, ${palette.text} 8%, transparent)`,
  } as CSSProperties;
  const openSolve = (s: Solve) => {
    setSelectedSolve({ ...s });
    setManual(String(s.duration / 1000));
    setDialog('solve');
    setInputError('');
  };
  const close = () => {
    setDialog('');
    setInputError('');
  };
  const theme = () =>
    store.setWorkspace({
      ...workspace,
      appearance: { ...a, theme: a.theme === 'light' ? 'dark' : 'light' },
    });
  const displayed = pendingSolve
    ? formatTime(value(pendingSolve), a.precision)
    : busy
      ? timer.phase === 'running'
        ? formatTime(timer.elapsed, a.precision)
        : timer.inspectionPenalty !== 'none'
          ? timer.inspectionPenalty
          : preferences.inspection
            ? String(Math.ceil(timer.elapsed / 1000))
            : formatTime(last ? value(last) : 0, a.precision)
      : formatTime(last ? value(last) : 0, a.precision);
  const hint =
    timer.phase === 'ready'
      ? 'Release to start'
      : timer.phase === 'holding'
        ? 'Keep holding…'
        : running
          ? 'Press anywhere on the timer to stop'
          : timer.phase === 'inspection'
            ? 'Inspect · hold space when ready'
            : scramble.loading && !scramble.scramble
              ? 'Preparing your first scramble…'
              : preferences.inspection
                ? 'Press space to inspect'
                : 'Hold space to start';
  return (
    <div
      className={`app theme-${a.theme} font-${a.font} ${running ? 'is-running' : ''} ${focused ? 'is-focused' : ''}`}
      style={variables}
    >
      <Background appearance={a} paused={busy} />
      <UpdateNotice busy={busy || saving} />
      <header className="topbar">
        <a
          ref={brandRef}
          className="brand"
          href="#"
          aria-label={focused ? 'Exit focus mode' : 'turn'}
          title={focused ? 'Hover to exit focus mode · Esc' : undefined}
          onPointerEnter={(event) => {
            if (focused && event.pointerType === 'mouse') setFocused(false);
          }}
          onClick={(e) => {
            e.preventDefault();
            setFocused(false);
            if (!busy) setView('Timer');
          }}
        >
          turn
        </a>
        <nav
          className="segmented"
          aria-label="Main navigation"
          inert={focused}
          aria-hidden={focused}
        >
          {['Timer', 'Settings', 'Gallery'].map((v) => (
            <button
              key={v}
              disabled={busy}
              className={view === v ? 'active' : ''}
              aria-current={view === v ? 'page' : undefined}
              onClick={() => setView(v)}
            >
              {view === v && <i />}
              {v}
            </button>
          ))}
        </nav>
        <div className="puzzle-selector" inert={focused} aria-hidden={focused}>
          <Select
            label="Puzzle"
            value={puzzle}
            options={puzzleEvents.map((event) => ({
              value: event,
              label: puzzles[event].label,
            }))}
            disabled={busy || saving || !!pendingSolve || switchingPuzzle || !session}
            onValueChange={(event: PuzzleEvent) => void changePuzzle(event)}
            onOpenChange={setPuzzlePickerOpen}
          />
        </div>
        <div className="header-actions" inert={focused} aria-hidden={focused}>
          <button
            className="icon-button glass"
            title="Enter focus mode"
            aria-label="Enter focus mode"
            disabled={busy || view !== 'Timer'}
            onClick={(event) => {
              setFocused(true);
              if (event.detail === 0) brandRef.current?.focus();
              else event.currentTarget.blur();
            }}
          >
            <Scan />
          </button>
          <button
            className="icon-button glass"
            title="Toggle theme"
            aria-label="Toggle theme"
            onClick={theme}
          >
            {a.theme === 'light' ? <Sun /> : <Moon />}
          </button>
          <button
            className={`icon-button glass ${!a.motion ? 'muted' : ''}`}
            title="Toggle background motion"
            aria-label="Toggle background motion"
            aria-pressed={a.motion}
            onClick={() =>
              store.setWorkspace({ ...workspace, appearance: { ...a, motion: !a.motion } })
            }
          >
            <Waves />
          </button>
        </div>
      </header>
      {store.error && (
        <div className="error-banner" role="alert">
          {store.error}
          <button onClick={() => store.setError('')}>Dismiss</button>
        </div>
      )}
      {pendingSolve && !saving && (
        <div className="error-banner" role="alert">
          {formatTime(value(pendingSolve))} has not been saved.
          <button onClick={() => void persistSolve(pendingSolve)}>Retry save</button>
          <button
            onClick={() =>
              download(
                JSON.stringify(pendingSolve, null, 2),
                'unsaved-solve.json',
                'application/json',
              )
            }
          >
            Download unsaved solve
          </button>
        </div>
      )}
      {!store.ready ? (
        <main className="loading">Opening your workspace…</main>
      ) : view === 'Timer' ? (
        <main className="workspace-default">
          <section className="scramble-bar" aria-label="Scramble">
            <div className="scramble-controls">
              <div className="scramble-actions">
                <button
                  aria-label="Copy scramble"
                  className="icon-button"
                  disabled={!scramble.scramble}
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(scramble.scramble)
                      .then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1600);
                      })
                      .catch(() =>
                        store.setError('Could not copy. Select and copy the scramble text.'),
                      );
                  }}
                >
                  {copied ? <Check /> : <Copy />}
                </button>
                <button
                  aria-label="New scramble"
                  className="icon-button"
                  disabled={busy || scramble.loading}
                  onClick={() => void scramble.next()}
                >
                  <RefreshCw size={20} className={scramble.loading ? 'spin' : ''} />
                </button>
              </div>
            </div>
            <p className="scramble-text">{scramble.scramble || 'Preparing scramble…'}</p>
          </section>
          {scramble.error && (
            <p role="alert" className="inline-error">
              {scramble.error}
              <button onClick={() => void scramble.next()}>Retry</button>
            </p>
          )}
          <section className="timer-area">
            <button
              className="session-label"
              disabled={busy}
              onClick={() => {
                setName(session?.name || '');
                setDialog('sessions');
              }}
            >
              {session?.name || 'Practice'}
              <ChevronDown size={13} />
            </button>
            <button
              data-timer
              className={`timer-number ${timer.phase === 'ready' ? 'ready' : ''} ${timer.phase === 'holding' ? 'holding' : ''}`}
              aria-label="Timer. Hold to start, press to stop"
              style={{
                fontWeight: a.timerWeight,
                fontSize: a.autoFit ? `clamp(64px,11vw,${a.timerSize}px)` : `${a.timerSize}px`,
                fontFamily: a.timerFont === 'mono' ? 'ui-monospace,monospace' : 'inherit',
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                timer.press();
              }}
              onPointerUp={() => timer.release()}
              onPointerCancel={() => {
                if (!running) timer.cancel();
              }}
            >
              {displayed}
            </button>
            <p className="timer-hint" aria-live="polite">
              {hint}
            </p>
          </section>
          {a.showStats && (
            <section className="inline-stats">
              {(['ao5', 'ao12', 'best'] as const).map((k) => (
                <div key={k}>
                  <span>{k === 'best' ? 'Best' : k}</span>
                  <strong>{formatTime(stats[k])}</strong>
                </div>
              ))}
            </section>
          )}
          <div
            className={`focus-widgets ${focused && preferences.hideWidgetsInFocus ? 'focus-widgets-hidden' : ''}`}
            inert={busy || (focused && preferences.hideWidgetsInFocus)}
            aria-hidden={focused && preferences.hideWidgetsInFocus}
          >
            <section className="widget-row">
              <article className="widget glass recent">
                <header>
                  <h2>Recent solves</h2>
                  <button className="text-button" onClick={() => setDialog('history')}>
                    See all <ArrowUpRight size={16} />
                  </button>
                </header>
                {solves.length ? (
                  <div className="recent-list">
                    {solves
                      .slice(-3)
                      .reverse()
                      .map((s, i) => (
                        <button className="solve-row" key={s.id} onClick={() => openSolve(s)}>
                          <span>{solves.length - i}</span>
                          <strong>
                            {formatTime(value(s))}
                            {s.penalty === '+2' && <small> +2</small>}
                          </strong>
                          <Pencil size={13} />
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="empty">
                    <p>Your first solve starts here.</p>
                    <small>Hold space, then release.</small>
                  </div>
                )}
                <footer>
                  <button className="text-button" onClick={() => setDialog('sessions')}>
                    {solves.length} solves · {session?.name}
                  </button>
                  <button
                    aria-label="Add manual solve"
                    className="icon-button small"
                    onClick={() => {
                      setManual('');
                      setDialog('manual');
                    }}
                  >
                    <Plus size={18} />
                  </button>
                </footer>
              </article>
              <article className="widget glass">
                <header>
                  <h2>Session trend</h2>
                  <span className="subtle">Time (s)</span>
                </header>
                <Trend solves={solves} />
              </article>
              <article className="widget glass">
                <header>
                  <h2>Scramble preview</h2>
                </header>
                <Preview scramble={scramble.scramble} event={puzzle} />
              </article>
            </section>
          </div>
        </main>
      ) : view === 'Settings' ? (
        <Settings dataControls={<DataControls />} />
      ) : (
        <Gallery />
      )}
      {deleted && (
        <div className="toast">
          Solve deleted
          <button
            onClick={() => {
              void safeWrite(() => db.solves.put(deleted));
              setDeleted(null);
            }}
          >
            Undo
          </button>
          <button aria-label="Dismiss undo" onClick={() => setDeleted(null)}>
            ×
          </button>
        </div>
      )}
      {dialog && (
        <Dialog
          title={
            dialog === 'delete-session'
              ? 'Delete this session?'
              : dialog === 'manual'
                ? 'Add a solve'
                : dialog === 'solve'
                  ? 'Solve details'
                  : dialog === 'history'
                    ? 'Recent solves'
                    : 'Sessions'
          }
          onClose={close}
          wide={dialog === 'history'}
        >
          {(dialog === 'manual' || dialog === 'solve') && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const duration = parseTime(manual);
                if (duration === null) {
                  setInputError('Enter a time such as 12.84 or 1:02.34.');
                  return;
                }
                if (selectedSolve && dialog === 'solve') {
                  void safeWrite(() => db.solves.put({ ...selectedSolve, duration })).then((ok) => {
                    if (ok) close();
                  });
                } else {
                  void saveSolve(duration).then((ok) => {
                    if (ok) close();
                  });
                }
              }}
            >
              <label>
                Time in seconds
                <input
                  autoFocus
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="12.84"
                  inputMode="decimal"
                />
              </label>
              {inputError && (
                <p role="alert" className="inline-error">
                  {inputError}
                </p>
              )}
              {dialog === 'solve' && selectedSolve && (
                <>
                  <label>
                    Penalty
                    <select
                      value={selectedSolve.penalty}
                      onChange={(e) =>
                        setSelectedSolve({ ...selectedSolve, penalty: e.target.value as Penalty })
                      }
                    >
                      <option value="none">None</option>
                      <option>+2</option>
                      <option>DNF</option>
                    </select>
                  </label>
                  <label>
                    Notes
                    <textarea
                      value={selectedSolve.note}
                      onChange={(e) => setSelectedSolve({ ...selectedSolve, note: e.target.value })}
                    />
                  </label>
                  <p className="detail-scramble">{selectedSolve.scramble}</p>
                  <p className="subtle">{new Date(selectedSolve.timestamp).toLocaleString()}</p>
                </>
              )}
              <div className="button-row">
                {dialog === 'solve' && selectedSolve && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      void safeWrite(() => db.solves.delete(selectedSolve.id)).then((ok) => {
                        if (ok) {
                          setDeleted(selectedSolve);
                          close();
                        }
                      });
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                )}
                <button className="primary" type="submit">
                  Save solve
                </button>
              </div>
            </form>
          )}
          {dialog === 'history' && (
            <>
              <div className="summary-grid">
                {Object.entries(stats).map(([k, v]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <strong>{k === 'count' ? v : formatTime(v)}</strong>
                  </div>
                ))}
              </div>
              <div className="history-list">
                {[...solves].reverse().map((s, i) => (
                  <button key={s.id} className="solve-row" onClick={() => openSolve(s)}>
                    <span>{solves.length - i}</span>
                    <strong>{formatTime(value(s))}</strong>
                    <small>{s.note || new Date(s.timestamp).toLocaleTimeString()}</small>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setManual('');
                  setDialog('manual');
                }}
              >
                Add manual solve
              </button>
            </>
          )}
          {dialog === 'delete-session' && (
            <>
              <p>
                Delete “{session?.name}” and its {solves.length} solves? Export a backup first if
                you want to keep them.
              </p>
              <div className="button-row">
                <button onClick={() => setDialog('sessions')}>Keep session</button>
                <button
                  className="danger"
                  onClick={() => {
                    if (!session) return;
                    const sid = session.id;
                    void safeWrite(() =>
                      db.transaction('rw', db.sessions, db.solves, async () => {
                        await db.solves.where('sessionId').equals(sid).delete();
                        await db.sessions.delete(sid);
                      }),
                    ).then((ok) => {
                      if (ok) {
                        const next = sessions.find((s) => s.id !== sid);
                        if (next) store.setPreferences({ activeSessionId: next.id });
                        close();
                      }
                    });
                  }}
                >
                  Delete session
                </button>
              </div>
            </>
          )}
          {dialog === 'sessions' && (
            <>
              <button
                className="danger session-delete"
                disabled={sessions.length < 2}
                onClick={() => setDialog('delete-session')}
              >
                Delete current session
              </button>
              <p className="subtle">
                New sessions use {puzzles[puzzle].label}. Choose another puzzle from the scramble
                bar. Keep at least one session.
              </p>
              <div className="session-list">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    className={s.id === session?.id ? 'chosen' : ''}
                    onClick={() => {
                      store.setPreferences({ activeSessionId: s.id });
                      close();
                    }}
                  >
                    {s.name}
                    <small>{puzzles[s.puzzle].label}</small>
                    {s.id === session?.id && <Check size={16} />}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!name.trim()) return;
                  const s = { id: id(), name: name.trim(), createdAt: Date.now(), puzzle };
                  void safeWrite(() => db.sessions.add(s)).then((ok) => {
                    if (ok) {
                      store.setPreferences({ activeSessionId: s.id });
                      close();
                    }
                  });
                }}
              >
                <label>
                  Session name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Evening practice"
                  />
                </label>
                <div className="button-row">
                  <button
                    type="button"
                    disabled={!name.trim() || !session}
                    onClick={() => {
                      if (session)
                        void safeWrite(() =>
                          db.sessions.update(session.id, { name: name.trim() }),
                        ).then((ok) => {
                          if (ok) close();
                        });
                    }}
                  >
                    Rename current
                  </button>
                  <button className="primary" type="submit">
                    New session
                  </button>
                </div>
              </form>
            </>
          )}
        </Dialog>
      )}
    </div>
  );
}
