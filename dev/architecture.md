# Architecture

turn is a browser app built with React, TypeScript, and Vite. Cloudflare serves the compiled static assets; solve storage and timing run in the browser.

## Source map

- `src/App.tsx`: timer page, navigation, solve dialogs, and feature composition.
- `src/core/`: timer engine and hooks, scramble queue, puzzle definitions, statistics, backgrounds, themes, and shared types.
- `src/components/`: session manager, settings, gallery, data controls, puzzle rendering, and graphs. `ui/` holds shared controls.
- `src/components/Graph.tsx`: reusable graph presentation and accessible interaction. `Trend.tsx` calculates metrics and selects the displayed solve window.
- `src/data/db.ts`: Dexie database, initialization, and migrations.
- `src/data/actions/session.ts`: session creation, switching, automatic rollover, renaming, and deletion.
- `src/data/store.ts`: Zustand UI state and persisted preferences/workspace settings.
- `src/data/transfer.ts`, `schemas.ts`, and `validate.ts`: backup/import, CSV export, and validation.
- `src/layout/`: workspace and appearance defaults plus geometry helpers.
- `src/styles/app.css`: application styling and responsive layout.
- `scripts/`: cubing.js bundling and Playwright support.
- `tests/`: Vitest unit tests and Playwright tests in `tests/browser/`.

## Persistence and transfer

Dexie stores sessions, solves, settings, and saved presets in IndexedDB. There is no server database or cross-device synchronization. Storage is tied to the site's origin.

Native JSON backups use the `turn` identifier and version 2, preserving puzzle types and workspace settings. Version 1 backups import as 3×3. The backup payload contains sessions, solves, and the current workspace; it does not include the full preset library or every timing preference.

Imports create separate sessions and retain existing solves. Standard csTimer puzzle types are mapped explicitly; unsupported types and invalid records are reported for review. CSV includes puzzle and session columns and is intended for analysis, not restoration.

## Scrambles and puzzle rendering

`bun run dev` and `bun run build` first run `scripts/build-cubing.mjs`. esbuild bundles cubing.js into generated `public/cubing/` modules, keeping solver workers separate from the React bundle. Vite serves or copies those modules without rebundling them.

Generated `public/cubing/` files are ignored by Git. Run `bun run build:cubing` again after changing the cubing entry modules or dependency, or restart the normal development/build command.

`PuzzleView` provides flat nets, face thumbnails, and 3D previews. The 3D view falls back to a face preview when WebGL is unavailable or for Clock and Square-1.

## Offline updates

`vite-plugin-pwa` generates the production manifest and service worker. The cache includes generated cubing modules. `UpdateNotice` offers a reload when an update is ready and waits while timing or saving a solve.

See [session graphs](../docs/session-graphs.md) for metric behavior and [quickstart](quickstart.md) for verification commands.
