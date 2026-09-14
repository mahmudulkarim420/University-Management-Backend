# University Management — API Instruction Generation Prompt

Give this entire document to an AI (or use it yourself) as the master prompt
for producing **`API_INSTRUCTION.md`** — the REST API contract for the
University Management backend. It assumes the AI already has (or you attach) the
existing project context: `docs/DATABASE_SCHEMA_README.md` and the
`prisma/schema/*.prisma` files. Do not regenerate the database schema —
this prompt is only for the API layer that sits on top of it.

---

## 1. Project Context (recap)

I am building the REST API for **University Management**, a University Management
System, on top of an existing Prisma/PostgreSQL schema (Node.js, Express.js,
TypeScript, JWT + Google OAuth). The schema has 9 units and 32 tables,
already finalized — see the attached `DATABASE_SCHEMA_README.md`.

**Roles (exactly six, one per user, from `Role` enum):**

```
SUPER_ADMIN
   │
   └── ADMIN
        ├── DEPARTMENT_HEAD
        │      └── INSTRUCTOR
        │             └── STUDENT
        │
        └── ACCOUNTANT
```

(Per `resources/ORGANIZATIONAL_HIERARCHY.md` §24 — `ACCOUNTANT` is `ADMIN`'s
parallel **financial** branch, separate from the **academic** branch
`DEPARTMENT_HEAD → INSTRUCTOR → STUDENT`. Academic and financial authority
never cross.)

This is **not** simple role inheritance. Every request must pass this exact
funnel, and `API_INSTRUCTION.md` must document, per endpoint, exactly what
satisfies each stage:

```
Authenticated (valid JWT, account.isActive)
      ↓
Role rule allows this action
      ↓
Permission exists in user.permissions[]
      ↓
Organizational scope matches (department / course / self / financial)
      ↓
Business rule / resource-state check passes (e.g. valid state transition,
no self-approval)
      ↓
ALLOW
```

**Role summaries** (full responsibilities are in the schema README —
restate only what's needed to write endpoint restrictions):

- `SUPER_ADMIN` — system-wide authority; manages ADMIN accounts and their
  `permissions[]`; should require MFA for sensitive endpoints.
- `ADMIN` — university-level operations: users, faculties, departments,
  programs, courses, sessions/semesters, platform-wide read access.
- `DEPARTMENT_HEAD` — scoped to exactly one department: manages its
  instructors, reviews/approves its course results, department notices.
- `INSTRUCTOR` — scoped to courses/sections they're assigned to via
  `CourseInstructor`: attendance, assignments, exams, grades, result
  submission.
- `STUDENT` — scoped to their own `StudentProfile`: own enrollment,
  attendance, submissions, grades, published results, invoices, payments.
- `ACCOUNTANT` — scoped to Finance unit only: invoices, payments,
  scholarships, financial reports. No academic read/write access.

---

## 2. What I Want You To Produce

A single file, **`API_INSTRUCTION.md`**, that is a complete, implementable
REST API contract. It must let a backend engineer implement every endpoint
without asking follow-up questions, and let a frontend engineer build every
screen without guessing a request/response shape.

Do **not** just describe CRUD generically. For every endpoint you must
specify:

1. **Method + path** (REST, resource-based, plural nouns, matching the
   Prisma `@@map` table names where sensible)
2. **Allowed roles** (from the six above) and the **exact permission**
   required (from the `Permission` enum in `enums.prisma`)
3. **Scope rule** — which of: none (any authenticated user of that role),
   self, department, course/section (via `CourseInstructor`), or financial
4. **Request body** — a realistic JSON example with correct field types
   matching the Prisma schema (respect required vs optional, enum values,
   `Decimal` for money as a string in JSON with a note on precision)
5. **Response body** — a realistic JSON example for the success case,
   including relevant nested/expanded fields where useful (e.g. a
   `StudentEnrollment` response including a summarized `section` object)
6. **Restrictions / business rules** specific to this endpoint (state
   transitions allowed, fields that are read-only after creation, fields a
   given role may never set, uniqueness conflicts)
7. **Error cases** — which of the standard error codes (see §5) apply and
   why, in plain language (e.g. "409 if `invoiceNumber` already exists")
8. **Audit** — whether this action must write an `AuditLog` row, and which
   `AuditAction` value it uses (see §7)

---

## 3. Required Document Structure

Organize `API_INSTRUCTION.md` in this order:

1. **Overview** — base URL, versioning (`/api/v1`), auth header format
   (`Authorization: Bearer <jwt>`), content type, pagination convention,
   filtering/sorting convention
2. **Authentication & Session Endpoints** — register (credential), login
   (credential), Google OAuth callback, refresh token, logout, password
   reset flow, `needPasswordChange` forced-reset flow
3. **Global Conventions**
   - Standard success envelope
   - Standard error envelope
   - Standard error codes table (§5 below)
   - Pagination shape (`page`, `limit`, `total`, `totalPages`)
   - Soft-delete visibility rule: which endpoints exclude
     `isDeleted = true` rows by default, and which admin endpoints can
     include them via a query flag
4. **Role Capability Matrix** — one big table: rows = the 32 resources
   (from the 9 schema units), columns = the 6 roles, cells = allowed
   actions (`R` read / `C` create / `U` update / `D` delete / custom verbs
   like `Approve`, `Publish`, `Verify` where relevant). This table is the
   fast-reference summary; the detailed sections below are the source of
   truth.
5. **Endpoint Reference, grouped exactly by the 9 schema units** (use the
   same unit names/order as the schema so the two documents line up
   one-to-one):
   1. Users
   2. Profiles
   3. Organization
   4. Academic Catalog
   5. Academic Delivery
   6. Student Academics
   7. Finance
   8. Communication
   9. System

   Within each unit, one subsection per resource/table, and within each
   resource, one entry per endpoint (list → get → create → update →
   delete → any custom action endpoints like `/approve`, `/publish`,
   `/verify`, `/enroll`).
6. **Workflow Endpoints** — call out the multi-step state-machine flows
   explicitly, listing the exact sequence of endpoint calls and which role
   makes each call:
   - Student enrollment: request → approve/reject → drop/complete
   - Result lifecycle: draft → submit → approve/reject → publish
   - Payment lifecycle: create → gateway callback/verify → reconcile
   - Assignment submission: create assignment → student submits →
     instructor grades
7. **Restrictions Appendix** — a consolidated list of the cross-cutting
   rules that apply to many endpoints at once (separation of duties,
   append-only tables, self-scope, nullable org scope) so they aren't
   repeated verbatim in every section — reference them by ID from
   individual endpoints (e.g. "See R-3").
8. **Audit Logging Requirements** — table mapping endpoints/actions to
   `AuditAction` enum values.

---

## 4. Per-Role Instruction Requirement

In addition to the resource-grouped reference in §3.5, add one **per-role
quick-reference table** near the top of the document (after the capability
matrix) with columns: `Endpoint`, `Purpose`, `Key restriction`. This is the
"what can I call today" cheat sheet for someone building the `STUDENT`
mobile app, or the `ACCOUNTANT` finance dashboard, without reading the full
resource-by-resource reference. Six tables total, one per role.

---

## 5. Standard Error Codes (use these exactly, don't invent new ones)

| Code | Meaning | Example trigger |
|---|---|---|
| 400 | Bad request | Missing required field, invalid enum value |
| 401 | Unauthenticated | Missing/expired/invalid JWT |
| 403 | Forbidden | Authenticated but role/permission/scope check fails |
| 404 | Not found | Resource doesn't exist or is soft-deleted and caller lacks admin visibility |
| 409 | Conflict | Unique constraint violation, invalid state transition |
| 422 | Unprocessable | Valid shape but fails a business rule (e.g. `dueDate` before `startDate`) |
| 429 | Rate limited | Too many requests (mainly auth endpoints) |
| 500 | Server error | Unexpected failure |

Every error response uses the same envelope:

```json
{
  "success": false,
  "error": {
    "code": "RESULT_INVALID_STATE_TRANSITION",
    "message": "Result must be SUBMITTED before it can be approved.",
    "httpStatus": 409
  }
}
```

Success responses use:

```json
{
  "success": true,
  "data": { },
  "meta": { }
}
```

`meta` carries pagination info on list endpoints; omit it elsewhere.

---

## 6. Money, Dates, and Enums in JSON

- `Decimal` fields (Invoice/Payment/Scholarship/FinancialTransaction
  `amount`) are serialized as **strings**, e.g. `"amount": "1250.00"` —
  never as a JSON number, to avoid floating-point precision loss on the
  client. State this explicitly in the doc.
- `DateTime` fields are ISO 8601 UTC strings, e.g.
  `"dueDate": "2026-09-30T00:00:00.000Z"`.
- Enum fields are serialized as their exact Prisma enum string (e.g.
  `"status": "PUBLISHED"`), never translated or lowercased.

---

## 7. Audit Logging Requirement

Every endpoint that matches an `AuditAction` enum value (see
`enums.prisma`) must write an `AuditLog` row — list these explicitly in
§3.8 of the output document, one row per `AuditAction` value, with the
endpoint(s) that trigger it. Never include `password`, tokens, or secrets
in `AuditLog.metadata`.

---

## 8. Things To Get Right (non-negotiable)

- **Every** finance endpoint restricted to `ACCOUNTANT` (+ read access for
  `SUPER_ADMIN`/`ADMIN`) must be explicitly called out as never touching
  academic tables.
- **Every** instructor-scoped endpoint (attendance, assignments, exams,
  grading) must state the `CourseInstructor` check as its scope rule, not
  just "role = INSTRUCTOR".
- **Result** endpoints must enforce `submittedById ≠ approvedById` — a
  single instructor who is also a department head cannot approve their own
  submission for a section they taught.
- **Payment** status must never be settable by a request body value coming
  from a `STUDENT`-authenticated call — only via the verify/webhook
  endpoint, restricted to `ACCOUNTANT`/system.
- **Admin creation** of another `ADMIN` account must use a fixed backend
  default `permissions[]` — the request body must not accept an arbitrary
  `permissions` array from the client for this endpoint.
- **AuditLog and FinancialTransaction** are append-only — there must be no
  `PATCH`/`DELETE` endpoint for either resource anywhere in the document.
- Keep endpoint paths and JSON field names **consistent with the Prisma
  field names** already defined in the schema files (e.g. `studentId`, not
  `student_id`, in JSON bodies) unless you're intentionally documenting a
  camelCase-in-JSON / snake_case-in-DB convention — if so, state that
  convention once at the top instead of leaving it ambiguous per endpoint.

---

## 9. Output Format

Write `API_INSTRUCTION.md` in **English**, using the same heading style and
level of specificity as `DATABASE_SCHEMA_README.md` (tables for structured
info, fenced code blocks for JSON examples, one endpoint = one clearly
delimited subsection). Do not compress multiple endpoints into a single
paragraph — a reader should be able to jump to one endpoint via the table
of contents and get everything needed to implement it without scrolling
past unrelated endpoints.
