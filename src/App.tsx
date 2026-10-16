import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, MotionConfig } from 'motion/react';
import {
  Copy,
  RefreshCw,
  Plus,
  ArrowUpRight,
  Trash2,
  Pencil,
  Menu,
  Check,
  Scan,
} from 'lucide-react';
import { useStore, safeWrite } from './data/store';
import { db, id } from './data/db';
import { activateSession, saveSessionSolve } from './data/actions/session';
import type { Solve, Penalty } from './core/types';
import type { PuzzleEvent } from './core/puzzles';
import { formatTime, parseTime, statistics, value } from './core/statistics';
import { useTheme } from './core/useTheme';
import { useTimer } from './core/useTimer';
import { useFocusMode } from './core/useFocusMode';
import { useScramble } from './core/useScramble';
import { Navigate, Route, Routes, useLocation, useMatch, useNavigate } from 'react-router';
import { sessionPath } from './core/routes';
import { SessionPage } from './components/session/SessionPage';
import { Background } from './components/Background';
import { isPattern } from './core/backgrounds';
import { Trend } from './components/Trend';
import { PuzzleView } from './components/PuzzleView';
import { SessionManager } from './components/SessionManager';
import { Dialog } from './components/ui/Dialog';
import { portalContainer } from './components/ui/portal';
import { Settings } from './components/Settings';
import { Gallery } from './components/Gallery';
import { DataControls } from './components/DataControls';
import { UpdateNotice } from './components/UpdateNotice';
import { download } from './data/transfer';

const NAVIGATION_VIEWS = ['Timer', 'Settings', 'Gallery'] as const;

const NAVIGATION_PATHS = { Timer: '/', Settings: '/settings', Gallery: '/gallery' } as const;

export default function App() {
  const store = useStore(),
    { workspace, preferences } = store,
    a = workspace.appearance,
    theme = useTheme(a.theme),
    palette = a[theme];
  const [dialog, setDialog] = useState(''),
    [selectedSolve, setSelectedSolve] = useState<Solve | null>(null),
    [manual, setManual] = useState(''),
    [inputError, setInputError] = useState(''),
    [managerSessionId, setManagerSessionId] = useState(''),
    [managerPuzzle, setManagerPuzzle] = useState<PuzzleEvent>('333'),
    [returnDialog, setReturnDialog] = useState(''),
    [deleted, setDeleted] = useState<Solve | null>(null),
    [copied, setCopied] = useState(false),
    [pendingSolve, setPendingSolve] = useState<Solve | null>(null),
    [saving, setSaving] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const sessionRoute = useMatch('/session/:sessionId/*');
  const view = NAVIGATION_VIEWS.find((item) => location.pathname === NAVIGATION_PATHS[item]);

  useEffect(() => {
    if (sessionRoute) setDialog('');
  }, [sessionRoute]);
  const pendingStartedAt = useRef(0);
  const closingManager = useRef(false);
  const { focused, changeFocus, focusFade } = useFocusMode(!!dialog || !!sessionRoute);
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

  useEffect(() => {
    void useStore.getState().boot();
  }, []);

  const persistSolve = async (solve: Solve) => {
    setSaving(true);
    setPendingSolve(solve);
    const ok = await safeWrite(async () => {
      const saved = await saveSessionSolve(solve, preferences, pendingStartedAt.current);

      if (saved.sessionId !== preferences.activeSessionId)
        store.setPreferences({ activeSessionId: saved.sessionId });
    });

    setSaving(false);

    if (ok) {
      setPendingSolve(null);
      void scramble.next();
    }

    return ok;
  };

  const saveSolve = async (duration: number, penalty: Penalty = 'none', manualEntry = false) => {
    const solve: Solve = {
      id: id(),
      duration: Math.round(duration),
      penalty,
      sessionId: preferences.activeSessionId,
      scramble: scramble.scramble,
      timestamp: Date.now(),
      note: '',
    };

    pendingStartedAt.current = manualEntry ? solve.timestamp : solve.timestamp - solve.duration;

    return persistSolve(solve);
  };

  const timer = useTimer(
    preferences.inspection,
    preferences.holdMs,
    !!dialog ||
      !!sessionRoute ||
      view !== 'Timer' ||
      !!pendingSolve ||
      saving ||
      !session ||
      !scramble.scramble ||
      scramble.loading ||
      !preferences.activeSessionId,
    (r) => void saveSolve(r.duration, r.penalty),
  );
  const running = timer.phase === 'running',
    busy = timer.phase !== 'idle';
  const hideUI =
    preferences.hideUIWhileSolving &&
    (timer.phase === 'holding' || timer.phase === 'ready' || running);
  const hiddenUI = { inert: hideUI, 'aria-hidden': hideUI };
  const variables = {
    '--solve-fade-duration': `${preferences.holdMs}ms`,
    '--ink': palette.text,
    '--accent': palette.accent,
    '--tint': palette.tint,
    '--outline': palette.outline,
    // Patterns stop at widget edges: surfaces blend with the page color instead of showing through.
    '--surface': `color-mix(in srgb, ${palette.tint} ${a.opacity * 100}%, ${isPattern(a.background) ? palette.background : 'transparent'})`,
    '--radius': `${a.radius}px`,
    '--control-radius': `${a.controlRadius}px`,
    '--blur': `${a.blur}px`,
    '--border': `${a.border}px`,
    '--font-scale': a.fontScale,
    '--glass': a.glass,
    '--shadow': `0 ${a.shadow * 12}px ${a.shadow * 32}px color-mix(in srgb, ${palette.text} 8%, transparent)`,
  } as CSSProperties;

  const openSolve = (s: Solve, returnTo = '') => {
    setReturnDialog(returnTo);
    setSelectedSolve({ ...s });
    setManual(String(s.duration / 1000));
    setDialog('solve');
    setInputError('');
  };

  const openSessionPage = async (tab: 'solves' | 'graphs') => {
    if (focused) await changeFocus(false);
    navigate(sessionPath(preferences.activeSessionId, tab));
  };

  const openSessions = () => {
    setManagerSessionId(preferences.activeSessionId);
    setManagerPuzzle(session?.puzzle || '333');
    setDialog('sessions');
  };

  const close = () => {
    if (dialog === 'sessions') {
      if (closingManager.current) return;
      closingManager.current = true;
      void safeWrite(() => activateSession(managerSessionId, managerPuzzle)).then((ok) => {
        closingManager.current = false;
        if (ok) setDialog('');
      });
    } else {
      setDialog(dialog === 'solve' ? returnDialog : '');
    }

    setReturnDialog('');
    setInputError('');
  };

  const displayed = pendingSolve
    ? formatTime(value(pendingSolve), a.precision)
    : busy
      ? timer.phase === 'running'
        ? preferences.hideClockWhileSolving
          ? 'Solving...'
          : formatTime(timer.elapsed, a.precision)
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
      ref={portalContainer}
      className={`app theme-${theme} font-${a.font} ${running ? 'is-running' : ''} ${focused ? 'is-focused' : ''} ${hideUI ? 'is-hiding-ui' : ''}`}
      style={variables}
    >
      <Background theme={theme} appearance={a} paused={busy} />
      <div className="solve-ui" {...hiddenUI}>
        <UpdateNotice busy={busy || saving} />
        <motion.header animate={focusFade} className="topbar">
          <motion.a
            className="brand"
            href="#"
            aria-label={focused ? 'Exit focus mode' : 'turn'}
            title={focused ? 'Hover to exit focus mode · Esc' : undefined}
            onPointerEnter={(event) => {
              if (focused && event.pointerType === 'mouse') void changeFocus(false);
            }}
            onClick={(e) => {
              e.preventDefault();
              if (focused) void changeFocus(false);

              if (!busy) {
                navigate('/');
                e.currentTarget.blur();
              }
            }}
          >
            turn
          </motion.a>
          <MotionConfig reducedMotion="user">
            <nav
              className="segmented"
              aria-label="Main navigation"
              inert={focused}
              aria-hidden={focused}
            >
              {NAVIGATION_VIEWS.map((v) => (
                <button
                  key={v}
                  disabled={busy}
                  className={!sessionRoute && view === v ? 'active' : ''}
                  aria-current={!sessionRoute && view === v ? 'page' : undefined}
                  onClick={(event) => {
                    navigate(NAVIGATION_PATHS[v]);
                    if (v === 'Timer') event.currentTarget.blur();
                  }}
                >
                  {!focused && !sessionRoute && view === v && (
                    <motion.span
                      initial={false}
                      className="segmented-selection"
                      layoutId="main-navigation-selection"
                      transition={{ type: 'spring', stiffness: 180, damping: 26 }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="segmented-label">{v}</span>
                </button>
              ))}
            </nav>
          </MotionConfig>
          <div className="topbar-controls">
            <div className="header-actions" inert={focused} aria-hidden={focused}>
              <button
                className="icon-button glass"
                title="Enter focus mode"
                aria-label="Enter focus mode"
                disabled={busy || view !== 'Timer' || !!sessionRoute}
                onClick={(event) => {
                  void changeFocus(true);
                  event.currentTarget.blur();
                }}
              >
                <Scan />
              </button>
            </div>
          </div>
        </motion.header>
      </div>
      {store.error && (
        <div className="error-banner solve-ui" {...hiddenUI} role="alert">
          {store.error}
          <button onClick={() => store.setError('')}>Dismiss</button>
        </div>
      )}
      {pendingSolve && !saving && (
        <div className="error-banner solve-ui" {...hiddenUI} role="alert">
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
      ) : (
        <Routes>
          <Route
            path="session/:sessionId/*"
            element={
              <SessionPage
                key={sessionRoute?.params.sessionId}
                precision={a.precision}
                onBack={() => {
                  navigate('/');
                  setManagerSessionId(
                    sessionRoute?.params.sessionId || preferences.activeSessionId,
                  );
                  setDialog('sessions');
                }}
                onContinue={() => navigate('/')}
              />
            }
          />
          <Route
            path="/"
            element={
              <motion.main animate={focusFade} className="workspace-default">
                <section className="scramble-bar solve-ui" {...hiddenUI} aria-label="Scramble">
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
                  <p className="scramble-text">{scramble.scramble || 'Preparing scramble…'}</p>
                </section>
                {scramble.error && (
                  <p role="alert" className="inline-error solve-ui" {...hiddenUI}>
                    {scramble.error}
                    <button onClick={() => void scramble.next()}>Retry</button>
                  </p>
                )}
                <section className="timer-area">
                  <div className="timer-session-heading solve-ui" {...hiddenUI}>
                    <p className="timer-session-name">{session?.name}</p>
                    <button
                      aria-label="Manage sessions"
                      title="Manage sessions"
                      aria-haspopup="dialog"
                      className="icon-button"
                      disabled={busy || saving || !!pendingSolve || !session}
                      onClick={openSessions}
                    >
                      <Menu size={18} />
                    </button>
                  </div>
                  <button
                    data-timer
                    className={`timer-number ${focused && a.autoFit ? 'focus-auto-fit' : ''} ${timer.phase === 'ready' ? 'ready' : ''} ${timer.phase === 'holding' ? 'holding' : ''}`}
                    aria-label="Timer. Hold to start, press to stop"
                    style={{
                      fontWeight: a.timerWeight,
                      fontSize: a.autoFit
                        ? focused
                          ? `clamp(64px, min(28vw, 24svh, calc((100cqi - 60px) / ${Math.max(displayed.length, 4) * (a.timerFont === 'mono' ? 0.62 : 0.5)})), 280px)`
                          : `clamp(64px,11vw,${a.timerSize}px)`
                        : `${a.timerSize}px`,
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
                  <p className="timer-hint solve-ui" {...hiddenUI} aria-live="polite">
                    {hint}
                  </p>
                </section>
                {a.showStats && (
                  <section className="inline-stats solve-ui" {...hiddenUI}>
                    {(['ao5', 'ao12', 'best'] as const).map((k) => (
                      <div key={k}>
                        <span>{k === 'best' ? 'Best' : k}</span>
                        <strong>{formatTime(stats[k])}</strong>
                      </div>
                    ))}
                  </section>
                )}
                <div
                  className={`focus-widgets solve-ui ${focused && preferences.hideWidgetsInFocus ? 'focus-widgets-hidden' : ''}`}
                  inert={hideUI || busy || (focused && preferences.hideWidgetsInFocus)}
                  aria-hidden={hideUI || (focused && preferences.hideWidgetsInFocus)}
                >
                  <section className="widget-row">
                    <article className="widget glass recent">
                      <header>
                        <h2>Recent solves</h2>
                        <button
                          className="text-button"
                          onClick={() => {
                            void openSessionPage('solves');
                          }}
                        >
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
                        <button
                          className="text-button"
                          onClick={() => {
                            void openSessionPage('solves');
                          }}
                        >
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
                        <button
                          className="text-button"
                          onClick={() => void openSessionPage('graphs')}
                        >
                          See all <ArrowUpRight size={16} />
                        </button>
                      </header>
                      <Trend key={session?.id} solves={solves} />
                    </article>
                    <article className="widget glass">
                      <header>
                        <h2>Scramble preview</h2>
                      </header>
                      <PuzzleView scramble={scramble.scramble} event={puzzle} />
                    </article>
                  </section>
                </div>
              </motion.main>
            }
          />
          <Route
            path="settings"
            element={<Settings theme={theme} dataControls={<DataControls />} />}
          />
          <Route path="gallery" element={<Gallery />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
      {deleted && (
        <div className="toast solve-ui" {...hiddenUI}>
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
      <Dialog
        open={!!dialog}
        title={
          dialog === 'manual'
            ? 'Add a solve'
            : dialog === 'solve'
              ? 'Solve details'
              : 'Puzzle and sessions'
        }
        onClose={close}
        wide={dialog === 'sessions'}
        allowOverflow={dialog === 'sessions'}
        className={dialog === 'sessions' ? 'session-manager-dialog' : ''}
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
                void saveSolve(duration, 'none', true).then((ok) => {
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
        {dialog === 'sessions' && (
          <SessionManager
            theme={theme}
            sessions={sessions}
            activeId={preferences.activeSessionId}
            selectedId={managerSessionId}
            onSelect={setManagerSessionId}
            onPuzzleChange={setManagerPuzzle}
            onExpand={(id) => {
              setDialog('');
              navigate(sessionPath(id));
            }}
            onViewAll={(id) => {
              setDialog('');
              navigate(sessionPath(id, 'solves'));
            }}
            onOpenSolve={(solve) => openSolve(solve, 'sessions')}
            precision={a.precision}
          />
        )}
      </Dialog>
    </div>
  );
}
