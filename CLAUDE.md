# Tutor IB — Claude Code Instructions

## Identity

**Mentor IB** is an IB-native tutoring platform. Match-first, not marketplace-first.
One shared ecosystem for students and tutors — not two separate apps.
Production domain: `mentorib.com`.
Old names "Tutor IB", "tutorib", and "ibcamp" are dead. Always use **Mentor IB** in code, copy, metadata, and comments. The repo folder may still say `tutorib` — ignore that, the product name is Mentor IB.

Brand strings (app name, tagline, domain, description) must live in one shared site config (`src/lib/config/site.ts`), not hardcoded across files. All code must import from that config.

## Stack (frozen)

| Layer | Choice |
|---|---|
| Runtime | Node.js 24.x LTS |
| Framework | Next.js 16.2.x App Router (no Pages Router) |
| UI | React 19.2.x, React Compiler enabled |
| Language | TypeScript 5.9.x strict |
| Styling | CSS Variables + CSS Modules (NOT Tailwind) |
| Database | Supabase Postgres, RLS, Auth, Storage, Realtime |
| ORM | Drizzle ORM + drizzle-kit, `postgres` driver |
| Payments | Stripe Checkout + Stripe Connect Express |
| Email | Resend |
| Analytics | PostHog |
| Hosting | Vercel (Node runtime, not Edge by default) |
| Package manager | pnpm 10.x |
| Dates | luxon (UTC storage, display in user timezone always) |
| Validation | Zod |
| Testing | Vitest + @testing-library/react + Playwright |
| Fonts | IBM Plex Sans + Instrument Serif |
| Classnames | clsx |

Do NOT add: Tailwind, React Hook Form, Zustand/Jotai/Redux, Firebase/Clerk/Auth0, Algolia, SendGrid, Cloudinary, Inngest/Trigger.dev, Jest, Cypress. If you think you need something not on this list, stop and ask.

## Project structure (target)

```
src/
  app/          # routes and layouts (App Router)
  components/   # shared UI
  modules/      # domain logic (services, repositories)
  lib/          # cross-cutting helpers (env, auth, db)
  styles/       # tokens and shared CSS
  test/         # test utilities
drizzle/        # migrations and DB config
public/         # static assets
docs/           # planning and architecture docs (read-only during implementation)
```

## How to execute a task

Every implementation session follows this protocol:

### Step 1: Receive task ID

The human says something like "Implement P1-FOUND-001". If no task ID is given, ask for one. Never pick tasks on your own.

### Step 2: Read the task (mandatory reads)

Read these files. Do NOT skip any. Do NOT read anything else unless you hit an ambiguity.

1. The **detailed task section only** (not the entire file) in the relevant phase pack. Use the task ID to locate the section:
   - Phase 1: `docs/planning/phase1-mvp-task-pack-v1.md`
   - Phase 1.5: `docs/planning/phase1-5-task-pack-v1.md`
   - Phase 2: `docs/planning/phase2-task-pack-v1.md`
2. Every file listed under **Required source docs** for that task
3. Existing code in the area you'll touch (`package.json`, `tsconfig.json`, `next.config.*`, relevant source files)

**Do NOT read these docs every time** — their rules are already condensed in this CLAUDE.md file:
- `engineering-guardrails-v1.md` (already here in "Non-negotiable rules")
- `implementation-baseline-v1.md` (already here in "Stack" and "Project structure")
- `service-dependency-baseline-v1.md` (already here in "Stack")
- `agent-implementation-decision-index-v1.md` (already here in "Doc navigation")

Only read those full docs if you encounter a specific ambiguity that CLAUDE.md doesn't resolve.

### Step 3: Answer pre-flight questions (before writing any code)

State these answers explicitly before touching any code:

- What is the exact task ID?
- Is the task status `ready`?
- Are all dependencies satisfied?
- What does the **Scope** section say? (list each item)
- What does the **Out of scope** section say? (list each item)
- Which files will I create or modify? (every file, explicitly)
- Which packages will I install? (only those required by this task's scope — if none, say none)
- Which other tasks own adjacent work I must NOT touch? (name them)
- Does this need a migration, RLS change, DTO change, or provider integration?

If anything is unclear, read more docs before coding. If something is blocked, report it — do not improvise.

### Step 4: Implement

- Implement ONLY what the task's Scope section lists. Nothing more.
- Before creating each file, check: is this file required by the Scope? If not, skip it.
- Before running `pnpm add`, check: is this package required by this task? If not, skip it.
- Do not create stubs, placeholders, or empty files for future tasks.
- Reuse existing shared components, DTOs, and patterns.
- Run verification: typecheck (`tsc --noEmit`), lint (`eslint`), build (`next build`), and any task-specific tests.

### Step 5: Report

```
Task: <ID> — <title>
Outcome: completed | blocked
Files changed: <list>
Verification: <what was run and result>
Blockers/Notes: <any issues, assumptions, or doc mismatches>

Manual steps required (NEVER SKIP THIS SECTION):
- Migrations to run: <list commands, e.g. `pnpm drizzle-kit push` or `pnpm drizzle-kit migrate`>
- SQL to execute in Supabase: <any RLS policies, functions, triggers, seeds>
- Environment variables to add: <any new .env entries>
- Other manual steps: <anything the human must do before the code works>
- Tests to run: <specific test commands or manual QA steps>
- If none: "No manual steps required."
```

**This section is mandatory.** If the task created migrations, RLS policies, database functions, triggers, or seed data, the human MUST know exactly what to run and in what order. Never assume the human will figure it out from the code.

## Non-negotiable rules

### Scope — this is the most important section
- ONE task per session. Do not combine tasks.
- The task's **Scope** section is your hard boundary. If something is not listed there, do not build it.
- The task's **Out of scope** section is an explicit exclusion list. If something is listed there, do not touch it under any circumstances.
- Before creating any file, route, or package install, ask: **"Does the task's Scope section require this?"** If the answer is no, do not create it. Another task owns it.
- Do not create files "because they'll be needed later." Each task creates only what it needs. The next task will create what it needs.
- Do not install packages that are not directly needed by the current task. Other tasks will install their own dependencies when they run.
- Do not create routes, pages, or stubs for other phases or other tasks. Even empty placeholder files for future work are scope creep.
- Do not add features, config, or packages not required by the current task.
- Do not refactor unrelated code. Do not "clean up" adjacent files.
- Do not implement `draft` or `planned` tasks unless explicitly told to clarify them.
- When in doubt about whether something is in scope, it is NOT in scope. Stop and ask.

### Code quality
- Do not hardcode: design tokens, spacing, status values, reference data, legal copy, provider IDs, webhook paths, analytics destinations, or anything that belongs in a shared source of truth.
- All design tokens come from central CSS variable definitions.
- Environment variables: read once, parse once (via `src/lib/env/server.ts`). No scattered `process.env.*` reads.
- Pin exact dependency versions. Do not silently upgrade packages during feature work.
- Authorization lives in the server/domain layer. UI hiding is not security.
- Shape DTOs before exposing data to UI. Never return raw DB rows to components.
- Do not log secrets, tokens, message bodies, meeting URLs, credential evidence, or payment data.

### Architecture
- Server Components for data reads. Server Actions for mutations. Route Handlers only for callbacks, webhooks, exports, and machine-readable endpoints.
- Do not create `/api/*` routes for internal page data.
- Do not put business logic in page files. Domain services own business rules; repositories own queries.
- Supabase clients for: Auth, Storage, Realtime. Drizzle for: all SQL queries and domain data access.
- Keep one shared student/tutor design language. Do not create separate visual products by role.
- Student mobile: bottom nav (Home, Match, Lessons, Messages, Saved — max 5 items). Tutor mobile: hamburger/drawer, desktop-primary.

### Data
- UTC storage. Display in user's local timezone. Always.
- Minimum booking notice: 8 hours (slots within 8h are hidden from students).
- Migration files in version control. Run database-change checklist for any schema work.
- Verify webhooks server-side. Preserve raw-body for Stripe signature verification.
- Idempotency keys for retryable operations (webhook_events table, provider_event_id dedup).

### Payment (Phase 1 is payment-bearing)
- Authorization at booking request (Stripe Checkout, capture_method: manual).
- Capture on tutor acceptance. Release on decline/expiry.
- Stripe Connect Express for tutor payouts: pre-fill name, email, country, DOB. Tutor only adds verification docs + bank account.
- 6-gate tutor listing: application approved + profile complete + schedule set + meeting link + payout ready + no suspension.

### SEO (unified SEO + AI SEO)
- Route classes: A (high-value landing), B (profile/detail), C (authenticated).
- Server-render all public pages. Metadata via Next.js `generateMetadata`.
- JSON-LD on public pages (Organization, BreadcrumbList, ProfilePage).
- Dynamic sitemap. Quality-gated indexation. Canonical URLs. Open Graph.
- `noindex` on preview/staging.
- Production domain is `mentorib.com`. Use site config for all brand references, never hardcode.

### Git
- Do not commit, push, or create branches. The human manages git.
- Do not commit `.env`, secrets, or machine-specific artifacts.

## Task selection order

When the human asks "what's next":

1. Current active phase (Phase 1 first)
2. Lowest unfinished wave
3. `ready` tasks with satisfied dependencies
4. Highest priority in that wave
5. Smallest overlap risk if parallel work is happening

**Table order in the task pack is NOT execution order. Dependencies are.**
Always check the `Depends on:` field in each detailed task section before starting.

## Phase 1 execution order (dependency-resolved)

This is the concrete order. Tasks on the same line can run in parallel (disjoint write scopes).

### Wave 1: Foundations

```
Step 1:  P1-FOUND-001 (app shell)          + P1-DATA-001 (identity/account schema)
Step 2:  P1-FOUND-002 (design tokens)       + P1-SEO-001 (SEO foundations)
         + P1-AUTH-001 (sign-in/callback)    + P1-JOBS-001 (background jobs)
         + P1-DATA-002 (tutor/trust schema)  + P1-DATA-004 (message schema)
Step 3:  P1-FOUND-003 (continuity anchors)  + P1-AUTH-002 (role selection)
         + P1-DATA-003 (lesson/booking schema) + P1-DATA-005 (notification schema)
         + P1-AUTH-003 (Google safety)
Step 4:  P1-PUBLIC-001 (marketing route shell)
```

### Wave 2: Match, discovery, booking

```
Step 5:  P1-PUBLIC-002 (home route)         + P1-PUBLIC-003 (tutor profile)
         + P1-MATCH-001 (match flow)        + P1-ACCOUNT-001 (account routes)
Step 6:  P1-MATCH-002 (results route)       + P1-BOOK-001 (booking request)
```

### Wave 3: Continuity

```
Step 7:  P1-MSG-001 (conversation list/thread)
         + P1-LESS-001 (lessons route)      + P1-NOTIF-001 (in-app notifications)
Step 8:  P1-MSG-002 (message send/unread)   + P1-LESS-002 (lesson actions)
         + P1-NOTIF-002 (email delivery)
```

### Wave 4: Tutor operations and quality

```
Step 9:  P1-TUTOR-001 (overview)            + P1-TUTOR-003 (schedule)
Step 10: P1-TUTOR-002 (tutor lessons)       + P1-TUTOR-004 (tutor messages)
         + P1-TUTOR-005 (earnings/payout)
Step 11: P1-QUALITY-001 (observability)
Step 12: P1-QUALITY-002 (release checklist)
```

For each step, complete all tasks before moving to the next step.
Within a step, tasks can be done sequentially or in parallel — they don't depend on each other.

## Stop and escalate when

- The task is not `ready`
- A dependency is not complete
- Two source docs conflict
- You need a provider/package not in the approved list
- Required secrets or env vars are missing
- Existing code conflicts with what you need to change
- The task needs schema/auth work that wasn't named
- Acceptance criteria can't be met without widening scope
- You feel the urge to create "just one more file" that isn't in the Scope section

Report the blocker clearly. Do not improvise workarounds. Do not "help" by doing extra work.

## Doc navigation

- Full doc index: `docs/README.md`
- Decision routing: `docs/planning/agent-implementation-decision-index-v1.md`
- Backlog index: `docs/planning/implementation-backlog-index-v1.md`
- Execution playbook: `docs/planning/agent-execution-playbook-v1.md`
- Engineering guardrails: `docs/planning/engineering-guardrails-v1.md`
- Implementation baseline: `docs/planning/implementation-baseline-v1.md`
- Service baseline: `docs/planning/service-dependency-baseline-v1.md`

Phase task packs:
- Phase 1: `docs/planning/phase1-mvp-task-pack-v1.md`
- Phase 1.5: `docs/planning/phase1-5-task-pack-v1.md`
- Phase 2: `docs/planning/phase2-task-pack-v1.md`

Key canonical docs created during audit:
- `docs/data/lesson-issue-and-dispute-model-v1.md`
- `docs/data/tutor-listing-readiness-model-v1.md`
- `docs/data/tutor-reliability-thresholds-v1.md`
- `docs/planning/phase1-payment-scope-decision-v1.md`

## Manual setup required before P1-INFRA-001

These cannot be done by Claude Code. The human must complete them and provide the keys:

1. **Supabase** — create project → get `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, database connection string
2. **Stripe** — create account, enable Connect → get `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
3. **Resend** — create account, verify domain → get `RESEND_API_KEY`
4. **PostHog** — create project → get `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_HOST`
5. **Vercel** — create project, link to repo, configure env vars
6. **Domain** — configure DNS for production and preview

After setup, provide secrets via `.env.local`. Claude Code will create `.env.example` with all required keys (no values) during P1-INFRA-001.
