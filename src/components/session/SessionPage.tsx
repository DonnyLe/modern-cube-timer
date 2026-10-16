import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Download, Pencil, Play } from 'lucide-react';
import type { Session, Solve } from '../../core/types';
import { puzzles } from '../../core/puzzles';
import { sessionLink } from '../../core/useSessionRoute';
import { db } from '../../data/db';
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
  sessionId,
  tab,
  search,
  onBack,
  onContinue,
  precision,
}: {
  sessionId: string;
  tab: string;
  search: string;
  onBack: () => void;
  onContinue: () => void;
  precision: number;
}) {
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
    if (tab !== 'solves') window.location.hash = sessionLink(sessionId, 'solves');
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
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={16} /> All sessions
        </button>
        <h1>This session is no longer available.</h1>
      </main>
    );

  return (
    <main className="session-page" aria-label="Session details">
      <button className="text-button session-back" onClick={onBack}>
        <ArrowLeft size={16} /> All sessions
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
          <a
            key={item}
            href={sessionLink(session.id, item)}
            aria-current={
              (['graphs', 'solves', 'insights'].includes(tab) ? tab : 'overview') === item
                ? 'page'
                : undefined
            }
          >
            {item[0].toUpperCase() + item.slice(1)}
          </a>
        ))}
      </nav>
      <div className={selected && tab === 'solves' ? 'session-detail-grid' : ''}>
        <div>
          {tab === 'insights' ? (
            <SessionInsights solves={solves} sessionId={session.id} precision={precision} />
          ) : tab === 'graphs' ? (
            <SessionGraphs
              sessionId={session.id}
              solves={solves}
              precision={precision}
              onOpenSolve={openSolve}
            />
          ) : tab === 'solves' ? (
            <SessionSolves
              key={search}
              solves={solves}
              precision={precision}
              onOpenSolve={openSolve}
              search={search}
            />
          ) : (
            <>
              <SessionOverview
                sessionId={session.id}
                solves={solves}
                precision={precision}
                onOpenSolve={openSolve}
              />
              <a className="session-all-solves" href={sessionLink(session.id, 'solves')}>
                View all {solves.length} solves →
              </a>
            </>
          )}
        </div>
        {selected && tab === 'solves' && (
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
              void safeWrite(() => db.solves.add(deleted)).then((ok) => {
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
