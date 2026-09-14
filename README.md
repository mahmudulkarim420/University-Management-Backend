# University Management

**A production-oriented University Management System backend — role-based, scope-aware, and built for real academic + financial workflows, not just CRUD.**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT%20%2B%20Google%20OAuth-000000?style=flat)

---

## Table of Contents

1. [Overview](#overview)
2. [Business Problem](#business-problem)
3. [Key Features](#key-features)
4. [Tech Stack](#tech-stack)
5. [Architecture](#architecture)
6. [Role & Permission Model](#role--permission-model)
7. [Getting Started](#getting-started)
8. [Environment Variables](#environment-variables)
9. [Demo / Test Credentials](#demo--test-credentials)
10. [API Documentation](#api-documentation)
11. [Database](#database)
12. [Running Tests](#running-tests)
13. [Deployment Guide](#deployment-guide)
14. [Security Notes](#security-notes)
15. [Project Structure](#project-structure)
16. [Roadmap](#roadmap)
17. [Contributing](#contributing)
18. [License](#license)
19. [Author / Contact](#author--contact)
20. [Conclusion](#conclusion)

---

## Overview

**University Management** is a University Management System (UMS) backend built for
universities and academic institutions that need to digitize their
day-to-day operations: admissions and enrollment, teaching delivery,
grading and results, tuition and scholarships, and university-wide
communication — all under one coherent, auditable system.

What makes University Management's design notable isn't its CRUD surface — it's the
authorization model underneath it. Every request passes through a layered
check: **who you are** (role), **what you're specifically allowed to do**
(a permission array on top of your role), **whose data you're touching**
(department, course, or your own records only), and **whether the action
makes sense right now** (e.g. you can't publish a result that hasn't been
approved yet). That model is designed once, in the database schema and
the API contract, and then enforced the same way everywhere in the code —
so "can a department head see another department's students?" has one
answer, not one answer per endpoint.

## Business Problem

Universities running on spreadsheets, disconnected portals, or paper-based
approval chains run into the same handful of problems. University Management's design
maps directly onto them:

- **No single source of truth for who teaches what.** Instructor-to-course
  assignment is often informal, so authorization ends up being "trust the
  frontend." University Management makes the `CourseInstructor` table the one place
  this is decided — every attendance, grading, and result action checks
  it, not just the UI.
- **Result approval with no audit trail.** Marks get changed after the
  fact with no record of who approved what. University Management enforces a
  `DRAFT → SUBMITTED → APPROVED/REJECTED → PUBLISHED` workflow where the
  instructor who submits a result can never be the one who approves it,
  and every transition is logged.
- **Financial and academic data mixed together.** Giving an accountant
  academic write access (or an instructor financial access) is a common
  and unnecessary risk. University Management isolates finance into its own scope —
  an `ACCOUNTANT` account simply has no path to grades or attendance.
- **Department heads managing the whole university, or nothing at all.**
  Without organizational scoping, admin tools are either dangerously
  broad or too restrictive to be useful. University Management scopes
  `DEPARTMENT_HEAD` actions to their own department by construction, not
  by convention.
- **Payment status trusted from the client.** A common integration bug
  class. University Management's payment workflow requires a separate accountant
  verification step — client-submitted payment status is never accepted
  as fact.
- **Students with no self-service visibility.** Enrollment requests,
  attendance, grades, invoices, and scholarships are all available to a
  `STUDENT` for their own records — read access that's scoped to "you,"
  not "everyone."





## Demo / Test Credentials

Seeded by `npm run seed` for local development only — **one account per
role**:

| Role            | Name                   | Email                      | Password               |
| --------------- | ---------------------- | -------------------------- | ---------------------- |
| SUPER_ADMIN     | TESTER Super Admin     | `superadmin@gmail.com`     | `Super@admin12345`     |
| ADMIN           | TESTER Admin           | `admin@gmail.com`          | `Admin@12345`          |
| DEPARTMENT_HEAD | TESTER Department Head | `departmenthead@gmail.com` | `DepartmentHead@12345` |
| INSTRUCTOR      | TESTER Instructor      | `instructor@gmail.com`     | `Instructor@12345`     |
| STUDENT         | TESTER Student         | `student@gmail.com`        | `Student@12345`        |
| ACCOUNTANT      | TESTER Accountant      | `accountant@gmail.com`     | `Accountant@12345`     |

> **These credentials must never exist in a production database.** They
> are created only by the local seed script, against a local/staging
> database — rotate or remove them before any deployment that isn't
> strictly for local development.








## Key Features

**Users & Profiles**
- Six-role identity system (`SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD`,
  `INSTRUCTOR`, `STUDENT`, `ACCOUNTANT`) with role-specific profile tables
- Fine-grained permission arrays layered on top of role, governed by
  `SUPER_ADMIN` for admin accounts
- Credential and Google OAuth authentication

**Organization**
- Full Faculty → Department → Program hierarchy
- Dean and department-head assignment without a dedicated role table

**Academic Catalog & Delivery**
- Reusable Subject definitions offered as Courses per department/program
- Instructor-to-course assignment via a dedicated join table
- Academic sessions, semesters, sections, and weekly class schedules

**Student Academics**
- Enrollment request/approval workflow
- Attendance tracking per section
- Assignments, submissions, and grading
- Exams and per-exam grades
- Result submission → department-head approval → publish workflow

**Finance**
- Invoicing, payment initiation and accountant verification
- Scholarship application and approval
- An append-only financial ledger for full transaction history

**Communication**
- University/faculty/department/section-scoped notices and events

**System**
- Append-only audit logging for every security- and business-sensitive action
- Global system configuration

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js | Async I/O suited to an API-heavy backend |
| Language | TypeScript | Type safety across 32 database tables and role-based logic |
| Framework | Express.js | Lightweight, unopinionated — fits a modular-monolith structure |
| ORM | Prisma | Type-safe queries, multi-file schema for a large domain model |
| Database | PostgreSQL | Relational integrity for academic/financial data with real foreign keys |
| Authentication | JWT + Google OAuth | Stateless access tokens plus federated login |
| Password hashing | bcrypt | Industry-standard credential hashing |

## Architecture

University Management follows a **modular-monolith** pattern: a single Express
application, split into self-contained feature modules that mirror the
database schema's 9 units, sitting on a thin shared core layer
(authentication, RBAC middleware, error handling, response envelopes).
Modules only talk to each other through their service layer — never by
reaching into another module's repository or database calls directly.

```
src/
├── app.ts / server.ts
├── config/            # env, Prisma client
├── core/               # middlewares, errors, response envelope, scope guards
├── modules/             # one folder per schema unit
│   ├── auth/
│   ├── users/
│   ├── profiles/
│   ├── organization/
│   ├── academic-catalog/
│   ├── academic-delivery/
│   ├── student-academics/   # enrollments, attendance, assignments, exams, grades, results
│   ├── finance/              # invoices, payments, scholarships, financial-transactions
│   ├── communication/         # notices, events
│   └── system/                 # audit-logs, system-settings
└── routes/
    └── index.ts
```

Full detail — the anatomy of a module, a complete worked example, RBAC
middleware code, and cross-module rules — is in
[`docs/MODULAR_ARCHITECTURE_GUIDE.md`](docs/MODULAR_ARCHITECTURE_GUIDE.md).
The full database design is in
[`docs/DATABASE_SCHEMA_README.md`](docs/DATABASE_SCHEMA_README.md).

## Role & Permission Model

Every request is checked through the same funnel:

```
Authenticated → Role allows action → Permission granted → Scope matches → Business rules pass
```

- **Role** (`User.role`) decides broad capability — one of six values.
- **Permission** (`User.permissions[]`) layers fine-grained grants on top;
  only `SUPER_ADMIN` can edit an `ADMIN` account's permissions.
- **Scope** decides whose data you can touch: your own department, the
  courses you're assigned to, your own records, or (for accountants)
  financial resources only.
- **Business rules** cover things scope alone can't, like a result's
  submitter never being its own approver.

The full role capability matrix, per-role endpoint reference, and
workflow sequences (enrollment, result approval, payment verification)
are documented in
[`docs/API_INSTRUCTION.md`](docs/API_INSTRUCTION.md).

## Getting Started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 14
- npm ≥ 9
- A Google Cloud project with OAuth 2.0 credentials (only required if
  Google sign-in is enabled)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/AyanSujon/University-Management-API.git
cd University-Management-API

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# then fill in .env — see "Environment Variables" below

# 4. Generate the Prisma client
npx prisma generate

# 5. Run database migrations
npx prisma migrate dev --name init

# 6. (Optional) Seed demo data, including the test accounts listed below
npm run seed

# 7. Start the development server
npm run dev
```

The API will be available at `http://localhost:4000/api/v1` (or whichever
`PORT` you configure).

## Environment Variables

| Variable | Description | Required | Example |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@localhost:5432/university-management` |
| `PORT` | HTTP port the API listens on | No | `4000` |
| `NODE_ENV` | Runtime environment | Yes | `development` / `production` |
| `JWT_ACCESS_SECRET` | Signing secret for access tokens | Yes | `<random 64-char string>` |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens | Yes | `<random 64-char string>` |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | Yes | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | Yes | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes, if Google login is enabled | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes, if Google login is enabled | `GOCSPX-...` |
| `CORS_ORIGIN` | Allowed frontend origin(s) | No | `http://localhost:3000` |

> **Never commit `.env`.** Commit only `.env.example` with placeholder
> values, and keep real secrets out of version control and out of this
> file.



## API Documentation

The full API contract — authentication flow, per-role endpoint reference,
request/response shapes, standard error codes, and the enrollment/result/
payment/assignment workflows with step-by-step examples — is documented
in [`docs/API_INSTRUCTION.md`](docs/API_INSTRUCTION.md).

<!-- TODO: add a Postman collection or OpenAPI/Swagger link here once one exists -->

## Database

University Management's schema is organized into 9 units (Users, Profiles,
Organization, Academic Catalog, Academic Delivery, Student Academics,
Finance, Communication, System), each in its own Prisma file under
`prisma/schema/`. Full field-by-field documentation, relationships, and
business rules are in
[`docs/DATABASE_SCHEMA_README.md`](docs/DATABASE_SCHEMA_README.md).

```bash
npx prisma format      # format every file under prisma/schema/
npx prisma validate    # validate the merged schema
npx prisma migrate dev # create/apply a migration locally
npx prisma studio      # browse the database visually
```

## Running Tests

```bash
npm test                 # run the full test suite
npm test -- results      # run tests for a single module (e.g. results)
npm run test:coverage    # run with coverage report
```

Service-layer tests mock the repository and run without a database;
workflow-level integration tests run against a real test PostgreSQL
instance via `supertest`. See
[`docs/MODULAR_ARCHITECTURE_GUIDE.md`](docs/MODULAR_ARCHITECTURE_GUIDE.md#9-testing-structure)
for the full testing structure.

## Deployment Guide

1. **Build the project**
   ```bash
   npm run build
   ```
2. **Apply migrations to the production database** — never use
   `migrate dev` in production:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
3. **Set production environment variables** — same variables as
   [Environment Variables](#environment-variables), with:
   - `NODE_ENV=production`
   - a production `DATABASE_URL`
   - freshly generated `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
     (never reuse development secrets)
   - shorter `JWT_ACCESS_EXPIRES_IN` if your security policy calls for it
   - real `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` registered against
     your production OAuth consent screen and redirect URI
4. **Run the server**
   ```bash
   npm start
   ```
   In production, run this under a process manager (PM2, systemd) or as
   a container on your hosting platform (Render, Railway, Fly.io, or a
   VPS) — pick whichever fits your infrastructure; none is a hard
   requirement of the codebase itself.
5. **Expose a health-check endpoint** (`GET /health`) for your hosting
   platform's uptime monitoring.
6. **Rotate secrets** and confirm the production Google OAuth consent
   screen is out of testing mode before going live.

<!-- TODO: confirm the actual hosting platform once chosen, and add platform-specific steps (Dockerfile, CI/CD pipeline) here -->

## Security Notes

- `SUPER_ADMIN` accounts carry MFA and IP-allowlist fields
  (`SuperAdminProfile.mfaEnabled`, `ipWhitelist`) — enable these before
  granting super-admin access to anyone.
- Payment status is **never** accepted from client input; only an
  accountant's verification call can mark a payment `SUCCESS`/`FAILED`.
- `FinancialTransaction` and `AuditLog` are append-only — the API
  exposes no update/delete endpoint for either.
- `AuditLog.metadata` must never contain passwords, tokens, or secrets.
- An `ADMIN` account's `permissions[]` array can only be changed by
  `SUPER_ADMIN`, and only for `ADMIN`-role targets.

## Project Structure

```
University-Management-API/
├── src/
│   ├── config/
│   ├── core/
│   ├── modules/
│   └── routes/
├── prisma/
│   └── schema/
│       ├── 00-config.prisma
│       ├── enums.prisma
│       ├── 01-auth-users.prisma
│       ├── 02-profiles.prisma
│       ├── 03-organization.prisma
│       ├── 04-academic-catalog.prisma
│       ├── 05-academic-delivery.prisma
│       ├── 06-student-academics.prisma
│       ├── 07-finance.prisma
│       ├── 08-communication.prisma
│       └── 09-system.prisma
├── docs/
│   ├── DATABASE_SCHEMA_REFERENCE.md
│   ├── API_INSTRUCTION.md
│   ├── API_INSTRUCTION_PROMPT.md
│   ├── MODULAR_ARCHITECTURE_GUIDE.md
│   └── README_GENERATION_PROMPT.md
├── ORGANIZATIONAL_HIERARCHY.md
├── .env.example
├── package.json
└── README.md
```

Full per-module breakdown is in
[`docs/MODULAR_ARCHITECTURE_GUIDE.md`](docs/MODULAR_ARCHITECTURE_GUIDE.md).

## Roadmap

Forward-looking — none of the following is implemented yet:

- File storage integration for `AssignmentSubmission.contentUrl`
  (currently expects a pre-uploaded URL)
- Email/SMS notification delivery for notices and events
- A frontend client (student/instructor/admin portals)
- OpenAPI/Swagger auto-generated documentation
- CI/CD pipeline for automated testing and deployment

## Contributing

This is currently a solo project, but contributions are welcome:

1. Create a feature branch: `feat/<short-description>` or
   `fix/<short-description>`
2. Run `npx prisma format` and your linter before committing
3. Add or update tests for any service-layer change
4. Open a pull request describing the change and which schema unit(s)
   it touches

## License

<!-- TODO: confirm license — no license has been specified yet -->

## Author / Contact

**Ayan Sujon**
Portfolio: [https://ayansujon.vercel.app](https://ayansujon.vercel.app)
GitHub: [github.com/AyanSujon](https://github.com/AyanSujon)

## Conclusion

University Management is a demonstration of production-minded backend design applied
to a genuinely complex domain: layered RBAC instead of a single
`isAdmin` flag, organizational scope instead of blanket access, explicit
approval workflows instead of direct writes, and a modular structure that
keeps 32 tables and 6 roles navigable instead of tangled. For the full
depth behind any of the summaries above, see the linked documents:

- [`docs/DATABASE_SCHEMA_REFERENCE.md`](docs/DATABASE_SCHEMA_REFERENCE.md) — every table, field, and relationship
- [`docs/API_INSTRUCTION.md`](docs/API_INSTRUCTION.md) — the full API contract, per role
- [`docs/MODULAR_ARCHITECTURE_GUIDE.md`](docs/MODULAR_ARCHITECTURE_GUIDE.md) — how the codebase is organized and why
