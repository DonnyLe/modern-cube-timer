import { NavLink } from './SessionLinks';
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
import { loadSessionDetails, type SessionDetails } from '../../data/sessionDetails';
import { PageFade } from '../ui/PageFade';
import { restoreSolves } from '../../data/actions/solve';
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
  initialData,
}: {
  initialData?: SessionDetails;
  onBack: (toPicker: boolean) => void;
  onContinue: () => void;
  precision: number;
}) {
  const { sessionId = '', '*': tab = '' } = useParams();
  const validTab = ['overview', 'data', 'solves', 'insights'].includes(tab);
  const navigate = useNavigate();
  const location = useLocation();
  const fromPicker = location.state?.sessionEntry === 'sessions';
  const backLabel = fromPicker ? 'All sessions' : 'Back to Timer';
  const onSolves = !!useMatch('/session/:sessionId/solves');
  const data = useLiveQuery(
    () => loadSessionDetails(sessionId),
    [sessionId],
    initialData?.sessionId === sessionId ? initialData : undefined,
  );
  const session = data?.session;
  const solves = data?.solves;
  const [selectedId, setSelectedId] = useState('');
  const [deleted, setDeleted] = useState<Solve[]>([]);
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
  }, [sessionId, session?.id, validTab]);

  if (!solves)
    return (
      <main
        className="session-page session-pending"
        aria-label="Session details"
        aria-busy="true"
      />
    );
  if (!session)
    return (
      <main className="session-page">
        <button className="text-button" onClick={() => onBack(fromPicker)}>
          <ArrowLeft size={16} /> {backLabel}
        </button>
        <h1>This session is no longer available.</h1>
      </main>
    );

  // Normalize URLs outside the animated content so redirects never wait for an exit.
  if (!validTab)
    return (
      <Navigate
        to={sessionPath(session.id, tab === 'graphs' ? 'data' : 'overview') + location.search}
        state={location.state}
        replace
      />
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
        {['overview', 'data', 'solves', 'insights'].map((item) => (
          <NavLink key={item} to={sessionPath(session.id, item)} end>
            {item[0].toUpperCase() + item.slice(1)}
          </NavLink>
        ))}
      </nav>
      <div
        className={selected && onSolves ? 'session-content session-detail-grid' : 'session-content'}
      >
        <PageFade pageKey={location.pathname}>
          <Routes location={location}>
            <Route
              path="overview"
              element={
                <SessionOverview
                  sessionId={session.id}
                  solves={solves}
                  precision={precision}
                  onOpenSolve={openSolve}
                />
              }
            />
            <Route
              path="solves"
              element={
                <SessionSolves
                  key={session.id + location.search}
                  sessionId={session.id}
                  solves={solves}
                  precision={precision}
                  onOpenSolve={openSolve}
                  onDeleted={setDeleted}
                />
              }
            />
            <Route
              path="data"
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
          </Routes>
        </PageFade>
        {selected && onSolves && (
          <SolveDetail
            key={selected.id}
            solve={selected}
            solves={solves}
            session={session}
            precision={precision}
            onClose={closeDetail}
            onSelect={openSolve}
            onDeleted={(solve) => setDeleted([solve])}
          />
        )}
      </div>
      {deleted.length > 0 && (
        <div className="session-panel session-undo" role="status">
          {deleted.length === 1 ? 'Solve deleted' : `${deleted.length} solves deleted`}{' '}
          <button
            onClick={() => {
              void safeWrite(() => restoreSolves(deleted)).then((ok) => {
                if (ok) setDeleted([]);
              });
            }}
          >
            Undo delete
          </button>
          <button onClick={() => setDeleted([])}>Dismiss</button>
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
