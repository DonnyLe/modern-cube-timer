# Expanded session pages

Select the session name above the timer to open its Overview, or open **Manage sessions**, choose a session, and select **Expand session**. **View all** opens its Solves tab directly. Browsing does not change the timer's active session; use **Continue session** to resume that session.

- **Overview** uses an insight workspace that fills the available desktop viewport: elapsed session length and time solving, best single/ao5/ao12 linked to their original solves, a session trend on the left and four clearly marked insight placeholders on the right.
- **Solves** supports scramble/time/note search, penalties, note filters, sorting, and pagination. Selecting an attempt opens its scramble, cube net, time, penalty, note, and averages at that point. Deletion requires confirmation and provides Undo.
- **Data** groups statistics into Performance, Rolling averages (current and best ao5/ao12/ao50), and Consistency panels on the left. The full-session chart sits on the right, with a histogram and configurable target chart directly beneath it. Info disclosures explain calculation rules and expose finished mean, finished count, and range. Time-band links, solve lookup by number, and the block-consistency chart remain available through expandable controls. Selecting a plotted point opens its solve.
- **Insights** compares opening and closing stretches, identifies the earliest best ao12 window, and links to target matches, unusual results, and annotated solves.

React Router manages session and tab URLs using `#/session/<id>/<tab>` (older `#session/...` links still work) and survive reloads. Solve ranges and time bands are linked using hash query parameters. **Show all solves** clears that context. CSV export includes only the viewed session.

The session name is a persistent entry point outside the widget area, so access to session details does not depend on a particular widget. Widget customization and removal remain separate work.

The return link follows the entry point: **Back to Timer** from the timer title or widgets, and **All sessions** from the session picker. This context survives tab changes, filtered-solve links, reloads, and browser history. Direct links default to **Back to Timer**. **All sessions** is also available in the page header when entered from the timer.

## Statistics

Times include +2 penalties. Rolling averages use the existing trimming rules; unavailable averages and DNF averages leave gaps. The session mean preserves the timer's untrimmed DNF behavior. Finished-solve medians and stretch means explicitly omit DNFs. Target percentages count every attempt in the denominator and use a strict “below” comparison.

Stretch comparisons need at least 12 attempts and compare the first and last quarter of attempts, capped at 50 per stretch. Each stretch needs a finished result. Unusual times use 1.5 times the interquartile range of finished results, with at least four finished results. Flags never exclude records from statistics or infer technique.

Timer, Settings, and Gallery also use hash routes, so browser Back/Forward and reloads preserve navigation.

Session pages inherit the app's theme and appearance settings. Solve mutations live in `src/data/actions/solve.ts`; derived analysis lives in `src/core/sessionAnalysis.ts`. Browser coverage is in `tests/browser/session-page.spec.ts` and calculation coverage in `tests/session-analysis.test.ts`.

Session navigation uses a brief opacity crossfade (80ms out, 160ms in). The app header and session tab bar stay steady while content changes. Opening from the timer or picker loads a consistent session snapshot before navigation; live updates continue after opening. Session initialization no longer displays a transient “Opening session…” screen. Reduced-motion preferences skip fades.

When returning to All sessions, the picker opens first while the timer content stays hidden. Once the modal entrance finishes, the timer background fades in gently over 280ms. Closing the picker early releases the held background; reduced motion skips both animations.

Opening Overview or Solves from the session picker prepares the session data, closes the picker and backdrop completely, then starts the session-page crossfade. Navigation waits for the actual modal exit callback rather than a timed delay.

Session filters, graph controls, and the solve editor use the shared Base UI Select. The reusable Checkbox component supplies themed checked, disabled, and keyboard-focus states for notes and graph series. Session dropdowns use consistent 40px heights and inset chevrons.

The Data tab uses `#/session/<id>/data`. Existing `/graphs` links redirect to Data, retaining query parameters and the return destination. Finished-solve descriptive statistics exclude DNFs and include +2 penalties; standard deviation uses the finished-solve population.

On desktop, Overview uses the available viewport height: both summary panels and the lower graph/insight row stretch with the window, including the chart plot and the four insight slots. Narrow layouts stack and scroll naturally. Data groups related statistics on the left of the main chart, with two compact supporting charts below the main plot; narrow screens stack these panels.
