# turn

A local-first, customizable speedcubing timer. Built with React, TypeScript, Vite, IndexedDB, and a WebGL background.

See [the implementation plan](docs/implementation-plan.md) and [approved design](docs/design-reference.png).

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

Solve records stay in this browser. Export backups regularly before clearing browser data.

Use `bun add <package>` for dependencies and `bun add -d <package>` for development tools. Commit `bun.lock`; CI uses `bun ci` to enforce it. Run `bun run test` for the existing Vitest suite; `bun test` invokes Bun’s separate test runner.

The development and production commands first bundle cubing.js with esbuild into generated `public/cubing` files. Vite serves or copies these modules without rebundling them, keeping solver workers separate from React. The generated files are ignored by Git and included in the production offline cache. Run `bun run build:cubing` again after changing the cubing entry modules or dependency.

## Cloudflare Workers Builds

`wrangler.json` configures the built static assets in `dist` for production and branch previews. In the Worker's build settings, use:

- Build command: `bun run build`
- Deploy command: `npx wrangler deploy`
- Preview command: `npx wrangler preview`

Wrangler reads the asset directory from the configuration. Do not add `--assets` to the Preview command; it does not support that flag. Leaving out `--name` lets each preview use its branch name.
