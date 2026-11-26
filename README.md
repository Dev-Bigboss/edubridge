# EduBridge

Learning Management Portal: live cohort classes and one-on-one sessions with vetted instructors.
Built to the *LMP Software Requirements Specification v0.1*. Plan and decisions: [docs/redesign-plan.md](docs/redesign-plan.md).

## Run it

Needs Node 22 (`nvm use` reads `.nvmrc`) and pnpm.

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_API_MOCKING=on runs without a backend
pnpm dev
```

With mocking on, sign in as `learner@example.com`, `instructor@example.com` or `admin@example.com`,
password `Password123!`. Instructors and admins are asked for a code: `123456`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm check` | Typecheck, lint, unit tests, production build |
| `pnpm test` / `pnpm test:coverage` | Vitest unit tests (coverage gate 80% on `src/lib`) |
| `pnpm e2e` | Playwright against a fresh production build on mocks, incl. axe WCAG 2.2 AA |

## Layout

```
contracts/            API contract for the backend (OpenAPI per module + CONVENTIONS.md)
messages/en.json      All user-facing copy (i18n-ready)
src/app/              Routes: (public) landing, (auth) sign-in, learn/ teach/ admin/ role areas
src/components/       ui/ primitives, layout/ shells and nav, landing/ sections
src/lib/domain/       SRS enums, booking and cohort state machines, money, time zones
src/lib/api/          Fetch client, error shape, zod schemas mirroring contracts/
src/lib/auth/         Session hooks and redirect rules
src/mocks/            MSW handlers and fixtures (browser and Vitest)
e2e/                  Playwright specs
```

## Working with the backend

The frontend drafts each module's contract in `contracts/openapi/<module>.yaml`, builds against MSW mocks of it,
and the backend implements it. Change the YAML first; keep `src/lib/api/schemas` and `src/mocks/handlers` in step.
