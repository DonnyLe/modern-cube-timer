import { Link, NavLink } from './SessionLinks';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useMatch,
  useNavigate,
  useParams,
} from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Download, Pencil, Play } from 'lucide-react';
import type { Session, Solve } from '../../core/types';
import { puzzles } from '../../core/puzzles';
import { sessionPath } from '../../core/routes';
import { db } from '../../data/db';
import { restoreSolve } from '../../data/actions/solve';
import { safeWrite } from '../../data/store';
import { activateSession, renameSession } from '../../data/actions/session';
import { csv, download } from '../../data/transfer';
import { SessionInsights } from './SessionInsights';
import { SessionGraphs } from './SessionGraphs';
import { SolveDetail } from './SolveDetail';
import { SessionSolves } from './SessionSolves';
import { SessionOverview } from './SessionOverview';
import { PuzzleView } from '../PuzzleView';
import '../../styles/session.css';

export function SessionPage({
  onBack,
  onContinue,
  precision,
}: {
  onBack: (toPicker: boolean) => void;
  onContinue: () => void;
  precision: number;
}) {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPicker = location.state?.sessionEntry === 'sessions';
  const backLabel = fromPicker ? 'All sessions' : 'Back to Timer';
  const onSolves = !!useMatch('/session/:sessionId/solves');
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId]);
  const solves = useLiveQuery(
    () => db.solves.where('sessionId').equals(sessionId).sortBy('timestamp'),
    [sessionId],
  );
  const [selectedId, setSelectedId] = useState('');
  const [deleted, setDeleted] = useState<Solve | null>(null);
  const selected = solves?.find((solve) => solve.id === selectedId);

  const openSolve = (solve: Solve) => {
    setSelectedId(solve.id);
    if (!onSolves) navigate(sessionPath(sessionId, 'solves'), { state: location.state });
  };

  const closeDetail = () => {
    setSelectedId('');
    requestAnimationFrame(() => document.getElementById(`session-solve-${selectedId}`)?.focus());
  };

  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, [sessionId, session?.id]);

  if (!solves) return <main className="session-page loading">Opening session…</main>;
  if (!session)
    return (
      <main className="session-page">
        <button className="text-button" onClick={() => onBack(fromPicker)}>
          <ArrowLeft size={16} /> {backLabel}
        </button>
        <h1>This session is no longer available.</h1>
      </main>
    );

  return (
    <main className="session-page" aria-label="Session details">
      <button className="text-button session-back" onClick={() => onBack(fromPicker)}>
        <ArrowLeft size={16} /> {backLabel}
      </button>
      <header className="session-header">
        <div className="session-identity">
          <PuzzleView
            event={session.puzzle}
            variant="face"
            randomized
            caption={false}
            className="session-thumbnail"
          />
          <div>
            <h1 ref={heading} tabIndex={-1}>
              {session.name}
            </h1>
            <p className="subtle">
              {puzzles[session.puzzle].label} ·{' '}
              {new Date(session.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} ·{' '}
              {solves.length} solves
            </p>
          </div>
          <SessionRename key={session.id} session={session} />
        </div>
        <div className="session-header-actions">
          {!fromPicker && <button onClick={() => onBack(true)}>All sessions</button>}
          <button
            disabled={!solves.length}
            onClick={() => download(csv(solves, [session]), 'session.csv', 'text/csv')}
          >
            <Download size={16} /> Export
          </button>
          <button
            className="primary"
            onClick={() => {
              void safeWrite(() => activateSession(session.id, session.puzzle)).then((ok) => {
                if (ok) onContinue();
              });
            }}
          >
            <Play size={16} /> Continue session
          </button>
        </div>
      </header>
      <nav className="session-tabs" aria-label="Session navigation">
        {['overview', 'graphs', 'solves', 'insights'].map((item) => (
          <NavLink key={item} to={sessionPath(session.id, item)} end>
            {item[0].toUpperCase() + item.slice(1)}
          </NavLink>
        ))}
      </nav>
      <div className={selected && onSolves ? 'session-detail-grid' : ''}>
        <div>
          <Routes>
            <Route index element={<Navigate to="overview" state={location.state} replace />} />
            <Route
              path="overview"
              element={
                <>
                  <SessionOverview
                    sessionId={session.id}
                    solves={solves}
                    precision={precision}
                    onOpenSolve={openSolve}
                  />
                  <Link className="session-all-solves" to={sessionPath(session.id, 'solves')}>
                    View all {solves.length} solves →
                  </Link>
                </>
              }
            />
            <Route
              path="solves"
              element={
                <SessionSolves
                  key={location.search}
                  sessionId={session.id}
                  solves={solves}
                  precision={precision}
                  onOpenSolve={openSolve}
                />
              }
            />
            <Route
              path="graphs"
              element={
                <SessionGraphs
                  sessionId={session.id}
                  solves={solves}
                  precision={precision}
                  onOpenSolve={openSolve}
                />
              }
            />
            <Route
              path="insights"
              element={
                <SessionInsights
                  sessionId={session.id}
                  solves={solves}
                  precision={precision}
                  onOpenSolve={openSolve}
                />
              }
            />
            <Route
              path="*"
              element={<Navigate to={sessionPath(session.id)} state={location.state} replace />}
            />
          </Routes>
        </div>
        {selected && onSolves && (
          <SolveDetail
            key={selected.id}
            solve={selected}
            solves={solves}
            session={session}
            precision={precision}
            onClose={closeDetail}
            onSelect={openSolve}
            onDeleted={setDeleted}
          />
        )}
      </div>
      {deleted && (
        <div className="session-panel session-undo" role="status">
          Solve deleted{' '}
          <button
            onClick={() => {
              void safeWrite(() => restoreSolve(deleted)).then((ok) => {
                if (ok) setDeleted(null);
              });
            }}
          >
            Undo delete
          </button>
          <button onClick={() => setDeleted(null)}>Dismiss</button>
        </div>
      )}
    </main>
  );
}

function SessionRename({ session }: { session: Session }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(session.name);
  const [saving, setSaving] = useState(false);

  return editing ? (
    <form
      className="session-rename"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || saving) return;
        setSaving(true);
        void safeWrite(() => renameSession(session.id, name)).then((ok) => {
          setSaving(false);
          if (ok) setEditing(false);
        });
      }}
    >
      <label>
        Session name
        <input autoFocus value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <button disabled={saving || !name.trim()}>Save name</button>
      <button type="button" onClick={() => setEditing(false)}>
        Cancel
      </button>
    </form>
  ) : (
    <button
      className="icon-button"
      aria-label="Rename session"
      onClick={() => {
        setName(session.name);
        setEditing(true);
      }}
    >
      <Pencil size={16} />
    </button>
  );
}
