# turn

A local-first speedcubing timer, currently under development.

## Development tooling

Requires Bun 1.4.2 and Node 22.13+ for tool compatibility.

```sh
bun ci
bun run lint
bun run format:check
bun run format
```

Use `bun add <package>` for dependencies and `bun add -d <package>` for development tools. Commit `bun.lock`; CI enforces it with `bun ci`.

The timer, interface, tests, and build scripts arrive in the following feature pull requests. This setup establishes Bun, ESLint, and Prettier first.
