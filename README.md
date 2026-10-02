# turn

A local-first, customizable speedcubing timer. Built with React, TypeScript, Vite, IndexedDB, and a WebGL background.

See [the implementation plan](docs/implementation-plan.md) and [approved design](docs/design-reference.png).

## Development

Requires Bun 1.4.2 and Node 22.13+ for tool compatibility.

```sh
bun ci
bun run dev
bun run test
bun run build
bun run lint
bun run format:check
```

Solve records stay in this browser. Export backups regularly before clearing browser data.
