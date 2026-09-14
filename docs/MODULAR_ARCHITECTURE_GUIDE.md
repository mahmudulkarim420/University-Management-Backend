# University Management — Modular Architecture Implementation Guide

How to implement the API defined in `docs/API_INSTRUCTION.md` as a
**modular monolith**: one Express app, split into self-contained feature
modules that mirror the 9 schema units, with a thin shared "core" layer
underneath. This keeps the codebase navigable as it grows (32 tables, 6
roles, several multi-step workflows) without splitting into microservices
prematurely.

---

## Table of Contents

1. [Why modular, and the rule that keeps it modular](#1-why-modular-and-the-rule-that-keeps-it-modular)
2. [Top-level folder structure](#2-top-level-folder-structure)
3. [The core layer](#3-the-core-layer)
4. [Anatomy of one module](#4-anatomy-of-one-module)
5. [Worked example — the `results` module (full code)](#5-worked-example--the-results-module-full-code)
6. [Request lifecycle](#6-request-lifecycle)
7. [RBAC middleware pattern](#7-rbac-middleware-pattern)
8. [Cross-module communication rules](#8-cross-module-communication-rules)
9. [Testing structure](#9-testing-structure)
10. [Final folder tree](#10-final-folder-tree)

---

## 1. Why modular, and the rule that keeps it modular

University Management has 9 schema units and ~32 resources. A modular pattern gives
each one its own folder with routes/controller/service/repository, so:

- A change to `results` never touches files under `payments`.
- `docs/DATABASE_SCHEMA_README.md` unit → `docs/API_INSTRUCTION.md`
  section → `src/modules/<unit>/` folder — all three line up 1:1.
- Onboarding a new engineer means pointing them at one folder, not the
  whole codebase.

**The one rule that makes this actually work:** a module's `service.ts` is
the *only* file other modules are allowed to import from it. Nothing ever
reaches into another module's `repository.ts`, `controller.ts`, or Prisma
calls directly. This is what "modular" means here — not that modules
can't talk to each other, but that they only talk through one narrow,
intentional door. §8 covers this in detail with a concrete example (the
`enrollments` module needing data from `sections`).

---

## 2. Top-level folder structure

```
src/
├── app.ts                    # Express app: middleware, route mounting
├── server.ts                 # HTTP server bootstrap
├── config/
│   ├── env.ts                 # validated environment variables
│   └── prisma.ts              # single PrismaClient instance
├── core/                      # shared infrastructure — see §3
│   ├── middlewares/
│   ├── errors/
│   ├── response/
│   └── types/
├── modules/                   # one folder per schema unit — see §4
│   ├── auth/
│   ├── users/
│   ├── profiles/
│   ├── organization/
│   ├── academic-catalog/
│   ├── academic-delivery/
│   ├── student-academics/
│   │   ├── enrollments/
│   │   ├── attendance/
│   │   ├── assignments/
│   │   ├── exams/
│   │   ├── grades/
│   │   └── results/
│   ├── finance/
│   │   ├── invoices/
│   │   ├── payments/
│   │   ├── scholarships/
│   │   └── financial-transactions/
│   ├── communication/
│   │   ├── notices/
│   │   └── events/
│   └── system/
│       ├── audit-logs/
│       └── system-settings/
└── routes/
    └── index.ts                # mounts every module's router under /api/v1
```

`student-academics`, `finance`, and `communication` are **unit folders**
containing several resource sub-modules, because those units genuinely
hold multiple independent resources (Unit 6 alone has 7 tables). Smaller
units (`organization`, `academic-catalog`) stay as a single flat module
folder rather than being split further — split only when a
resource earns its own workflow/state machine (like `results` did).

---

## 3. The core layer

Framework-level concerns that every module depends on, but that contain
**no business logic** of their own.

```
core/
├── middlewares/
│   ├── authenticate.middleware.ts    # verifies JWT, attaches req.user
│   ├── require-permission.middleware.ts   # role + permission check (§7)
│   ├── require-scope.middleware.ts        # department/course/self/financial check (§7)
│   ├── validate.middleware.ts             # runs a zod schema against req.body/query
│   └── error-handler.middleware.ts        # turns AppError → error envelope (§6)
├── errors/
│   └── app-error.ts                       # AppError class + factory helpers
├── response/
│   └── envelope.ts                        # success()/paginated() response helpers
└── types/
    └── express.d.ts                       # augments Express.Request with `user`
```

### `core/response/envelope.ts`

```typescript
export function success<T>(data: T) {
  return { success: true as const, data };
}

export function paginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
) {
  return {
    success: true as const,
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
```

### `core/errors/app-error.ts`

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number,
    public details?: unknown,
  ) {
    super(message);
  }

  static forbiddenRole(message = "Your role cannot perform this action.") {
    return new AppError("FORBIDDEN_ROLE", message, 403);
  }

  static forbiddenScope(message = "This resource is outside your scope.") {
    return new AppError("FORBIDDEN_SCOPE", message, 403);
  }

  static invalidTransition(message: string) {
    return new AppError("INVALID_STATE_TRANSITION", message, 409);
  }

  static notFound(resource: string) {
    return new AppError("RESOURCE_NOT_FOUND", `${resource} not found.`, 404);
  }

  static conflict(message: string) {
    return new AppError("CONFLICT", message, 409);
  }
}
```

Every error code in `docs/API_INSTRUCTION.md` §3 gets a matching factory
here — this keeps error shapes consistent without every service
hand-rolling `{ code, message, httpStatus }` objects.

### `core/middlewares/error-handler.middleware.ts`

```typescript
import { ErrorRequestHandler } from "express";
import { AppError } from "../errors/app-error";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        httpStatus: err.httpStatus,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  console.error(err); // real setup: send to a logger/monitoring service
  return res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Unexpected error.", httpStatus: 500 },
  });
};
```

Mounted **last** in `app.ts`, after every route — this is what lets every
module simply `throw new AppError(...)` or `throw AppError.notFound(...)`
from inside a service and never write a `try/catch` in a controller.

---

## 4. Anatomy of one module

Every leaf module (a single resource, e.g. `results`, `payments`,
`notices`) has the same six files. This uniformity is the point — once
you've read one module, you can navigate all 20+ others.

```
modules/student-academics/results/
├── results.routes.ts        # URL → middleware chain → controller method
├── results.controller.ts    # parses req, calls service, returns response — no logic
├── results.service.ts       # business rules, state machine, calls repository
├── results.repository.ts    # the ONLY file that calls prisma.result.*
├── results.validator.ts     # zod schemas for request bodies
├── results.types.ts         # DTOs / request-response TypeScript types
└── results.permissions.ts   # which Permission + scope check each action needs
```

| File | Responsibility | Imports allowed |
|---|---|---|
| `*.routes.ts` | Wire `Router()` paths to controller methods, attach middleware | controller, core middlewares, `*.permissions.ts` |
| `*.controller.ts` | Extract `req.params`/`req.body`/`req.user`, call one service method, wrap result in `success()` | service, `core/response` |
| `*.service.ts` | Business rules, workflow/state transitions, orchestration | own repository, **other modules' services only** (§8) |
| `*.repository.ts` | Prisma queries for this resource, nothing else | `config/prisma` |
| `*.validator.ts` | zod (or equivalent) schemas | zod |
| `*.types.ts` | Request/response TypeScript interfaces | — |
| `*.permissions.ts` | Maps each route to a `Permission` enum value + scope-check function | `Permission` enum |

**Why the controller stays this thin:** it means every business rule
lives in exactly one place (`*.service.ts`), which is what makes the R-1
through R-10 restrictions in `API_INSTRUCTION.md` §8 testable in
isolation — you unit-test the service without spinning up Express at all.

---

## 5. Worked example — the `results` module (full code)

This is the most complex workflow in the system (R-5 separation of
duties, multi-role state machine), so it's the best module to use as the
template for everything else.

### `results.types.ts`

```typescript
export interface CreateResultInput {
  studentId: string;
  sectionId: string;
}

export interface ApproveResultInput {
  gradeLetter?: string;
  gradePoint?: number;
}

export interface RejectResultInput {
  reason: string;
}
```

### `results.validator.ts`

```typescript
import { z } from "zod";

export const createResultSchema = z.object({
  studentId: z.string().uuid(),
  sectionId: z.string().uuid(),
});

export const approveResultSchema = z.object({
  gradeLetter: z.string().max(2).optional(),
  gradePoint: z.number().min(0).max(4).optional(),
});

export const rejectResultSchema = z.object({
  reason: z.string().min(1),
});
```

### `results.repository.ts`

```typescript
import { prisma } from "../../../config/prisma";
import { ResultStatus } from "@prisma/client";

export const resultsRepository = {
  create: (studentId: string, sectionId: string) =>
    prisma.result.create({ data: { studentId, sectionId, status: "DRAFT" } }),

  findById: (id: string) => prisma.result.findUnique({ where: { id } }),

  findManyForStudent: (studentId: string) =>
    prisma.result.findMany({
      where: { studentId, status: ResultStatus.PUBLISHED },
    }),

  updateStatus: (id: string, data: Record<string, unknown>) =>
    prisma.result.update({ where: { id }, data }),
};
```

Note: **every** Prisma call for `Result` lives here — the service below
never imports `prisma` directly.

### `results.permissions.ts`

```typescript
import { Permission } from "@prisma/client";

export const resultsPermissions = {
  create: Permission.RESULT_CREATE,
  submit: Permission.RESULT_SUBMIT,
  approve: Permission.RESULT_APPROVE,
  reject: Permission.RESULT_REJECT,
  publish: Permission.RESULT_PUBLISH,
  read: Permission.RESULT_READ,
};
```

### `results.service.ts`

```typescript
import { AppError } from "../../../core/errors/app-error";
import { resultsRepository } from "./results.repository";
import { courseInstructorRepository } from "../../academic-catalog/course-instructor.repository";
import { AuthUser } from "../../../core/types/auth-user";
import { CreateResultInput, ApproveResultInput, RejectResultInput } from "./results.types";

export const resultsService = {
  async create(caller: AuthUser, input: CreateResultInput) {
    // R-3: instructor must be assigned to this section's course
    const isAssigned = await courseInstructorRepository.isInstructorForSection(
      caller.id,
      input.sectionId,
    );
    if (!isAssigned) throw AppError.forbiddenScope();

    return resultsRepository.create(input.studentId, input.sectionId);
  },

  async submit(caller: AuthUser, resultId: string) {
    const result = await resultsRepository.findById(resultId);
    if (!result) throw AppError.notFound("Result");
    if (result.status !== "DRAFT") {
      throw AppError.invalidTransition("Result must be DRAFT to submit.");
    }

    return resultsRepository.updateStatus(resultId, {
      status: "SUBMITTED",
      submittedById: caller.id,
      submittedAt: new Date(),
    });
  },

  async approve(caller: AuthUser, resultId: string, input: ApproveResultInput) {
    const result = await resultsRepository.findById(resultId);
    if (!result) throw AppError.notFound("Result");
    if (result.status !== "SUBMITTED") {
      throw AppError.invalidTransition("Result must be SUBMITTED before approval.");
    }
    // R-5: separation of duties — the submitter can never approve their own result
    if (result.submittedById === caller.id) {
      throw AppError.forbiddenScope("You cannot approve a result you submitted.");
    }
    // R-2: department head scope — delegated to a shared department-scope guard
    // (see require-scope.middleware.ts in §7; already checked before this runs)

    return resultsRepository.updateStatus(resultId, {
      status: "APPROVED",
      approvedById: caller.id,
      approvedAt: new Date(),
      ...input,
    });
  },

  async reject(caller: AuthUser, resultId: string, input: RejectResultInput) {
    const result = await resultsRepository.findById(resultId);
    if (!result) throw AppError.notFound("Result");
    if (result.status !== "SUBMITTED") {
      throw AppError.invalidTransition("Result must be SUBMITTED before rejection.");
    }
    if (result.submittedById === caller.id) {
      throw AppError.forbiddenScope("You cannot reject a result you submitted.");
    }

    return resultsRepository.updateStatus(resultId, {
      status: "REJECTED",
      approvedById: caller.id,
      approvedAt: new Date(),
    });
    // input.reason: persist wherever the schema stores rejection notes,
    // or log it as AuditLog metadata if no dedicated field exists
  },

  async publish(resultId: string) {
    const result = await resultsRepository.findById(resultId);
    if (!result) throw AppError.notFound("Result");
    if (result.status !== "APPROVED") {
      throw AppError.invalidTransition("Result must be APPROVED before publishing.");
    }

    return resultsRepository.updateStatus(resultId, {
      status: "PUBLISHED",
      publishedAt: new Date(),
    });
  },

  // R-6: student visibility filtered server-side, not by query params
  listForStudent: (studentId: string) => resultsRepository.findManyForStudent(studentId),
};
```

### `results.controller.ts`

```typescript
import { Request, Response } from "express";
import { resultsService } from "./results.service";
import { success } from "../../../core/response/envelope";

export const resultsController = {
  create: async (req: Request, res: Response) => {
    const result = await resultsService.create(req.user!, req.body);
    res.status(201).json(success(result));
  },

  submit: async (req: Request, res: Response) => {
    const result = await resultsService.submit(req.user!, req.params.id);
    res.json(success(result));
  },

  approve: async (req: Request, res: Response) => {
    const result = await resultsService.approve(req.user!, req.params.id, req.body);
    res.json(success(result));
  },

  reject: async (req: Request, res: Response) => {
    const result = await resultsService.reject(req.user!, req.params.id, req.body);
    res.json(success(result));
  },

  publish: async (req: Request, res: Response) => {
    const result = await resultsService.publish(req.params.id);
    res.json(success(result));
  },

  listMine: async (req: Request, res: Response) => {
    const results = await resultsService.listForStudent(req.user!.studentProfileId!);
    res.json(success(results));
  },
};
```

No `try/catch` here — an async error thrown inside `resultsService` is
caught by Express's async-error handling (or an `asyncHandler` wrapper if
your Express version predates native async support) and routed straight
to `errorHandler`.

### `results.routes.ts`

```typescript
import { Router } from "express";
import { resultsController } from "./results.controller";
import { resultsPermissions } from "./results.permissions";
import { validate } from "../../../core/middlewares/validate.middleware";
import { requirePermission } from "../../../core/middlewares/require-permission.middleware";
import { requireScope } from "../../../core/middlewares/require-scope.middleware";
import { departmentScopeForSection, selfScopeForStudent } from "../../../core/scopes";
import {
  createResultSchema,
  approveResultSchema,
  rejectResultSchema,
} from "./results.validator";

const router = Router();

router.post(
  "/",
  requirePermission(resultsPermissions.create),
  validate(createResultSchema),
  resultsController.create,
);

router.post(
  "/:id/submit",
  requirePermission(resultsPermissions.submit),
  resultsController.submit,
);

router.post(
  "/:id/approve",
  requirePermission(resultsPermissions.approve),
  requireScope(departmentScopeForSection),
  validate(approveResultSchema),
  resultsController.approve,
);

router.post(
  "/:id/reject",
  requirePermission(resultsPermissions.reject),
  requireScope(departmentScopeForSection),
  validate(rejectResultSchema),
  resultsController.reject,
);

router.post(
  "/:id/publish",
  requirePermission(resultsPermissions.publish),
  resultsController.publish,
);

router.get(
  "/me",
  requirePermission(resultsPermissions.read),
  requireScope(selfScopeForStudent),
  resultsController.listMine,
);

export { router as resultsRoutes };
```

Compare this file line-for-line against the `/results/*` rows in
`API_INSTRUCTION.md` §6.6 and §7.2 — the middleware chain on each route
*is* the restrictions column, made executable.

---

## 6. Request lifecycle

```
Incoming request
      │
      ▼
Route match (results.routes.ts)
      │
      ▼
authenticate            → verifies JWT, loads req.user (id, role, permissions[],
                           departmentId, studentProfileId)
      │
      ▼
requirePermission(...)  → 403 FORBIDDEN_ROLE / FORBIDDEN_PERMISSION if it fails
      │
      ▼
requireScope(...)       → 403 FORBIDDEN_SCOPE if it fails (R-1..R-4)
      │
      ▼
validate(schema)        → 400 VALIDATION_ERROR if it fails
      │
      ▼
Controller               → thin: extract req, call one service method
      │
      ▼
Service                  → business rules, state machine (R-5, R-6, R-7...)
      │
      ▼
Repository → Prisma → PostgreSQL
      │
      ▼
success()/paginated() envelope back through controller → response
```

Any `AppError` thrown at any layer skips straight to
`error-handler.middleware.ts` — no layer above the one that threw needs to
know an error happened.

---

## 7. RBAC middleware pattern

Three composable middlewares implement the authorization funnel from
`API_INSTRUCTION.md` §1 (Authenticated → Role → Permission → Scope →
Business rule).

### `core/middlewares/authenticate.middleware.ts`

```typescript
import { RequestHandler } from "express";
import { verifyAccessToken } from "../auth/jwt";
import { AppError } from "../errors/app-error";

export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("AUTH_REQUIRED", "Missing bearer token.", 401));
  }

  const payload = verifyAccessToken(header.slice(7)); // throws on invalid/expired
  if (!payload.isActive) {
    return next(new AppError("ACCOUNT_INACTIVE", "Account is inactive.", 403));
  }

  req.user = payload; // { id, role, permissions[], departmentId, studentProfileId, ... }
  next();
};
```

### `core/middlewares/require-permission.middleware.ts`

```typescript
import { RequestHandler } from "express";
import { Permission } from "@prisma/client";
import { AppError } from "../errors/app-error";

export const requirePermission =
  (permission: Permission): RequestHandler =>
  (req, _res, next) => {
    if (!req.user!.permissions.includes(permission)) {
      return next(AppError.forbiddenRole(`Requires permission: ${permission}`));
    }
    next();
  };
```

### `core/middlewares/require-scope.middleware.ts`

A scope guard is just an async function `(req) => Promise<boolean>` — the
middleware factory is generic, the guards themselves live next to the
data they check (`core/scopes.ts` or co-located per module for
resource-specific ones).

```typescript
import { RequestHandler } from "express";
import { AppError } from "../errors/app-error";

type ScopeGuard = (req: import("express").Request) => Promise<boolean>;

export const requireScope =
  (guard: ScopeGuard): RequestHandler =>
  async (req, _res, next) => {
    const allowed = await guard(req);
    if (!allowed) return next(AppError.forbiddenScope());
    next();
  };
```

**Reusable scope guards (`core/scopes.ts`)** — implement R-1 through R-4
once, reuse everywhere:

```typescript
import { prisma } from "../config/prisma";
import { Request } from "express";

// R-2: department scope, resolved from a Section's Course
export async function departmentScopeForSection(req: Request): Promise<boolean> {
  if (req.user!.role === "SUPER_ADMIN" || req.user!.role === "ADMIN") return true;

  const result = await prisma.result.findUnique({
    where: { id: req.params.id },
    include: { section: { include: { course: true } } },
  });
  return result?.section.course.departmentId === req.user!.departmentId;
}

// R-3: course/section scope via CourseInstructor
export async function courseInstructorScope(req: Request): Promise<boolean> {
  const sectionId = req.body.sectionId ?? req.params.sectionId;
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) return false;

  const assignment = await prisma.courseInstructor.findUnique({
    where: {
      courseId_instructorId: { courseId: section.courseId, instructorId: req.user!.id },
    },
  });
  return !!assignment;
}

// R-1: self scope for a student-owned resource
export function selfScopeForStudent(req: Request): Promise<boolean> {
  return Promise.resolve(req.user!.studentProfileId === req.params.studentId);
}
```

Each guard is a small, independently testable function — `results`,
`attendance`, `assignments`, `exams`, and `grades` all reuse
`courseInstructorScope` unchanged, which is exactly what keeps R-3
enforced consistently instead of re-implemented five slightly-different
ways.

---

## 8. Cross-module communication rules

**The rule (repeated from §1):** a module only imports another module's
`*.service.ts` — never its `*.repository.ts`, `*.controller.ts`, or raw
Prisma calls. This is the entire enforcement mechanism for "modular" —
there is no build-time boundary in a single Express app, so this
convention is what keeps modules from silently coupling.

**Worked example:** `resultsService.create()` (§5) needs to confirm the
calling instructor is assigned to a section's course. That check reads
`CourseInstructor`, which conceptually belongs to the `academic-catalog`
module (Unit 4). Two valid options:

- **Option A (used above):** `academic-catalog` exposes a narrow,
  purpose-built repository function (`courseInstructorRepository
  .isInstructorForSection(...)`) that other modules may import directly,
  *because it's read-only and has no business logic of its own* — it's
  effectively part of `academic-catalog`'s public surface, just not
  routed through a full service method.
- **Option B (stricter):** expose
  `academicCatalogService.isInstructorAssignedToSection(...)` instead,
  keeping the repository fully private. Prefer this once the check grows
  any business logic beyond a single Prisma lookup (e.g. also checking
  `InstructorProfile.employmentStatus === "ACTIVE"`).

Pick one convention project-wide and apply it consistently — the
important part is that it's a **documented, narrow interface**, not an
unrestricted import of `../../other-module/whatever`.

**Never do this:**

```typescript
// results.service.ts — WRONG
import { prisma } from "../../../config/prisma";
const section = await prisma.section.findUnique(...); // bypasses academic-delivery module entirely
```

If `results` needs `Section` data, it goes through
`academicDeliveryService.getSectionById(...)`, not a direct Prisma call —
otherwise a future change to how sections are fetched (e.g. adding a
caching layer) has to be hunted down across every module that quietly
reached into Prisma directly.

---

## 9. Testing structure

Mirror the module structure under `tests/`, one test file per service
(services hold the business logic, so that's where the R-1..R-10 rules
actually get verified):

```
tests/
└── modules/
    └── student-academics/
        └── results/
            └── results.service.test.ts
```

```typescript
describe("resultsService.approve", () => {
  it("rejects self-approval (R-5)", async () => {
    const submitter = { id: "u1", role: "DEPARTMENT_HEAD", departmentId: "d1" };
    mockRepository.findById.mockResolvedValue({
      id: "r1", status: "SUBMITTED", submittedById: "u1",
    });

    await expect(resultsService.approve(submitter, "r1", {}))
      .rejects.toThrow("You cannot approve a result you submitted.");
  });

  it("rejects approval from DRAFT state", async () => {
    mockRepository.findById.mockResolvedValue({ id: "r1", status: "DRAFT" });

    await expect(resultsService.approve(otherHead, "r1", {}))
      .rejects.toThrow("Result must be SUBMITTED before approval.");
  });
});
```

Mock the repository, never a real database, in service tests — that's
what makes them fast enough to run on every save. Reserve real-database
integration tests (Prisma against a test PostgreSQL instance) for a
smaller set of end-to-end workflow tests that exercise a full HTTP
request through `supertest` — one per workflow in `API_INSTRUCTION.md`
§7 is enough (enrollment, result, payment, assignment submission).

---

## 10. Final folder tree

```
src/
├── app.ts
├── server.ts
├── config/
│   ├── env.ts
│   └── prisma.ts
├── core/
│   ├── middlewares/
│   │   ├── authenticate.middleware.ts
│   │   ├── require-permission.middleware.ts
│   │   ├── require-scope.middleware.ts
│   │   ├── validate.middleware.ts
│   │   └── error-handler.middleware.ts
│   ├── errors/app-error.ts
│   ├── response/envelope.ts
│   ├── scopes.ts
│   └── types/express.d.ts
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── jwt.ts
│   ├── users/                 (Unit 1)
│   ├── profiles/              (Unit 2 — one sub-folder per profile type)
│   ├── organization/          (Unit 3 — faculties, departments, programs)
│   ├── academic-catalog/      (Unit 4 — subjects, courses, course-instructors)
│   ├── academic-delivery/     (Unit 5 — sessions, semesters, sections, schedules)
│   ├── student-academics/     (Unit 6)
│   │   ├── enrollments/
│   │   ├── attendance/
│   │   ├── assignments/
│   │   ├── exams/
│   │   ├── grades/
│   │   └── results/           ← fully worked example above
│   ├── finance/                (Unit 7)
│   │   ├── invoices/
│   │   ├── payments/
│   │   ├── scholarships/
│   │   └── financial-transactions/   (read-only — no create/update files, R-9)
│   ├── communication/          (Unit 8)
│   │   ├── notices/
│   │   └── events/
│   └── system/                 (Unit 9)
│       ├── audit-logs/         (read-only — no create/update files, R-9)
│       └── system-settings/
└── routes/
    └── index.ts
```

**`routes/index.ts`** is the single place that wires every module's
router onto the app, keeping `app.ts` itself tiny:

```typescript
import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { resultsRoutes } from "../modules/student-academics/results/results.routes";
// ...one import per module

const router = Router();
router.use("/auth", authRoutes);
router.use("/results", resultsRoutes);
// ...one line per module, matching the paths in API_INSTRUCTION.md

export { router as v1Routes };
```
