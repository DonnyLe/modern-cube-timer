# Expanded session pages

Open **Manage sessions**, choose a session, and select **Expand session**. **View all** opens its Solves tab directly. Browsing does not change the timer's active session; use **Continue session** to resume that session.

- **Overview** shows session statistics, a recent trend, and recent times with full scrambles.
- **Solves** supports scramble/time/note search, penalties, note filters, sorting, and pagination. Selecting an attempt opens its scramble, cube net, time, penalty, note, and averages at that point. Deletion requires confirmation and provides Undo.
- **Graphs** includes full-session singles and rolling averages, a histogram, consistency by blocks of up to 50 attempts, and the share of attempts below a configurable target.
- **Insights** compares opening and closing stretches, identifies the earliest best ao12 window, and links to target matches, unusual results, and annotated solves.

React Router manages session and tab URLs using `#/session/<id>/<tab>` (older `#session/...` links still work) and survive reloads. Solve ranges and time bands are linked using hash query parameters. **Show all solves** clears that context. CSV export includes only the viewed session.

## Statistics

Times include +2 penalties. Rolling averages use the existing trimming rules; unavailable averages and DNF averages leave gaps. The session mean preserves the timer's untrimmed DNF behavior. Finished-solve medians and stretch means explicitly omit DNFs. Target percentages count every attempt in the denominator and use a strict “below” comparison.

Stretch comparisons need at least 12 attempts and compare the first and last quarter of attempts, capped at 50 per stretch. Each stretch needs a finished result. Unusual times use 1.5 times the interquartile range of finished results, with at least four finished results. Flags never exclude records from statistics or infer technique.

Timer, Settings, and Gallery also use hash routes, so browser Back/Forward and reloads preserve navigation.

Session pages inherit the app's theme and appearance settings. Solve mutations live in `src/data/actions/solve.ts`; derived analysis lives in `src/core/sessionAnalysis.ts`. Browser coverage is in `tests/browser/session-page.spec.ts` and calculation coverage in `tests/session-analysis.test.ts`.
