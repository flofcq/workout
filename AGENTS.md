# AGENTS.md

## Cursor Cloud specific instructions

App overview: "Suivi salle" is a French workout-tracking PWA. Frontend is React 19 +
Vite (`src/`); the backend is Vercel serverless functions (`api/`) backed by Neon
(Postgres). Standard commands live in `package.json` `scripts`; setup/usage is
documented in `README.md`.

### Running / developing

- Demo mode is the way to run and develop the UI in the cloud without any
  database or secrets: `npm run demo` (Vite `--mode demo`, serves on port 5173).
  It uses fake in-memory data (`src/api.mock.js`), needs no login, and writes
  nothing to a server — use it for end-to-end UI testing. Add `-- --host` to
  expose it on all interfaces.
- Full stack (`npm run dev`) runs `vercel dev`, which serves the front and the
  `api/` functions together. It is NOT runnable out of the box here: it requires
  an interactive Vercel account link (`vercel link`) plus `DATABASE_URL` (a Neon
  Postgres connection string) and `AUTH_SECRET` in `.env`. Without those, only
  demo mode, lint, and the test scripts run. `npm run dev:ui` runs plain Vite
  (front only); any `/api/...` call then 404s.

### Lint / test / build

- Lint: `npm run lint` (oxlint). Clean run prints no findings.
- Tests: `npm test` (Node scripts in `scripts/`, no DB needed). Gotcha: the
  `test:steps` suite intentionally sends one fully-valid request that reaches the
  (unreachable) Neon host, so a `fetch failed` / `ENOTFOUND api.aws.neon.tech`
  stack trace followed by `requête valide ... (500)` is EXPECTED and counts as a
  pass. The run is green when every line ends in `Tout est vert.`. There is no
  frontend/browser test suite.
- Build: `npm run build` produces the real-API bundle. To build the demo bundle
  instead, use `npx vite build --mode demo` — a plain `npm run build` overwrites
  `dist/` with the version that calls the real API (shows "Configuration requise"
  without a backend).

### Conventions

- All user-facing text, comments, and commit messages are in French (tutoiement).
- Never rename exercise `key` values in `src/program.js` (they link historical
  data). `db/schema.sql` is the only migration mechanism and is fully replayable.
