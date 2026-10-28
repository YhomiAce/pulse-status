# pulse-status

A public status page and a small admin UI for **pulse**, the uptime monitor API. It is a static single-page app (Vue 3 + Vite): there is no server of its own, everything comes from the pulse API in the browser.

## Features

- **Status page** (`/`)
  - Overall banner: "All systems operational", "Partial outage", "Major outage" or "Checking services".
  - One row per service with its current state, **90 daily uptime bars** (hover, tap or use the arrow keys for the date, uptime %, number of checks and average latency) and uptime over 24 h, 7 d and 30 d.
  - Recent incidents (last 30 days, newest first), each marked ongoing or resolved with its duration and linked to its service.
  - Refreshes every 30 seconds (paused while the tab is hidden, caught up when it becomes visible again). If a refresh fails, the last data stays on screen with a notice.
- **Service detail** (`/services/:id`): state, 90-day bars, response-time chart for 24 h, 7 d or 30 d (the range is kept in the URL, e.g. `?range=7d`) with a data-table view, and the service's incident history.
- **Admin** (`/admin`): enter pulse's admin token (kept in `sessionStorage`, so it is gone when the tab closes), list every monitor including paused ones, create, edit and delete them. The form applies the same rules as the API (http(s) URL, status 100 to 599, interval 30 to 3600 s, timeout 1000 to 30000 ms and shorter than the interval) and also shows the API's own validation errors. A rejected token signs you out.
- Client-side routing in history mode: deep links work after a refresh as long as the web server falls back to `index.html`.
- Light and dark themes (follows the system setting).
- Every API response is validated with zod; unexpected data shows a clean error instead of a broken page.

## Requirements

- Node 22+, pnpm through corepack (`corepack enable`; the version is pinned in `packageManager`)
- A running pulse API whose `CORS_ORIGINS` includes this site's origin

## Local development

```bash
corepack enable
pnpm install
cp .env.example .env      # set VITE_API_URL to your pulse API
pnpm dev                  # http://localhost:5107
```

Run pulse alongside it with `CORS_ORIGINS=http://localhost:5107` (and `PORT=5104` to match `.env.example`).

| Script           | What it does                                       |
| ---------------- | -------------------------------------------------- |
| `pnpm dev`       | Vite dev server on port 5107                       |
| `pnpm build`     | Type-checks (`vue-tsc`) and builds to `dist/`      |
| `pnpm preview`   | Serves the built `dist/` on port 5107              |
| `pnpm test`      | Unit and component tests (Vitest, no API needed)   |
| `pnpm typecheck` | Type-checks without building                       |

## Environment variables

Both variables are read by Vite **at build time** and baked into the JavaScript bundle. Setting them on a running web server does nothing; change them and rebuild. The build fails with a clear message if `VITE_API_URL` is missing or isn't an http(s) URL.

| Name                | Required | Example                     | Build or runtime | Notes |
| ------------------- | -------- | --------------------------- | ---------------- | ----- |
| `VITE_API_URL`      | yes      | `https://pulse.example.com` | **build**        | Base URL of the pulse API, without `/api` |
| `VITE_STATUS_TITLE` | no       | `Acme Status`               | **build**        | Brand name in the header and page title. Default `Status` |

Don't put secrets in `VITE_*` variables: they are public in the bundle. The admin token is typed in by the user at `/admin`, never built in.

### CORS

The browser calls pulse directly, so pulse's `CORS_ORIGINS` must include this site's exact origin, for example `CORS_ORIGINS=https://status.example.com` (comma-separate several, e.g. to keep `http://localhost:5107` for development). Without it the status page shows "Could not reach the status API".

## Deploying

The output is a static site in `dist/`; serve it with any static web server that falls back to `index.html` for unknown paths.

- **Install:** `pnpm install --frozen-lockfile`
- **Build:** `VITE_API_URL=https://pulse.example.com pnpm build` (output in `dist/`)
- **Start:** no Node process; serve `dist/` with nginx or similar, with an SPA fallback to `/index.html`. `pnpm preview` works for a quick look but isn't meant for production.
- **Port:** whatever your web server listens on (the example config uses 5107; the dev server also uses 5107)
- **Build-time env vars:** `VITE_API_URL` (required), `VITE_STATUS_TITLE` (optional)
- **Runtime env vars:** none
- **On the pulse side:** add this site's URL to pulse's `CORS_ORIGINS`.

An example nginx server block is in [`deploy/nginx.conf`](deploy/nginx.conf). With Docker:

```bash
VITE_API_URL=https://pulse.example.com pnpm build
docker run --rm -p 8080:5107 \
  -v "$PWD/dist:/usr/share/nginx/html:ro" \
  -v "$PWD/deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine
```

## Project layout

```
src/
  api/          zod schemas and the typed pulse client
  lib/          pure logic: banner, uptime thresholds, form rules, formatting
  stores/       Pinia stores (status with auto-refresh, admin session)
  components/   banner, uptime bars, service row, incident timeline, chart, monitor form
  views/        status page, service detail, admin, not found
test/           Vitest + Vue Test Utils
```

Uptime bar colours: at least 99.9 % green, at least 99 % yellow, at least 95 % orange, below that red, grey for days without checks. Bars are UTC days, as computed by pulse.

## License

MIT
