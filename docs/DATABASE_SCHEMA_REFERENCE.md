# University Management — Database Schema Reference

This document explains every table in the University Management Prisma schema, field by
field, organized into the same **9 units** as the schema files themselves —
so you can open one `.prisma` file and its matching README section side by
side.

```
prisma/models/
├── 00-config.prisma            → generator + datasource
├── enums.prisma                → every enum, shared across units
├── 01-auth-users.prisma        → Unit 1: Users
├── 02-profiles.prisma          → Unit 2: Profiles
├── 03-organization.prisma      → Unit 3: Organization
├── 04-academic-catalog.prisma  → Unit 4: Academic Catalog
├── 05-academic-delivery.prisma → Unit 5: Academic Delivery
├── 06-student-academics.prisma → Unit 6: Student Academics
├── 07-finance.prisma           → Unit 7: Finance
├── 08-communication.prisma     → Unit 8: Communication
└── 09-system.prisma            → Unit 9: System
```

**Legend:** PK = Primary Key · FK = Foreign Key · Req = Required (non-null).
All primary keys are UUID strings (`@default(uuid())`) unless noted.

---

## Table of Contents

- [How Prisma Implements This (setup guide)](#how-prisma-implements-this-setup-guide)
- [Unit 1 — Users](#unit-1--users)
- [Unit 2 — Profiles](#unit-2--profiles)
- [Unit 3 — Organization](#unit-3--organization)
- [Unit 4 — Academic Catalog](#unit-4--academic-catalog)
- [Unit 5 — Academic Delivery](#unit-5--academic-delivery)
- [Unit 6 — Student Academics](#unit-6--student-academics)
- [Unit 7 — Finance](#unit-7--finance)
- [Unit 8 — Communication](#unit-8--communication)
- [Unit 9 — System](#unit-9--system)
- [Cross-Cutting: Indexing Strategy](#cross-cutting-indexing-strategy)
- [Cross-Cutting: Soft-Delete Strategy](#cross-cutting-soft-delete-strategy)
- [Cross-Cutting: RBAC & Authorization](#cross-cutting-rbac--authorization)

---

## How Prisma Implements This (setup guide)

University Management uses **Prisma's multi-file schema** feature: every file under
`prisma/schema/` is parsed and merged into a single logical schema, so models
in different files can reference each other directly (e.g. `Course` in Unit 4
can point at `Department` in Unit 3) with no extra configuration per file.

### 1. Point Prisma at the folder, not a single file

In `package.json`:

```json
{
  "prisma": {
    "schema": "prisma/schema"
  }
}
```

> Multi-file schemas are supported **natively from Prisma ORM 6.7+**. If your
> project is on an older 6.x version, add
> `previewFeatures = ["prismaSchemaFolder"]` to the `generator client` block
> in `00-config.prisma` instead. On Prisma 5.x, upgrade first — this feature
> was preview-only starting at 5.15 and is not worth relying on before that.

### 2. Install and generate

```bash
npm install prisma @prisma/client
npx prisma format      # formats every file in prisma/schema/
npx prisma validate    # validates the merged schema as one unit
```

### 3. Create the first migration

```bash
npx prisma migrate dev --name init
npx prisma generate
```

This creates one migration covering all 9 units — Prisma does not create
separate migrations per file; the file split is purely for human readability,
not a database-level boundary.

### 4. Environment

Set `DATABASE_URL` in `.env` to a PostgreSQL connection string before running
any command above:

```
DATABASE_URL="postgresql://user:password@localhost:5432/university-management"
```

### 5. Production deploy

```bash
npx prisma migrate deploy
npx prisma generate
```

### 6. Adding a new field or table later

Edit the `.prisma` file for the unit the change belongs to (e.g. a new
finance table goes in `07-finance.prisma`), then repeat step 3. You never
need to touch other unit files unless the new table relates to them.

---

## Unit 1 — Users

**File:** `01-auth-users.prisma`

### `User` (`users`)

The single authentication/identity record for **every** person in the
system, across all six roles. Role-specific data is deliberately kept out of
`User` and lives in Unit 2 instead — this is why: it keeps `User` small and
stable no matter which role it represents, and it means adding a new field
for one role (e.g. `mfaEnabled` for `SUPER_ADMIN`) never touches the table
every other role also depends on.

| Field | Type | Req | Why it's here |
|---|---|---|---|
| id | String (UUID) | ✓ | Primary key, stable identity across the app |
| name | String | ✓ | Display name |
| email | String | ✓ | Login identity — `@@unique` |
| password | String? | | Nullable because Google-OAuth accounts never set one |
| facultyId | String? | | Organizational scope — nullable, see rule below |
| departmentId | String? | | Organizational scope — nullable, see rule below |
| googleId | String? | | `@unique`, set only for OAuth sign-ups |
| authProvider | AuthProvider | ✓ | Distinguishes CREDENTIAL vs GOOGLE accounts |
| emailVerified | Boolean | ✓ | Gate for email-dependent flows (password reset, notices) |
| role | Role | ✓ | Exactly one business role — the backbone of authorization |
| permissions | Permission[] | ✓ | Fine-grained grants layered on `role` (see RBAC section) |
| isActive | Boolean | ✓ | Lets an account be disabled without deleting it |
| needPasswordChange | Boolean | ✓ | Forces reset after an admin-issued temporary password |
| isDeleted / deletedAt | Boolean / DateTime? | | Soft-delete pair — see Soft-Delete section |
| createdAt / updatedAt | DateTime | ✓ | Standard audit timestamps |

**Why `facultyId`/`departmentId` are nullable:** `SUPER_ADMIN`, `ADMIN`, and
`ACCOUNTANT` may be university-wide with no single faculty/department, while
`DEPARTMENT_HEAD` and `INSTRUCTOR` normally belong to exactly one department.
Postgres can't express "required for these roles only" — the service layer
enforces it.

**Relationships:**
- 1-1 with each Unit 2 profile table (exactly one should be populated,
  matching `role` — enforced at the service layer, since Prisma has no
  "exactly one of five relations" constraint).
- Belongs to `Faculty` / `Department` (Unit 3), nullable.
- Target of every "actor" foreign key elsewhere in the schema —
  `createdById`, `approvedById`, `verifiedById`, `markedById`,
  `submittedById`, `deanUserId`, `headUserId`, etc. — all grouped as named
  relations on `User` so the identity table stays the single place to see
  "everything this person has done."

**Business rules (enforced in application code, not by Postgres):**
- A user holds exactly one `role` — never model multi-role users with a
  join table. If responsibilities change, update `role` through an
  authorized role-change workflow.
- `User.role` must match exactly one populated `*Profile` relation.


**Prisma model:**

```prisma
model User {
  id                 String       @id @default(uuid())
  /// Full display name.
  name               String
  /// Login identity. Unique across the whole system regardless of role.
  email              String
  /// Null when the account was created via Google OAuth (authProvider = GOOGLE).
  password           String?
  /// Nullable organizational scope — see "Why nullable" note below.
  facultyId          String?
  departmentId       String?
  /// Google account identifier, set only for OAuth sign-ups.
  googleId           String?      @unique
  /// How this user authenticates. Drives whether `password` is expected.
  authProvider       AuthProvider @default(CREDENTIAL)
  emailVerified      Boolean      @default(false)
  /// Exactly one business role per user — never model multi-role users
  /// with a join table. If responsibilities change, update this value
  /// through an authorized role-change workflow instead.
  role               Role         @default(STUDENT)
  /// Fine-grained resource:action grants layered on top of `role`.
  /// SUPER_ADMIN governs this array for ADMIN users; every other role
  /// receives an application-defined default set at creation time.
  /// See docs/DATABASE_SCHEMA_README.md §11 (RBAC).
  permissions        Permission[]
  isActive           Boolean      @default(true)
  /// Forces a password reset on next login (e.g. after an admin-issued
  /// temporary password).
  needPasswordChange Boolean      @default(false)
  /// Soft-delete pair — see README §10. Historical relationships (grades,
  /// payments, audit trail) must survive a user being "removed".
  isDeleted          Boolean      @default(false)
  deletedAt          DateTime?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  // --------------------------------------------------------------------
  // Organizational scope
  // --------------------------------------------------------------------
  // Why nullable: SUPER_ADMIN, ADMIN, and ACCOUNTANT may be university-wide
  // (no single faculty/department), while DEPARTMENT_HEAD and INSTRUCTOR
  // normally belong to exactly one department. The service layer enforces
  // which roles require a non-null value.
  faculty    Faculty?    @relation("UserFaculty", fields: [facultyId], references: [id], onDelete: SetNull)
  department Department? @relation("UserDepartment", fields: [departmentId], references: [id], onDelete: SetNull)

  // --------------------------------------------------------------------
  // One-to-one role profiles
  // --------------------------------------------------------------------
  // Exactly one of these should be populated, matching `role` — enforced
  // at the service layer (Prisma cannot express "exactly one of five
  // relations is non-null" declaratively). See 02-profiles.prisma.
  superAdminProfile    SuperAdminProfile?
  adminProfile          AdminProfile?
  departmentHeadProfile DepartmentHeadProfile?
  instructorProfile     InstructorProfile?
  studentProfile        StudentProfile?
  accountantProfile     AccountantProfile?

  // --------------------------------------------------------------------
  // Organizational headships this user holds
  // --------------------------------------------------------------------
  deanOfFaculties   Faculty[]    @relation("FacultyDean")
  headOfDepartments Department[] @relation("DepartmentHead")

  // --------------------------------------------------------------------
  // Instructor course assignments
  // --------------------------------------------------------------------
  courseAssignments CourseInstructor[]
  classSchedules    ClassSchedule[]    @relation("InstructorClassSchedules")

  // --------------------------------------------------------------------
  // "Actor" relations — actions this user performed elsewhere in the
  // system. Grouped here once rather than duplicated per model, since
  // they all point back to the same User table.
  // --------------------------------------------------------------------
  approvedEnrollments   StudentEnrollment[]     @relation("EnrollmentApprovedBy")
  markedAttendance      Attendance[]            @relation("AttendanceMarkedBy")
  createdAssignments    Assignment[]            @relation("AssignmentCreatedBy")
  createdExams          Exam[]                  @relation("ExamCreatedBy")
  submittedResults      Result[]                @relation("ResultSubmittedBy")
  approvedResults       Result[]                @relation("ResultApprovedBy")
  verifiedPayments      Payment[]               @relation("PaymentVerifiedBy")
  approvedScholarships  Scholarship[]           @relation("ScholarshipApprovedBy")
  createdTransactions   FinancialTransaction[]  @relation("TransactionCreatedBy")
  createdNotices        Notice[]                @relation("NoticeCreatedBy")
  createdEvents         Event[]                 @relation("EventCreatedBy")
  updatedSystemSettings SystemSetting[]         @relation("SystemSettingUpdatedBy")
  auditLogEntries       AuditLog[]              @relation("AuditLogActor")

  @@unique([email])
  @@index([facultyId])
  @@index([departmentId])
  @@index([role])
  @@index([isActive])
  @@map("users")
}
```

---

## Unit 2 — Profiles

**File:** `02-profiles.prisma`

One table per role, each a strict 1-1 extension of `User` (`userId
@unique`). `onDelete: Cascade` on the `user` relation means deleting a
`User` also removes its profile row automatically.

### `SuperAdminProfile` (`super_admin_profiles`)

Kept **separate from `AdminProfile`** rather than shared, so
system-governance and security attributes never leak onto an ordinary
`ADMIN` account by accident, and so `SUPER_ADMIN`-only security posture can
evolve independently.

| Field | Type | Req | Why it's here |
|---|---|---|---|
| userId | String | ✓ | Unique FK back to the identity row |
| employeeId | String | ✓ | Internal staff identifier, unique |
| designation | String? | | Job title, e.g. "System Administrator" |
| phone | String? | | Contact number |
| mfaEnabled | Boolean | ✓ | The org-hierarchy design recommends MFA for privileged roles; this flag lets the backend enforce/report on it per account |
| ipWhitelist | String[] | ✓ | Optional allow-list of source IPs for privileged sign-in; empty array = no restriction |
| lastPrivilegedActionAt | DateTime? | | Supports security review/anomaly detection without scanning the full audit log |
| createdAt / updatedAt | DateTime | ✓ | |


**Prisma model:**

```prisma
/// Profile for SUPER_ADMIN users — the highest system authority. Kept
/// separate from AdminProfile (not shared) so system-governance/security
/// attributes never leak onto an ordinary ADMIN account by accident.
model SuperAdminProfile {
  id         String   @id @default(uuid())
  /// One SuperAdminProfile per User; also the FK back to the identity row.
  userId     String   @unique
  /// Internal staff/employee identifier for this super admin.
  employeeId String   @unique
  designation String?
  phone      String?
  /// Whether multi-factor auth is enabled for this account. SUPER_ADMIN
  /// carries system-wide authority, so the org hierarchy design
  /// recommends MFA for privileged roles — this flag lets the backend
  /// enforce/report on that requirement per account.
  mfaEnabled Boolean  @default(false)
  /// Optional allow-list of source IPs this account may authenticate from.
  /// Supports the "IP/device controls where appropriate" recommendation
  /// for privileged accounts; empty array = no restriction.
  ipWhitelist String[]
  /// Timestamp of the most recent privileged/sensitive action, useful for
  /// security review and anomaly detection without scanning the full
  /// audit log.
  lastPrivilegedActionAt DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("super_admin_profiles")
}
```

### `AdminProfile` (`admin_profiles`)

Profile for `ADMIN` users only (the university-wide operational
administrator) — `SUPER_ADMIN` no longer shares this table.

| Field | Type | Req | Why it's here |
|---|---|---|---|
| userId | String | ✓ | Unique FK to User |
| employeeId | String | ✓ | Unique staff identifier |
| designation | String? | | Job title |
| phone | String? | | Contact number |


**Prisma model:**

```prisma
/// Profile for ADMIN users — the university-wide operational administrator.
model AdminProfile {
  id          String   @id @default(uuid())
  userId      String   @unique
  employeeId  String   @unique
  designation String?
  phone       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("admin_profiles")
}
```

### `DepartmentHeadProfile` (`department_head_profiles`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| userId | String | ✓ | Unique FK to User |
| employeeId | String | ✓ | Unique staff identifier |
| designation | String? | | |
| appointedAt | DateTime? | | When this person became department head |
| phone / officeRoom | String? | | |

The department scope itself is **not** stored here — it lives on
`User.departmentId` / `Department.headUserId` (Unit 3), so this table only
holds HR-style attributes.


**Prisma model:**

```prisma
/// Profile for DEPARTMENT_HEAD users. The actual department scope is
/// authoritative on User.departmentId / Department.headUserId (Unit 3) —
/// this table only holds the person's HR-style attributes.
model DepartmentHeadProfile {
  id          String    @id @default(uuid())
  userId      String    @unique
  employeeId  String    @unique
  designation String?
  /// When this person was appointed department head.
  appointedAt DateTime?
  phone       String?
  officeRoom  String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("department_head_profiles")
}
```

### `InstructorProfile` (`instructor_profiles`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| userId | String | ✓ | Unique FK to User |
| employeeId | String | ✓ | Unique staff identifier |
| designation / specialization / qualification | String? | | Academic background fields |
| joiningDate | DateTime? | | |
| phone / officeRoom | String? | | |
| employmentStatus | EmploymentStatus | ✓ default `ACTIVE` | Drives whether new course assignments (Unit 4) should be allowed |


**Prisma model:**

```prisma
/// Profile for INSTRUCTOR users.
model InstructorProfile {
  id               String           @id @default(uuid())
  userId           String           @unique
  employeeId       String           @unique
  designation      String?
  specialization   String?
  qualification    String?
  joiningDate      DateTime?
  phone            String?
  officeRoom       String?
  /// Current employment status — drives whether new course assignments
  /// (Unit 4: CourseInstructor) should be allowed.
  employmentStatus EmploymentStatus @default(ACTIVE)
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("instructor_profiles")
}
```

### `StudentProfile` (`student_profiles`)

The hub every academic and financial relation is keyed off — Units 6 and 7
relate to `StudentProfile.id`, **never** directly to `User.id`, so history
survives even if identity fields on `User` change later.

| Field | Type | Req | Why it's here |
|---|---|---|---|
| userId | String | ✓ | Unique FK to User |
| studentId | String | ✓ | Unique human-facing ID (ID card, transcript) — distinct from the internal UUID |
| programId | String | ✓ | FK → Program (Unit 3), `Restrict` |
| admissionDate / dateOfBirth | DateTime? | | |
| gender | Gender? | | |
| phone / address / bloodGroup | String? | | |
| guardianName / guardianPhone | String? | | |
| academicStatus | StudentAcademicStatus | ✓ default `ACTIVE` | Drives enrollment/registration eligibility |
| currentSemesterNo | Int? | | |

**Relationships:** parent of `StudentEnrollment`, `Attendance`,
`AssignmentSubmission`, `Grade`, `Result` (Unit 6), `Invoice`, `Payment`,
`Scholarship`, `FinancialTransaction` (Unit 7).


**Prisma model:**

```prisma
/// Profile for STUDENT users — the hub every academic and financial
/// relation is keyed off (Units 6 and 7 relate to StudentProfile.id,
/// never directly to User.id, so that history survives identity changes).
model StudentProfile {
  id                String                @id @default(uuid())
  userId            String                @unique
  /// Human-facing student ID (what appears on ID cards, transcripts, etc.)
  /// — distinct from the internal `id`/`userId` UUIDs.
  studentId         String                @unique
  programId         String
  admissionDate     DateTime?
  dateOfBirth       DateTime?
  gender            Gender?
  phone             String?
  address           String?
  bloodGroup        String?
  guardianName      String?
  guardianPhone     String?
  /// Academic standing — drives enrollment/registration eligibility.
  academicStatus    StudentAcademicStatus @default(ACTIVE)
  currentSemesterNo Int?
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  program Program @relation(fields: [programId], references: [id], onDelete: Restrict)

  enrollments           StudentEnrollment[]
  attendanceRecords     Attendance[]
  assignmentSubmissions AssignmentSubmission[]
  grades                Grade[]
  results               Result[]
  invoices              Invoice[]
  payments              Payment[]
  scholarships          Scholarship[]
  financialTransactions FinancialTransaction[]

  @@index([programId])
  @@map("student_profiles")
}
```

### `AccountantProfile` (`accountant_profiles`)

Kept isolated by design — no relation from this profile touches grades,
attendance, or course data (see Unit 7).

| Field | Type | Req | Why it's here |
|---|---|---|---|
| userId | String | ✓ | Unique FK to User |
| employeeId | String | ✓ | Unique staff identifier |
| designation | String? | | |
| joiningDate | DateTime? | | |
| phone / officeRoom | String? | | |
| employmentStatus | EmploymentStatus | ✓ default `ACTIVE` | |


**Prisma model:**

```prisma
/// Profile for ACCOUNTANT users — kept isolated from academic tables by
/// design (see Unit 7 Finance — no relation from this profile to grades,
/// attendance, or course data).
model AccountantProfile {
  id               String           @id @default(uuid())
  userId           String           @unique
  employeeId       String           @unique
  designation      String?
  joiningDate      DateTime?
  phone            String?
  officeRoom       String?
  employmentStatus EmploymentStatus @default(ACTIVE)
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("accountant_profiles")
}
```

### Role ↔ Profile Mapping

| `User.role` | Profile table |
|---|---|
| `SUPER_ADMIN` | `SuperAdminProfile` |
| `ADMIN` | `AdminProfile` |
| `DEPARTMENT_HEAD` | `DepartmentHeadProfile` |
| `INSTRUCTOR` | `InstructorProfile` |
| `STUDENT` | `StudentProfile` |
| `ACCOUNTANT` | `AccountantProfile` |

---

## Unit 3 — Organization

**File:** `03-organization.prisma`

The university's structural hierarchy: `Faculty` → `Department` → `Program`.
Every Unit 4/5 table ultimately traces back to a `Department`, which is how
department-scoped authorization (`DEPARTMENT_HEAD`) is enforced.

### `Faculty` (`faculties`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| code | String | ✓ | Unique short code |
| name | String | ✓ | e.g. "Faculty of Engineering" |
| description | String? | | |
| deanUserId | String? | | The user acting as dean — no dedicated `DEAN` role exists (project decision); deanship is an assignment on top of an existing user, typically `ADMIN` |
| isActive / isDeleted / deletedAt | | | See Soft-Delete section |

**Relationships:** 1-N `Department`, 1-N `User` (via `User.facultyId`), 1-N
`Notice`, 1-N `Event` (Unit 8).


**Prisma model:**

```prisma
/// Top-level academic organizational unit (e.g. "Faculty of Engineering").
model Faculty {
  id          String    @id @default(uuid())
  code        String    @unique
  name        String
  description String?
  /// The user acting as dean. No dedicated DEAN role exists in this system
  /// (per project decision) — deanship is just an assignment on top of an
  /// existing user (typically an ADMIN).
  deanUserId  String?
  isActive    Boolean   @default(true)
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  dean        User?        @relation("FacultyDean", fields: [deanUserId], references: [id], onDelete: SetNull)
  departments Department[]
  users       User[]       @relation("UserFaculty")
  notices     Notice[]
  events      Event[]

  @@index([deanUserId])
  @@map("faculties")
}
```

### `Department` (`departments`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| facultyId | String | ✓ | FK → Faculty, `Restrict` — deleting a Faculty with departments is blocked so history is never orphaned |
| code | String | ✓ | Unique short code |
| name | String | ✓ | e.g. "Department of CSE" |
| description | String? | | |
| headUserId | String? | | The user acting as department head — service layer must verify `role = DEPARTMENT_HEAD` and `User.departmentId = this department` |
| isActive / isDeleted / deletedAt | | | |

**Relationships:** 1-N `User`, `Program`, `Course` (Unit 4), `Notice`,
`Event` (Unit 8).


**Prisma model:**

```prisma
/// A department within a Faculty (e.g. "Department of CSE"). Deleting a
/// Faculty that still has departments is blocked (`onDelete: Restrict`)
/// so academic history is never silently orphaned.
model Department {
  id          String    @id @default(uuid())
  facultyId   String
  code        String    @unique
  name        String
  description String?
  /// The user acting as department head. Service layer must verify this
  /// user's role = DEPARTMENT_HEAD and User.departmentId = this department.
  headUserId  String?
  isActive    Boolean   @default(true)
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  faculty Faculty @relation(fields: [facultyId], references: [id], onDelete: Restrict)
  head    User?   @relation("DepartmentHead", fields: [headUserId], references: [id], onDelete: SetNull)

  users    User[]    @relation("UserDepartment")
  programs Program[]
  courses  Course[]
  notices  Notice[]
  events   Event[]

  @@index([facultyId])
  @@index([headUserId])
  @@map("departments")
}
```

### `Program` (`programs`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| departmentId | String | ✓ | FK → Department, `Restrict` |
| code | String | ✓ | Unique short code |
| name | String | ✓ | e.g. "BSc in CSE" |
| degreeType | DegreeType | ✓ | CERTIFICATE / DIPLOMA / BACHELOR / MASTER / PHD |
| durationYears | Int | ✓ | |
| totalCredits | Int | ✓ | |
| description | String? | | |
| isActive / isDeleted / deletedAt | | | |

**Relationships:** 1-N `Course` (Unit 4), 1-N `StudentProfile` (Unit 2).


**Prisma model:**

```prisma
/// An academic degree program (e.g. "BSc in CSE"), owned by a Department.
model Program {
  id            String    @id @default(uuid())
  departmentId  String
  code          String    @unique
  name          String
  degreeType    DegreeType
  durationYears Int
  totalCredits  Int
  description   String?
  isActive      Boolean   @default(true)
  isDeleted     Boolean   @default(false)
  deletedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  department Department @relation(fields: [departmentId], references: [id], onDelete: Restrict)

  courses  Course[]
  students StudentProfile[]

  @@index([departmentId])
  @@map("programs")
}
```

---

## Unit 4 — Academic Catalog

**File:** `04-academic-catalog.prisma`

The reusable "what can be taught" layer: `Subject` (definition) → `Course`
(a subject offered under a department/program) → `CourseInstructor` (who
teaches it). *When/where* a course actually runs is Unit 5.

### `Subject` (`subjects`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| code | String | ✓ | Unique catalog code, e.g. "CSE101" |
| title | String | ✓ | e.g. "Introduction to Programming" |
| description | String? | | |
| subjectType | SubjectType | ✓ default `CORE` | CORE / ELECTIVE / LAB / THESIS / INTERNSHIP |
| credit | Int | ✓ | |
| isActive / isDeleted / deletedAt | | | |

Kept separate from `Course` so the same subject definition can be reused
across multiple course offerings without duplicating it.


**Prisma model:**

```prisma
/// A reusable academic subject definition (e.g. "CSE101 — Introduction to
/// Programming"), independent of which department/program currently offers
/// it. Kept separate from Course so the same subject can be reused across
/// multiple course offerings without duplicating its definition.
model Subject {
  id          String      @id @default(uuid())
  code        String      @unique
  title       String
  description String?
  subjectType SubjectType @default(CORE)
  credit      Int
  isActive    Boolean     @default(true)
  isDeleted   Boolean     @default(false)
  deletedAt   DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  courses Course[]

  @@map("subjects")
}
```

### `Course` (`courses`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| departmentId | String | ✓ | FK → Department, `Restrict` |
| programId | String | ✓ | FK → Program, `Restrict` |
| subjectId | String | ✓ | FK → Subject, `Restrict` |
| code | String | ✓ | Unique offering code |
| title | String | ✓ | |
| description | String? | | |
| credit | Int | ✓ | |
| level | Int? | | Optional year/level indicator |
| isActive / isDeleted / deletedAt | | | |

**Relationships:** N-N with `User` (instructors) via `CourseInstructor`;
1-N `Section` (Unit 5).


**Prisma model:**

```prisma
/// A Subject as offered under a specific Department/Program. This is what
/// students enroll in (through Section, Unit 5) and instructors are
/// assigned to (through CourseInstructor below).
model Course {
  id           String    @id @default(uuid())
  departmentId String
  programId    String
  subjectId    String
  code         String    @unique
  title        String
  description  String?
  credit       Int
  level        Int?
  isActive     Boolean   @default(true)
  isDeleted    Boolean   @default(false)
  deletedAt    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  department Department @relation(fields: [departmentId], references: [id], onDelete: Restrict)
  program    Program    @relation(fields: [programId], references: [id], onDelete: Restrict)
  subject    Subject    @relation(fields: [subjectId], references: [id], onDelete: Restrict)

  instructors CourseInstructor[]
  sections    Section[]

  @@index([departmentId])
  @@index([programId])
  @@index([subjectId])
  @@map("courses")
}
```

### `CourseInstructor` (`course_instructors`)

The many-to-many join between `Course` and instructor (`User`). **This is
the single source of truth for instructor authorization** — an instructor
may act on a course/section only if a row exists here; the backend must
always check it before allowing attendance, grading, or result-submission
actions.

| Field | Type | Req | Why it's here |
|---|---|---|---|
| courseId | String | ✓ | Composite PK part, FK → Course, `Cascade` |
| instructorId | String | ✓ | Composite PK part, FK → User, `Cascade` |
| isPrimary | Boolean | ✓ default `false` | Marks the lead instructor for co-taught courses |
| assignedAt | DateTime | ✓ default `now()` | |

`@@id([courseId, instructorId])` — no surrogate `id`, since the pair is
already a natural unique key.


**Prisma model:**

```prisma
/// Many-to-many join between Course and instructor (User). This table is
/// the single source of truth for instructor authorization: an instructor
/// may act on a course/section only if a row exists here for them — the
/// backend must always check this before allowing attendance, grading,
/// or result-submission actions.
model CourseInstructor {
  courseId     String
  instructorId String
  /// Marks the lead instructor when a course has multiple assigned
  /// instructors (e.g. for co-teaching or lab sections).
  isPrimary    Boolean  @default(false)
  assignedAt   DateTime @default(now())

  course     Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  instructor User   @relation(fields: [instructorId], references: [id], onDelete: Cascade)

  @@id([courseId, instructorId])
  @@index([instructorId])
  @@map("course_instructors")
}
```

---

## Unit 5 — Academic Delivery

**File:** `05-academic-delivery.prisma`

The "when/where a course runs" layer: `AcademicSession` (year) →
`Semester` (term) → `Section` (a specific run of a `Course` in a
`Semester`) → `ClassSchedule` (its weekly time slots). Students enroll into
**Sections**, not Courses directly — see Unit 6.

### `AcademicSession` (`academic_sessions`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| code | String | ✓ | Unique, e.g. "2026-2027" |
| name | String | ✓ | |
| startDate / endDate | DateTime | ✓ | |
| isCurrent | Boolean | ✓ default `false` | App should keep exactly one session flagged true |
| isActive | Boolean | ✓ default `true` | |

**Relationships:** 1-N `Semester`.


**Prisma model:**

```prisma
/// A university academic year (e.g. "2026-2027"), containing one or more
/// Semesters.
model AcademicSession {
  id        String   @id @default(uuid())
  code      String   @unique
  name      String
  startDate DateTime
  endDate   DateTime
  /// Marks the session currently in progress — the application should
  /// keep exactly one session flagged true at a time.
  isCurrent Boolean  @default(false)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  semesters Semester[]

  @@map("academic_sessions")
}
```

### `Semester` (`semesters`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| academicSessionId | String | ✓ | FK → AcademicSession, `Restrict` |
| name | String | ✓ | e.g. "Spring 2026" |
| term | SemesterTerm | ✓ | SPRING / SUMMER / FALL / WINTER |
| startDate / endDate | DateTime | ✓ | |
| isCurrent / isActive | Boolean | ✓ | |

**Relationships:** 1-N `Section`.


**Prisma model:**

```prisma
/// A term within an AcademicSession (e.g. "Spring 2026").
model Semester {
  id                String       @id @default(uuid())
  academicSessionId String
  name              String
  term              SemesterTerm
  startDate         DateTime
  endDate           DateTime
  isCurrent         Boolean      @default(false)
  isActive          Boolean      @default(true)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  academicSession AcademicSession @relation(fields: [academicSessionId], references: [id], onDelete: Restrict)

  sections Section[]

  @@index([academicSessionId])
  @@map("semesters")
}
```

### `Section` (`sections`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| courseId | String | ✓ | FK → Course, `Restrict` |
| semesterId | String | ✓ | FK → Semester, `Restrict` |
| code | String | ✓ | Short label for parallel sections (e.g. "A", "B") |
| name | String? | | |
| capacity | Int? | | |
| room | String? | | |
| isActive | Boolean | ✓ default `true` | |

`@@unique([courseId, semesterId, code])` — one section code per course per
semester.

**Relationships:** parent of `ClassSchedule`, `StudentEnrollment`,
`Attendance`, `Assignment`, `Exam`, `Result` (Unit 6), `Notice` (Unit 8,
scope = SECTION).


**Prisma model:**

```prisma
/// A specific offering of a Course within a Semester — what students
/// actually enroll in and what instructors, attendance, assignments,
/// exams, and results are all recorded against.
model Section {
  id         String   @id @default(uuid())
  courseId   String
  semesterId String
  /// Short label distinguishing parallel sections of the same course in
  /// the same semester (e.g. "A", "B").
  code       String
  name       String?
  capacity   Int?
  room       String?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  course   Course   @relation(fields: [courseId], references: [id], onDelete: Restrict)
  semester Semester @relation(fields: [semesterId], references: [id], onDelete: Restrict)

  classSchedules ClassSchedule[]
  enrollments    StudentEnrollment[]
  attendance     Attendance[]
  assignments    Assignment[]
  exams          Exam[]
  results        Result[]
  notices        Notice[]

  // One section code per course per semester — prevents duplicate "Section A"
  // rows for the same course/semester pair.
  @@unique([courseId, semesterId, code])
  @@index([courseId])
  @@index([semesterId])
  @@map("sections")
}
```

### `ClassSchedule` (`class_schedules`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| sectionId | String | ✓ | FK → Section, `Cascade` |
| instructorId | String | ✓ | FK → User, `Restrict` |
| dayOfWeek | DayOfWeek | ✓ | |
| startTime / endTime | DateTime | ✓ | |
| room | String? | | |


**Prisma model:**

```prisma
/// A recurring weekly class time slot for a Section.
model ClassSchedule {
  id           String    @id @default(uuid())
  sectionId    String
  instructorId String
  dayOfWeek    DayOfWeek
  startTime    DateTime
  endTime      DateTime
  room         String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  section    Section @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  instructor User    @relation("InstructorClassSchedules", fields: [instructorId], references: [id], onDelete: Restrict)

  @@index([sectionId])
  @@index([instructorId])
  @@map("class_schedules")
}
```

---

## Unit 6 — Student Academics

**File:** `06-student-academics.prisma`

Everything a student does inside a `Section`: enroll, attend, submit
assignments, sit exams, and receive grades/results. All student FKs point
at `StudentProfile.id` (Unit 2), never directly at `User.id`.

### `StudentEnrollment` (`student_enrollments`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| studentId | String | ✓ | FK → StudentProfile, `Cascade` |
| sectionId | String | ✓ | FK → Section, `Cascade` |
| status | EnrollmentStatus | ✓ default `PENDING` | PENDING / APPROVED / REJECTED / DROPPED / COMPLETED |
| requestedAt | DateTime | ✓ default `now()` | |
| approvedAt | DateTime? | | |
| approvedById | String? | | The `DEPARTMENT_HEAD`/`ADMIN` who approved/rejected — a student can never set their own status to `APPROVED` |

`@@unique([studentId, sectionId])` — one enrollment row per student per
section.


**Prisma model:**

```prisma
/// A student's request/membership in a Section — a many-to-many
/// student↔section relation carried through an approval workflow.
model StudentEnrollment {
  id           String           @id @default(uuid())
  studentId    String
  sectionId    String
  status       EnrollmentStatus @default(PENDING)
  requestedAt  DateTime         @default(now())
  approvedAt   DateTime?
  /// The DEPARTMENT_HEAD/ADMIN who approved or rejected this request.
  /// A student can never set their own status to APPROVED.
  approvedById String?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  student    StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)
  section    Section        @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  approvedBy User?          @relation("EnrollmentApprovedBy", fields: [approvedById], references: [id], onDelete: SetNull)

  // A student can only have one enrollment row per section.
  @@unique([studentId, sectionId])
  @@index([studentId])
  @@index([sectionId])
  @@map("student_enrollments")
}
```

### `Attendance` (`attendance`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| studentId | String | ✓ | FK → StudentProfile, `Cascade` |
| sectionId | String | ✓ | FK → Section, `Cascade` |
| date | DateTime | ✓ | |
| status | AttendanceStatus | ✓ | PRESENT / ABSENT / LATE / EXCUSED |
| markedById | String | ✓ | The instructor who marked it — must be assigned via `CourseInstructor` (Unit 4), enforced in the service layer |
| remarks | String? | | |

`@@unique([studentId, sectionId, date])` prevents duplicate attendance rows.


**Prisma model:**

```prisma
/// A single day's attendance record for a student in a Section.
model Attendance {
  id         String           @id @default(uuid())
  studentId  String
  sectionId  String
  date       DateTime
  status     AttendanceStatus
  /// The instructor who marked this attendance record — must be assigned
  /// to the section via CourseInstructor (Unit 4), enforced in the
  /// service layer.
  markedById String
  remarks    String?
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  student  StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)
  section  Section        @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  markedBy User           @relation("AttendanceMarkedBy", fields: [markedById], references: [id], onDelete: Restrict)

  // Prevents duplicate attendance rows for the same student/section/day.
  @@unique([studentId, sectionId, date])
  @@index([studentId])
  @@index([sectionId])
  @@index([date])
  @@map("attendance")
}
```

### `Assignment` (`assignments`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| sectionId | String | ✓ | FK → Section, `Cascade` |
| createdById | String | ✓ | FK → User, `Restrict` |
| title | String | ✓ | |
| description | String? | | |
| dueDate | DateTime | ✓ | |
| totalMarks | Int | ✓ | |
| status | AssignmentStatus | ✓ default `DRAFT` | DRAFT / PUBLISHED / CLOSED |


**Prisma model:**

```prisma
/// An assignment created by an instructor for a Section.
model Assignment {
  id          String           @id @default(uuid())
  sectionId   String
  createdById String
  title       String
  description String?
  dueDate     DateTime
  totalMarks  Int
  status      AssignmentStatus @default(DRAFT)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  section   Section @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  createdBy User    @relation("AssignmentCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)

  submissions AssignmentSubmission[]

  @@index([sectionId])
  @@index([createdById])
  @@map("assignments")
}
```

### `AssignmentSubmission` (`assignment_submissions`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| assignmentId | String | ✓ | FK → Assignment, `Cascade` |
| studentId | String | ✓ | FK → StudentProfile, `Cascade` |
| submittedAt | DateTime | ✓ default `now()` | |
| contentUrl / contentText | String? | | At least one expected in practice |
| marks | Int? | | |
| feedback | String? | | |
| status | SubmissionStatus | ✓ default `SUBMITTED` | SUBMITTED / LATE / GRADED / RESUBMIT_REQUIRED |

`@@unique([assignmentId, studentId])` — one row per student per assignment;
a resubmission updates this same row.


**Prisma model:**

```prisma
/// A student's submission for an Assignment.
model AssignmentSubmission {
  id           String           @id @default(uuid())
  assignmentId String
  studentId    String
  submittedAt  DateTime         @default(now())
  /// At least one of contentUrl/contentText is expected in practice
  /// (a file link or inline text answer).
  contentUrl   String?
  contentText  String?
  marks        Int?
  feedback     String?
  status       SubmissionStatus @default(SUBMITTED)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  assignment Assignment     @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  student    StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)

  // One submission row per student per assignment. A resubmission
  // updates this same row rather than creating a new one.
  @@unique([assignmentId, studentId])
  @@index([studentId])
  @@map("assignment_submissions")
}
```

### `Exam` (`exams`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| sectionId | String | ✓ | FK → Section, `Cascade` |
| title | String | ✓ | |
| examType | ExamType | ✓ | QUIZ / MIDTERM / FINAL / CLASS_TEST / PRACTICAL / VIVA / OTHER |
| examDate | DateTime | ✓ | |
| totalMarks | Int | ✓ | |
| createdById | String | ✓ | FK → User, `Restrict` |


**Prisma model:**

```prisma
/// An exam scheduled for a Section (quiz, midterm, final, etc.).
model Exam {
  id          String   @id @default(uuid())
  sectionId   String
  title       String
  examType    ExamType
  examDate    DateTime
  totalMarks  Int
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  section   Section @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  createdBy User    @relation("ExamCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)

  grades Grade[]

  @@index([sectionId])
  @@index([createdById])
  @@map("exams")
}
```

### `Grade` (`grades`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| examId | String | ✓ | FK → Exam, `Cascade` |
| studentId | String | ✓ | FK → StudentProfile, `Cascade` |
| marks | Float | ✓ | |
| gradeLetter | String? | | |
| gradePoint | Float? | | |
| remarks | String? | | |

`@@unique([examId, studentId])`.


**Prisma model:**

```prisma
/// A student's marks for one Exam.
model Grade {
  id          String   @id @default(uuid())
  examId      String
  studentId   String
  marks       Float
  gradeLetter String?
  gradePoint  Float?
  remarks     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  exam    Exam           @relation(fields: [examId], references: [id], onDelete: Cascade)
  student StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([examId, studentId])
  @@index([studentId])
  @@map("grades")
}
```

### `Result` (`results`)

A student's final result for a `Section`, carried through an approval
workflow.

| Field | Type | Req | Why it's here |
|---|---|---|---|
| studentId | String | ✓ | FK → StudentProfile, `Cascade` |
| sectionId | String | ✓ | FK → Section, `Cascade` |
| totalMarks / gradeLetter / gradePoint | nullable | | Filled in as the workflow progresses |
| status | ResultStatus | ✓ default `DRAFT` | DRAFT / SUBMITTED / REJECTED / APPROVED / PUBLISHED |
| submittedById | String? | | The instructor who submitted |
| submittedAt | DateTime? | | |
| approvedById | String? | | The department head who approved — deliberately a **separate field** from `submittedById` so the same person can never fill both roles (separation of duties) |
| approvedAt | DateTime? | | |
| publishedAt | DateTime? | | |

`@@unique([studentId, sectionId])`.

**Workflow (state machine — enforced in the service layer, not by
Postgres):**

```
DRAFT (instructor) → SUBMITTED (instructor submits)
   → APPROVED / REJECTED (department head)
   → PUBLISHED (system / authorized publisher)
   → STUDENT reads only after PUBLISHED
```


**Prisma model:**

```prisma
/// A student's final result for a Section, carried through an approval
/// workflow: INSTRUCTOR submits → DEPARTMENT_HEAD approves/rejects →
/// PUBLISHED → STUDENT reads. `submittedById` and `approvedById` are
/// deliberately separate fields so the same person can never fill both
/// roles for one Result row (separation of duties).
model Result {
  id            String       @id @default(uuid())
  studentId     String
  sectionId     String
  totalMarks    Float?
  gradeLetter   String?
  gradePoint    Float?
  status        ResultStatus @default(DRAFT)
  submittedById String?
  submittedAt   DateTime?
  approvedById  String?
  approvedAt    DateTime?
  publishedAt   DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  student     StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)
  section     Section        @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  submittedBy User?          @relation("ResultSubmittedBy", fields: [submittedById], references: [id], onDelete: SetNull)
  approvedBy  User?          @relation("ResultApprovedBy", fields: [approvedById], references: [id], onDelete: SetNull)

  @@unique([studentId, sectionId])
  @@index([studentId])
  @@index([sectionId])
  @@index([status])
  @@map("results")
}
```

---

## Unit 7 — Finance

**File:** `07-finance.prisma`

Billing and payment tables, isolated from academic authority — no relation
here touches grades, attendance, or course data, matching the project rule
that `ACCOUNTANT` users should never need write access outside this unit.

**Money rule:** every monetary column is `Decimal @db.Decimal(12, 2)` —
never `Float` or `String`. This is a hard project rule after a prior
Prisma/Stripe bug came from storing an amount as a string.

### `Invoice` (`invoices`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| studentId | String | ✓ | FK → StudentProfile, `Restrict` |
| invoiceNumber | String | ✓ | Unique billing reference |
| description | String? | | |
| amount | Decimal(12,2) | ✓ | |
| dueDate | DateTime | ✓ | |
| status | InvoiceStatus | ✓ default `UNPAID` | UNPAID / PARTIALLY_PAID / PAID / OVERDUE / CANCELLED |


**Prisma model:**

```prisma
/// A billable charge issued to a student.
model Invoice {
  id            String        @id @default(uuid())
  studentId     String
  invoiceNumber String        @unique
  description   String?
  amount        Decimal       @db.Decimal(12, 2)
  dueDate       DateTime
  status        InvoiceStatus @default(UNPAID)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  student StudentProfile @relation(fields: [studentId], references: [id], onDelete: Restrict)

  payments     Payment[]
  transactions FinancialTransaction[]

  @@index([studentId])
  @@index([status])
  @@map("invoices")
}
```

### `Payment` (`payments`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| invoiceId | String | ✓ | FK → Invoice, `Restrict` |
| studentId | String | ✓ | FK → StudentProfile, `Restrict` |
| amount | Decimal(12,2) | ✓ | |
| method | PaymentMethod | ✓ | CASH / CARD / BANK_TRANSFER / MOBILE_BANKING / ONLINE_GATEWAY / OTHER |
| transactionId | String? | | Unique gateway reference — used to reconcile without trusting client-supplied status |
| status | PaymentStatus | ✓ default `PENDING` | PENDING / SUCCESS / FAILED / REFUNDED |
| verifiedById | String? | | The `ACCOUNTANT` who verified/reconciled |
| verifiedAt / paidAt | DateTime? | | |

**Business rule:** payment status must be driven by verified gateway/webhook
data, never trusted directly from the client — a student can create a
payment but can never set `verifiedById` or `status = SUCCESS` themselves.


**Prisma model:**

```prisma
/// A payment made by a student against an Invoice. Status must be driven
/// by verified gateway/webhook data, never trusted directly from the
/// client — a student can create a payment but can never set
/// `verifiedById`/`status = SUCCESS` themselves.
model Payment {
  id            String        @id @default(uuid())
  invoiceId     String
  studentId     String
  amount        Decimal       @db.Decimal(12, 2)
  method        PaymentMethod
  /// Payment gateway's own reference — used to reconcile without trusting
  /// client-supplied status.
  transactionId String?       @unique
  status        PaymentStatus @default(PENDING)
  /// The ACCOUNTANT who verified/reconciled this payment.
  verifiedById  String?
  verifiedAt    DateTime?
  paidAt        DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  invoice    Invoice        @relation(fields: [invoiceId], references: [id], onDelete: Restrict)
  student    StudentProfile @relation(fields: [studentId], references: [id], onDelete: Restrict)
  verifiedBy User?          @relation("PaymentVerifiedBy", fields: [verifiedById], references: [id], onDelete: SetNull)

  transactions FinancialTransaction[]

  @@index([invoiceId])
  @@index([studentId])
  @@index([status])
  @@map("payments")
}
```

### `Scholarship` (`scholarships`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| studentId | String | ✓ | FK → StudentProfile, `Restrict` |
| name | String | ✓ | |
| amount | Decimal(12,2) | ✓ | |
| status | ScholarshipStatus | ✓ default `APPLIED` | APPLIED / APPROVED / REJECTED / DISBURSED |
| appliedAt | DateTime | ✓ default `now()` | |
| approvedById | String? | | |
| approvedAt | DateTime? | | |


**Prisma model:**

```prisma
/// A scholarship award applied to a student's account.
model Scholarship {
  id           String            @id @default(uuid())
  studentId    String
  name         String
  amount       Decimal           @db.Decimal(12, 2)
  status       ScholarshipStatus @default(APPLIED)
  appliedAt    DateTime          @default(now())
  approvedById String?
  approvedAt   DateTime?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  student    StudentProfile @relation(fields: [studentId], references: [id], onDelete: Restrict)
  approvedBy User?          @relation("ScholarshipApprovedBy", fields: [approvedById], references: [id], onDelete: SetNull)

  @@index([studentId])
  @@map("scholarships")
}
```

### `FinancialTransaction` (`financial_transactions`)

Append-only ledger. **Never delete or edit rows here** — corrections are
modeled as new `ADJUSTMENT`/`REFUND` rows, never mutations of history. No
`updatedAt` field on purpose — this table is write-once.

| Field | Type | Req | Why it's here |
|---|---|---|---|
| studentId | String | ✓ | FK → StudentProfile, `Restrict` |
| invoiceId | String? | | FK → Invoice, `SetNull` |
| paymentId | String? | | FK → Payment, `SetNull` |
| type | FinancialTransactionType | ✓ | INVOICE_CHARGE / PAYMENT_RECEIVED / REFUND / ADJUSTMENT / SCHOLARSHIP_CREDIT |
| amount | Decimal(12,2) | ✓ | |
| reference / description | String? | | |
| createdById | String? | | |
| createdAt | DateTime | ✓ | No `updatedAt` — immutable |


**Prisma model:**

```prisma
/// Append-only financial ledger. Never delete or edit rows here —
/// corrections must be modeled as new ADJUSTMENT/REFUND rows, not
/// mutations of history. No `updatedAt` on purpose: this table is
/// write-once.
model FinancialTransaction {
  id          String                   @id @default(uuid())
  studentId   String
  invoiceId   String?
  paymentId   String?
  type        FinancialTransactionType
  amount      Decimal                  @db.Decimal(12, 2)
  reference   String?
  description String?
  createdById String?
  createdAt   DateTime                 @default(now())

  student   StudentProfile @relation(fields: [studentId], references: [id], onDelete: Restrict)
  invoice   Invoice?       @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  payment   Payment?       @relation(fields: [paymentId], references: [id], onDelete: SetNull)
  createdBy User?          @relation("TransactionCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  @@index([studentId])
  @@index([invoiceId])
  @@index([paymentId])
  @@map("financial_transactions")
}
```

---

## Unit 8 — Communication

**File:** `08-communication.prisma`

University-wide and scoped announcements. Both models use a `scope` enum
plus optional foreign keys so one table represents every scope level
without needing a separate table per level.

### `Notice` (`notices`)

| Field | Type | Req | Why it's here |
|---|---|---|---|
| title | String | ✓ | |
| content | String | ✓ | |
| scope | NoticeScope | ✓ | UNIVERSITY / FACULTY / DEPARTMENT / SECTION |
| facultyId / departmentId / sectionId | String? | | Exactly the ID matching `scope` should be set — enforced at the service layer |
| createdById | String | ✓ | FK → User, `Restrict` |
| isPublished | Boolean | ✓ default `false` | |
| publishedAt | DateTime? | | |


**Prisma model:**

```prisma
/// A notice published at a University/Faculty/Department/Section scope.
/// The service layer must ensure exactly the ID matching `scope` is
/// populated — e.g. UNIVERSITY → none set, FACULTY → facultyId set,
/// SECTION → sectionId set.
model Notice {
  id           String      @id @default(uuid())
  title        String
  content      String
  scope        NoticeScope
  facultyId    String?
  departmentId String?
  sectionId    String?
  createdById  String
  isPublished  Boolean     @default(false)
  publishedAt  DateTime?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  faculty    Faculty?    @relation(fields: [facultyId], references: [id], onDelete: Cascade)
  department Department? @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  section    Section?    @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  createdBy  User        @relation("NoticeCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)

  @@index([scope])
  @@index([facultyId])
  @@index([departmentId])
  @@index([sectionId])
  @@map("notices")
}
```

### `Event` (`events`)

Scoped like `Notice` but without a `SECTION` level — events are organized
at University/Faculty/Department granularity.

| Field | Type | Req | Why it's here |
|---|---|---|---|
| title | String | ✓ | |
| description | String? | | |
| scope | EventScope | ✓ | UNIVERSITY / FACULTY / DEPARTMENT |
| startAt | DateTime | ✓ | |
| endAt | DateTime? | | |
| location | String? | | |
| facultyId / departmentId | String? | | |
| createdById | String | ✓ | FK → User, `Restrict` |
| isPublished | Boolean | ✓ default `false` | |


**Prisma model:**

```prisma
/// A university event, scoped like Notice but without a Section level
/// (events are organized at University/Faculty/Department granularity).
model Event {
  id           String     @id @default(uuid())
  title        String
  description  String?
  scope        EventScope
  startAt      DateTime
  endAt        DateTime?
  location     String?
  facultyId    String?
  departmentId String?
  createdById  String
  isPublished  Boolean    @default(false)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  faculty    Faculty?    @relation(fields: [facultyId], references: [id], onDelete: Cascade)
  department Department? @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  createdBy  User        @relation("EventCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)

  @@index([scope])
  @@index([facultyId])
  @@index([departmentId])
  @@map("events")
}
```

---

## Unit 9 — System

**File:** `09-system.prisma`

Platform-level tables: an immutable audit trail and global configuration.
Neither table participates in academic or financial business logic — they
exist purely to support security, compliance, and ops.

### `AuditLog` (`audit_logs`)

Immutable, append-only. **Never write passwords, tokens, or secrets into
`metadata`.** No `updatedAt` — audit rows are write-once.

| Field | Type | Req | Why it's here |
|---|---|---|---|
| actorId | String? | | FK → User, `SetNull` — an entry must survive even if the actor's account is later removed |
| action | AuditAction | ✓ | e.g. `RESULT_PUBLISHED`, `PAYMENT_VERIFIED` |
| resourceType | String | ✓ | Plain string, not an enum, so a new resource type never needs a migration to be logged |
| resourceId | String? | | |
| requestId | String? | | Correlates this entry with a specific HTTP request/trace |
| ipAddress / userAgent | String? | | |
| metadata | Json? | | Free-form context — must never contain secrets |
| result | AuditResult | ✓ default `SUCCESS` | SUCCESS / FAILURE |
| createdAt | DateTime | ✓ | |


**Prisma model:**

```prisma
/// Immutable, append-only record of security- and business-sensitive
/// actions across the whole system. Never write password, token, or
/// secret values into `metadata`. No `updatedAt` on purpose — audit rows
/// are write-once and must never be edited after creation.
model AuditLog {
  id           String      @id @default(uuid())
  /// Nullable + SetNull on delete: an audit entry must survive even if the
  /// actor's User account is later removed.
  actorId      String?
  action       AuditAction
  /// Free-text name of the resource type affected (e.g. "Result",
  /// "Payment") — kept as a plain string rather than an enum so new
  /// resource types never require a migration just to be logged.
  resourceType String
  resourceId   String?
  /// Correlates this entry with a specific HTTP request/trace for
  /// debugging and incident review.
  requestId    String?
  ipAddress    String?
  userAgent    String?
  /// Free-form structured context. Must never contain secrets.
  metadata     Json?
  result       AuditResult @default(SUCCESS)
  createdAt    DateTime    @default(now())

  actor User? @relation("AuditLogActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([actorId])
  @@index([resourceType, resourceId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### `SystemSetting` (`system_settings`)

Global application configuration — not for secrets.

| Field | Type | Req | Why it's here |
|---|---|---|---|
| key | String | ✓ | Unique config key |
| value | String | ✓ | |
| description | String? | | |
| isPublic | Boolean | ✓ default `false` | Whether safe to expose to non-privileged clients (e.g. a feature flag) vs admin-only config |
| updatedById | String? | | |


**Prisma model:**

```prisma
/// Global application configuration, keyed by a unique string. This is for
/// ordinary/public-ish app configuration only — never store secrets here;
/// use a dedicated secrets manager for those.
model SystemSetting {
  id          String   @id @default(uuid())
  key         String   @unique
  value       String
  description String?
  /// Whether this setting is safe to expose to non-privileged
  /// roles/clients (e.g. a feature flag) versus admin-only configuration.
  isPublic    Boolean  @default(false)
  updatedById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  updatedBy User? @relation("SystemSettingUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  @@map("system_settings")
}
```

---

## Cross-Cutting: Indexing Strategy

Beyond the primary keys and `@unique` constraints already listed per table,
every foreign key that will be filtered on routinely gets an `@@index`,
plus a few composite/lookup indexes:

- **Unit 1** `User`: `facultyId`, `departmentId`, `role`, `isActive`
- **Unit 3** `Department`: `facultyId`, `headUserId`; `Program`: `departmentId`
- **Unit 4** `Course`: `departmentId`, `programId`, `subjectId`;
  `CourseInstructor`: `instructorId`
- **Unit 5** `Section`: `courseId`, `semesterId`
- **Unit 6** `StudentEnrollment`: `studentId`, `sectionId`; `Attendance`:
  `studentId`, `sectionId`, `date`; `Assignment`/`Exam`: `sectionId`,
  `createdById`; `Grade`: `studentId`; `Result`: `studentId`, `sectionId`,
  `status`
- **Unit 7** `Invoice`: `studentId`, `status`; `Payment`: `invoiceId`,
  `studentId`, `status`
- **Unit 9** `AuditLog`: `actorId`, `[resourceType, resourceId]`,
  `createdAt`

## Cross-Cutting: Soft-Delete Strategy

`isDeleted` + `deletedAt` is used on tables where historical relationships
matter and a hard delete would silently orphan or falsify academic/financial
history: **User (Unit 1), Faculty, Department, Program (Unit 3), Subject,
Course (Unit 4)**.

- `FinancialTransaction` (Unit 7) and `AuditLog` (Unit 9) have **no** delete
  flag at all — they are meant to be immutable/append-only; corrections are
  new rows, never edits.
- Lower-level operational rows (`Section`, `Assignment`, `Notice`, `Event`,
  etc.) use `isActive` instead, where a simple "currently active" toggle is
  enough. Add `isDeleted`/`deletedAt` to any of these later if the business
  needs a distinct archive state.
- `onDelete` behavior reinforces this: relations that would delete
  historically significant data use `Restrict` (e.g. `Department → Course`,
  `StudentProfile → Invoice/Payment/Scholarship/FinancialTransaction`);
  relations safe to cascade use `Cascade` (e.g. `User → *Profile`,
  `Section → Attendance`).

## Cross-Cutting: RBAC & Authorization

University Management follows a **single-role + permission-array** model, defined in
Unit 1 and used everywhere:

```
User
 ├── role: Role                (exactly one — no UserRole join table)
 └── permissions: Permission[] (fine-grained resource:action grants)
```

**Authorization formula the backend implements** (Postgres/Prisma cannot
enforce this on their own):

```
ALLOW =
    authenticated
    AND account.isActive
    AND role_rule_allows_action
    AND required_permission_exists_in(user.permissions)
    AND resource_is_in_user_scope      // department / course / self / financial
    AND business_rules_pass            // e.g. state transitions, self-approval bans
```

**Scope enforcement patterns:**

- **Department scope:** `user.departmentId === resource.departmentId`
- **Course/section scope:** a matching row in `CourseInstructor` (Unit 4)
- **Self scope (student):** `resource.studentId === currentUser.studentProfile.id`
- **Financial scope:** `ACCOUNTANT` reads/writes Unit 7 tables only — never
  grades, attendance, or course data

**Admin permission governance:**
- Only `SUPER_ADMIN` may add/remove entries in an `ADMIN` user's
  `permissions` array.
- When an `ADMIN` creates another `ADMIN`, the new account must receive a
  predefined `DEFAULT_ADMIN_PERMISSIONS` set from trusted backend code —
  never accept a `permissions` array from the request body.

**Separation of duties baked into the schema:**
- `Result` (Unit 6): `submittedById` (instructor) and `approvedById`
  (department head) are separate fields.
- `Payment` (Unit 7): `verifiedById` (accountant) is separate from the
  student who initiates the payment.
- `FinancialTransaction`/`AuditLog` immutability prevents any single role
  from quietly rewriting history.
