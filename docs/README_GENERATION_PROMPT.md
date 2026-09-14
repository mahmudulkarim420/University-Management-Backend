# University Management — Project README Generation Prompt

Give this entire document to an AI, **along with the following existing
project files attached**, as the master prompt for producing the final
**`README.md`** at the repository root:

- `docs/DATABASE_SCHEMA_README.md`
- `docs/API_INSTRUCTION.md`
- `docs/MODULAR_ARCHITECTURE_GUIDE.md`
- `prisma/schema/*.prisma` (all 11 files)
- `ORGANIZATIONAL_HIERARCHY.md` (from the repo root)

The AI must **analyze these files first** and pull real facts from them
(role names, table names, tech stack, folder structure, permission
model) — never invent details that contradict what's already defined.

---

## 1. Project Context (recap)

**University Management** is a University Management System backend: Node.js,
Express.js, TypeScript, Prisma ORM, PostgreSQL, JWT authentication +
Google OAuth, REST API. It has 9 schema units / 32 tables, 6 roles
(`SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD`, `INSTRUCTOR`, `STUDENT`,
`ACCOUNTANT`), a permission-array RBAC model, and multi-role workflows
(enrollment approval, result publishing, payment verification). The
codebase follows a modular-monolith pattern, one module per resource,
documented in `MODULAR_ARCHITECTURE_GUIDE.md`.

Repository: `AyanSujon/University-Management-API`.

---

## 2. What I Need You To Produce

A single, polished, GitHub-ready **`README.md`** at the repo root — the
first thing anyone (recruiter, collaborator, evaluator, future me) reads.
It must let a stranger understand what the project does, why it exists,
and get it running locally within minutes, without reading any other
file first.

### Required sections, in this order

#### 1. Title & Tagline
Project name as an `# H1`, one-sentence tagline directly under it, and a
short badge row (tech stack badges — Node.js, TypeScript, Express,
Prisma, PostgreSQL — using shields.io style markdown; skip badges that
would be false, like a CI badge if there's no CI pipeline yet).

#### 2. Table of Contents
Linked to every section below, so long as the section is actually
included.

#### 3. Overview
2–4 paragraphs: what University Management is, who it's for (universities/
institutions digitizing academic + administrative operations), and what
makes the design notable — mention the permission-layer RBAC and the
organizational-scope authorization model in plain language (no jargon
dump — a non-technical reader should still follow this section).

#### 4. Business Problem
A dedicated section answering: **what real-world problem does this
solve?** Ground it in the six roles and their friction points — e.g.
fragmented department records, manual/paper-based result approval with
no audit trail, no separation between academic and financial data
access, no single source of truth for who is assigned to which course.
Frame each role's pain point → how University Management's design addresses it (one
short paragraph or bullet per role is enough — don't repeat the full
role table from `API_INSTRUCTION.md`, just the "why it matters"
framing).

#### 5. Key Features
Bullet list, grouped by the 9 schema units (Users & Profiles,
Organization, Academic Catalog, Academic Delivery, Student Academics,
Finance, Communication, System/Audit). Pull real feature names from the
schema — don't invent features the schema doesn't support.

#### 6. Tech Stack
A table: Layer | Technology | Why. Cover runtime, framework, language,
ORM, database, auth (JWT + Google OAuth), validation library (if named
elsewhere in the project files), testing library (if named in
`MODULAR_ARCHITECTURE_GUIDE.md`).

#### 7. Architecture
A short paragraph on the modular-monolith pattern (one module per
resource, mirroring the 9 schema units) with a **link**, not a copy, to
`docs/MODULAR_ARCHITECTURE_GUIDE.md` and `docs/DATABASE_SCHEMA_README.md`
for the full detail. Include the top-level folder tree only (not the
full per-module breakdown — that lives in the linked doc).

#### 8. Role & Permission Model
Briefly restate the 6 roles and the authorization funnel (Authenticated
→ Role → Permission → Scope → Business rule) in 4–6 lines, then link to
`docs/API_INSTRUCTION.md` for the full capability matrix and endpoint
reference. Do not reproduce the full role capability matrix here — a
README should summarize, not duplicate.

#### 9. Getting Started

##### Prerequisites
List with exact version constraints where known (Node.js version,
PostgreSQL version, npm/pnpm/yarn, a Google Cloud project for OAuth
credentials).

##### Installation
Numbered steps: clone → install dependencies → copy `.env.example` to
`.env` → generate Prisma client → run migrations → seed (if a seed
script is implied) → start dev server. Use real commands matching the
Prisma multi-file setup already documented (`npx prisma format`, `npx
prisma migrate dev`, `npx prisma generate`).

#### 10. Environment Variables
A table: `Variable` | `Description` | `Required` | `Example`. Must
include at minimum (infer any others the schema/architecture implies,
e.g. a port or CORS origin, but do not invent unrelated ones):

| Variable | Description | Required | Example |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@localhost:5432/university-management` |
| `PORT` | HTTP port the API listens on | No | `4000` |
| `NODE_ENV` | Runtime environment | Yes | `development` / `production` |
| `JWT_ACCESS_SECRET` | Signing secret for access tokens | Yes | `<random 64-char string>` |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens | Yes | `<random 64-char string>` |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | Yes | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | Yes | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes (if Google login enabled) | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes (if Google login enabled) | `GOCSPX-...` |
| `CORS_ORIGIN` | Allowed frontend origin(s) | No | `http://localhost:3000` |

State explicitly: **never commit `.env` — commit only `.env.example`
with placeholder values**, and never put real secrets in this table.

#### 11. Demo / Test Credentials
A table for local/staging demo logins — **one row per role**: `Role` |
`Email` | `Password` | `Notes`. Use obviously fake placeholder
credentials (e.g. `admin@university-management.test` / `Demo@1234`), and add a bold
warning that these accounts must **never** exist with these credentials
in a production database — they're for local seed data only, created by
a seed script.

#### 12. API Documentation
One paragraph pointing to `docs/API_INSTRUCTION.md` as the full API
contract (auth flow, per-role endpoints, workflows, error codes), plus a
link to a Postman collection or OpenAPI/Swagger URL if one exists —
otherwise state that a Postman collection is planned rather than
fabricating a link.

#### 13. Database
One paragraph + link to `docs/DATABASE_SCHEMA_README.md` covering the 9
schema units, plus the exact Prisma commands to set up the database
locally (mirroring §9's installation steps, but this is the reference
copy — link back to it instead of repeating verbatim if it's long).

#### 14. Running Tests
Commands to run the test suite (unit + integration, per
`MODULAR_ARCHITECTURE_GUIDE.md` §9), and how to run a single module's
tests.

#### 15. Deployment Guide
Step-by-step production deployment instructions:
- Build step (`npm run build` or equivalent TypeScript compile)
- Running `npx prisma migrate deploy` against the production database
  (never `migrate dev` in production)
- Required production environment variables (reference §10, note which
  ones differ in production, e.g. `NODE_ENV=production`, shorter JWT
  expirations, production `DATABASE_URL`)
- Process manager / hosting notes — cover whichever applies: a
  Dockerfile + container platform (Render, Railway, Fly.io, a VPS with
  PM2/systemd), or a serverless target — pick the most likely one for a
  Node/Express/Prisma/PostgreSQL stack and note it's an example, not a
  hard requirement
- Health-check endpoint recommendation (`GET /health`) for the hosting
  platform's uptime checks
- A reminder to rotate `JWT_*_SECRET` values and set real
  `GOOGLE_CLIENT_*` credentials for the production OAuth consent screen

#### 16. Security Notes
Short list: MFA/IP-allowlist expectations for `SUPER_ADMIN`
(`SuperAdminProfile`), payment status never trusted from client input,
append-only audit/financial tables, secrets never in `AuditLog.metadata`
— pull these from the existing docs rather than re-deriving them.

#### 17. Project Structure
The top-level folder tree only (same one as §7 — link rather than
duplicate if both sections would show it).

#### 18. Roadmap (optional but include if there's an obvious next step)
A short bullet list of logical next features implied by the schema but
not yet built out (e.g. notifications, a frontend, file storage
integration for `AssignmentSubmission.contentUrl`) — mark this section
clearly as forward-looking, not implemented.

#### 19. Contributing
A short paragraph — even if this is a solo project for now, include
minimal contribution guidance (branch naming, PR expectations,
`prisma format`/lint before commit) so it's ready if that changes.

#### 20. License
State the license (ask me which one if not otherwise specified — do not
assume MIT by default).

#### 21. Author / Contact
Name, GitHub profile link, and any other contact method I've provided
elsewhere in the project files.

#### 22. Conclusion
A short closing paragraph — what University Management demonstrates (production-
oriented schema design, layered RBAC, modular architecture), and an
invitation to explore the linked docs for depth.

---

## 3. Formatting Rules

- English, GitHub-flavored Markdown.
- Use real badges, real folder trees, real environment variable names —
  everything must be traceable to the attached project files.
- Link to the existing docs (`DATABASE_SCHEMA_README.md`,
  `API_INSTRUCTION.md`, `MODULAR_ARCHITECTURE_GUIDE.md`) instead of
  duplicating their content — the README summarizes and points outward;
  it is not a fourth copy of the same information.
- Keep total length reasonable for a landing document — long enough to
  be complete, short enough that someone reads it in one sitting. Depth
  belongs in the linked docs, not the README.
- Use tables for structured data (env vars, credentials, tech stack) —
  not prose paragraphs.
- If something requested above genuinely isn't determinable from the
  attached files (e.g. license choice, hosting platform, contact info),
  leave a clearly marked placeholder (e.g. `<!-- TODO: confirm license
  -->`) instead of inventing a plausible-sounding answer.

## 4. Deliverable

One file: **`README.md`**, at the project root, following the 22
sections above in order.
