# Cloudflare deployment

## Live address

The current public app is **<https://modern-cube-timer.donnyle2005.workers.dev>**.

Cloudflare assigns a `workers.dev` address using `<worker-name>.<account-subdomain>.workers.dev`. Here the worker name is `modern-cube-timer`, matching `wrangler.json`, and the account subdomain is `donnyle2005`. You can use this address without buying a custom domain. See [Cloudflare's workers.dev documentation](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

To confirm the address in Cloudflare, open **Workers & Pages → modern-cube-timer → Settings → Domains & Routes**. Production deployments update this stable address; branch previews have separate URLs.

If a custom domain is added later, export a JSON backup before switching addresses. IndexedDB data does not follow the user to a different origin; import the backup on the new address.

## Workers Builds settings

The repository's `wrangler.json` sets the worker name, compatibility date, and static asset directory (`./dist`). Use these settings for its Git-connected Cloudflare build:

- Repository: `DonnyLe/modern-cube-timer`.
- Root directory: repository root.
- Production branch: `main`.
- Build command: `bun run build`.
- Deploy command: `npx wrangler deploy`.
- Preview command: `npx wrangler preview`.
- Build tools: Node 22 and Bun 1.4.2, matching CI.

Dependency installation must complete before the build; use `bun ci` when configuring an explicit install step. The build generates `dist/`, including the bundled cubing modules and service worker.

Wrangler reads the assets directory from `wrangler.json`. Do not add `--assets` to the Preview command; that command does not support the flag. Leave out `--name` so branch previews can use their branch name.

These are the expected dashboard settings; they are configured separately from GitHub Actions. The repository's `Check` workflow verifies code on pushes and pull requests, while Cloudflare Workers Builds handles deployment. Confirm the latest production build succeeded in Cloudflare after a push to `main`.

## Manual production deployment

With Node and Bun installed, authenticate to the intended Cloudflare account, build, then deploy from the repository root:

```sh
bun ci
npx wrangler login
bun run build
npx wrangler deploy
```

The deploy command publishes the assets from `dist/` to the configured worker. No application secrets or backend bindings are required by the current app. Use [local production preview](quickstart.md#preview-production-locally) to inspect a build before publishing.
