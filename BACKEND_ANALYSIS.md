# University Management API — Complete Backend Architecture & System Analysis

## 1. PROJECT OVERVIEW

### Tech Stack & Core Infrastructure

| Component | Technology / Library | Details & Usage |
| :--- | :--- | :--- |
| **Backend Framework** | Express.js (v5.2.1) | Modular RESTful API server built on Express 5.x |
| **Language & Runtime** | TypeScript (v7.0.2) / Node.js | Executed via `tsx` (v4.23.1) in dev, bundled with `tsup` (v8.5.1) for production (`node dist/server.js`) |
| **Package Manager** | `npm` | Configured with ES Modules (`"type": "module"`) in `package.json` |
| **Database** | PostgreSQL | Hosted PostgreSQL database connected via SSL mode (`pooled.db.prisma.io:5432`) |
| **Database Adapter / Driver** | `@prisma/adapter-pg` (v7.9.1) / `pg` (v8.22.0) | Prisma v7 native PostgreSQL driver adapter for connection pooling |
| **ORM / Query Builder** | Prisma ORM (v7.9.1) | Uses multi-file schema feature (`prisma/schema/models/*.prisma` & `enums.prisma`) generating types to `src/generated/prisma` |
| **Cache & In-Memory Store** | Redis (`redis` v6.2.0) | Handles 6-digit OTP storage with 5-minute expiration (`EX 300`) for password reset |
| **Authentication** | JWT & Google OAuth 2.0 | `jsonwebtoken` (v9.0.3) for access/refresh tokens; `google-auth-library` (v11.0.0) for OAuth verification |
| **Authorization / RBAC** | Custom Express Middleware | `Role` enum (`SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD`, `INSTRUCTOR`, `STUDENT`, `ACCOUNTANT`) verified via `auth(...roles)` in [checkAuth.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/checkAuth.ts) |
| **Validation Library** | Zod (v4.4.3) | Schema validation via [validateRequest.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/validateRequest.ts) middleware |
| **API Architecture** | RESTful JSON API | Global prefix `/api/v1/` with modular routing |
| **File Storage System** | *Not Implemented* | Database schema contains `contentUrl` fields, but no upload middleware (e.g. Multer/Cloudinary) exists |
| **Email System** | Nodemailer (v9.0.5) & EJS (v6.0.1) | Gmail SMTP transport sending compiled HTML templates ([forgot-password.ejs](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/templates/forgot-password.ejs)) |
| **Payment System** | Stripe API (`stripe` v22.6.1) | Stripe Checkout Sessions & Webhooks ([stripe.gateway.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/payment-gateways/stripe/stripe.gateway.ts)) |
| **Configuration** | `dotenv` (v17.4.2) | Centralized environment loader in [config/index.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/config/index.ts) |
| **Security Middlewares** | `helmet` (v8.3.0), `cors` (v2.8.6), `express-rate-limit` (v8.7.0) | Security headers, CORS with credentials support, and IP rate limiting (100 req / 15 min) |
| **Error Handling** | Custom `AppError` & Global Handler | [AppError.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/utils/AppError.ts), [catchAsync.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/utils/catchAsync.ts), and [globalErrorHandler.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/globalErrorHandler.ts) |
| **Testing Setup** | *Not Implemented* | `npm test` runs `echo "Error: no test specified" && exit 1` |
| **API Documentation** | Postman Collection | [University Management.postman_collection.json](file:///home/dictatorprem/Downloads/Programming/University-Management-API/University Management.postman_collection.json) and markdown docs in `docs/` |

### High-Level Architecture Explanation

University Management API is structured using a **Modular Layered Architecture**. The application separates HTTP routing, request validation, business logic execution, and database persistence into distinct, decoupled layers:

1. **Bootstrap & Entry Point**: [server.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/server.ts) initializes infrastructure connections (PostgreSQL, Redis, Nodemailer SMTP), seeds default tester accounts for all 6 roles, and starts the Express HTTP server on the configured port.
2. **Application Core**: [app.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app.ts) configures security headers (`helmet`), CORS, global rate limiting, raw body parsing for Stripe webhooks, JSON body parsing, cookie parsing, route mounting under `/api/v1/`, 404 handling, and global error handling.
3. **Module Isolation**: Business capabilities are organized into functional modules inside `src/app/modules/` (`auth`, `profiles`, `organization`, `academic-catalog`, `finance`). Each module contains standard layered files: `*.routes.ts` -> `*.controller.ts` -> `*.service.ts` -> `*.validation.ts` -> `*.interface.ts`.

---

## 2. FOLDER & FILE STRUCTURE

```
University-Management-API/
├── .env.example                                  # Environment template & fallback configs
├── University Management.postman_collection.json            # Postman API test collection
├── ORGANIZATIONAL_HIERARCHY.md                   # Org structure & permission reference
├── README.md                                     # Project setup & architecture overview
├── biome.json                                    # Biome linter & formatter configuration
├── package.json                                  # NPM dependencies & scripts
├── tsconfig.json                                 # TypeScript compiler options
├── tsup.config.ts                                # Tsup build bundler configuration
├── vercel.json                                   # Vercel deployment deployment rules
├── docs/                                         # Architecture, DB schema, & RBAC specifications
├── prisma/
│   ├── migrations/                               # SQL migration history
│   └── schema/
│       ├── schema.prisma                         # Generator & DB provider config
│       ├── enums.prisma                          # Shared enums across all 9 schema units
│       └── models/
│           ├── 01-auth-users.prisma              # User authentication model
│           ├── 02-profiles.prisma                # Role-specific profile models (1:1 with User)
│           ├── 03-organization.prisma            # Faculty, Department, Program models
│           ├── 04-academic-catalog.prisma        # Subject, Course, CourseInstructor models
│           ├── 05-academic-delivery.prisma       # Session, Semester, Section, ClassSchedule models
│           ├── 06-student-academics.prisma       # Enrollment, Attendance, Assignment, Exam, Grade, Result
│           ├── 07-finance.prisma                 # Invoice, Payment, Scholarship, FinancialTransaction
│           ├── 08-communication.prisma           # Notice, Event models
│           └── 09-system.prisma                  # AuditLog, SystemSetting models
└── src/
    ├── app.ts                                    # Express app setup & middleware pipeline
    ├── server.ts                                 # Server bootstrapper, DB connect & seeder
    └── app/
        ├── config/
        │   └── index.ts                          # Environment variables & constants configuration
        ├── lib/                                  # Infrastructure client instantiations
        │   ├── googleAuth.ts                     # Google OAuth2Client instance
        │   ├── nodemailer.ts                     # Nodemailer SMTP transporter
        │   ├── prisma.ts                         # Prisma Client instance with PG adapter
        │   ├── redis.ts                          # Redis client instance
        │   └── stripe.ts                         # Stripe SDK instance
        ├── middleware/                           # Global & route-level Express middlewares
        │   ├── checkAuth.ts                      # JWT authentication & RBAC role verification
        │   ├── globalErrorHandler.ts             # Centralized Express error handler
        │   ├── healthCheck.ts                    # Detailed system health monitor (/ endpoint)
        │   ├── notFound.ts                       # 404 Route Not Found handler
        │   ├── rateLimiter.ts                    # express-rate-limit configuration
        │   └── validateRequest.ts                # Zod request body validation middleware
        ├── templates/                            # Email EJS templates
        │   ├── forgot-password.ejs               # Password reset OTP email template
        │   └── reset-password-success.ejs        # Password change confirmation email template
        ├── utils/                                # Helper utilities
        │   ├── AppError.ts                       # Operational error class extending Error
        │   ├── catchAsync.ts                     # Async controller error wrapper
        │   ├── idGenerator.ts                    # Business ID format generators (STU-2026-CSE-0001)
        │   ├── jwt.ts                            # JWT signing & verification helpers
        │   ├── seed.ts                           # Auto-seeder for tester accounts across 6 roles
        │   └── sendResponse.ts                   # Standardized JSON response formatter
        └── modules/                              # Feature modules
            ├── academic-catalog/
            │   ├── academic-catalog.routes.ts   # Catalog sub-router aggregator
            │   ├── course-instructors/          # Course-to-Instructor assignment
            │   ├── courses/                     # Course offering management
            │   └── subjects/                    # Subject catalog management
            ├── auth/                            # Authentication, JWT, Google OAuth, Password Reset
            ├── finance/
            │   ├── finance.routes.ts            # Finance sub-router aggregator
            │   ├── invoices/                    # Invoice creation & billing
            │   ├── payment-gateways/stripe/     # Stripe gateway checkout & webhook processing
            │   └── payments/                    # Payment records & checkout initiation
            ├── organization/
            │   ├── organization.routes.ts       # Organization sub-router aggregator
            │   ├── departments/                 # Department management
            │   ├── faculties/                   # Faculty management
            │   └── programs/                    # Degree program management
            └── profiles/
                ├── profiles.routes.ts           # Profile sub-router aggregator
                ├── admin/                       # Admin profile (empty stub)
                └── student/                     # Student profile creation & management
```

### System Architecture Flow Map

```
[ Client Request ]
       │
       ▼
[ src/server.ts ] ──► (Loads env, connects PG/Redis/SMTP, runs seeders, starts HTTP server)
       │
       ▼
[ src/app.ts ] ──► (Helmet Security Headers, CORS, Rate Limiter, Body Parsers, Cookie Parser)
       │
       ├──► GET / ──► [ middleware/healthCheck.ts ] ──► Checks DB, Redis, SMTP status
       │
       ▼
[ Module Router ] (e.g. src/app/modules/auth/auth.route.ts)
       │
       ▼
[ middleware/validateRequest.ts ] ──► Validates payload against Zod Schema
       │
       ▼
[ middleware/checkAuth.ts ] ──► Verifies JWT Cookie/Header & checks user Role
       │
       ▼
[ Controller ] (e.g. src/app/modules/auth/auth.controller.ts) ──► Wrapped in catchAsync
       │
       ▼
[ Service Layer ] (e.g. src/app/modules/auth/auth.service.ts) ──► Executes Business Logic
       │
       ▼
[ Database Layer ] (src/app/lib/prisma.ts) ──► PostgreSQL / Redis Client
       │
       ▼
[ Response Formatter ] (src/app/utils/sendResponse.ts) ──► Returns standardized JSON
       │
       ▼
[ Exception Path ] ──► Any thrown Error ──► [ middleware/globalErrorHandler.ts ]
```

---

## 3. MODULE-BY-MODULE ANALYSIS

### Implemented Modules Summary

The backend contains **5 functional modules** active in `src/app/modules/`. Below is the complete breakdown of every active module:

---

### Module 1: Authentication (`src/app/modules/auth`)

1. **Purpose**: Handles user identity creation, authentication, session tokens, OAuth verification, and password recovery.
2. **Main Files**:
   - Route: [auth.route.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/auth/auth.route.ts)
   - Controller: [auth.controller.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/auth/auth.controller.ts)
   - Service: [auth.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/auth/auth.service.ts)
   - Validation: [auth.validation.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/auth/auth.validation.ts)
   - Interface: [auth.interface.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/auth/auth.interface.ts)
3. **Database Models Involved**: `User`, `StudentProfile`
4. **Endpoints**:
   - `POST /api/v1/auth/register` — Student registration (Public)
   - `POST /api/v1/auth/login` — User authentication (Public)
   - `GET /api/v1/auth/me` — Fetch current user profile (Authenticated: All roles)
   - `POST /api/v1/auth/refresh-token` — Generate new access/refresh tokens (Public with Refresh Cookie)
   - `POST /api/v1/auth/google` — Google OAuth authentication (Public)
   - `POST /api/v1/auth/forgot-password` — Send 6-digit OTP to user email (Public)
   - `POST /api/v1/auth/reset-password` — Reset password using OTP (Public)
5. **Business Rules**:
   - Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character.
   - If optional `studentProfile` is provided during registration, a business `studentId` (e.g. `STU-2026-CSE-0001`) is generated automatically.
   - Password reset OTPs expire after 300 seconds (5 minutes) in Redis.
   - Accounts registered via Google OAuth cannot perform standard password resets or password logins unless linked.
6. **Request / Response Flow**:
   - Client sends credentials to `POST /login` -> `validateRequest` parses payload -> `loginUser` service compares password with `bcrypt.compare` -> JWT access & refresh tokens generated -> Controller sets HTTP-only cookies (`accessToken`, `refreshToken`) and returns tokens in response JSON.

---

### Module 2: Profiles (`src/app/modules/profiles`)

1. **Purpose**: Manages role-specific user details extending the core `User` identity.
2. **Main Files**:
   - Sub-router: [profiles.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/profiles/profiles.routes.ts)
   - Student Route: [student-profile.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/profiles/student/student-profile.routes.ts)
   - Student Controller: [student-profile.controller.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/profiles/student/student-profile.controller.ts)
   - Student Service: [student-profile.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/profiles/student/student-profile.service.ts)
   - Admin Profile: [admin-profile.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/profiles/admin/admin-profile.routes.ts) *(Empty file stub)*
3. **Database Models Involved**: `User`, `StudentProfile`, `Program`
4. **Endpoints**:
   - `GET /api/v1/profiles/student/profile` — Test route (Public)
   - `POST /api/v1/profiles/student/create-profile` — Create a student profile for logged-in user (Protected: `STUDENT`)
5. **Business Rules**:
   - A `User` can have at most one `StudentProfile` (enforced by 1:1 relation `@unique` on `userId`).
   - If profile already exists, service throws `409 Conflict`.
   - Links student to degree `Program` if `programId` is provided.

---

### Module 3: Organization (`src/app/modules/organization`)

1. **Purpose**: Manages the university institutional structure: Faculties -> Departments -> Programs.
2. **Main Files**:
   - Aggregator Route: [organization.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/organization.routes.ts)
   - Faculty: [faculty.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/faculties/faculty.routes.ts), [faculty.controller.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/faculties/faculty.controller.ts), [faculty.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/faculties/faculty.service.ts)
   - Department: [department.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/departments/department.routes.ts), [department.controller.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/departments/department.controller.ts), [department.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/departments/department.service.ts)
   - Program: [program.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/programs/program.routes.ts), [program.controller.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/programs/program.controller.ts), [program.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/programs/program.service.ts)
3. **Database Models Involved**: `Faculty`, `Department`, `Program`, `User`
4. **Endpoints**:
   - `POST /api/v1/organization/faculties/create` — Create Faculty (Protected: `SUPER_ADMIN`)
   - `GET /api/v1/organization/faculties/all` — List all faculties (Public)
   - `POST /api/v1/organization/departments/create` — Create Department (Protected: `SUPER_ADMIN`, `ADMIN`)
   - `GET /api/v1/organization/departments/all` — Search & list departments with pagination (Public)
   - `PATCH /api/v1/organization/departments/:id` — Update Department (Protected: `SUPER_ADMIN`, `ADMIN`)
   - `POST /api/v1/organization/programs/create` — Create Program (Protected: `SUPER_ADMIN`, `ADMIN`)
   - `PATCH /api/v1/organization/programs/update/:id` — Update Program (Protected: `SUPER_ADMIN`, `ADMIN`)
   - `POST /api/v1/organization/programs/all` — List all programs (Public — *Note: Uses HTTP POST instead of GET*)
5. **Business Rules**:
   - Faculty and Department codes must be globally unique.
   - Assigned Department Head user must exist, have role `DEPARTMENT_HEAD`, and belong to the department.
   - Soft-deleted departments/programs (`isDeleted = true`) are filtered out of public queries.

---

### Module 4: Academic Catalog (`src/app/modules/academic-catalog`)

1. **Purpose**: Defines educational offerings: Subjects (master course definitions), Courses (offered courses under departments), and Course Instructor assignments.
2. **Main Files**:
   - Aggregator Route: [academic-catalog.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/academic-catalog.routes.ts)
   - Subject: [subject.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/subjects/subject.routes.ts), [subject.controller.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/subjects/subject.controller.ts), [subject.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/subjects/subject.service.ts)
   - Course: [course.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/courses/course.routes.ts), [course.controller.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/courses/course.controller.ts), [course.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/courses/course.service.ts)
   - Course Instructor: [course-instructor.route.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/course-instructors/course-instructor.route.ts), [course-instructor.controller.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/course-instructors/course-instructor.controller.ts), [course-instructor.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/course-instructors/course-instructor.service.ts)
3. **Database Models Involved**: `Subject`, `Course`, `CourseInstructor`, `Department`, `Program`, `User`
4. **Endpoints**:
   - `POST /api/v1/academic-catalog/subjects/create` — Create Subject (Protected: `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD`)
   - `POST /api/v1/academic-catalog/courses/create` — Create Course (Protected: `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD`)
   - `POST /api/v1/academic-catalog/course-instructors/create` — Assign Instructor to Course (Protected: `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD`)
5. **Business Rules**:
   - Subject code and Course code must be unique.
   - Assigning an instructor requires validating user exists and holds role `INSTRUCTOR`.
   - If `isPrimary = true` is passed when assigning an instructor, any existing primary instructor for that course is automatically set to `isPrimary = false`.

---

### Module 5: Finance (`src/app/modules/finance`)

1. **Purpose**: Manages student billing invoices, payment processing, and Stripe payment gateway integration.
2. **Main Files**:
   - Aggregator Route: [finance.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/finance.routes.ts)
   - Invoice: [invoice.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/invoices/invoice.routes.ts), [invoice.controller.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/invoices/invoice.controller.ts), [invoice.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/invoices/invoice.service.ts)
   - Payment: [payment.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/payments/payment.routes.ts), [payment.controller.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/payments/payment.controller.ts), [payment.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/payments/payment.service.ts)
   - Stripe Gateway & Webhook: [stripe.gateway.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/payment-gateways/stripe/stripe.gateway.ts), [stripe.webhook.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/payment-gateways/stripe/stripe.webhook.ts)
3. **Database Models Involved**: `Invoice`, `Payment`, `StudentProfile`, `User`
4. **Endpoints**:
   - `USE /api/v1/finance/invoices` — Create Invoice (*CRITICAL BUG: Mounted directly on `.use` without auth middleware*)
   - `POST /api/v1/finance/payments/create` — Initiate Stripe Checkout session for an invoice (Protected: `STUDENT`)
   - `POST /api/v1/finance/payments/webhook/stripe-verify` — Process incoming Stripe webhooks (Public / Webhook Signature Verified)
5. **Business Rules**:
   - Invoice numbers are generated sequentially per date (e.g. `INV-20260913-0001`).
   - Invoices can only be paid by the student assigned to that invoice (`invoice.studentId === studentId`).
   - Paid invoices (`status === "PAID"`) cannot accept new checkout attempts.
   - Webhook processing uses an atomic `$transaction` to update `Payment.status = "SUCCESS"` and `Invoice.status = "PAID"` upon receiving `checkout.session.completed`.

---

### Unimplemented Schema Modules (Defined in Prisma, No API Routes)

The database schema defines models for several modules that **do not have controllers or routes implemented in the API**:
- **Academic Delivery** (`AcademicSession`, `Semester`, `Section`, `ClassSchedule`)
- **Student Academics** (`StudentEnrollment`, `Attendance`, `Assignment`, `AssignmentSubmission`, `Exam`, `Grade`, `Result`)
- **Financial Extensions** (`Scholarship`, `FinancialTransaction`)
- **Communication** (`Notice`, `Event`)
- **System Administration** (`AuditLog`, `SystemSetting`)

---

## 4. DATABASE ANALYSIS

### Database Schema Overview (20 Models across 9 Schema Files)

The project utilizes Prisma v7's multi-file schema feature (`prisma/schema/models/`). All tables map to explicit lower-case snake_case database tables using `@@map()`.

```
========================================================================================
                                DATABASE ENTITY MAP
========================================================================================

    +-------------------+       1:1      +------------------------+
    |       User        | ──────────────►|   StudentProfile       |
    | (users)           |                | (student_profiles)     |
    +-------------------+                +------------------------+
      │         │                                  │
      │ 1:N     │ 1:N                              │ 1:N
      ▼         ▼                                  ▼
+----------+ +------------+              +-------------------+
| Faculty  | | Department |              |      Invoice      |
| (faculties)| (departments)|             | (invoices)        |
+----------+ +------------+              +-------------------+
                     │                             │
                     │ 1:N                         │ 1:N
                     ▼                             ▼
             +------------+              +-------------------+
             |  Program   |              |      Payment      |
             | (programs) |              | (payments)        |
             +------------+              +-------------------+
                     │
                     │ 1:N
                     ▼
             +------------+       1:N    +-------------------+
             |   Course   | ────────────►| CourseInstructor  |
             | (courses)  |              | (course_instructors)|
             +------------+              +-------------------+
                     │
                     │ 1:N
                     ▼
             +------------+
             |  Subject   |
             | (subjects) |
             +------------+
```

### Complete Database Schema Reference Table

| Model Name | Table Name | Key Fields | Primary Key | Constraints & Indexes | Relationships |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `User` | `users` | `id`, `name`, `email`, `password`, `role`, `authProvider`, `isActive` | `id` (UUID) | `@unique([email])`, `@unique([googleId])`, `@index([role])` | 1:1 Profiles, 1:N Faculty/Dept Dean, 1:N CourseInstructor |
| `SuperAdminProfile` | `super_admin_profiles` | `id`, `userId`, `employeeId`, `mfaEnabled`, `ipWhitelist` | `id` (UUID) | `@unique([userId])`, `@unique([employeeId])` | 1:1 `User` (`onDelete: Cascade`) |
| `AdminProfile` | `admin_profiles` | `id`, `userId`, `employeeId`, `designation` | `id` (UUID) | `@unique([userId])`, `@unique([employeeId])` | 1:1 `User` (`onDelete: Cascade`) |
| `DepartmentHeadProfile` | `department_head_profiles` | `id`, `userId`, `employeeId`, `appointedAt` | `id` (UUID) | `@unique([userId])`, `@unique([employeeId])` | 1:1 `User` (`onDelete: Cascade`) |
| `InstructorProfile` | `instructor_profiles` | `id`, `userId`, `employeeId`, `employmentStatus` | `id` (UUID) | `@unique([userId])`, `@unique([employeeId])` | 1:1 `User` (`onDelete: Cascade`) |
| `StudentProfile` | `student_profiles` | `id`, `userId`, `studentId`, `programId`, `academicStatus` | `id` (UUID) | `@unique([userId])`, `@unique([studentId])`, `@index([programId])` | 1:1 `User`, N:1 `Program`, 1:N Invoices, 1:N Payments |
| `AccountantProfile` | `accountant_profiles` | `id`, `userId`, `employeeId`, `employmentStatus` | `id` (UUID) | `@unique([userId])`, `@unique([employeeId])` | 1:1 `User` (`onDelete: Cascade`) |
| `Faculty` | `faculties` | `id`, `code`, `name`, `deanUserId` | `id` (UUID) | `@unique([code])`, `@index([deanUserId])` | N:1 Dean (`User`), 1:N Departments |
| `Department` | `departments` | `id`, `facultyId`, `code`, `name`, `headUserId` | `id` (UUID) | `@unique([code])`, `@index([facultyId])` | N:1 `Faculty`, N:1 Head (`User`), 1:N Programs, 1:N Courses |
| `Program` | `programs` | `id`, `departmentId`, `code`, `degreeType` | `id` (UUID) | `@unique([code])`, `@index([departmentId])` | N:1 `Department`, 1:N `StudentProfile`, 1:N `Course` |
| `Subject` | `subjects` | `id`, `code`, `title`, `credit`, `subjectType` | `id` (UUID) | `@unique([code])` | 1:N `Course` |
| `Course` | `courses` | `id`, `departmentId`, `programId`, `subjectId`, `code` | `id` (UUID) | `@unique([code])`, `@index([departmentId])` | N:1 `Department`, N:1 `Program`, N:1 `Subject`, 1:N `CourseInstructor` |
| `CourseInstructor` | `course_instructors` | `courseId`, `instructorId`, `isPrimary` | Composite `[courseId, instructorId]` | `@index([instructorId])` | Composite join table between `Course` and `User` |
| `Invoice` | `invoices` | `id`, `studentId`, `invoiceNumber`, `amount`, `status` | `id` (UUID) | `@unique([invoiceNumber])`, `@index([studentId])` | N:1 `StudentProfile`, 1:N `Payment` (Monetary column: `Decimal(12,2)`) |
| `Payment` | `payments` | `id`, `invoiceId`, `studentId`, `amount`, `gatewaySessionId`, `status` | `id` (UUID) | `@unique([transactionId])`, `@index([invoiceId])` | N:1 `Invoice`, N:1 `StudentProfile` (Monetary column: `Decimal(12,2)`) |

---

## 5. AUTHENTICATION ANALYSIS

### Authentication Flow Step-by-Step

```
[ Client ]
   │
   ├─► 1. POST /api/v1/auth/login { email, password }
   │      │
   │      ▼
   │   [ validateRequest(UserValidation.LoginZodSchema) ]
   │      │
   │      ▼
   │   [ AuthService.loginUser ]
   │      ├── Search User by email in PostgreSQL via Prisma
   │      ├── Verify user.isActive === true & user.isDeleted === false
   │      ├── Compare password using bcrypt.compare(password, user.password)
   │      ├── Sign Access Token (jwtUtils.createToken, secret: JWT_ACCESS_SECRET, exp: 1d)
   │      └── Sign Refresh Token (jwtUtils.createToken, secret: JWT_REFRESH_SECRET, exp: 7d)
   │      │
   │      ▼
   │   [ AuthController.loginUser ]
   │      ├── res.cookie("accessToken", accessToken, { httpOnly: true, sameSite: "none" })
   │      ├── res.cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "none" })
   │      └── Return JSON response { success: true, data: { accessToken, refreshToken } }
   │
   ├─► 2. Protected Request (e.g. GET /api/v1/auth/me)
   │      │
   │      ▼
   │   [ middleware/checkAuth.ts -> auth(...roles) ]
   │      ├── Extract token from req.cookies.accessToken OR Authorization: Bearer <token>
   │      ├── Verify JWT signature with jwtUtils.verifyToken(token, JWT_ACCESS_SECRET)
   │      ├── Check user role matches required roles array
   │      ├── Fetch user from DB to verify user exists and user.isActive !== false
   │      ├── Attach user identity to req.user = { id, email, name, role }
   │      └── Call next() -> Handover to Controller
```

### Password Reset / OTP Architecture

1. **Initiation**: User sends email to `POST /api/v1/auth/forgot-password`.
2. **OTP Generation**: `crypto.randomInt(100000, 1000000)` generates a 6-digit numeric OTP.
3. **Redis Storage**: Stored under key `forgor-password-otp:${email}` with TTL `EX 300` (5 minutes).
4. **Email Dispatch**: EJS template [forgot-password.ejs](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/templates/forgot-password.ejs) compiled and delivered via Nodemailer SMTP.
5. **Verification & Reset**: User submits `{ email, otp, newPassword }` to `POST /api/v1/auth/reset-password`. Service retrieves OTP from Redis (`redisClient.get`), verifies match, hashes new password with `bcrypt.hash`, updates `User.password`, deletes Redis key, and sends confirmation email.

---

## 6. AUTHORIZATION & RBAC

### System Roles (`Role` Enum)

1. `SUPER_ADMIN`: System owner, highest privilege level.
2. `ADMIN`: Institutional operational administrator.
3. `DEPARTMENT_HEAD`: Departmental administrative head.
4. `INSTRUCTOR`: Teaching faculty / course teacher.
5. `STUDENT`: Enrolled student.
6. `ACCOUNTANT`: Finance & billing administrator.

### Role-Permission Overview Matrix (Current Route Access)

| Endpoint | Method | Permitted Roles | Enforcement Point |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/me` | `GET` | `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD`, `INSTRUCTOR`, `STUDENT`, `ACCOUNTANT` | [auth.route.ts:44](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/auth/auth.route.ts#L44) |
| `/api/v1/profiles/student/create-profile` | `POST` | `STUDENT` | [student-profile.routes.ts:19](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/profiles/student/student-profile.routes.ts#L19) |
| `/api/v1/organization/faculties/create` | `POST` | `SUPER_ADMIN` | [faculty.routes.ts:11](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/faculties/faculty.routes.ts#L11) |
| `/api/v1/organization/departments/create` | `POST` | `SUPER_ADMIN`, `ADMIN` | [department.routes.ts:10](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/departments/department.routes.ts#L10) |
| `/api/v1/organization/departments/:id` | `PATCH` | `SUPER_ADMIN`, `ADMIN` | [department.routes.ts:17](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/departments/department.routes.ts#L17) |
| `/api/v1/organization/programs/create` | `POST` | `SUPER_ADMIN`, `ADMIN` | [program.routes.ts:10](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/programs/program.routes.ts#L10) |
| `/api/v1/organization/programs/update/:id` | `PATCH` | `SUPER_ADMIN`, `ADMIN` | [program.routes.ts:11](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/programs/program.routes.ts#L11) |
| `/api/v1/academic-catalog/subjects/create` | `POST` | `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD` | [subject.routes.ts:12](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/subjects/subject.routes.ts#L12) |
| `/api/v1/academic-catalog/courses/create` | `POST` | `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD` | [course.routes.ts:10](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/courses/course.routes.ts#L10) |
| `/api/v1/academic-catalog/course-instructors/create` | `POST` | `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD` | [course-instructor.route.ts:14](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/course-instructors/course-instructor.route.ts#L14) |
| `/api/v1/finance/invoices` | `USE` | **NONE (Public due to routing bug)** | [finance.routes.ts:9](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/finance.routes.ts#L9) |
| `/api/v1/finance/payments/create` | `POST` | `STUDENT` | [payment.routes.ts:27](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/payments/payment.routes.ts#L27) |

---

## 7. API ENDPOINT REGISTRY

### Complete Active API Routes Table

| Module | Method | Endpoint Path | Auth Required | Allowed Roles | Controller Handler | Service Function |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/` | No | Public | `healthCheck` | [healthCheck.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/healthCheck.ts) |
| **Auth** | `POST` | `/api/v1/auth/register` | No | Public | `registerStudent` | `AuthService.registerStudent` |
| **Auth** | `POST` | `/api/v1/auth/login` | No | Public | `loginUser` | `AuthService.loginUser` |
| **Auth** | `GET` | `/api/v1/auth/me` | Yes | All 6 Roles | `getMe` | `AuthService.getMe` |
| **Auth** | `POST` | `/api/v1/auth/refresh-token` | Refresh Cookie | Public | `refreshToken` | `AuthService.refreshToken` |
| **Auth** | `POST` | `/api/v1/auth/google` | No | Public | `googleLogin` | `AuthService.googleLogin` |
| **Auth** | `POST` | `/api/v1/auth/forgot-password` | No | Public | `forgotPassword` | `AuthService.forgotPassword` |
| **Auth** | `POST` | `/api/v1/auth/reset-password` | No | Public | `resetPassword` | `AuthService.resetPassword` |
| **Profile** | `GET` | `/api/v1/profiles/student/profile` | No | Public | Inline Callback | Returns text message |
| **Profile** | `POST` | `/api/v1/profiles/student/create-profile` | Yes | `STUDENT` | `createStudentProfile` | `studentProfileService.createStudentProfile` |
| **Organization** | `POST` | `/api/v1/organization/faculties/create` | Yes | `SUPER_ADMIN` | `createFaculty` | `facultyService.createFaculty` |
| **Organization** | `GET` | `/api/v1/organization/faculties/all` | No | Public | `getAllFaculties` | `facultyService.getAllFaculties` |
| **Organization** | `POST` | `/api/v1/organization/departments/create` | Yes | `SUPER_ADMIN`, `ADMIN` | `createDepartment` | `departmentsService.createDepartment` |
| **Organization** | `GET` | `/api/v1/organization/departments/all` | No | Public | `getAllDepartments` | `departmentsService.getAllDepartments` |
| **Organization** | `PATCH` | `/api/v1/organization/departments/:id` | Yes | `SUPER_ADMIN`, `ADMIN` | `updateDepartment` | `departmentsService.updateDepartment` |
| **Organization** | `POST` | `/api/v1/organization/programs/create` | Yes | `SUPER_ADMIN`, `ADMIN` | `createProgram` | `programsService.createProgram` |
| **Organization** | `PATCH` | `/api/v1/organization/programs/update/:id` | Yes | `SUPER_ADMIN`, `ADMIN` | `updateProgram` | `programsService.updateProgram` |
| **Organization** | `POST` | `/api/v1/organization/programs/all` | No | Public | `getAllPrograms` | `programsService.getAllPrograms` |
| **Catalog** | `POST` | `/api/v1/academic-catalog/subjects/create` | Yes | `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD` | `createSubject` | `subjectsService.createSubject` |
| **Catalog** | `POST` | `/api/v1/academic-catalog/courses/create` | Yes | `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD` | `createCourse` | `coursesService.createCourse` |
| **Catalog** | `POST` | `/api/v1/academic-catalog/course-instructors/create` | Yes | `SUPER_ADMIN`, `ADMIN`, `DEPARTMENT_HEAD` | `createCourseInstructors` | `courseInstructorsService.createCourseInstructors` |
| **Finance** | `ALL` | `/api/v1/finance/invoices` | No | **Unprotected Bug** | `createInvoice` | `invoiceService.createInvoice` |
| **Finance** | `POST` | `/api/v1/finance/payments/create` | Yes | `STUDENT` | `createPayment` | `PaymentService.createPayment` |
| **Finance** | `POST` | `/api/v1/finance/payments/webhook/stripe-verify` | No | Stripe Signature | `stripeWebhook` | `PaymentWebhookService.handleStripeWebhook` |

---

## 8. REQUEST LIFECYCLE TRACES

### Lifecycle 1: `POST /api/v1/auth/login`

```
1. HTTP POST Request arrives at Express server (port 5000)
2. app.use(helmet()) -> Sets security HTTP headers
3. app.use(cors()) -> Validates Origin against FRONTEND_URL
4. app.use(globalRateLimiter) -> Checks request limit per IP
5. app.use(express.json()) -> Parses JSON payload into req.body
6. app.use(cookieParser()) -> Parses cookies into req.cookies
7. App matches router: app.use("/api/v1/auth", AuthRoutes)
8. AuthRoutes matches POST "/login"
9. Middleware: validateRequest(UserValidation.LoginZodSchema)
   - Runs UserValidation.LoginZodSchema.safeParse(req.body)
   - If invalid: throws Error(result.error.issues[0].message)
   - If valid: updates req.body = result.data and calls next()
10. Controller: AuthController.loginUser (wrapped in catchAsync)
    - Calls AuthService.loginUser(req.body)
11. Service: AuthService.loginUser
    - Normalizes email (`trim().toLowerCase()`)
    - Executes `prisma.user.findUnique({ where: { email } })`
    - Checks `user.isDeleted` and `user.isActive`
    - Calls `bcrypt.compare(password, user.password)`
    - Signs JWT access token & refresh token using `jwtUtils.createToken`
    - Returns `{ accessToken, refreshToken }` to controller
12. Controller receives result:
    - Calls `res.cookie("accessToken", accessToken, ...)`
    - Calls `res.cookie("refreshToken", refreshToken, ...)`
    - Calls `sendResponse(res, { statusCode: 200, success: true, ... })`
13. Client receives HTTP 200 JSON response with set-cookie headers.
```

### Lifecycle 2: Stripe Checkout Payment (`POST /api/v1/finance/payments/create`)

```
1. Request arrives at POST /api/v1/finance/payments/create
2. Pipeline middlewares: helmet -> cors -> rateLimiter -> json parser -> cookieParser
3. Route Handler matched in payment.routes.ts
4. Auth Middleware: auth(Role.STUDENT)
   - Extracts JWT token from req.cookies.accessToken or Bearer Header
   - Verifies JWT with jwtUtils.verifyToken(token, JWT_ACCESS_SECRET)
   - Verifies req.user.role === "STUDENT"
   - Queries DB: prisma.user.findUnique to ensure user exists & isActive
   - Sets req.user = { id, email, name, role }
5. Controller: paymentController.createPayment
   - Reads req.user.id and req.body (invoiceId, method, gateway)
   - Calls PaymentService.createPayment(userId, payload)
6. Service: PaymentService.createPayment
   - Queries user + studentProfile: prisma.user.findUnique({ include: { studentProfile: true } })
   - Queries invoice: prisma.invoice.findUnique({ where: { id: payload.invoiceId } })
   - Verifies invoice.studentId === studentProfile.id (Ownership Check)
   - Verifies invoice.status !== "PAID"
   - Creates internal PENDING payment record: prisma.payment.create({ data: { status: "PENDING" } })
   - Calls stripe.checkout.sessions.create via createPaymentbystripe()
   - Updates payment record with gatewaySessionId & gatewayPaymentIntentId
   - Returns { paymentId, checkoutUrl }
7. Controller sends HTTP 201 Created with Checkout URL.
```

---

## 9. BUSINESS LOGIC DEEP DIVE

### 1. Centralized Business ID Generation ([idGenerator.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/utils/idGenerator.ts))

The system maintains human-facing business identifier formats separate from primary key database UUIDs:
- **Student ID**: `STU-YYYY-DEPT-XXXX` (e.g. `STU-2026-CSE-0001`)
- **Faculty ID**: `FAC-YYYY-XXXX` (e.g. `FAC-2026-0001`)
- **Department ID**: `DEPT-YYYY-CODE-XXXX` (e.g. `DEPT-2026-CSE-0001`)
- **Program ID**: `PROG-YYYY-CODE-XXXX` (e.g. `PROG-2026-CSE-0001`)
- **Course ID**: `CRS-DEPT-XXXX` (e.g. `CRS-CSE-0001`)
- **Subject ID**: `SUBJ-DEPT-XXXX` (e.g. `SUBJ-CSE-0001`)
- **Section ID**: `SEC-YYYY-COURSE-LETTER` (e.g. `SEC-2026-CSE101-A`)
- **Invoice Number**: `INV-YYYYMMDD-XXXX` (e.g. `INV-20260913-0001`)

### 2. Department Head Assignment Constraints ([department.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/departments/department.service.ts))

When creating or updating a department:
- The assigned `headUserId` must point to an active user holding the role `DEPARTMENT_HEAD`.
- Upon update, the user must already be assigned to that specific `departmentId` (`headUser.departmentId === id`).

### 3. Primary Instructor Promotion Logic ([course-instructor.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/course-instructors/course-instructor.service.ts))

When assigning an instructor to a course:
- If `isPrimary = true` is passed, the service automatically executes `prisma.courseInstructor.updateMany({ where: { courseId, isPrimary: true }, data: { isPrimary: false } })` to ensure only one lead instructor is designated per course.

---

## 10. VALIDATION ARCHITECTURE

Request validation is executed using **Zod** schemas passed to the higher-order middleware [validateRequest.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/validateRequest.ts):

```typescript
export const validateRequest = (zodSchema: z.ZodObject<any>) => {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const payload = req.body ?? {};
        const result = zodSchema.safeParse(payload);

        if (!result.success) {
            throw new Error(result.error.issues[0].message);
        }

        req.body = result.data;
        next();
    });
};
```

### Key Validation Observations
1. **Fallback Payload**: Uses `req.body ?? {}` to prevent null dereference errors when no body is supplied.
2. **Schema Sanitization**: Overwrites `req.body = result.data`, ensuring unknown/extraneous request fields are stripped before reaching controllers.
3. **First Error Throw**: Throws only `result.error.issues[0].message` as a plain string error instead of returning a structured array of all field validation issues.

---

## 11. ERROR HANDLING ARCHITECTURE

### Error Pipeline Hierarchy

```
[ Error Occurs in Controller/Service ]
             │
             ▼
      [ catchAsync.ts ]  (Catches promise rejection and forwards error via next(error))
             │
             ▼
 [ globalErrorHandler.ts ] (Centralized Error Middleware)
             │
             ├── Checks err instanceof Prisma.PrismaClientValidationError ──► 400 Bad Request
             ├── Checks err instanceof Prisma.PrismaClientKnownRequestError
             │     ├── Code P2002 ──► Duplicate Key Error (400 Bad Request)
             │     ├── Code P2003 ──► Foreign Key Constraint Failed (400 Bad Request)
             │     └── Code P2025 ──► Record Not Found (400 Bad Request)
             ├── Checks err instanceof Prisma.PrismaClientInitializationError
             │     ├── Code P1000 ──► Auth DB Failed (401 Unauthorized)
             │     └── Code P1001 ──► Can't reach DB Server (400 Bad Request)
             └── Native Error ──► Uses err.message
```

### Critical Bug in `globalErrorHandler.ts`

Lines 57-68 of [globalErrorHandler.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/globalErrorHandler.ts):

```typescript
res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    statusCode: statusCode || httpStatus.INTERNAL_SERVER_ERROR,
    name: config.node_env === "development" ? errorName : "Internal Server Error",
    message: config.node_env === "development" ? errorMessage : "Internal Server Error",
    error: config.node_env === "development" ? err : undefined,
    stack: config.node_env === "development" ? err.stack : undefined,
});
```

> [!WARNING]
> **CRITICAL ISSUE**: The HTTP response status code is hardcoded to `res.status(httpStatus.INTERNAL_SERVER_ERROR)` (500). Even when `statusCode` is calculated as `400 Bad Request` or `401 Unauthorized`, the server sends HTTP status `500 Internal Server Error` to the client.

---

## 12. SECURITY AUDIT FINDINGS

### Severity Rating Matrix

- 🔴 **CRITICAL**: 2 Issues
- 🟧 **HIGH**: 2 Issues
- 🟡 **MEDIUM**: 2 Issues
- 🟦 **LOW**: 2 Issues

---

### Detailed Findings

#### 1. 🔴 CRITICAL: Unprotected Invoice Endpoint (Authentication Bypass)
- **File**: [src/app/modules/finance/finance.routes.ts:9-13](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/finance.routes.ts#L9-L13)
- **Code**:
  ```typescript
  router.use(
      "/invoices",
      validateRequest(invoiceValidation.createInvoiceZodSchema),
      invoiceController.createInvoice,
  );
  ```
- **Reason**: The router uses `router.use("/invoices", ...)` directly on `financeRoutes` instead of mounting [invoice.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/invoices/invoice.routes.ts). As a result, the `auth(Role.ACCOUNTANT, Role.ADMIN)` middleware defined in `invoice.routes.ts` is **completely bypassed**. Anyone on the internet can issue billing invoices to any student without authentication.

#### 2. 🔴 CRITICAL: Secret & Private Key Exposure in `.env.example`
- **File**: [.env.example](file:///home/dictatorprem/Downloads/Programming/University-Management-API/.env.example)
- **Reason**: The repository `.env.example` file contains active, production-like secrets:
  - Database connection URL with credentials (`postgres://7ca84...:sk_HsC...@pooled.db.prisma.io:5432/postgres`)
  - JWT Access Secret (`JWT_ACCESS_SECRET=e077e5e5...`)
  - Redis database host and plain-text password (`REDIS_PASSWORD=wsCeQR...`)
  - SMTP email sender password (`SMTP_PASSWORD=baqf lcho ltja ojxm`)
  - Google Client ID

#### 3. 🟧 HIGH: Server Always Responds with HTTP 500 Status Code
- **File**: [src/app/middleware/globalErrorHandler.ts:57](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/globalErrorHandler.ts#L57)
- **Reason**: `res.status(httpStatus.INTERNAL_SERVER_ERROR)` is hardcoded. Validation errors (400), authentication failures (401), and permission denials (403) all return HTTP status code 500. This breaks HTTP standard compliance and causes client-side API libraries (e.g. Axios/Fetch) to treat expected client validation errors as server crashes.

#### 4. 🟧 HIGH: Permissive Insecure Cookie Configuration
- **File**: [src/app/modules/auth/auth.controller.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/auth/auth.controller.ts)
- **Reason**: Access and refresh token cookies are set with `secure: false` and `sameSite: "none"`. Browser security policies require `secure: true` whenever `sameSite: "none"` is used. In production environments, `secure: false` over unencrypted HTTP exposes JWT session cookies to network interception.

#### 5. 🟡 MEDIUM: Global Rate Limiter Lacks Endpoint-Specific Rules
- **File**: [src/app/middleware/rateLimiter.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/rateLimiter.ts)
- **Reason**: A single rate limiter allows 100 requests per 15 minutes globally. Sensitive authentication routes (`/api/v1/auth/login`, `/api/v1/auth/forgot-password`) lack strict rate limiting, enabling brute-force password guessing and email spamming.

#### 6. 🟡 MEDIUM: Absence of Payload Body Size Constraints
- **File**: [src/app.ts:46](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app.ts#L46)
- **Reason**: `express.json()` is initialized without explicit payload size boundaries (e.g. `express.json({ limit: "10kb" })`). An attacker can send oversized JSON payloads to exhaust server memory (DoS).

#### 7. 🟦 LOW: Hardcoded & Inconsistent Bcrypt Salt Rounds
- **File**: [src/app/modules/auth/auth.service.ts:48](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/auth/auth.service.ts#L48)
- **Reason**: In `auth.service.ts`, student registration hardcodes bcrypt salt rounds to `8` (`bcrypt.hash(password, 8)`), while `seed.ts` and `config` specify `BCRYPT_SALT_ROUNDS=10`.

#### 8. 🟦 LOW: Type Safety Bypasses via `any` Type Casts
- **Files**: [stripe.webhook.ts:178](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/payment-gateways/stripe/stripe.webhook.ts#L178), [payment.service.ts:121](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/payments/payment.service.ts#L121)
- **Reason**: Stripe JSON session objects are saved into Prisma model JSON fields by casting to `session as any`, circumventing TypeScript compile-time type safety.

---

## 13. CODE QUALITY & MAINTAINABILITY

### Positives & Strong Patterns
1. **Strict Modular Architecture**: Clear folder division by domain entity (`auth`, `organization`, `finance`, `academic-catalog`, `profiles`).
2. **Layered Separation of Concerns**: Routes handle HTTP paths, Middlewares handle cross-cutting checks, Controllers format responses, and Services handle database operations.
3. **Prisma Multi-File Schema**: Excellent database schema organisation grouping 20 models across 9 logical `.prisma` files.
4. **Declarative Seeding**: Centralized tester account generator in `seed.ts` automatically populates default users for all 6 system roles upon boot.

### Anti-Patterns & Quality Issues

1. **Copy-Paste Controller Response Messages**:
   - Creating a Department returns `"Faculty Created Successfully"` ([department.controller.ts:15](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/departments/department.controller.ts#L15)).
   - Creating a Program returns `"Faculty Created Successfully"` ([program.controller.ts:15](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/programs/program.controller.ts#L15)).
   - Creating a Subject returns `"Invoice Created Successfully"` ([subject.controller.ts:21](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/subjects/subject.controller.ts#L21)).
   - Updating a Program returns status `201 CREATED` instead of `200 OK` ([program.controller.ts:33](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/programs/program.controller.ts#L33)).

2. **Typographical Errors in Identifiers**:
   - `courcesController` in [course.controller.ts:24](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/academic-catalog/courses/course.controller.ts#L24) (should be `coursesController`).
   - `getewayRowData` field in `Payment` model ([07-finance.prisma:53](file:///home/dictatorprem/Downloads/Programming/University-Management-API/prisma/schema/models/07-finance.prisma#L53)) (typo in DB column name for `gatewayRowData`).
   - Redis key `forgor-password-otp` in [auth.service.ts:417](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/auth/auth.service.ts#L417) (typo for `forgot-password-otp`).

3. **Commented-Out Dead Code**:
   - [checkAuth.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/checkAuth.ts) contains 80 lines of commented-out older middleware code.
   - [student-profile.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/profiles/student/student-profile.routes.ts) and [profiles.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/profiles/profiles.routes.ts) contain multiple commented-out sub-routers.

4. **Inconsistent Validation Middleware Usage**:
   - Several POST routes (e.g. `faculty.routes.ts`, `department.routes.ts`, `student-profile.routes.ts`) have their `validateRequest(...)` middleware commented out, skipping Zod validation entirely before reaching services.

---

## 14. ARCHITECTURAL PATTERNS

1. **Layered Architecture (N-Tier)**: Strict top-down control flow (`Route -> Middleware -> Controller -> Service -> ORM -> Database`).
2. **Higher-Order Middleware Pattern**: `validateRequest(schema)` and `auth(...roles)` are factory functions returning Express middleware handlers.
3. **Async Error Wrapping (CatchAsync / Template Method)**: `catchAsync` wraps async route controllers in a try-catch block, forwarding exceptions to `next(error)`.
4. **Adapter / Gateway Pattern**: `stripe.gateway.ts` encapsulates Stripe SDK interactions away from business logic.
5. **Data Transfer Object (DTO) & Interface Pattern**: TypeScript interfaces (`*.interface.ts`) define typed contract payloads passed between layers.

---

## 15. ENVIRONMENT VARIABLES & CONFIGURATION

| Variable Name | Category | Purpose | Required? | Security Sensitivity |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | System | Environment flag (`development` / `production`) | Optional | Low |
| `PORT` | Server | HTTP Server port (default `5000`) | Optional | Low |
| `DATABASE_URL` | Database | PostgreSQL connection URL string | **Required** | 🔴 High (Contains DB credentials) |
| `FRONTEND_URL` | CORS | Allowed client origin for CORS header | **Required** | Low |
| `JWT_ACCESS_SECRET` | Auth | Symmetric secret key for signing Access Tokens | **Required** | 🔴 High |
| `JWT_REFRESH_SECRET` | Auth | Symmetric secret key for signing Refresh Tokens | **Required** | 🔴 High |
| `JWT_ACCESS_EXPIRES_IN` | Auth | Access token lifetime (e.g. `1d`) | **Required** | Low |
| `JWT_REFRESH_EXPIRES_IN` | Auth | Refresh token lifetime (e.g. `7d`) | **Required** | Low |
| `BCRYPT_SALT_ROUNDS` | Auth | Password hashing cost factor (e.g. `10`) | **Required** | Low |
| `GOOGLE_CLIENT_ID` | OAuth | Google OAuth Client Identifier | **Required** | Medium |
| `SUPER_ADMIN_*` | Seeder | Seed credentials for Super Admin account | **Required** | 🔴 High |
| `TESTER_*` | Seeder | Seed credentials for tester accounts across 5 roles | **Required** | 🔴 High |
| `REDIS_HOST`/`PORT` | Infrastructure | Redis connection endpoint | **Required** | Low |
| `REDIS_USER`/`PASSWORD` | Infrastructure | Redis authentication credentials | **Required** | 🔴 High |
| `SMTP_USER`/`PASSWORD` | Email | Nodemailer Gmail SMTP credentials | **Required** | 🔴 High |
| `EMAIL_SENDER` | Email | Default `From` email header address | **Required** | Low |
| `STRIPE_SECRET_KEY` | Payment | Stripe API private key | **Required** | 🔴 High |
| `STRIPE_WEBHOOK_SECRET` | Payment | Stripe Webhook signature verification secret | **Required** | 🔴 High |

---

## 16. DEPENDENCIES ANALYSIS

### Production Dependencies (`package.json`)

- `@prisma/adapter-pg` & `pg`: Native PostgreSQL driver adapter enabling connection pooling for Prisma Client in serverless/Node environments.
- `@prisma/client`: Auto-generated type-safe ORM query builder.
- `bcryptjs`: Pure JavaScript password hashing implementation.
- `cookie-parser`: Middleware to parse HTTP request cookies into `req.cookies`.
- `cors`: Middleware enabling Cross-Origin Resource Sharing.
- `dotenv`: Loads environment variables from `.env` into `process.env`.
- `ejs`: Templating engine used to render HTML email templates for OTPs.
- `express`: Core web application framework.
- `express-rate-limit`: Basic rate-limiting middleware for Express.
- `google-auth-library`: Official Google OAuth client for verifying ID tokens.
- `helmet`: Express middleware setting defensive HTTP security headers.
- `http-status`: Utility providing human-readable HTTP status code constants (`httpStatus.OK`).
- `jsonwebtoken`: JSON Web Token implementation for authentication.
- `nodemailer`: Module for sending emails via SMTP.
- `redis`: Official Node.js Redis client for in-memory caching and OTP storage.
- `stripe`: Node.js SDK for Stripe payments and webhooks.
- `zod`: Schema validation library for TypeScript.

---

## 17. TESTING SETUP

- **Test Framework**: None configured.
- **Current State**: `package.json` script runs `echo "Error: no test specified" && exit 1`.
- **Coverage**: 0% automated test coverage. No unit tests, integration tests, or end-to-end API tests exist in the codebase.

---

## 18. API DOCUMENTATION

- **Postman Collection**: [University Management.postman_collection.json](file:///home/dictatorprem/Downloads/Programming/University-Management-API/University Management.postman_collection.json) provides pre-configured requests for testing authentication, department creation, and payment checkout.
- **Markdown Docs**: Located in `docs/` (`API_INSTRUCTION.md`, `DATABASE_SCHEMA_REFERENCE.md`, `MODULAR_ARCHITECTURE_GUIDE.md`, `University Management System — Role Structure & RBAC Design.md`).
- **Swagger / OpenAPI**: Not integrated at runtime.

---

## 19. COMPLETE DATA FLOW DIAGRAMS

### 1. Student Registration Data Flow

```
[ User Input: name, email, password, studentProfile ]
                      │
                      ▼
            [ POST /api/v1/auth/register ]
                      │
                      ▼
            [ validateRequest ]
  (Check Zod: name >= 3 chars, email format, password complexity)
                      │
                      ▼
             [ AuthService.registerStudent ]
                      │
   ┌──────────────────┴──────────────────┐
   ▼                                     ▼
[ Check DB Email ]              [ Hash Password ]
prisma.user.findUnique          bcrypt.hash(password, 8)
   │                                     │
   └──────────────────┬──────────────────┘
                      │
                      ▼
         [ Generate Student ID ]
        idGenerator.generateStudentId
       Format: STU-2026-CSE-0001
                      │
                      ▼
         [ Database Transaction ]
          prisma.user.create({
            data: {
              name, email, password, role: "STUDENT",
              studentProfile: { create: { studentId, ... } }
            }
          })
                      │
                      ▼
        [ Generate Access & Refresh Tokens ]
       jwtUtils.createToken(payload, secret)
                      │
                      ▼
          [ Set HTTP-Only Cookies & Return ]
          res.cookie("accessToken"), res.cookie("refreshToken")
```

---

## 20. IMPORTANT FILES TO STUDY (PRIORITIZED LEARNING LIST)

### Level 1 — Must Understand First (Core Infrastructure)
1. [src/server.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/server.ts) — Server bootstrapper, DB connections & seeders execution.
2. [src/app.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app.ts) — Express pipeline setup, middlewares, and route mountings.
3. [src/app/middleware/checkAuth.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/checkAuth.ts) — Authentication & RBAC role verification logic.
4. [src/app/middleware/globalErrorHandler.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/globalErrorHandler.ts) — Global error handling & Prisma error formatting.
5. [prisma/schema/models/01-auth-users.prisma](file:///home/dictatorprem/Downloads/Programming/University-Management-API/prisma/schema/models/01-auth-users.prisma) — Core `User` identity model.

### Level 2 — Important (Business Logic & Primary Modules)
6. [src/app/modules/auth/auth.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/auth/auth.service.ts) — Login, Registration, Google OAuth, Redis OTP password reset.
7. [src/app/modules/finance/payments/payment.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/payments/payment.service.ts) — Stripe checkout initiation and invoice ownership checks.
8. [src/app/modules/finance/payment-gateways/stripe/stripe.webhook.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/payment-gateways/stripe/stripe.webhook.ts) — Webhook signature validation & atomic payment transactions.
9. [src/app/modules/organization/departments/department.service.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/organization/departments/department.service.ts) — Paginated department querying and head validation.

### Level 3 — Supporting Utilities & Helpers
10. [src/app/utils/idGenerator.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/utils/idGenerator.ts) — Business identifier formatting functions.
11. [src/app/utils/catchAsync.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/utils/catchAsync.ts) — Controller error wrapper.
12. [src/app/lib/prisma.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/lib/prisma.ts) — Prisma client adapter instance.
13. [src/app/utils/seed.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/utils/seed.ts) — Default tester accounts seeder.

---

## 21. BEGINNER-FRIENDLY EXPLANATION

Imagine University Management API as a **well-organized university administrative building**:

1. **The Building Entrance ([server.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/server.ts))**: When you start the server, it turns on electricity (Database), unlocks the filing cabinets (Redis), and hires security officers for 6 departments (`seedSuperAdmin`, `seedTesterAdmin`, etc.).
2. **The Reception Desk ([app.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app.ts))**: Every request from a student or admin enters here. Reception checks if the visitor is causing trouble (Rate Limiter), inspects their luggage (Body Parser), and checks their ID badge (Cookies).
3. **The Department Corridors (Routers in `src/app/modules/`)**: If a visitor says "I want to pay a fee", reception directs them down the `/api/v1/finance` hallway.
4. **Security Checkpoints ([checkAuth.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/checkAuth.ts))**: Before entering an office, a guard verifies your badge. A student cannot enter the "Create Faculty" office because guards only allow visitors with a `SUPER_ADMIN` badge.
5. **The Officers (Controllers)**: The controller receives your form, double-checks that you filled in required fields using a checklist (`Zod`), and passes the form to the specialist worker.
6. **The Specialists (Services)**: The service carries out actual tasks — calculates total fees, talks to Stripe bank officers, or records student details into PostgreSQL file cabinets via `Prisma`.
7. **The Error Office ([globalErrorHandler.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/globalErrorHandler.ts))**: If anything goes wrong anywhere in the building, the worker stops and passes the problem to the global error office, which formats a standard apology letter (`JSON`) back to the visitor.

---

## 22. INTERVIEW / VIVA PREPARATION GUIDE

### Basic Level Questions

**Q1: What framework, ORM, and database does University Management API use?**  
*Answer*: University Management API is built on Express.js (v5.2) with TypeScript. It uses Prisma ORM (v7.9) with the `@prisma/adapter-pg` PostgreSQL driver adapter connecting to a hosted PostgreSQL database.

**Q2: How does the application organize database models?**  
*Answer*: It uses Prisma v7's multi-file schema feature, splitting 20 models across 9 domain-specific files inside `prisma/schema/models/` (e.g., `01-auth-users.prisma`, `03-organization.prisma`, `07-finance.prisma`) with shared enums in `enums.prisma`.

**Q3: How are passwords secured during user registration?**  
*Answer*: Passwords are validated using Zod regex rules (requiring uppercase, lowercase, numbers, and special characters) and hashed asynchronously using `bcryptjs` before storage in PostgreSQL.

---

### Intermediate Level Questions

**Q1: How does authentication work for protected endpoints?**  
*Answer*: The `auth(...requiredRoles)` middleware inspects incoming requests for an `accessToken` cookie or a `Bearer` header token. It verifies the JWT signature using `jwtUtils.verifyToken`, checks if the user's role is in the allowed roles array, queries PostgreSQL to confirm the user is active, and attaches `req.user` for the controller.

**Q2: How is password reset handled securely without storing OTPs in the main database?**  
*Answer*: When a user requests a password reset, a 6-digit numeric OTP is generated and saved in Redis under `forgor-password-otp:${email}` with a 5-minute expiration (`EX 300`). An EJS HTML template is emailed via Nodemailer. Reset requests verify the OTP directly against Redis before updating the hashed password in PostgreSQL.

**Q3: Explain how Stripe payments are handled and reconciled.**  
*Answer*: A student initiates payment for an invoice at `POST /api/v1/finance/payments/create`. The service verifies invoice ownership, creates an internal `Payment` record with status `PENDING`, and calls `stripe.checkout.sessions.create`. When the student completes payment, Stripe sends a webhook to `POST /api/v1/finance/payments/webhook/stripe-verify`. The webhook handler verifies the Stripe signature, checks `payment_status === "paid"`, and runs an atomic `prisma.$transaction` updating `Payment.status = "SUCCESS"` and `Invoice.status = "PAID"`.

---

### Advanced Level Questions

**Q1: What major security vulnerability exists in the financial routing layer?**  
*Answer*: In [finance.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/finance.routes.ts#L9), the invoice creation handler is mounted directly using `router.use("/invoices", validateRequest(...), invoiceController.createInvoice)`. This bypasses [invoice.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/invoices/invoice.routes.ts#L18) where `auth(Role.ACCOUNTANT, Role.ADMIN)` is defined, leaving invoice creation completely unauthenticated and accessible to any public client.

**Q2: What issue exists in the global error handler regarding HTTP status codes?**  
*Answer*: In [globalErrorHandler.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/globalErrorHandler.ts#L57), the response status code is hardcoded as `res.status(httpStatus.INTERNAL_SERVER_ERROR)`. Although internal logic categorizes errors (e.g. 400 for validation or P2002 duplicate keys), the server sends HTTP status code 500 for all errors.

**Q3: How does the database design ensure data integrity when a user account is deleted?**  
*Answer*: The schema separates core identity (`User`) from role profiles (`StudentProfile`, `InstructorProfile`) and business records (`Invoice`, `Payment`, `Result`). Profiles cascade on delete (`onDelete: Cascade`), while historical business relations use `onDelete: Restrict` or `onDelete: SetNull`. Additionally, `User` supports soft deletion (`isDeleted`, `deletedAt`), preserving academic and financial history.

---

## 23. FINAL ARCHITECTURE & SYSTEM SUMMARY

### Executive Summary

| Category | Rating / Status | Summary Note |
| :--- | :--- | :--- |
| **Backend Stack** | Express.js 5 / TypeScript / Prisma 7 / PostgreSQL / Redis | Modern TypeScript stack with up-to-date dependencies. |
| **Architecture** | Layered Modular Architecture | Excellent separation of concerns across modules. |
| **Core Modules Implemented** | 5 Active Modules (Auth, Profiles, Org, Catalog, Finance) | Core auth, org, and billing routes implemented; 4 schema units remain unhandled by controllers. |
| **Database Design** | 20 Models, Multi-file Prisma Schema | Outstanding 9-unit database schema design with clear relations and monetary Decimal types. |
| **Authentication** | Dual JWT + Cookie / Google OAuth / Redis OTP | Feature-rich authentication with OAuth and Redis OTP reset. |
| **Authorization** | Role-Based Access Control (`Role` Enum) | 6 system roles enforced via middleware. |
| **API Organization** | RESTful JSON under `/api/v1/` | Clean routing hierarchy with standard response formatting. |
| **Security** | 🔴 2 Critical / 🟧 2 High Risks | Unprotected invoice route and exposed credentials in `.env.example` require immediate remediation. |
| **Code Quality** | Moderate | Clean structure, but suffers from copy-paste response messages and spelling typos. |
| **Testing** | 🔴 Missing | No automated unit or integration tests present. |

---

### System Evaluation Scores (Out of 10)

```
Architecture          :  8.5 / 10  [Strong modular layered layout]
Code Quality          :  6.0 / 10  [Copy-paste string bugs & typos present]
Security              :  4.5 / 10  [Bypassed auth on invoices & exposed secrets]
Database Design       :  9.0 / 10  [Excellent multi-file Prisma schema & relations]
Maintainability       :  7.5 / 10  [Clean modular file separation]
Scalability           :  8.0 / 10  [Redis caching, PG adapter connection pooling]
Documentation         :  7.0 / 10  [Postman collection & schema docs available]
Testing               :  0.0 / 10  [No tests implemented]
--------------------------------------------------------------------------------
OVERALL SCORE         :  6.3 / 10
```

### Action Plan for Remediation

1. **Fix Invoice Route Security**: Replace `router.use("/invoices", ...)` in [finance.routes.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/modules/finance/finance.routes.ts) with `router.use("/invoices", invoiceRoutes)` to enforce `auth(Role.ACCOUNTANT, Role.ADMIN)`.
2. **Fix Global Error Handler HTTP Status**: Change line 57 of [globalErrorHandler.ts](file:///home/dictatorprem/Downloads/Programming/University-Management-API/src/app/middleware/globalErrorHandler.ts#L57) from `res.status(httpStatus.INTERNAL_SERVER_ERROR)` to `res.status(statusCode)`.
3. **Purge Exposed Credentials**: Rotate database, Redis, SMTP, and Stripe secrets exposed in `.env.example`.
4. **Fix Controller Response Strings & Typos**: Correct copy-paste response messages in department, program, and subject controllers, and fix typos (`courcesController`, `getewayRowData`, `forgor-password-otp`).
