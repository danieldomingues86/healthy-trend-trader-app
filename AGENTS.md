# AGENTS.md — The Healthy Trend Trader

## Regra de ouro

> **Understand → Reuse → Modify → Validate**

Antes de criar algo novo: entenda o que existe, reutilize o que puder, altere somente o necessário e valide que nada foi quebrado.

## Project overview

The Healthy Trend Trader is a browser-based trading-workspace application. It guides a trader through market permission, setup quality, position sizing, portfolio risk, execution, journaling, review, market intelligence, habits, and educational content.

The frontend is a multi-screen, single-document application: `index.html` owns the shell, navigation, much of the static markup, shared CSS, and script loading. Feature scripts in `frontend/` render into page/root elements and attach browser globals. The backend is a dependency-light Node.js HTTP API. PostgreSQL (typically Supabase via `DATABASE_URL`) supplies authenticated persistence; market data is cached on disk and is fetched server-side only.

## Tech stack actually in use

- Frontend: vanilla HTML, CSS, and browser JavaScript; no React, TypeScript, bundler, or frontend package manifest.
- Backend: Node.js 20+ CommonJS modules and the native `node:http` server.
- Database: PostgreSQL through `pg`; SQL migrations under `backend/db/migrations/` are applied on server startup when `DATABASE_URL` is configured.
- Authentication: backend-issued random bearer tokens stored hashed in the database; the browser stores only the session token in `localStorage` or `sessionStorage`.
- Market integrations: B3/COTAHIST as the normal historical source, BRAPI as controlled fallback/live-quote source, and Fundamentus for fundamentals. Credentials stay in `backend/.env`.
- Tests: native Node test runner (`node --test`) covering backend modules and testable frontend models.

## Repository structure

- `index.html` — application entry point, app shell, page sections, shared styles, and ordered feature assets.
- `frontend/` — feature UI scripts, feature CSS, browser models, persistence helpers, and `*.test.js` tests. Files are generally named by feature, with `-model.js` for logic that can be tested independently.
- `backend/src/` — HTTP routes in `server.js`, data-access/domain modules, auth, market providers/cache, and operational scripts.
- `backend/db/migrations/` — ordered, additive PostgreSQL schema migrations. Do not rename, edit historical migrations, or reorder them after use.
- `backend/data/` — runtime/cache and reference data; do not treat generated cache as source code.
- `backend/test/` — backend test suite.
- `backend/scripts/` — operational import, extraction, refresh, and database-policy scripts.
- `assets/` — versioned visual and content assets consumed directly by pages and manuals.
- `docs/` — product specifications, audits, data-model notes, and feature documentation. Treat implemented behavior as authoritative if documentation diverges.
- `scripts/` — repository-level content/index/audit utilities, especially Trader Wisdom asset/index generation.
- `tools/`, `scratch/`, `output/`, and `healthy-trend-trader-app/` — supporting/generated or working material; inspect before relying on or changing it.
- `.cursor/rules/git-workflow.mdc` — mandatory Git workflow rule for Codex-compatible agents.

## Architecture rules

- Keep the frontend as the current single-document, script-tag-loaded application unless a task explicitly authorizes architectural change. Script order in `index.html` is significant because features use globals.
- A feature normally consists of a matching `frontend/<feature>.js` and, when needed, `frontend/<feature>.css`; keep its DOM rendering and styling close to that feature.
- Put testable calculation/domain logic in existing or new `*-model.js` modules using the project’s browser/CommonJS wrapper pattern when appropriate. Keep DOM code out of these models.
- `backend/src/server.js` is the HTTP boundary. Put validation, persistence, and domain behavior in the focused module (`trades.js`, `risk-policy.js`, `wealth.js`, `watchlist.js`, etc.), then expose it through a minimal route.
- Keep tenant isolation: authenticated server operations derive the user from `auth.session(bearer(request))` and pass `user.id` to domain modules. Never trust a user id from the browser.
- Use `database.query` and `database.transaction`; preserve parameterized SQL and transactional multi-step state changes.
- Preserve the backend’s explicit errors and safe fallbacks. Market screens must continue to use the last valid cache when providers fail or quota protection blocks a refresh.
- Never expose `BRAPI_TOKEN`, `DATABASE_URL`, admin credentials, or file-storage secrets to the frontend or Git.

## Component reuse and page integration

Before adding a component, control, calculation, or persistence path:

1. Search `index.html` and `frontend/` for an existing equivalent.
2. Reuse it if it fits.
3. Extend the existing feature/model/style if the behavior is adjacent.
4. Create a new implementation only when neither reuse nor extension is appropriate.

Do not duplicate existing components. Reuse established primitives such as `.page`, `.hero`, `.grid`, `.card`, `.card-head`, `.primary`, `.secondary`, badges/chips, forms, toast handling, and the `go(pageId)` navigation convention. New navigable screens require a matching page section, sidebar entry, breadcrumb/navigation integration, ordered asset inclusion, and regression checks for existing navigation.

## Design system and responsive design

- The base visual language is premium trading-workspace: dark green ink, warm paper surfaces, mint/lime emphasis, semantic good/warn/bad colors, rounded cards (commonly 22px), soft shadows, pill controls, uppercase tracked eyebrow labels, and compact numeric typography.
- Core tokens and reusable base styles live at the start of `index.html`. A Gold theme overrides the same custom properties later in that file; theme-aware CSS must use existing variables rather than hard-coded competing palettes.
- Each large feature has deliberate feature CSS. Preserve its existing visual vocabulary rather than introducing a second card, button, modal, table, or chart style.
- CSS is desktop-first. The primary content is capped at `1600px`; common breakpoints are around `1200px` (multi-column to one column), `1050/1000/950px` (feature layouts), `800px`, and narrower feature-specific limits. Notebook, desktop, and widescreen behavior are first-class. Test the affected page at wide desktop, notebook-width, and any relevant breakpoint; never fix one width by regressing another.
- Charts/gauges are largely custom HTML/CSS/SVG, not a chart library. Extend existing feature renderers and SVG/CSS patterns where possible.

## Data and state management

- `frontend/auth-client.js` is the shared authenticated API client. Use `window.healthyTrendApi.request`, `uploadFile`, and `requestBlob`; do not add ad-hoc fetch clients or duplicate token handling.
- `frontend/workspace-data.js` provides `window.healthyTrendWorkspace`: pre-hydration changes are kept locally, then per-key values synchronize to `/api/workspace-state` after authentication. Use it for the interface preferences/state that already follow this pattern.
- Persistent product records (accounts, trades, position events, wealth, policies, habits, watchlist, attachments, access sessions, and Zen sessions) belong in backend APIs and migrations, not browser-only storage.
- Browser features communicate through established `healthyTrend:*` custom events (for example authentication, workspace loading, and access updates) and render functions. Preserve event names and consumers when changing state flows.
- Static/generated editorial data belongs in its existing asset/catalog/index pipeline; do not manually edit generated search/catalog files unless the relevant generator workflow calls for it.

## Domain rules to preserve

- Workflow precedence is market permission → A+ setup → position sizing → portfolio heat → execution → journal/review. Discovery/Watchlist is not an execution signal by itself.
- Market permission: Down protects capital/no new long trades; Transition favors preparation and conservative recovery behavior; Up permits only correctly sized A+ contexts. Follow the implemented logic before changing wording or gates.
- Trading Rubric grades setup quality (A+, A, B, C, D). The current risk policy resolves grade-based nominal risk; Grade D is a zero-risk automatic block.
- Position sizing has three constraints: stop risk, ATR volatility, and capital limit. The most conservative (smallest) quantity wins.
- Risk Ramp-Up is a distinct conservative operational profile (documented as up to three concurrent positions); the standard profile is documented as up to six. Risk-policy behavior is implemented in `backend/src/risk-policy.js` and used by the trade workflow.
- A/A+ Challenge eligibility is only A or A+; it evaluates execution against the policy’s nominal risk and must not change position sizing.
- A position is the complete trade idea. Entries, partial exits, stop changes, and closing are position events; do not model partial exits as independent trades. Preserve transactional event recording in `backend/src/trades.js` and shared calculations in `frontend/position-management-model.js`.
- Market-data refresh is protected by business-day/São Paulo timing, provider budgets, serialization, and cache-completeness safeguards. Historical B3 data is preferred; live BRAPI scan overlays are opt-in via `ENABLE_BRAPI_LIVE_SCANS=true`.

If a requested change conflicts with one of these rules, identify the conflict before silently replacing the logic. Do not invent domain rules.

## Coding conventions

- Use JavaScript and the existing indentation/style of the file being edited (mostly two spaces in source modules; much of `index.html` is compact inline CSS/markup).
- Use `camelCase` for functions and values, `PascalCase` for exposed model namespaces, descriptive kebab-case filenames, and matching feature prefixes for JS/CSS/model/tests.
- Frontend scripts use IIFEs and browser globals; models commonly support both `module.exports` for tests and `window.<Name>` in browsers. Follow the nearby module’s pattern.
- Prefer small focused functions, explicit normalization/validation, numeric coercion checks, and Portuguese user-facing text consistent with the UI.
- Preserve CommonJS (`require`/`module.exports`) in the backend. Do not introduce ESM, TypeScript, or a framework as incidental work.
- Keep imports/requires grouped at the top. Do not change script order or cache-busting query strings in `index.html` without need.

## Change scope — critical rule

Modify only what is necessary for the requested task. Do not use a feature as an opportunity to refactor unrelated code, redesign other screens, alter unrequested domain rules, replace libraries, reorganize directories, or change global components. If a global change is genuinely necessary, explain why before making it.

## Validation and regression prevention

Before completing a change:

1. Inspect all affected components, models, routes, and related screens.
2. Run the relevant tests; the full available suite is `npm test` from `backend/`.
3. Run any relevant content verification scripts when changing their generated content/indexes.
4. There is no configured lint script, frontend build command, CI definition, or deployment configuration in this repository as of this document. Do not claim to have run them unless one is added.
5. For frontend changes, open the relevant screen and verify its desktop, notebook, and widescreen layouts, navigation, theme, and authenticated/unauthenticated behavior as applicable.
6. For backend/schema changes, validate route error paths, authorization, migration ordering, and cache/fallback behavior.

## Git workflow and handoff

- `main` is the current reference state. Start future work from its latest state.
- Follow `.cursor/rules/git-workflow.mdc`: do not implement code directly on `main`; create a focused `codex/<short-description>` branch before code changes. Do not push, open a PR, or merge without explicit user instruction.
- Keep changes small, traceable, and scoped to one objective. Do not mix independent work.
- Assume a later agent will continue the work: preserve established patterns, make decisions explicit when they are architectural, reuse existing abstractions, and leave readable code and relevant tests.

## Known architectural considerations (do not “fix” incidentally)

- `index.html` is large and contains both application shell/static feature markup and shared CSS; the frontend is intentionally coupled through global scripts and script order.
- The frontend has no compiler/type checker/linter or separate build pipeline; native Node tests cover only testable modules/models, not browser integration end-to-end.
- Documentation and legacy prototype references coexist with the implemented app; validate against current code rather than assuming every document is current.
- The backend route dispatcher is centralized in `backend/src/server.js`; avoid broad rewrites while adding a focused route.
