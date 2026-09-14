# University Management — API Instruction

The complete REST API contract for the University Management University Management
System backend, generated from `docs/DATABASE_SCHEMA_README.md` and the
`prisma/schema/*.prisma` files. This document is organized to mirror the
schema's 9 units so the two stay easy to cross-reference.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication & Session Endpoints](#2-authentication--session-endpoints)
3. [Global Conventions](#3-global-conventions)
4. [Role Capability Matrix](#4-role-capability-matrix)
5. [Per-Role Quick Reference](#5-per-role-quick-reference)
6. [Endpoint Reference](#6-endpoint-reference)
   - [6.1 Users (Unit 1)](#61-users-unit-1)
   - [6.2 Profiles (Unit 2)](#62-profiles-unit-2)
   - [6.3 Organization (Unit 3)](#63-organization-unit-3)
   - [6.4 Academic Catalog (Unit 4)](#64-academic-catalog-unit-4)
   - [6.5 Academic Delivery (Unit 5)](#65-academic-delivery-unit-5)
   - [6.6 Student Academics (Unit 6)](#66-student-academics-unit-6)
   - [6.7 Finance (Unit 7)](#67-finance-unit-7)
   - [6.8 Communication (Unit 8)](#68-communication-unit-8)
   - [6.9 System (Unit 9)](#69-system-unit-9)
7. [Workflow Endpoints](#7-workflow-endpoints)
8. [Restrictions Appendix](#8-restrictions-appendix)
9. [Audit Logging Requirements](#9-audit-logging-requirements)

---

## 1. Overview

| | |
|---|---|
| Base URL | `https://api.university-management.app/api/v1` |
| Content type | `application/json` for all requests/responses |
| Auth header | `Authorization: Bearer <access_token>` |
| Pagination | `?page=1&limit=20` (query params), response carries `meta` |
| Filtering | `?filter[field]=value`, e.g. `?filter[status]=PENDING` |
| Sorting | `?sort=field:asc` or `?sort=field:desc`, e.g. `?sort=createdAt:desc` |
| Versioning | URL-prefixed (`/api/v1`); breaking changes ship as `/api/v2` |
| Idempotency | POST endpoints that create a financial or enrollment record accept an optional `Idempotency-Key` header; a repeated key with the same body returns the original response instead of creating a duplicate |

---

## 2. Authentication & Session Endpoints

### `POST /auth/register`

Creates a `User` with `role = STUDENT` by default (self-registration is
student-only; every other role is created by `ADMIN`/`SUPER_ADMIN` via
`POST /users`, see §6.1).

**Request**
```json
{
  "name": "Ayan Sujon",
  "email": "ayan@example.com",
  "password": "StrongPassw0rd!"
}
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": "b1a3...",
    "name": "Ayan Sujon",
    "email": "ayan@example.com",
    "role": "STUDENT",
    "emailVerified": false,
    "authProvider": "CREDENTIAL"
  }
}
```

**Restrictions:** `email` must be unique (`409` on conflict). Triggers a
verification email; `needPasswordChange = false` for self-registered users.
**Audit:** `USER_CREATED`.

### `POST /auth/login`

**Request**
```json
{ "email": "ayan@example.com", "password": "StrongPassw0rd!" }
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": { "id": "b1a3...", "role": "STUDENT", "needPasswordChange": false }
  }
}
```

**Restrictions:** `401 AUTH_INVALID_CREDENTIALS` on mismatch. `403
ACCOUNT_INACTIVE` if `isActive = false`. If `needPasswordChange = true`,
the response still succeeds but the client must route to the forced
password-change screen before any other authenticated call.
**Audit:** `LOGIN_SUCCESS` / `LOGIN_FAILED`.

### `POST /auth/google`

Exchanges a Google OAuth `idToken` for a session. Creates a new `User`
(`authProvider = GOOGLE`, `role = STUDENT`) on first sign-in, or logs in
the existing user matched by `googleId`.

**Request:** `{ "idToken": "..." }` → **Response:** same shape as
`/auth/login`. **Restrictions:** if the Google email matches an existing
`CREDENTIAL` account, respond `409 ACCOUNT_PROVIDER_CONFLICT` rather than
silently merging accounts.

### `POST /auth/refresh`

**Request:** `{ "refreshToken": "..." }` → **Response:** new
`accessToken`/`refreshToken` pair. **Restrictions:** `401` if the refresh
token is expired, revoked, or reused after rotation.

### `POST /auth/logout`

Revokes the current refresh token. **Response `204`.**

### `POST /auth/change-password`

**Request**
```json
{ "currentPassword": "StrongPassw0rd!", "newPassword": "EvenStronger1!" }
```
Sets `needPasswordChange = false`. **Audit:** `PASSWORD_CHANGED`.

### `POST /auth/forgot-password` / `POST /auth/reset-password`

Standard email-token reset flow. `reset-password` accepts `{ "token":
"...", "newPassword": "..." }`. **Audit:** `PASSWORD_RESET`.

---

## 3. Global Conventions

### Success envelope
```json
{ "success": true, "data": { }, "meta": { } }
```
`meta` is present only on list endpoints:
```json
"meta": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 }
```

### Error envelope
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

### HTTP status usage

| Status | Meaning | Example |
|---|---|---|
| 200 | OK | Successful read/update |
| 201 | Created | Successful create |
| 204 | No content | Successful delete/logout |
| 400 | Bad request | Missing field, malformed JSON, invalid enum value |
| 401 | Unauthenticated | Missing/expired/invalid JWT |
| 403 | Forbidden | Authenticated but role/permission/scope check fails |
| 404 | Not found | Resource doesn't exist, or soft-deleted and caller lacks visibility |
| 409 | Conflict | Unique constraint violation, invalid state transition |
| 422 | Unprocessable | Valid shape but fails a business rule (e.g. `dueDate` before today) |
| 429 | Rate limited | Too many requests (mainly `/auth/*`) |
| 500 | Server error | Unexpected failure |

### Standard error codes

| Code | Used for |
|---|---|
| `AUTH_REQUIRED` | No/invalid JWT |
| `ACCOUNT_INACTIVE` | `User.isActive = false` |
| `FORBIDDEN_ROLE` | Role not permitted for this endpoint |
| `FORBIDDEN_PERMISSION` | Permission missing from `user.permissions[]` |
| `FORBIDDEN_SCOPE` | Role/permission OK, but department/course/self/financial scope check fails |
| `VALIDATION_ERROR` | Field-level input validation failure |
| `RESOURCE_NOT_FOUND` | 404 |
| `CONFLICT` | Unique constraint or state conflict |
| `INVALID_STATE_TRANSITION` | Workflow status change not allowed from current state |
| `RATE_LIMITED` | 429 |

**Field-level validation error shape:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request failed validation.",
    "httpStatus": 400,
    "details": [
      { "field": "dueDate", "issue": "must be a valid ISO 8601 date" },
      { "field": "totalMarks", "issue": "must be a positive integer" }
    ]
  }
}
```

### Money, dates, enums

- `Decimal` fields (`Invoice.amount`, `Payment.amount`, `Scholarship.amount`,
  `FinancialTransaction.amount`) are serialized as **strings**, e.g.
  `"amount": "1250.00"` — never a JSON number.
- `DateTime` fields are ISO 8601 UTC, e.g. `"dueDate":
  "2026-09-30T00:00:00.000Z"`.
- Enum fields are the exact Prisma enum string, e.g. `"status":
  "PUBLISHED"`.

### Soft-delete visibility

Endpoints for **User, Faculty, Department, Program, Subject, Course**
(the tables with `isDeleted`) exclude `isDeleted = true` rows by default
on every list/get call. `ADMIN`/`SUPER_ADMIN` list endpoints accept
`?includeDeleted=true` to see them; no other role may set this flag
(`403 FORBIDDEN_PERMISSION` if attempted).

### Permission source of truth

`user.permissions[]` is never accepted as client input on `POST
/users`/`PATCH /users/:id`. It is set by backend defaults per role, and is
only directly editable via `PATCH /users/:id/permissions`, restricted to
`SUPER_ADMIN` and only for `ADMIN` target users (see R-8).

---

## 4. Role Capability Matrix

`R` = read, `C` = create, `U` = update, `D` = delete/deactivate. Custom
verbs (`Approve`, `Reject`, `Publish`, `Verify`, `Submit`, `Assign`) are
listed where they exist. `—` = no access. All scope qualifiers ("own
dept", "self", "assigned") are enforced per §8.

| Resource | SUPER_ADMIN | ADMIN | DEPARTMENT_HEAD | INSTRUCTOR | STUDENT | ACCOUNTANT |
|---|---|---|---|---|---|---|
| User | RCUD, Suspend/Restore, Role change | RCU (non-admin), Suspend/Restore | R (own dept) | R (self) | R (self) | R (self) |
| SuperAdminProfile | RU (self) | — | — | — | — | — |
| AdminProfile | RU (any) | RU (self) | — | — | — | — |
| DepartmentHeadProfile | R | RU | RU (self) | — | — | — |
| InstructorProfile | R | RCU | RU (own dept) | RU (self) | R (limited) | — |
| StudentProfile | R | RCU | R (own dept) | R (enrolled students) | RU (self) | R (financial fields) |
| AccountantProfile | R | RCU | — | — | — | RU (self) |
| Faculty | RCUD | RCU | R | R | R | R |
| Department | RCUD | RCU | RU (own) | R | R | R |
| Program | RCUD | RCU | R (own dept) | R | R | — |
| Subject | RCUD | RCU | R | R | R | — |
| Course | RCUD | RCU | RU (own dept), Assign | R (assigned) | R | — |
| CourseInstructor | RCUD | RCUD | RC/D (own dept) | R (self assignments) | — | — |
| AcademicSession | RCUD | RCU | R | R | R | R |
| Semester | RCUD | RCU | R | R | R | R |
| Section | RCUD | RCU | RU (own dept) | R (assigned) | R | — |
| ClassSchedule | RCUD | RCU | RU (own dept) | RU (own sections) | R | — |
| StudentEnrollment | R | R, Approve/Reject | R, Approve/Reject (own dept) | R (own sections) | RC (self) | — |
| Attendance | R | R | R (own dept) | RCU (own sections) | R (self) | — |
| Assignment | R | R | R (own dept) | RCUD (own sections) | R (own sections) | — |
| AssignmentSubmission | R | R | R (own dept) | R, Grade (own sections) | RC, Submit (self) | — |
| Exam | R | R | R (own dept) | RCUD (own sections) | R (own sections) | — |
| Grade | R | R | R (own dept) | RCU (own sections) | R (self) | — |
| Result | R | R, Publish | R, Approve/Reject (own dept) | RC, Submit (own sections) | R (self, published only) | — |
| Invoice | R | R | — | — | R (self) | RCUD |
| Payment | R | R | — | — | RC (self, initiate) | R, Verify |
| Scholarship | R | R | — | — | RC (self, apply) | RU, Approve |
| FinancialTransaction | R | R | — | — | R (self) | R (append-only) |
| Notice | RCUD (university) | RCUD (university/faculty) | RCUD (own dept/section) | RC (own sections) | R | R |
| Event | RCUD (university) | RCUD (university/faculty) | RCUD (own dept) | R | R | R |
| AuditLog | R | R (non-super-admin actions) | — | — | — | R (financial actions) |
| SystemSetting | RCUD | R (public), U (non-security) | R (public) | R (public) | R (public) | R (public) |

---

## 5. Per-Role Quick Reference

### SUPER_ADMIN

| Endpoint | Purpose | Key restriction |
|---|---|---|
| `POST /users` (role=ADMIN) | Create an admin account | Applies fixed `DEFAULT_ADMIN_PERMISSIONS` (R-8) |
| `PATCH /users/:id/permissions` | Grant/revoke an ADMIN's permissions | Target user must have `role = ADMIN` |
| `PATCH /users/:id/role` | Change a user's role | Triggers `ROLE_CHANGED` audit entry |
| `POST /users/:id/suspend` | Deactivate any account | Cannot suspend own account |
| `GET /audit-logs` | Full audit trail, unrestricted | No scope filter applied |
| `GET/PATCH /system-settings` | Global config, including security settings | Only role that can write non-public settings |
| `GET /faculties`, `PATCH /faculties/:id` | Manage faculties, assign dean | — |

### ADMIN

| Endpoint | Purpose | Key restriction |
|---|---|---|
| `POST /users` (role≠ADMIN/SUPER_ADMIN) | Create staff/student accounts | Cannot create SUPER_ADMIN or set `permissions[]` freely (R-8) |
| `POST /departments`, `POST /programs`, `POST /courses` | Build the academic catalog/org tree | — |
| `POST /academic-sessions`, `POST /semesters` | Open a new term | Only one session/semester may have `isCurrent = true` |
| `PATCH /departments/:id` (`headUserId`) | Assign a department head | Target must have `role = DEPARTMENT_HEAD` and matching `departmentId` (R-2) |
| `POST /results/:id/publish` | Publish approved results | Result must be `APPROVED` (R-5) |
| `GET /audit-logs` | Read audit trail | Cannot see actions performed by `SUPER_ADMIN` accounts |

### DEPARTMENT_HEAD

| Endpoint | Purpose | Key restriction |
|---|---|---|
| `POST /course-instructors` | Assign an instructor to a course | Course and instructor must belong to caller's department (R-2) |
| `POST /student-enrollments/:id/approve` / `/reject` | Approve/reject enrollment requests | Section's course must belong to caller's department |
| `POST /results/:id/approve` / `/reject` | Review submitted results | Cannot approve a result they also submitted (R-5) |
| `GET /instructors?departmentId=own` | List department instructors | Scoped to `User.departmentId = caller.departmentId` |
| `POST /notices` (scope=DEPARTMENT) | Post a department notice | `departmentId` must equal caller's department |

### INSTRUCTOR

| Endpoint | Purpose | Key restriction |
|---|---|---|
| `POST /attendance` | Mark attendance for a class | Section's course must appear in caller's `CourseInstructor` rows (R-3) |
| `POST /assignments` | Create an assignment | Same `CourseInstructor` scope check |
| `POST /assignment-submissions/:id/grade` | Grade a submission | Same scope check |
| `POST /exams`, `POST /grades` | Record exams and marks | Same scope check |
| `POST /results` then `POST /results/:id/submit` | Submit a section's results | Instructor becomes `submittedById`; cannot also be `approvedById` (R-5) |
| `GET /class-schedules?instructorId=me` | View own teaching schedule | Self only |

### STUDENT

| Endpoint | Purpose | Key restriction |
|---|---|---|
| `POST /student-enrollments` | Request enrollment in a section | Creates with `status = PENDING`; cannot set `status` directly |
| `GET /results/me` | View published results | Only rows with `status = PUBLISHED` are returned (R-6) |
| `POST /assignment-submissions` | Submit an assignment | `studentId` forced to caller's own `StudentProfile.id` (R-1) |
| `POST /payments` | Initiate a payment against an invoice | Cannot set `status` or `verifiedById` (R-7) |
| `POST /scholarships` | Apply for a scholarship | Cannot set `status = APPROVED` directly |
| `GET /invoices/me`, `GET /attendance/me` | View own financial/academic records | Self only (R-1) |

### ACCOUNTANT

| Endpoint | Purpose | Key restriction |
|---|---|---|
| `POST /invoices` | Bill a student | No access to academic tables (R-4) |
| `POST /payments/:id/verify` | Verify/reconcile a payment | Only path that may set `Payment.status = SUCCESS` (R-7) |
| `PATCH /scholarships/:id/approve` | Approve a scholarship | — |
| `GET /financial-transactions` | Read the ledger | Read-only — no `PATCH`/`DELETE` exists for this resource (R-9) |
| `GET /reports/financial` | Generate financial reports | Requires `FINANCIAL_REPORT_GENERATE` |

---

## 6. Endpoint Reference

### 6.1 Users (Unit 1)

| Method | Path | Purpose | Permission | Restrictions |
|---|---|---|---|---|
| GET | `/users` | List users | `USER_READ` | `SUPER_ADMIN`/`ADMIN` only; `?includeDeleted` admin-only |
| GET | `/users/:id` | Get one user | `USER_READ` | `SUPER_ADMIN`/`ADMIN`, or self |
| GET | `/users/me` | Get current user | — | Any authenticated user |
| POST | `/users` | Create a user (any role) | `USER_CREATE` | See R-8; `ADMIN` cannot create `SUPER_ADMIN`/`ADMIN` with custom `permissions[]` |
| PATCH | `/users/:id` | Update basic fields | `USER_UPDATE` | Self, or `ADMIN`/`SUPER_ADMIN`; `role`/`permissions` excluded — use dedicated endpoints |
| PATCH | `/users/me` | Update own profile fields | — | Self only; `role`, `isActive`, `permissions` not editable here |
| PATCH | `/users/:id/role` | Change a user's role | `USER_UPDATE` | `SUPER_ADMIN` only |
| PATCH | `/users/:id/permissions` | Set an admin's permission array | `ADMIN_PERMISSION_UPDATE` | `SUPER_ADMIN` only, target must be `role = ADMIN` (R-8) |
| POST | `/users/:id/suspend` | Set `isActive = false` | `USER_SUSPEND` | `ADMIN`/`SUPER_ADMIN`; cannot suspend self |
| POST | `/users/:id/restore` | Set `isActive = true` | `USER_RESTORE` | `ADMIN`/`SUPER_ADMIN` |
| DELETE | `/users/:id` | Soft-delete (`isDeleted = true`) | `USER_UPDATE` | `SUPER_ADMIN` only |

**Create user — request**
```json
{
  "name": "Nusrat Karim",
  "email": "nusrat.karim@university-management.edu",
  "role": "INSTRUCTOR",
  "departmentId": "3f2c...",
  "authProvider": "CREDENTIAL",
  "needPasswordChange": true
}
```
`password` is omitted from the request — the backend generates a temporary
one and emails it; `needPasswordChange` defaults to `true` for
backend-created accounts. **Audit:** `USER_CREATED`.

**Update role — request**
```json
{ "role": "DEPARTMENT_HEAD" }
```
**Restrictions:** the caller must also ensure the matching profile table
row is created/updated to match the new role (service-layer transaction,
not a client concern). **Audit:** `ROLE_CHANGED`.

---

### 6.2 Profiles (Unit 2)

Each profile resource follows the same shape: list/get restricted to
management roles + self, update restricted to the owner + management
roles, no direct create (profiles are created as part of `POST /users`).

| Method | Path | Roles | Restrictions |
|---|---|---|---|
| GET | `/super-admins/:id` | `SUPER_ADMIN` | Self or any (SUPER_ADMIN sees all) |
| PATCH | `/super-admins/:id` | `SUPER_ADMIN` | Self only (`mfaEnabled`, `ipWhitelist`, contact fields) |
| GET | `/admins`, `/admins/:id` | `SUPER_ADMIN`, `ADMIN` (self) | — |
| PATCH | `/admins/:id` | `SUPER_ADMIN`, `ADMIN` (self) | — |
| GET | `/department-heads`, `/department-heads/:id` | `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD` (self) | — |
| PATCH | `/department-heads/:id` | `SUPER_ADMIN`, `ADMIN`, self | `appointedAt` is set by the backend when `headUserId` is assigned on `Department`, not editable directly |
| GET | `/instructors`, `/instructors/:id` | all roles (read) | `STUDENT` sees only instructors of their enrolled sections |
| PATCH | `/instructors/:id` | `SUPER_ADMIN`, `ADMIN`, self | `employmentStatus` change by self requires `ADMIN` co-sign in practice, but is technically self-editable |
| GET | `/students`, `/students/:id` | `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD` (own dept), `INSTRUCTOR` (enrolled students), self | `ACCOUNTANT` sees only financially-relevant fields (`studentId`, `academicStatus`) |
| PATCH | `/students/:id` | `SUPER_ADMIN`, `ADMIN`, self | `studentId`, `programId` are `ADMIN`-only fields |
| GET | `/accountants`, `/accountants/:id` | `SUPER_ADMIN`, `ADMIN`, self | — |
| PATCH | `/accountants/:id` | `SUPER_ADMIN`, `ADMIN`, self | — |

**Example — get own student profile (`GET /students/me`)**
```json
{
  "success": true,
  "data": {
    "id": "e771...",
    "studentId": "CSE-2026-0142",
    "programId": "9ab2...",
    "academicStatus": "ACTIVE",
    "currentSemesterNo": 3
  }
}
```

---

### 6.3 Organization (Unit 3)

| Method | Path | Purpose | Permission | Restrictions |
|---|---|---|---|---|
| GET | `/faculties` | List faculties | `FACULTY_READ` | Any authenticated role |
| POST | `/faculties` | Create a faculty | `FACULTY_CREATE` | `SUPER_ADMIN`, `ADMIN` |
| PATCH | `/faculties/:id` | Update / assign `deanUserId` | `FACULTY_UPDATE` | `SUPER_ADMIN`, `ADMIN`; `deanUserId` should reference an active user |
| DELETE | `/faculties/:id` | Soft-delete | `FACULTY_UPDATE` | `SUPER_ADMIN` only; blocked (`409`) while active `Department` rows exist |
| GET | `/departments` | List departments | `DEPARTMENT_READ` | Any authenticated role; `?facultyId=` filter |
| POST | `/departments` | Create a department | `DEPARTMENT_CREATE` | `SUPER_ADMIN`, `ADMIN` |
| PATCH | `/departments/:id` | Update / assign `headUserId` | `DEPARTMENT_UPDATE` | `SUPER_ADMIN`, `ADMIN` fully; `DEPARTMENT_HEAD` may update own department's non-structural fields (R-2) |
| GET | `/programs` | List programs | `PROGRAM_READ` | Any authenticated role; `?departmentId=` filter |
| POST | `/programs` | Create a program | `PROGRAM_CREATE` | `SUPER_ADMIN`, `ADMIN` |
| PATCH | `/programs/:id` | Update a program | `PROGRAM_UPDATE` | `SUPER_ADMIN`, `ADMIN` |

**Assign department head — request**
```json
{ "headUserId": "7cd1..." }
```
**Restrictions:** `422` if the target user's `role ≠ DEPARTMENT_HEAD` or
`departmentId ≠` this department (R-2). **Audit:** `USER_UPDATED`.

---

### 6.4 Academic Catalog (Unit 4)

| Method | Path | Purpose | Permission | Restrictions |
|---|---|---|---|---|
| GET | `/subjects` | List subjects | `SUBJECT_READ` | Any authenticated role |
| POST | `/subjects` | Create a subject | `SUBJECT_CREATE` | `SUPER_ADMIN`, `ADMIN` |
| PATCH | `/subjects/:id` | Update a subject | `SUBJECT_UPDATE` | `SUPER_ADMIN`, `ADMIN` |
| GET | `/courses` | List courses | `COURSE_READ` | Any authenticated role; `?departmentId=`, `?programId=` filters |
| POST | `/courses` | Create a course offering | `COURSE_CREATE` | `SUPER_ADMIN`, `ADMIN` |
| PATCH | `/courses/:id` | Update a course | `COURSE_UPDATE` | `SUPER_ADMIN`, `ADMIN`; `DEPARTMENT_HEAD` for own-department courses |
| DELETE | `/courses/:id` | Soft-delete a course | `COURSE_DELETE` | `SUPER_ADMIN` only |
| GET | `/courses/:id/instructors` | List assigned instructors | `COURSE_READ` | Any authenticated role |
| POST | `/courses/:id/instructors` | Assign an instructor | `COURSE_ASSIGN_INSTRUCTOR` | `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD` (own department only, R-2) |
| DELETE | `/courses/:id/instructors/:instructorId` | Unassign an instructor | `COURSE_ASSIGN_INSTRUCTOR` | Same as above |

**Assign instructor — request**
```json
{ "instructorId": "4d90...", "isPrimary": true }
```
**Response `201`**
```json
{
  "success": true,
  "data": {
    "courseId": "c112...",
    "instructorId": "4d90...",
    "isPrimary": true,
    "assignedAt": "2026-09-03T10:15:00.000Z"
  }
}
```
**Restrictions:** the instructor must have `role = INSTRUCTOR`; a
`DEPARTMENT_HEAD` may only assign instructors and courses that both
belong to their own department (R-2). **Audit:** none required (not
security- or grade-sensitive), but recommended as `resourceType =
"CourseInstructor"` under a general `AUDIT_LOG_READ`-visible category.

---

### 6.5 Academic Delivery (Unit 5)

| Method | Path | Purpose | Permission | Restrictions |
|---|---|---|---|---|
| GET | `/academic-sessions` | List sessions | `ACADEMIC_SESSION_READ` | Any authenticated role |
| POST | `/academic-sessions` | Create a session | `ACADEMIC_SESSION_MANAGE` | `SUPER_ADMIN`, `ADMIN` |
| PATCH | `/academic-sessions/:id` | Update / set `isCurrent` | `ACADEMIC_SESSION_MANAGE` | Setting `isCurrent = true` unsets it on all other sessions |
| GET | `/semesters` | List semesters | `SEMESTER_READ` | Any authenticated role; `?academicSessionId=` filter |
| POST | `/semesters` | Create a semester | `SEMESTER_MANAGE` | `SUPER_ADMIN`, `ADMIN` |
| PATCH | `/semesters/:id` | Update / set `isCurrent` | `SEMESTER_MANAGE` | Same one-current rule, scoped to its session |
| GET | `/sections` | List sections | `COURSE_READ` | Any authenticated role; `?courseId=`, `?semesterId=` filters |
| POST | `/sections` | Create a section | `COURSE_CREATE` | `SUPER_ADMIN`, `ADMIN` |
| PATCH | `/sections/:id` | Update a section | `COURSE_UPDATE` | `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD` (own department, R-2) |
| GET | `/class-schedules` | List class schedules | `CLASS_SCHEDULE_READ` | Any authenticated role; `?sectionId=`, `?instructorId=` filters |
| POST | `/class-schedules` | Create a weekly slot | `CLASS_SCHEDULE_MANAGE` | `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD` (own department) |
| PATCH | `/class-schedules/:id` | Update a slot | `CLASS_SCHEDULE_MANAGE` | Same as above, plus `INSTRUCTOR` may update `room` on their own slots |

**Create section — request**
```json
{
  "courseId": "c112...",
  "semesterId": "sem2026spring...",
  "code": "A",
  "capacity": 45,
  "room": "CSE-301"
}
```
**Restrictions:** `409` if `(courseId, semesterId, code)` already exists.

---

### 6.6 Student Academics (Unit 6)

#### Student Enrollment

| Method | Path | Purpose | Permission | Restrictions |
|---|---|---|---|---|
| GET | `/student-enrollments` | List enrollments | `ENROLLMENT_READ` | `SUPER_ADMIN`/`ADMIN` any; `DEPARTMENT_HEAD` own dept; `INSTRUCTOR` own sections; `STUDENT` self only |
| POST | `/student-enrollments` | Request enrollment | `ENROLLMENT_CREATE` | `STUDENT` only; `studentId` forced to caller (R-1); created with `status = PENDING` |
| POST | `/student-enrollments/:id/approve` | Approve a request | `ENROLLMENT_APPROVE` | `DEPARTMENT_HEAD` (own dept, R-2), `ADMIN`; must be `PENDING` |
| POST | `/student-enrollments/:id/reject` | Reject a request | `ENROLLMENT_REJECT` | Same roles as approve |
| POST | `/student-enrollments/:id/drop` | Student drops a section | `ENROLLMENT_CREATE` | `STUDENT` (self), must be `APPROVED` |

See §7.1 for the full workflow.

#### Attendance

| Method | Path | Purpose | Permission | Restrictions |
|---|---|---|---|---|
| GET | `/attendance` | List attendance | `ATTENDANCE_READ` | `STUDENT` self only; `INSTRUCTOR` own sections (R-3); `DEPARTMENT_HEAD` own dept |
| POST | `/attendance` | Mark attendance (bulk per class) | `ATTENDANCE_CREATE` | `INSTRUCTOR` only, `CourseInstructor` scope (R-3); `409` if `(studentId, sectionId, date)` exists |
| PATCH | `/attendance/:id` | Correct a record | `ATTENDANCE_UPDATE` | Same instructor scope; only same-day corrections allowed by default |

**Mark attendance — request**
```json
{
  "sectionId": "sec-A-2026sp",
  "date": "2026-09-03",
  "records": [
    { "studentId": "e771...", "status": "PRESENT" },
    { "studentId": "f882...", "status": "ABSENT" }
  ]
}
```

#### Assignments & Submissions

| Method | Path | Purpose | Permission | Restrictions |
|---|---|---|---|---|
| GET | `/assignments` | List assignments | `ASSIGNMENT_READ` | `STUDENT` own sections; `INSTRUCTOR` own sections; `DEPARTMENT_HEAD` own dept |
| POST | `/assignments` | Create an assignment | `ASSIGNMENT_CREATE` | `INSTRUCTOR` only, `CourseInstructor` scope (R-3) |
| PATCH | `/assignments/:id` | Update / publish | `ASSIGNMENT_UPDATE` | Creating instructor only |
| DELETE | `/assignments/:id` | Delete a draft assignment | `ASSIGNMENT_UPDATE` | Only while `status = DRAFT` |
| POST | `/assignment-submissions` | Submit work | `ASSIGNMENT_SUBMIT` | `STUDENT` only; `studentId` forced to caller (R-1); `409` if already submitted (resubmission uses `PATCH`) |
| PATCH | `/assignment-submissions/:id` | Resubmit | `ASSIGNMENT_SUBMIT` | Owning student only, before `dueDate` unless `status = RESUBMIT_REQUIRED` |
| POST | `/assignment-submissions/:id/grade` | Grade a submission | `ASSIGNMENT_GRADE` | `INSTRUCTOR` only, `CourseInstructor` scope (R-3) |

**Submit assignment — request**
```json
{ "assignmentId": "a331...", "contentUrl": "https://storage.university-management.app/f/9c2b.pdf" }
```

#### Exams & Grades

| Method | Path | Purpose | Permission | Restrictions |
|---|---|---|---|---|
| GET | `/exams` | List exams | `EXAM_READ` | Scoped as assignments above |
| POST | `/exams` | Schedule an exam | `EXAM_CREATE` | `INSTRUCTOR` only, `CourseInstructor` scope (R-3) |
| PATCH | `/exams/:id` | Update an exam | `EXAM_UPDATE` | Creating instructor only |
| GET | `/grades` | List grades | `RESULT_READ` | `STUDENT` self only; `INSTRUCTOR` own sections |
| POST | `/grades` | Record a student's marks | `RESULT_CREATE` | `INSTRUCTOR` only, `CourseInstructor` scope; `409` if `(examId, studentId)` exists |
| PATCH | `/grades/:id` | Correct marks | `RESULT_UPDATE` | Same instructor scope |

#### Results

| Method | Path | Purpose | Permission | Restrictions |
|---|---|---|---|---|
| GET | `/results` | List results | `RESULT_READ` | `STUDENT` self + `status = PUBLISHED` only (R-6); `INSTRUCTOR`/`DEPARTMENT_HEAD` per scope |
| POST | `/results` | Create a draft result | `RESULT_CREATE` | `INSTRUCTOR` only, `CourseInstructor` scope |
| POST | `/results/:id/submit` | Submit for approval | `RESULT_SUBMIT` | Creating instructor only; sets `submittedById = caller`; must be `DRAFT` |
| POST | `/results/:id/approve` | Approve | `RESULT_APPROVE` | `DEPARTMENT_HEAD` (own dept), `ADMIN`; caller must not equal `submittedById` (R-5); must be `SUBMITTED` |
| POST | `/results/:id/reject` | Reject | `RESULT_REJECT` | Same as approve |
| POST | `/results/:id/publish` | Publish | `RESULT_PUBLISH` | `ADMIN`, `SUPER_ADMIN`; must be `APPROVED` |

See §7.2 for the full workflow with JSON at every step.

---

### 6.7 Finance (Unit 7)

| Method | Path | Purpose | Permission | Restrictions |
|---|---|---|---|---|
| GET | `/invoices` | List invoices | `INVOICE_READ` | `STUDENT` self only; `ACCOUNTANT`/`ADMIN`/`SUPER_ADMIN` any |
| POST | `/invoices` | Bill a student | `INVOICE_CREATE` | `ACCOUNTANT` only (R-4); `409` if `invoiceNumber` exists |
| PATCH | `/invoices/:id` | Update / cancel | `INVOICE_UPDATE` | `ACCOUNTANT` only |
| GET | `/payments` | List payments | `PAYMENT_READ` | `STUDENT` self only; `ACCOUNTANT`/`ADMIN`/`SUPER_ADMIN` any |
| POST | `/payments` | Initiate a payment | `PAYMENT_CREATE` | `STUDENT` only; `studentId` forced to caller; `status` always starts `PENDING`, ignored if sent (R-7) |
| POST | `/payments/:id/verify` | Confirm a single payment against gateway data | `PAYMENT_VERIFY` | `ACCOUNTANT` only; the only path that may set `status = SUCCESS`/`FAILED` (R-7) |
| POST | `/payments/reconcile` | Bulk-reconcile payments against a gateway settlement batch | `PAYMENT_RECONCILE` | `ACCOUNTANT` only; distinct from `verify` — matches many payments against one settlement report rather than confirming one payment (see §7.3) |
| GET | `/scholarships` | List scholarships | `SCHOLARSHIP_READ` | `STUDENT` self only; `ACCOUNTANT`/`ADMIN`/`SUPER_ADMIN` any |
| POST | `/scholarships` | Apply for a scholarship | `SCHOLARSHIP_CREATE` | `STUDENT` only; created with `status = APPLIED` |
| PATCH | `/scholarships/:id/approve` | Approve | `SCHOLARSHIP_APPROVE` | `ACCOUNTANT` only |
| GET | `/financial-transactions` | Read the ledger | `FINANCIAL_REPORT_READ` | `STUDENT` self only; `ACCOUNTANT`/`ADMIN`/`SUPER_ADMIN` any; **no create/update/delete endpoint exists** (R-9) — rows are written internally when invoices/payments/scholarships/adjustments change |
| POST | `/financial-adjustments` | Request a correction to a student's financial record | `PAYMENT_RECONCILE` | `ACCOUNTANT` only; creates a pending request, **not** a ledger entry (R-11) |
| POST | `/financial-adjustments/:id/approve` | Approve a pending adjustment | `FINANCIAL_REPORT_GENERATE` | `ADMIN`/`SUPER_ADMIN` only; caller must not equal the requesting accountant (R-11); writes the actual `FinancialTransaction` (`type = ADJUSTMENT`) only on approval |
| GET | `/reports/financial` | Aggregate financial reports | `FINANCIAL_REPORT_GENERATE` | `ACCOUNTANT`, `ADMIN`, `SUPER_ADMIN` |
| GET | `/reports/financial/export` | Export a report (CSV/PDF) | `FINANCIAL_REPORT_EXPORT` | Same roles |

**Initiate payment — request**
```json
{ "invoiceId": "inv-2026-0091", "amount": "1250.00", "method": "ONLINE_GATEWAY" }
```
**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": "pay-77af...",
    "invoiceId": "inv-2026-0091",
    "amount": "1250.00",
    "method": "ONLINE_GATEWAY",
    "status": "PENDING",
    "transactionId": null
  }
}
```

**Verify payment — request**
```json
{ "transactionId": "gw_9f7c2b", "status": "SUCCESS" }
```
**Restrictions:** the gateway `transactionId` must be independently
confirmed against the payment provider's API/webhook before this call is
accepted — the request body alone is never trusted as proof of payment.
**Audit:** `PAYMENT_VERIFIED`.

See §7.3 for the full workflow.

---

### 6.8 Communication (Unit 8)

| Method | Path | Purpose | Permission | Restrictions |
|---|---|---|---|---|
| GET | `/notices` | List notices | `NOTICE_READ` | Any authenticated role; server filters to notices in the caller's scope (university + own faculty/department/section) |
| POST | `/notices` | Create a notice | `NOTICE_CREATE` | Scope-dependent: `SUPER_ADMIN`/`ADMIN` any scope; `DEPARTMENT_HEAD` own department/section; `INSTRUCTOR` own sections only |
| PATCH | `/notices/:id` | Update a notice | `NOTICE_UPDATE` | Creator, or `ADMIN`/`SUPER_ADMIN` |
| POST | `/notices/:id/publish` | Publish | `NOTICE_PUBLISH` | Same as create-scope roles |
| GET | `/events` | List events | `EVENT_READ` | Any authenticated role, scoped like notices |
| POST | `/events` | Create an event | `EVENT_CREATE` | `SUPER_ADMIN`/`ADMIN` any scope; `DEPARTMENT_HEAD` own department |
| PATCH | `/events/:id` | Update an event | `EVENT_UPDATE` | Creator, or `ADMIN`/`SUPER_ADMIN` |
| POST | `/events/:id/publish` | Publish | `EVENT_PUBLISH` | Same as create-scope roles |

**Create department notice — request**
```json
{
  "title": "Midterm schedule released",
  "content": "Midterm exams begin October 12. See the exam portal for room assignments.",
  "scope": "DEPARTMENT",
  "departmentId": "3f2c..."
}
```
**Restrictions:** exactly the ID field matching `scope` may be set — a
`DEPARTMENT` notice must not also carry `sectionId`, and a `UNIVERSITY`
notice must carry none of `facultyId`/`departmentId`/`sectionId`
(`422` otherwise).

---

### 6.9 System (Unit 9)

| Method | Path | Purpose | Permission | Restrictions |
|---|---|---|---|---|
| GET | `/audit-logs` | List audit entries | `AUDIT_LOG_READ` | `SUPER_ADMIN` unrestricted; `ADMIN` cannot see `SUPER_ADMIN` actor rows; `ACCOUNTANT` sees only financial `AuditAction` values; no other role |
| GET | `/audit-logs/:id` | Get one entry | `AUDIT_LOG_READ` | Same scope as list |
| GET | `/system-settings` | List settings | `SYSTEM_SETTING_READ` | Non-`SUPER_ADMIN`/`ADMIN` roles see only `isPublic = true` rows |
| POST | `/system-settings` | Create a setting | `SYSTEM_SETTING_MANAGE` | `SUPER_ADMIN` only |
| PATCH | `/system-settings/:key` | Update a setting | `SYSTEM_SETTING_MANAGE` | `SUPER_ADMIN` only for non-public/security-relevant keys; `ADMIN` may update keys explicitly flagged non-sensitive |

**No** `PATCH`/`DELETE` endpoint exists for `/audit-logs` — this resource
is append-only (R-9); entries are written internally by other endpoints,
never created directly via the API.

---

## 7. Workflow Endpoints

### 7.1 Enrollment workflow

```
STUDENT                         DEPARTMENT_HEAD / ADMIN
   │                                     │
   │ POST /student-enrollments           │
   │ status → PENDING                    │
   ├────────────────────────────────────►│
   │                                     │ POST .../approve  or  .../reject
   │                                     │ status → APPROVED / REJECTED
   │◄────────────────────────────────────┤
   │ POST .../drop (later, self)         │
   │ status → DROPPED                    │
```

| Step | Caller | Call | Effect |
|---|---|---|---|
| 1 | `STUDENT` | `POST /student-enrollments` `{ "sectionId": "sec-A-2026sp" }` | Creates row, `status = PENDING` |
| 2 | `DEPARTMENT_HEAD` (own dept) or `ADMIN` | `POST /student-enrollments/:id/approve` | `status → APPROVED`, `approvedById`/`approvedAt` set |
| 2′ | Same roles | `POST /student-enrollments/:id/reject` | `status → REJECTED` |
| 3 | `STUDENT` (self) | `POST /student-enrollments/:id/drop` | `status → DROPPED`; only valid from `APPROVED` |

**Invalid transition example:** approving a `DROPPED` or already
`APPROVED` row returns
`409 INVALID_STATE_TRANSITION`. A student attempting to call `.../approve`
on their own request returns `403 FORBIDDEN_ROLE`.

### 7.2 Result workflow

```
INSTRUCTOR                DEPARTMENT_HEAD           ADMIN         STUDENT
   │ POST /results               │                     │             │
   │ status → DRAFT               │                     │             │
   │ POST .../submit               │                     │             │
   │ status → SUBMITTED            │                     │             │
   ├──────────────────────────────►│                     │             │
   │                               │ POST .../approve    │             │
   │                               │ status → APPROVED   │             │
   │                               ├────────────────────►│             │
   │                               │                     │ POST .../publish
   │                               │                     │ status → PUBLISHED
   │                               │                     ├────────────►│
   │                               │                     │  GET /results/me
```

| Step | Caller | Call | Effect |
|---|---|---|---|
| 1 | `INSTRUCTOR` (assigned) | `POST /results` `{ "studentId": "e771...", "sectionId": "sec-A-2026sp" }` | Creates row, `status = DRAFT` |
| 2 | Same instructor | `POST /results/:id/submit` | `status → SUBMITTED`, `submittedById = caller`, `submittedAt` set |
| 3 | `DEPARTMENT_HEAD` (own dept, ≠ `submittedById`) | `POST /results/:id/approve` `{ "gradeLetter": "A", "gradePoint": 4.0 }` | `status → APPROVED`, `approvedById`/`approvedAt` set |
| 3′ | Same role | `POST /results/:id/reject` `{ "reason": "Marks do not match grade sheet" }` | `status → REJECTED`; instructor must resubmit |
| 4 | `ADMIN`/`SUPER_ADMIN` | `POST /results/:id/publish` | `status → PUBLISHED`, `publishedAt` set |
| 5 | `STUDENT` (self) | `GET /results/me` | Returns only `PUBLISHED` rows |

**Invalid cases:**
- `POST /results/:id/approve` where `status ≠ SUBMITTED` → `409
  INVALID_STATE_TRANSITION`.
- `POST /results/:id/approve` where `caller.id === result.submittedById`
  → `403 FORBIDDEN_SCOPE` (separation of duties, R-5).
- `GET /results/me` never returns `DRAFT`/`SUBMITTED`/`APPROVED` rows —
  they are filtered server-side, not merely hidden in the UI.

### 7.3 Payment workflow

```
STUDENT                    Payment Gateway              ACCOUNTANT
   │ POST /payments               │                          │
   │ status → PENDING              │                          │
   ├──────────────────────────────►│                          │
   │         (redirect/checkout)   │                          │
   │                               │  webhook: payment result  │
   │                               ├─────────────────────────►│
   │                               │                          │ POST .../verify
   │                               │                          │ status → SUCCESS/FAILED
   │◄──────────────────────────────┴──────────────────────────┤
   │  GET /payments/me                                          │
```

| Step | Caller | Call | Effect |
|---|---|---|---|
| 1 | `STUDENT` (self) | `POST /payments` `{ "invoiceId": "...", "amount": "1250.00", "method": "ONLINE_GATEWAY" }` | Creates row, `status = PENDING` |
| 2 | Payment gateway (server-to-server webhook, not a `STUDENT` call) | `POST /webhooks/payment-gateway` | Backend records `transactionId`, does **not** set `status` from this call alone |
| 3 | `ACCOUNTANT` | `POST /payments/:id/verify` `{ "transactionId": "gw_9f7c2b", "status": "SUCCESS" }` | `status → SUCCESS`/`FAILED`, `verifiedById`/`verifiedAt` set; a `FinancialTransaction` row (`type = PAYMENT_RECEIVED`) is written |
| 4 | `STUDENT` (self) | `GET /payments/me` | Reflects final status |

**Restrictions:** step 1's request body is never allowed to include
`status` or `verifiedById` — both are stripped server-side if present
(R-7). A refund follows the same shape as a new `FinancialTransaction`
(`type = REFUND`), never an edit to the original payment row.

### 7.4 Assignment submission workflow

| Step | Caller | Call | Effect |
|---|---|---|---|
| 1 | `INSTRUCTOR` (assigned) | `POST /assignments` | Creates assignment, `status = DRAFT` |
| 2 | Same instructor | `PATCH /assignments/:id` `{ "status": "PUBLISHED" }` | Visible to enrolled students |
| 3 | `STUDENT` (enrolled) | `POST /assignment-submissions` | Creates submission, `status = SUBMITTED` (or `LATE` if past `dueDate`) |
| 4 | Same instructor | `POST /assignment-submissions/:id/grade` `{ "marks": 18, "feedback": "Good work" }` | `status → GRADED` |
| 4′ | Same instructor | `POST /assignment-submissions/:id/grade` `{ "status": "RESUBMIT_REQUIRED", "feedback": "..." }` | Student may `PATCH` the same submission again |

### 7.5 Financial adjustment workflow

A correction to a student's financial record (a fee waiver, a billing
error fix, a manual credit) is never written straight to the ledger by
the `ACCOUNTANT` who spots it — it goes through the same separation of
duties as results and payments.

```
ACCOUNTANT                         ADMIN / SUPER_ADMIN
   │ POST /financial-adjustments        │
   │ (pending request, no ledger entry) │
   ├────────────────────────────────────►│
   │                                     │ POST .../approve
   │                                     │ writes FinancialTransaction
   │                                     │ (type = ADJUSTMENT)
   │◄────────────────────────────────────┤
```

| Step | Caller | Call | Effect |
|---|---|---|---|
| 1 | `ACCOUNTANT` | `POST /financial-adjustments` `{ "studentId": "e771...", "amount": "-200.00", "reason": "Duplicate lab fee charged in error" }` | Creates a pending request — **no** `FinancialTransaction` row yet |
| 2 | `ADMIN`/`SUPER_ADMIN` (≠ requesting accountant, R-11) | `POST /financial-adjustments/:id/approve` | Writes one `FinancialTransaction` (`type = ADJUSTMENT`, `amount` as requested) |

**Restrictions:** the accountant who filed the request can never be the
approver (R-11) — mirroring R-5 for results. **Audit:** `INVOICE_ADJUSTED`
on approval.

---

## 8. Restrictions Appendix

Cross-cutting rules referenced by ID throughout §5–§7 instead of being
repeated per endpoint.

| ID | Rule |
|---|---|
| R-1 | **Self scope.** For `STUDENT`-writable resources (enrollment, submission, payment, scholarship), the server forces `studentId`/`userId` to the caller's own profile — a value supplied in the request body for this field is ignored, never trusted. |
| R-2 | **Department scope.** `DEPARTMENT_HEAD` actions on `Department`, `Program`, `Course`, `Section`, `CourseInstructor`, `StudentEnrollment`, `Result`, `Notice` require `user.departmentId === resource.departmentId` (or the department of the resource's course/section). |
| R-3 | **Course/section scope.** `INSTRUCTOR` actions on `Attendance`, `Assignment`, `Exam`, `Grade`, `Result`, `ClassSchedule` require a matching `CourseInstructor` row for that course and instructor — not just `role = INSTRUCTOR`. |
| R-4 | **Financial isolation.** `ACCOUNTANT` has no read/write access to any Unit 4–6 (academic) table; academic roles have no write access to Unit 7 (finance) tables. |
| R-5 | **Separation of duties (results).** The user who calls `POST /results/:id/submit` (`submittedById`) can never be the same user who calls `POST /results/:id/approve`/`reject` (`approvedById`) for that row. |
| R-6 | **Result visibility.** `STUDENT` reads on `/results` are filtered to `status = PUBLISHED` server-side, regardless of query parameters supplied. |
| R-7 | **Payment status source of truth.** Only `POST /payments/:id/verify`, called by `ACCOUNTANT`, may set `Payment.status` to `SUCCESS`/`FAILED`/`REFUNDED`; no other endpoint accepts this field. |
| R-8 | **Admin permission governance.** `permissions[]` is never accepted from client input on `POST /users` or `PATCH /users/:id`. It is set to a backend-defined default per role at creation, and only `SUPER_ADMIN` may later change it — and only for target users with `role = ADMIN` — via `PATCH /users/:id/permissions`. |
| R-9 | **Append-only tables.** `FinancialTransaction` and `AuditLog` have no `PATCH`/`DELETE` endpoint anywhere in this API; corrections are new rows (`ADJUSTMENT`, `REFUND`), never edits. |
| R-10 | **Soft-delete visibility.** List/get endpoints for tables with `isDeleted` exclude soft-deleted rows by default; only `SUPER_ADMIN`/`ADMIN` may pass `?includeDeleted=true`. |
| R-11 | **Separation of duties (financial adjustments).** The `ACCOUNTANT` who files `POST /financial-adjustments` can never be the `ADMIN`/`SUPER_ADMIN` who calls `.../approve` for that same request — mirrors R-5 for the financial domain. |

---

## 9. Audit Logging Requirements

Every row below must produce an `AuditLog` entry with the matching
`AuditAction`. `metadata` never contains `password`, tokens, or secrets.

| `AuditAction` | Triggering endpoint(s) |
|---|---|
| `USER_CREATED` | `POST /auth/register`, `POST /users` |
| `USER_UPDATED` | `PATCH /users/:id`, `PATCH /users/me`, `PATCH /departments/:id` (head assignment) |
| `ROLE_CHANGED` | `PATCH /users/:id/role` |
| `PERMISSION_CHANGED` | `PATCH /users/:id/permissions` |
| `USER_SUSPENDED` | `POST /users/:id/suspend` |
| `USER_RESTORED` | `POST /users/:id/restore` |
| `GRADE_SUBMITTED` | `POST /results/:id/submit` |
| `GRADE_APPROVED` | `POST /results/:id/approve` |
| `GRADE_REJECTED` | `POST /results/:id/reject` |
| `RESULT_PUBLISHED` | `POST /results/:id/publish` |
| `PAYMENT_CREATED` | `POST /payments` |
| `PAYMENT_VERIFIED` | `POST /payments/:id/verify` |
| `PAYMENT_RECONCILED` | `POST /payments/reconcile` |
| `INVOICE_CREATED` | `POST /invoices` |
| `INVOICE_ADJUSTED` | `POST /financial-adjustments/:id/approve` |
| `SCHOLARSHIP_APPROVED` | `PATCH /scholarships/:id/approve` |
| `SYSTEM_SETTING_CHANGED` | `POST /system-settings`, `PATCH /system-settings/:key` |
| `LOGIN_SUCCESS` | `POST /auth/login`, `POST /auth/google` |
| `LOGIN_FAILED` | `POST /auth/login` (invalid credentials) |
| `PASSWORD_CHANGED` | `POST /auth/change-password` |
| `PASSWORD_RESET` | `POST /auth/reset-password` |
