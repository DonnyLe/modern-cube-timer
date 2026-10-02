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
```

Solve records stay in this browser. Export backups regularly before clearing browser data.

Use `bun add <package>` for dependencies and `bun add -d <package>` for development tools. Commit `bun.lock`; CI uses `bun ci` to enforce it. Run `bun run test` for the existing Vitest suite; `bun test` invokes Bun’s separate test runner.
