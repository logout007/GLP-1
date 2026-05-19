# PhoenixLabs GLP-1 Eligibility Screening Form

A full-stack monorepo application that guides patients through a 15-screen medical questionnaire to determine GLP-1 medication eligibility.

## Tech Stack

- **Backend:** NestJS 11, Prisma ORM, PostgreSQL 15
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Zustand
- **Testing:** Vitest 4 (unit + property-based), Playwright (E2E)
- **Infrastructure:** Docker Compose, GitHub Actions CI

## Architecture

```
apps/
├── api/          # NestJS 11 REST API (session management, eligibility evaluation)
└── web/          # Next.js 15 frontend (form UI, state management)
```

Key design decisions:
- **Server-side branching** — the backend is authoritative for all eligibility logic
- **Pure function evaluator** — zero framework dependencies, independently testable
- **Single JSON schema** — shared between frontend and backend as the source of truth
- **Zustand with persist** — handles session resume via localStorage automatically

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 9+

## Setup

```bash
# 1. Clone the repository
git clone <repo-url> && cd phoenixlabs-glp1

# 2. Start PostgreSQL
docker compose up -d

# 3. Install dependencies
npm install

# 4. Run database migrations
cd apps/api && npx prisma migrate dev --name init && cd ../..

# 5. Start both servers (API on :4000, Web on :3000)
npm run dev
```

## Running Tests

```bash
# Unit tests (API — includes evaluator, schema, controller tests)
npm run test --workspace=apps/api

# Unit tests with coverage (target: 100% branch coverage on evaluator)
npm run test:coverage --workspace=apps/api

# E2E tests (requires Docker PostgreSQL running)
npm run test:e2e --workspace=apps/web

# Run all tests
npm test
```

## Project Structure

| Path | Description |
|------|-------------|
| `apps/api/src/evaluator/` | Pure function eligibility evaluator |
| `apps/api/src/session/` | Session management (controller, service, DTOs) |
| `apps/api/src/form-schema/` | JSON schema defining all 15 screens |
| `apps/web/app/` | Next.js pages (home, form, result) |
| `apps/web/components/` | Form input components (Number, Radio, Checkbox, Computed) |
| `apps/web/lib/` | API client, Zustand store, schema types |
| `apps/web/e2e/` | Playwright E2E test specs |

## Eligibility Outcomes

| Result | Meaning |
|--------|---------|
| **Eligible** | Patient meets all screening criteria |
| **Ineligible** | Hard disqualifier detected (age, BMI, pregnancy, uncontrolled diabetes) |
| **Requires Clinical Review** | Conditions requiring physician review before determination |
# GLP-1
# GLP-1
# GLP-1
