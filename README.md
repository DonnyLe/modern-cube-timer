# turn

A local-first, customizable speedcubing timer. Built with React, TypeScript, Vite, IndexedDB, and a WebGL background.

See [the implementation plan](docs/implementation-plan.md) and [approved design](docs/design-reference.png).

## Puzzles

Choose 2×2–7×7, Pyraminx, Skewb, Megaminx, Square-1, or Clock from the scramble bar. Each puzzle has its own sessions, scrambles, statistics, and 2D state preview. Switching puzzles resumes its most recently created session or creates one.

Existing sessions migrate to 3×3. JSON backups use version 2 to preserve puzzle types; version 1 backups remain importable as 3×3. Standard csTimer puzzle sessions are recognized; unsupported scramble types are reported and skipped. CSV exports include puzzle and session columns.

## Development

Requires Bun 1.4.2 and Node 22.13+ (used by the existing build and browser-testing tools).

```sh
bun ci
bun run dev
bun run lint
bun run format:check
bun run test
bun run build
bunx --no-install playwright install
bun run test:e2e
bun run build && bun run test:e2e:production
```

On macOS, the Playwright setup gives its Firefox browser a separate app-data identity
to avoid macOS 27 blocking access to the regular Firefox profile directory. It uses
temporary files and leaves the installed browser and personal profiles untouched.
See [the upstream issue](https://github.com/microsoft/playwright/issues/42768).

Solve records stay in this browser. Export backups regularly before clearing browser data.

Use `bun add <package>` for dependencies and `bun add -d <package>` for development tools. Commit `bun.lock`; CI uses `bun ci` to enforce it. Run `bun run test` for the existing Vitest suite; `bun test` invokes Bun’s separate test runner.

The development and production commands first bundle cubing.js with esbuild into generated `public/cubing` files. Vite serves or copies these modules without rebundling them, keeping solver workers separate from React. The generated files are ignored by Git and included in the production offline cache. Run `bun run build:cubing` again after changing the cubing entry modules or dependency.

## Cloudflare Workers Builds

`wrangler.json` configures the built static assets in `dist` for production and branch previews. In the Worker's build settings, use:

- Build command: `bun run build`
- Deploy command: `npx wrangler deploy`
- Preview command: `npx wrangler preview`

Wrangler reads the asset directory from the configuration. Do not add `--assets` to the Preview command; it does not support that flag. Leaving out `--name` lets each preview use its branch name.
