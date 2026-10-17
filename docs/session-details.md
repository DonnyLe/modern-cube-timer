# Expanded session pages

Open **Manage sessions**, choose a session, and select **Expand session**. **View all** opens its Solves tab directly. Browsing does not change the timer's active session; use **Continue session** to resume that session.

- **Overview** uses an insight workspace that fills the available desktop viewport: elapsed session length and time solving, best single/ao5/ao12 linked to their original solves, a session trend on the left and four clearly marked insight placeholders on the right.
- **Solves** supports scramble/time/note search, penalties, note filters, sorting, and a virtualized list that scrolls within the available viewport. The page header and filters stay in place; the document does not scroll. Solve details scroll independently and overlay the list on narrow screens. Rows are measured as scrambles and notes wrap, and only nearby rows are rendered. Filters and sorting reset the list to the top; the result count still covers all matching solves. Selecting an attempt opens its scramble, cube net, time, penalty, note, and averages at that point. Deletion requires confirmation and provides Undo.
- **Data** groups statistics into Performance, Rolling averages (current and best ao5/ao12/ao50), and Consistency panels on the left. The full-session chart sits on the right, with a histogram and configurable target chart directly beneath it. Info disclosures explain calculation rules and expose finished mean, finished count, and range. Time-band links, solve lookup by number, and the block-consistency chart remain available through expandable controls. Selecting a plotted point opens its solve.
- **Insights** compares opening and closing stretches, identifies the earliest best ao12 window, and links to target matches, unusual results, and annotated solves.

Session and tab URLs use `#session/<id>/<tab>` and survive reloads. Solve ranges and time bands are linked using hash query parameters. **Show all solves** clears that context. CSV export includes only the viewed session.

## Statistics

Times include +2 penalties. Rolling averages use the existing trimming rules; unavailable averages and DNF averages leave gaps. The session mean preserves the timer's untrimmed DNF behavior. Finished-solve medians and stretch means explicitly omit DNFs. Target percentages count every attempt in the denominator and use a strict “below” comparison.

Stretch comparisons need at least 12 attempts and compare the first and last quarter of attempts, capped at 50 per stretch. Each stretch needs a finished result. Unusual times use 1.5 times the interquartile range of finished results, with at least four finished results. Flags never exclude records from statistics or infer technique.

Session pages inherit the app's theme and appearance settings. Solve mutations live in `src/data/actions/solve.ts`; derived analysis lives in `src/core/sessionAnalysis.ts`. Browser coverage is in `tests/browser/session-page.spec.ts` and calculation coverage in `tests/session-analysis.test.ts`.

The Graphs tab is now Data. Older Graphs links still display Data. Descriptive statistics omit DNFs and include +2 penalties; standard deviation uses the finished-solve population.
