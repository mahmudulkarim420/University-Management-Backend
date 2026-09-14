# University Management Swagger/OpenAPI Implementation

This document details the complete, clean, professional Swagger/OpenAPI documentation system implemented for the **University Management University Management Backend**.

---

## Swagger URL

- **Interactive Swagger UI**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **Raw OpenAPI JSON Specification**: [http://localhost:5000/api-docs.json](http://localhost:5000/api-docs.json)

---

## OpenAPI Version

- **OpenAPI 3.0.3**

---

## API Base URL

- **`http://localhost:5000`**
- All API routes are mounted under **`/api/v1`**

---

## Documented Modules

All **5 active modules** and **18 mounted endpoints** are fully documented:

| Module / Tag | Base Path | Endpoints Count | Key Capabilities |
|---|---|---|---|
| **Auth** | `/api/v1/auth` | 7 | Registration, Login, Current User, Token Refresh, Google OAuth, Password Recovery |
| **Profiles** | `/api/v1/profiles` | 2 | Health route, Student Profile creation |
| **Faculties** | `/api/v1/organization/faculties` | 2 | Faculty creation & listing |
| **Departments** | `/api/v1/organization/departments` | 3 | Department creation, listing with pagination/search, updating |
| **Programs** | `/api/v1/organization/programs` | 3 | Program creation, updating, fetching all |
| **Subjects** | `/api/v1/academic-catalog/subjects` | 1 | Subject creation |
| **Courses** | `/api/v1/academic-catalog/courses` | 1 | Course creation |
| **Course Instructors** | `/api/v1/academic-catalog/course-instructors` | 1 | Course instructor assignment |
| **Invoices** | `/api/v1/finance/invoices` | 2 | Student invoice creation (primary & alias route) |
| **Payments** | `/api/v1/finance/payments` | 1 | Invoice payment creation |
| **Stripe Webhook** | `/api/v1/finance/payments/webhook` | 1 | Stripe event webhook handler |

---

## Authentication

University Management uses **JWT Access Tokens** delivered through:
1. **HTTP-only Cookie**: `accessToken` cookie
2. **Bearer Auth Header**: `Authorization: Bearer <token>`

Swagger UI supports both authentication mechanisms through two OpenAPI security schemes:
- **`bearerAuth`**: Type `http`, scheme `bearer`, format `JWT`
- **`cookieAuth`**: Type `apiKey`, in `cookie`, name `accessToken`

Users can click the **Authorize** button in Swagger UI to enter their JWT access token for testing protected endpoints.

### Pre-configured Seed Credentials (.env)
The following pre-seeded test accounts are directly embedded in Swagger UI with selectable 1-click login request examples:

| Role | Email | Password |
|---|---|---|
| **SUPER_ADMIN** | `superadmin@gmail.com` | `Super@admin12345` |
| **ADMIN** | `admin@gmail.com` | `Admin@12345` |
| **DEPARTMENT_HEAD** | `departmenthead@gmail.com` | `DepartmentHead@12345` |
| **INSTRUCTOR** | `instructor@gmail.com` | `Instructor@12345` |
| **STUDENT** | `student@gmail.com` | `Student@12345` |
| **ACCOUNTANT** | `accountant@gmail.com` | `Accountant@12345` |

---

## RBAC (Role-Based Access Control)

Every protected endpoint in Swagger UI explicitly lists its authorization constraints in the description:

- **`SUPER_ADMIN`**: Faculty creation, Department creation/update, Program creation/update, Subject/Course/Instructor creation
- **`ADMIN`**: Department creation/update, Program creation/update, Subject/Course/Instructor creation, Invoice creation
- **`DEPARTMENT_HEAD`**: Subject creation, Course creation, Course-Instructor assignment
- **`STUDENT`**: Student profile creation, Invoice payment creation
- **`ACCOUNTANT`**: Invoice creation

---

## Request Schemas

All request bodies are strictly mapped to the backend's Zod validation schemas (`UserValidation`, `invoiceValidation`, `createPaymentValidationSchema`, etc.) and internal DTOs:

- `RegisterStudentInput`: Validation for name length (3-10), email format, password rules (lowercase, uppercase, digit, special character), and optional `studentProfile`.
- `LoginInput`: Email and password requirements.
- `ForgotPasswordInput`: Email formatting.
- `ResetPasswordInput`: Email, new password, and 6-digit OTP string.
- `GoogleLoginInput`: Google OAuth `idToken`.
- `CreateFacultyInput`: Code, name, description, deanUserId.
- `CreateDepartmentInput`: Faculty ID (UUID), code, name, description, headUserId (UUID).
- `CreateProgramInput`: Department ID, code, name, degreeType (`BACHELOR`, `MASTER`, `DOCTORATE`, `DIPLOMA`), durationYears, totalCredits.
- `CreateSubjectInput`: Code, title, description, subjectType (`THEORY`, `LAB`, `PROJECT`, `THESIS`), credit, isActive.
- `CreateCourseInput`: Department ID, Program ID, Subject ID, code, title, credit, level.
- `CreateInvoiceInput`: Student ID (UUID), description (1-255 chars), amount (monetary string regex `^\d+(\.\d{1,2})?$`), dueDate (ISO-8601 datetime string).
- `CreatePaymentInput`: Invoice ID (UUID), method (`CASH`, `CARD`, `BANK_TRANSFER`, `MOBILE_BANKING`, `OTHER`), gateway (`STRIPE`, `SSLCOMMERZ`, `BKASH`, `MANUAL`).

---

## Response Schemas

All endpoints standardise responses via University Management's `sendResponse` utility:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": {}
}
```

Paginated endpoints (e.g. `GET /api/v1/organization/departments/all`) return pagination metadata:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Retrieved All Departments Successfully",
  "data": {
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "totalPages": 5
    },
    "data": []
  }
}
```

---

## Error Responses

Error responses follow University Management's `globalErrorHandler`:

```json
{
  "success": false,
  "statusCode": 400,
  "name": "AppError",
  "message": "Error details",
  "error": {}
}
```

Standard error codes documented across Swagger endpoints:
- **`400 Bad Request`**: Validation errors, malformed JSON, duplicate keys.
- **`401 Unauthorized`**: Missing, invalid, or expired JWT token.
- **`403 Forbidden`**: Role authorization failure (e.g., student attempting to create invoices).
- **`404 Not Found`**: Resource or entity missing.
- **`409 Conflict`**: Duplicate code/email resource conflict.
- **`500 Internal Server Error`**: Server or unhandled execution errors.

---

## Stripe Webhook

- **Endpoint**: `POST /api/v1/finance/payments/webhook`
- **Security**: No JWT authentication required. Secured via Stripe Signature verification.
- **Header**: `stripe-signature` (Required)
- **Request Body**: Raw JSON request body parsed via `express.raw({ type: "application/json" })`.
- **Response**: `200 OK` (`{"success": true, "message": "Webhook received"}`) or `400 Bad Request` (`{"success": false, "message": "Invalid Stripe signature"}`).

---

## Manual Testing Results

| Test Case | Method & Route | Tested Payload / Header | Expected Status | Actual Status | Result |
|---|---|---|---|---|---|
| **Swagger UI Load** | `GET /api-docs/` | N/A | `200 OK` | `200 OK` | PASSED |
| **OpenAPI Spec JSON** | `GET /api-docs.json` | N/A | `200 OK` | `200 OK` | PASSED |
| **Registration** | `POST /api/v1/auth/register` | `{"name":"Tester","email":"...","password":"Password123!"}` | `201 Created` | `201 Created` | PASSED |
| **Authenticated Me** | `GET /api/v1/auth/me` | `Authorization: Bearer <token>` | `200 OK` | `200 OK` | PASSED |
| **RBAC Restriction** | `POST /api/v1/finance/invoices` | Student Bearer token | `403 Forbidden` | `403 Forbidden` | PASSED |
| **Stripe Webhook Signature Check** | `POST /api/v1/finance/payments/webhook` | Payload without `stripe-signature` header | `400 Bad Request` | `400 Bad Request` | PASSED |

---

## Undocumented / Unimplemented Backend Areas

The Prisma database schema contains additional models (such as `Attendance`, `Assignment`, `Exam`, `Result`, `Scholarship`, `AuditLog`, `SystemSetting`) for future modules.

**Status**: These database models currently have **no mounted REST API endpoints** in the Express application (`src/app.ts`) and were intentionally excluded from Swagger UI to keep the documentation 100% accurate to the live application.

---

## Conclusion & Readiness

Swagger/OpenAPI documentation system is **fully implemented, verified, type-safe, and ready for live manual API testing** directly from the browser at `http://localhost:5000/api-docs`.
