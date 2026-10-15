# turn · Modern Cube Timer

Your space to solve. A customizable speedcubing timer with puzzle-specific sessions, progress graphs, and a quiet interface that stays out of your way while solving.

**[Open the timer](https://modern-cube-timer.donnyle2005.workers.dev)** · [Developer quickstart](dev/quickstart.md) · [Developer documentation](dev/README.md)

## Features

- **Keyboard and touch timing.** Hold Space or the timer until ready, release to start, and press again to stop. Adjust the hold duration, enable 15-second inspection with automatic +2/DNF penalties, or enter a time manually.
- **11 puzzle events.** Generate scrambles for 2×2–7×7, Pyraminx, Skewb, Megaminx, Square-1, and Clock with cubing.js. Copy or refresh scrambles and view the resulting puzzle state.
- **Sessions for every puzzle.** Create, rename, switch, search, filter, and delete sessions. Optionally start a new session after a configurable break; automatic sessions are enabled by default with a four-hour break.
- **Solve history and statistics.** Review and edit times, penalties, and notes; delete a solve with undo. Track count, best, mean, mo3, ao5, ao12, and ao100.
- **Progress graphs.** Switch between individual solve times and rolling ao12, browse history in groups of 50 solves, and inspect points with a mouse, touch, or keyboard. Session details include their own graphs and statistics.
- **Focus mode.** Hide surrounding controls and optionally the supporting widgets. Choose whether to hide the clock or fade the interface while solving.
- **Personal appearance.** Choose light, dark, system, or time-based automatic themes. Customize colors, backgrounds, motion, typography, timer size, precision, glass effects, and card and control rounding. Start with Liquid Studio, Editorial, or Precision, then save your own presets in the Gallery.
- **Local storage and data transfer.** Solves, sessions, and settings stay in your browser with IndexedDB. Export a JSON backup or CSV, import turn backups or supported standard csTimer JSON sessions, and review import issues before adding records.
- **Installable and available offline.** The production app caches its assets for use after an initial online visit and offers an update prompt when a new version is available.

## Try it

1. Open [turn](https://modern-cube-timer.donnyle2005.workers.dev) and select a puzzle from the scramble bar.
2. Apply the scramble, hold Space until the timer is ready, then release. Press Space to stop. On a touchscreen, use the timer itself.
3. Open a recent solve to edit its time, penalty, or notes. Use the menu beside the session name to manage sessions.
4. Visit **Settings** to change timing and appearance, or **Gallery** to try and save presets.

There is no account or cloud sync. Data belongs to the browser and site address you use; clearing site data removes it. Export JSON backups regularly, especially before changing browsers, devices, or domains. CSV is for analysis; JSON is the restorable backup.

## Run locally

Requires Node.js 22.13+ and Bun 1.4.2 (the version used by CI).

```sh
git clone https://github.com/DonnyLe/modern-cube-timer.git
cd modern-cube-timer
bun ci
bun run dev
```

Open <http://127.0.0.1:5173>. No environment variables, account setup, or backend service are required for local development.

See the [quickstart](dev/quickstart.md) for checks, browser tests, and production preview, and the [Cloudflare guide](dev/deployment.md) for deployment settings.

## Built with

React 19, TypeScript, and Vite; cubing.js for scrambles and puzzle rendering; Dexie/IndexedDB for persistence; Zustand for UI state; Recharts for graphs; Motion for animation; and a WebGL background. Static assets are hosted on Cloudflare Workers.
