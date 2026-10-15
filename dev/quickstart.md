# Developer quickstart

## Prerequisites

- Node.js 22.13 or newer. CI uses Node 22; use that major version for consistent results.
- Bun 1.4.2, matching `packageManager` and CI.
- Git.

Check `node --version` and `bun --version` before starting. The browser tools and cubing.js build require a compatible Node version even though scripts run through Bun.

## Install and start

```sh
git clone https://github.com/DonnyLe/modern-cube-timer.git
cd modern-cube-timer
bun ci
bun run dev
```

Open <http://127.0.0.1:5173>. No `.env` file, database server, API keys, or login are needed. The app creates its IndexedDB database in the browser.

The development command bundles cubing.js before starting Vite. Keep it running while editing; Vite reloads source changes.

## Check a change

Run from the repository root:

```sh
bun run format:check
bun run lint
bun run test
bun run build
```

Use `bun run format` to format files and `bun run lint:fix` for supported lint fixes. Use `bun run test` for Vitest; `bun test` invokes Bun's separate test runner.

## Browser tests

Install Playwright's browsers once:

```sh
bunx --no-install playwright install
```

On Linux, use `bunx --no-install playwright install --with-deps` if browser system libraries are missing.

Run against the production build:

```sh
bun run build
bun run test:e2e:production --workers=4
```

Or run against the development server:

```sh
bun run test:e2e
```

Playwright starts the appropriate server automatically: development on port 5173, production preview on port 4173. Local runs cover Chromium, Firefox, and WebKit; CI runs Chromium. Stop unrelated servers on those ports so tests exercise the intended build.

On macOS, the Playwright setup gives Firefox a separate app-data identity to avoid macOS 27 blocking its regular profile directory. It uses temporary files and leaves the installed browser and personal profiles untouched. See the [upstream issue](https://github.com/microsoft/playwright/issues/42768).

## Preview production locally

```sh
bun run build
bun run preview
```

Open <http://127.0.0.1:4173>. Preview serves the existing `dist/` output, so rebuild after source changes. The installable app and offline cache are generated for production builds.

Browser storage is separate for each origin. Development, production preview, and the live site each have their own data. Use JSON export/import in Settings to transfer records; export a backup before clearing site storage while testing service workers.

## Dependencies

```sh
bun add <package>
bun add -d <package>
```

Commit `package.json` and `bun.lock` together. `bun ci` installs the locked dependencies and fails if the manifest and lockfile disagree.

Next: [architecture](architecture.md) or [deployment](deployment.md).
