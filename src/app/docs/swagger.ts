export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "University Management API Documentation",
    version: "1.0.0",
    description: `
# University Management Backend REST API

Welcome to the **University Management Backend API** documentation.

### Features & Capabilities
* **Authentication**: JWT-based auth via HTTP-only Cookies and Bearer Headers, Google OAuth, OTP password reset.
* **Role-Based Access Control (RBAC)**: Strictly enforced roles (\`SUPER_ADMIN\`, \`ADMIN\`, \`DEPARTMENT_HEAD\`, \`INSTRUCTOR\`, \`STUDENT\`, \`ACCOUNTANT\`).
* **Organization Hierarchy**: Faculties, Departments, and Programs.
* **Academic Catalog**: Subjects, Courses, and Course-Instructor assignments.
* **Finance & Payments**: Invoice generation, Student Payments, and Stripe Webhook integration.

---

### Pre-configured Seed User Credentials (.env)
Use these pre-seeded accounts to test endpoints with different RBAC permissions:

| Role | Email | Password |
|---|---|---|
| **SUPER_ADMIN** | \`superadmin@gmail.com\` | \`Super@admin12345\` |
| **ADMIN** | \`admin@gmail.com\` | \`Admin@12345\` |
| **DEPARTMENT_HEAD** | \`departmenthead@gmail.com\` | \`DepartmentHead@12345\` |
| **INSTRUCTOR** | \`instructor@gmail.com\` | \`Instructor@12345\` |
| **STUDENT** | \`student@gmail.com\` | \`Student@12345\` |
| **ACCOUNTANT** | \`accountant@gmail.com\` | \`Accountant@12345\` |

---

### Authentication Instructions
For protected endpoints:
1. Call \`POST /api/v1/auth/login\` with any set of credentials above.
2. The response sets an \`accessToken\` cookie and returns an access token in the response payload.
3. Click the **Authorize** button above to enter your Bearer token or rely on cookie authentication.
    `,
    contact: {
      name: "University Management Development Team",
      email: "support@universitymanagement.edu",
    },
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local Development Server",
    },
  ],
  tags: [
    { name: "Auth", description: "User registration, login, token refresh, OAuth, and password recovery" },
    { name: "Profiles", description: "Role-specific profile management" },
    { name: "Faculties", description: "University Faculty organizational units" },
    { name: "Departments", description: "Academic Departments under Faculties" },
    { name: "Programs", description: "Degree programs offered by Departments" },
    { name: "Subjects", description: "Academic subjects in catalog" },
    { name: "Courses", description: "Course offerings linked to subjects, programs & departments" },
    { name: "Course Instructors", description: "Assignments of instructors to courses" },
    { name: "Invoices", description: "Student fee invoicing and billing management" },
    { name: "Payments", description: "Invoice payment processing" },
    { name: "Stripe Webhook", description: "Stripe payment gateway webhook receiver" },
  ],
  paths: {
    "/api/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new Student account",
        description: "Public endpoint to register a new student account with optional initial profile details.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterStudentInput" },
              example: {
                name: "John",
                email: "john.doe@example.com",
                password: "Password123!",
                studentProfile: {
                  phone: "+1234567890",
                  address: "123 Campus Way",
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Student registered successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "400": {
            description: "Validation error or User with email already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Authenticate user and issue JWT tokens",
        description: "Public endpoint to authenticate with email and password. Sets an HTTP-only \`refreshToken\` cookie and returns tokens.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginInput" },
              examples: {
                admin: {
                  summary: "ADMIN Login",
                  value: {
                    email: "admin@gmail.com",
                    password: "Admin@12345",
                  },
                },
                superAdmin: {
                  summary: "SUPER_ADMIN Login",
                  value: {
                    email: "superadmin@gmail.com",
                    password: "Super@admin12345",
                  },
                },
                departmentHead: {
                  summary: "DEPARTMENT_HEAD Login",
                  value: {
                    email: "departmenthead@gmail.com",
                    password: "DepartmentHead@12345",
                  },
                },
                instructor: {
                  summary: "INSTRUCTOR Login",
                  value: {
                    email: "instructor@gmail.com",
                    password: "Instructor@12345",
                  },
                },
                student: {
                  summary: "STUDENT Login",
                  value: {
                    email: "student@gmail.com",
                    password: "Student@12345",
                  },
                },
                accountant: {
                  summary: "ACCOUNTANT Login",
                  value: {
                    email: "accountant@gmail.com",
                    password: "Accountant@12345",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User logged in successfully",
            headers: {
              "Set-Cookie": {
                schema: { type: "string" },
                description: "Sets accessToken and refreshToken cookies",
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "400": {
            description: "Invalid credentials or missing user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "403": {
            description: "User account is inactive or blocked",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user identity & profile",
        description: `
**Authentication Required**: YES  
**Allowed Roles**: \`SUPER_ADMIN\`, \`ADMIN\`, \`DEPARTMENT_HEAD\`, \`INSTRUCTOR\`, \`STUDENT\`, \`ACCOUNTANT\`

Retrieves identity info and role-specific profile details for the currently logged-in user.
        `,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          "200": {
            description: "User profile details retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized — missing or invalid JWT token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/refresh-token": {
      post: {
        tags: ["Auth"],
        summary: "Issue a new access token using a refresh token",
        description: "Public endpoint reading the \`refreshToken\` cookie to generate a fresh JWT access token.",
        security: [],
        responses: {
          "200": {
            description: "Access token refreshed successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "401": {
            description: "Invalid or expired refresh token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/google": {
      post: {
        tags: ["Auth"],
        summary: "Authenticate or register via Google OAuth ID Token",
        description: "Validates a Google ID token. If the user does not exist, registers them with role \`STUDENT\`.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GoogleLoginInput" },
              example: {
                idToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Google login/registration successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "400": {
            description: "Invalid Google token or account error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset OTP",
        description: "Generates a 6-digit OTP and emails it to the user if the account exists.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ForgotPasswordInput" },
              example: {
                email: "john.doe@example.com",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password reset OTP sent to email",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "400": {
            description: "User not found or email delivery failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using OTP",
        description: "Validates the 6-digit OTP and resets the user's password.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResetPasswordInput" },
              example: {
                email: "john.doe@example.com",
                newPassword: "NewPassword123!",
                otp: "123456",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password reset successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "400": {
            description: "Invalid or expired OTP",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/profiles/student/profile": {
      get: {
        tags: ["Profiles"],
        summary: "Student profile health route",
        description: "Simple test endpoint returning profile module route status.",
        security: [],
        responses: {
          "200": {
            description: "Route status response",
            content: {
              "text/plain": {
                example: "Student Profile Route",
              },
            },
          },
        },
      },
    },
    "/api/v1/profiles/student/create-profile": {
      post: {
        tags: ["Profiles"],
        summary: "Create Student Profile details",
        description: `
**Authentication Required**: YES  
**Allowed Roles**: \`STUDENT\`

Populates additional profile attributes for the logged-in student user.
        `,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateStudentProfileInput" },
              example: {
                phone: "+1987654321",
                address: "456 University Housing",
                bloodGroup: "O+",
                guardianName: "Jane Doe",
                guardianPhone: "+1987654322",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Student profile created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden — role restriction (\`STUDENT\` required)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/organization/faculties/create": {
      post: {
        tags: ["Faculties"],
        summary: "Create a new Faculty",
        description: `
**Authentication Required**: YES  
**Allowed Roles**: \`SUPER_ADMIN\`

Creates a new top-level university Faculty unit.
        `,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateFacultyInput" },
              example: {
                code: "ENG",
                name: "Faculty of Engineering",
                description: "Engineering and technology disciplines",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Faculty created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "409": {
            description: "Faculty code already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden — requires \`SUPER_ADMIN\` role",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/organization/faculties/all": {
      get: {
        tags: ["Faculties"],
        summary: "List all Faculties",
        description: "Retrieves all active faculties along with Dean user information.",
        security: [],
        responses: {
          "200": {
            description: "Faculties retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/organization/departments/create": {
      post: {
        tags: ["Departments"],
        summary: "Create a new Department",
        description: `
**Authentication Required**: YES  
**Allowed Roles**: \`SUPER_ADMIN\`, \`ADMIN\`

Creates an academic Department under an existing Faculty.
        `,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateDepartmentInput" },
              example: {
                facultyId: "550e8400-e29b-41d4-a716-446655440000",
                code: "CSE",
                name: "Computer Science and Engineering",
                description: "Department of CSE",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Department created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "404": {
            description: "Faculty not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "409": {
            description: "Department code conflict",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/organization/departments/all": {
      get: {
        tags: ["Departments"],
        summary: "List Departments with filtering & pagination",
        description: "Retrieves paginated departments with optional search and faculty filter.",
        security: [],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Page number" },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 }, description: "Records per page" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by code or name" },
          { name: "facultyId", in: "query", schema: { type: "string", format: "uuid" }, description: "Filter by Faculty UUID" },
          { name: "isActive", in: "query", schema: { type: "boolean" }, description: "Filter active status" },
        ],
        responses: {
          "200": {
            description: "Departments retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessPaginatedResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/organization/departments/{id}": {
      patch: {
        tags: ["Departments"],
        summary: "Update Department by ID",
        description: `
**Authentication Required**: YES  
**Allowed Roles**: \`SUPER_ADMIN\`, \`ADMIN\`
        `,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Department UUID" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateDepartmentInput" },
              example: {
                name: "Updated Computer Science Department",
                description: "Updated description",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Department updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "404": {
            description: "Department not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/organization/programs/create": {
      post: {
        tags: ["Programs"],
        summary: "Create a new Degree Program",
        description: `
**Authentication Required**: YES  
**Allowed Roles**: \`SUPER_ADMIN\`, \`ADMIN\`

Creates an academic degree program under a department.
        `,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProgramInput" },
              example: {
                departmentId: "550e8400-e29b-41d4-a716-446655440000",
                code: "BSC-CSE",
                name: "B.Sc. in Computer Science & Engineering",
                degreeType: "BACHELOR",
                durationYears: 4,
                totalCredits: 160,
                description: "Four-year undergraduate degree program",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Program created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "404": {
            description: "Department not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "409": {
            description: "Program code already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/organization/programs/update/{id}": {
      patch: {
        tags: ["Programs"],
        summary: "Update Academic Program by ID",
        description: `
**Authentication Required**: YES  
**Allowed Roles**: \`SUPER_ADMIN\`, \`ADMIN\`
        `,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Program UUID" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProgramInput" },
              example: {
                name: "B.Sc. in CSE (Software Engineering Specialization)",
                totalCredits: 162,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Program updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "404": {
            description: "Program not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/organization/programs/all": {
      post: {
        tags: ["Programs"],
        summary: "Fetch all Academic Programs",
        description: "Retrieves list of all active non-deleted academic programs.",
        security: [],
        responses: {
          "200": {
            description: "Programs retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/academic-catalog/subjects/create": {
      post: {
        tags: ["Subjects"],
        summary: "Create a Subject",
        description: `
**Authentication Required**: YES  
**Allowed Roles**: \`SUPER_ADMIN\`, \`ADMIN\`, \`DEPARTMENT_HEAD\`
        `,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateSubjectInput" },
              example: {
                code: "CSE-101",
                title: "Structured Programming",
                description: "Introduction to C programming concepts",
                subjectType: "THEORY",
                credit: 3.0,
                isActive: true,
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Subject created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "409": {
            description: "Subject code already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/academic-catalog/courses/create": {
      post: {
        tags: ["Courses"],
        summary: "Create a Course",
        description: `
**Authentication Required**: YES  
**Allowed Roles**: \`SUPER_ADMIN\`, \`ADMIN\`, \`DEPARTMENT_HEAD\`
        `,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCourseInput" },
              example: {
                departmentId: "550e8400-e29b-41d4-a716-446655440000",
                programId: "550e8400-e29b-41d4-a716-446655440001",
                subjectId: "550e8400-e29b-41d4-a716-446655440002",
                code: "CSE-101-FALL26",
                title: "Structured Programming Fall 2026",
                credit: 3.0,
                level: 1,
                isActive: true,
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Course created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "404": {
            description: "Department, Program, or Subject not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/academic-catalog/course-instructors/create": {
      post: {
        tags: ["Course Instructors"],
        summary: "Assign Instructor to Course",
        description: `
**Authentication Required**: YES  
**Allowed Roles**: \`SUPER_ADMIN\`, \`ADMIN\`, \`DEPARTMENT_HEAD\`
        `,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCourseInstructorInput" },
              example: {
                courseId: "550e8400-e29b-41d4-a716-446655440000",
                instructorId: "550e8400-e29b-41d4-a716-446655440001",
                isPrimary: true,
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Instructor assigned to course successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "400": {
            description: "Selected user is not an instructor",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "409": {
            description: "Instructor is already assigned to this course",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/finance/invoices": {
      post: {
        tags: ["Invoices"],
        summary: "Create Student Fee Invoice",
        description: `
**Authentication Required**: YES  
**Allowed Roles**: \`ACCOUNTANT\`, \`ADMIN\`

Creates an official invoice for a student. Secured strictly to billing authorities.
        `,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateInvoiceInput" },
              example: {
                studentId: "550e8400-e29b-41d4-a716-446655440000",
                description: "Semester Tuition Fee - Fall 2026",
                amount: "1500.00",
                dueDate: "2026-10-31T23:59:59.000Z",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Invoice created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "400": {
            description: "Validation error or invalid monetary amount",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden — requires \`ACCOUNTANT\` or \`ADMIN\` role",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/finance/invoices/create": {
      post: {
        tags: ["Invoices"],
        summary: "Create Student Fee Invoice (Alias Endpoint)",
        description: `
**Authentication Required**: YES  
**Allowed Roles**: \`ACCOUNTANT\`, \`ADMIN\`

Alias route for invoice creation.
        `,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateInvoiceInput" },
              example: {
                studentId: "550e8400-e29b-41d4-a716-446655440000",
                description: "Lab & Library Fees - Fall 2026",
                amount: "300.00",
                dueDate: "2026-10-31T23:59:59.000Z",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Invoice created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden — requires \`ACCOUNTANT\` or \`ADMIN\` role",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/finance/payments/create": {
      post: {
        tags: ["Payments"],
        summary: "Create Invoice Payment",
        description: `
**Authentication Required**: YES  
**Allowed Roles**: \`STUDENT\`

Submits a payment attempt for an unpaid student invoice.
        `,
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePaymentInput" },
              example: {
                invoiceId: "550e8400-e29b-41d4-a716-446655440000",
                method: "CARD",
                gateway: "STRIPE",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Payment created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/finance/payments/webhook": {
      post: {
        tags: ["Stripe Webhook"],
        summary: "Stripe Payment Gateway Webhook Receiver",
        description: `
**Authentication Required**: NO (Secured via Stripe Signature Header)  
**Header Required**: \`stripe-signature\`

Processes incoming Stripe webhook events (e.g. \`checkout.session.completed\`, \`payment_intent.succeeded\`).
Express consumes the raw request body (\`express.raw()\`) before JSON parsing to compute HMAC signatures.
        `,
        security: [],
        parameters: [
          {
            name: "stripe-signature",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "Stripe HMAC signature header sent by Stripe servers",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                description: "Raw Stripe Event Payload",
              },
              example: {
                id: "evt_1M0000000000000000000000",
                type: "checkout.session.completed",
                data: {
                  object: {
                    id: "cs_test_a1b2c3d4",
                    payment_status: "paid",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Webhook event received and processed successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Webhook received",
                },
              },
            },
          },
          "400": {
            description: "Invalid Stripe signature or payload parsing failure",
            content: {
              "application/json": {
                example: {
                  success: false,
                  message: "Invalid Stripe signature",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT Access Token (without 'Bearer ' prefix). Example: 'eyJhbGci...'",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "accessToken",
        description: "HTTP-Only cookie named 'accessToken'",
      },
    },
    schemas: {
      ApiSuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          statusCode: { type: "integer", example: 200 },
          message: { type: "string", example: "Operation completed successfully" },
          data: { type: "object", nullable: true },
        },
      },
      ApiSuccessPaginatedResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          statusCode: { type: "integer", example: 200 },
          message: { type: "string", example: "Data retrieved successfully" },
          data: {
            type: "object",
            properties: {
              meta: {
                type: "object",
                properties: {
                  page: { type: "integer", example: 1 },
                  limit: { type: "integer", example: 10 },
                  total: { type: "integer", example: 42 },
                  totalPages: { type: "integer", example: 5 },
                },
              },
              data: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
      ApiErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          statusCode: { type: "integer", example: 400 },
          name: { type: "string", example: "AppError" },
          message: { type: "string", example: "An error occurred" },
          error: { type: "object", nullable: true },
        },
      },
      RegisterStudentInput: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", minLength: 3, maxLength: 10, example: "John" },
          email: { type: "string", format: "email", example: "john.doe@example.com" },
          password: {
            type: "string",
            minLength: 8,
            description: "Must contain at least 1 lowercase, 1 uppercase, 1 digit, and 1 special character",
            example: "Password123!",
          },
          studentProfile: {
            type: "object",
            properties: {
              programId: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
              dateOfBirth: { type: "string", example: "2000-01-15" },
              gender: { type: "string", enum: ["MALE", "FEMALE", "OTHER"], example: "MALE" },
              phone: { type: "string", example: "+1234567890" },
              address: { type: "string", example: "123 Campus Way" },
              bloodGroup: { type: "string", example: "O+" },
              guardianName: { type: "string", example: "Jane Doe" },
              guardianPhone: { type: "string", example: "+1987654321" },
            },
          },
        },
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@gmail.com" },
          password: { type: "string", example: "Password123!" },
        },
      },
      ForgotPasswordInput: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", example: "user@example.com" },
        },
      },
      ResetPasswordInput: {
        type: "object",
        required: ["email", "newPassword", "otp"],
        properties: {
          email: { type: "string", format: "email", example: "user@example.com" },
          newPassword: { type: "string", minLength: 8, example: "NewPassword123!" },
          otp: { type: "string", minLength: 6, maxLength: 6, example: "123456" },
        },
      },
      GoogleLoginInput: {
        type: "object",
        required: ["idToken"],
        properties: {
          idToken: { type: "string", example: "eyJhbGciOiJSUzI1NiIs..." },
        },
      },
      CreateStudentProfileInput: {
        type: "object",
        properties: {
          programId: { type: "string", format: "uuid" },
          dateOfBirth: { type: "string" },
          gender: { type: "string", enum: ["MALE", "FEMALE", "OTHER"] },
          phone: { type: "string" },
          address: { type: "string" },
          bloodGroup: { type: "string" },
          guardianName: { type: "string" },
          guardianPhone: { type: "string" },
        },
      },
      CreateFacultyInput: {
        type: "object",
        required: ["code", "name"],
        properties: {
          code: { type: "string", example: "ENG" },
          name: { type: "string", example: "Faculty of Engineering" },
          description: { type: "string", example: "Engineering & Applied Sciences" },
          deanUserId: { type: "string", format: "uuid", nullable: true },
        },
      },
      CreateDepartmentInput: {
        type: "object",
        required: ["facultyId", "code", "name"],
        properties: {
          facultyId: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
          code: { type: "string", example: "CSE" },
          name: { type: "string", example: "Computer Science & Engineering" },
          description: { type: "string", example: "Department of CSE" },
          headUserId: { type: "string", format: "uuid", nullable: true },
        },
      },
      UpdateDepartmentInput: {
        type: "object",
        properties: {
          facultyId: { type: "string", format: "uuid" },
          code: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          headUserId: { type: "string", format: "uuid", nullable: true },
          isActive: { type: "boolean" },
        },
      },
      CreateProgramInput: {
        type: "object",
        required: ["departmentId", "code", "name", "degreeType", "durationYears", "totalCredits"],
        properties: {
          departmentId: { type: "string", format: "uuid" },
          code: { type: "string", example: "BSC-CSE" },
          name: { type: "string", example: "B.Sc. in Computer Science" },
          degreeType: { type: "string", enum: ["BACHELOR", "MASTER", "DOCTORATE", "DIPLOMA"], example: "BACHELOR" },
          durationYears: { type: "integer", example: 4 },
          totalCredits: { type: "number", example: 160 },
          description: { type: "string" },
        },
      },
      UpdateProgramInput: {
        type: "object",
        properties: {
          departmentId: { type: "string", format: "uuid" },
          code: { type: "string" },
          name: { type: "string" },
          degreeType: { type: "string", enum: ["BACHELOR", "MASTER", "DOCTORATE", "DIPLOMA"] },
          durationYears: { type: "integer" },
          totalCredits: { type: "number" },
          description: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
      CreateSubjectInput: {
        type: "object",
        required: ["code", "title", "subjectType", "credit"],
        properties: {
          code: { type: "string", example: "CSE-101" },
          title: { type: "string", example: "Structured Programming" },
          description: { type: "string", example: "C programming fundamentals" },
          subjectType: { type: "string", enum: ["THEORY", "LAB", "PROJECT", "THESIS"], example: "THEORY" },
          credit: { type: "number", example: 3.0 },
          isActive: { type: "boolean", default: true },
        },
      },
      CreateCourseInput: {
        type: "object",
        required: ["departmentId", "programId", "subjectId", "code", "title", "credit", "level"],
        properties: {
          departmentId: { type: "string", format: "uuid" },
          programId: { type: "string", format: "uuid" },
          subjectId: { type: "string", format: "uuid" },
          code: { type: "string", example: "CSE-101-FALL26" },
          title: { type: "string", example: "Structured Programming Fall 2026" },
          description: { type: "string" },
          credit: { type: "number", example: 3.0 },
          level: { type: "integer", example: 1 },
          isActive: { type: "boolean", default: true },
        },
      },
      CreateCourseInstructorInput: {
        type: "object",
        required: ["courseId", "instructorId"],
        properties: {
          courseId: { type: "string", format: "uuid" },
          instructorId: { type: "string", format: "uuid" },
          isPrimary: { type: "boolean", default: false },
        },
      },
      CreateInvoiceInput: {
        type: "object",
        required: ["studentId", "description", "amount", "dueDate"],
        properties: {
          studentId: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
          description: { type: "string", maxLength: 255, example: "Semester Tuition Fee - Fall 2026" },
          amount: { type: "string", pattern: "^\\d+(\\.\\d{1,2})?$", example: "1500.00" },
          dueDate: { type: "string", format: "date-time", example: "2026-10-31T23:59:59.000Z" },
        },
      },
      CreatePaymentInput: {
        type: "object",
        required: ["invoiceId", "method", "gateway"],
        properties: {
          invoiceId: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
          method: { type: "string", enum: ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_BANKING", "OTHER"], example: "CARD" },
          gateway: { type: "string", enum: ["STRIPE", "SSLCOMMERZ", "BKASH", "MANUAL"], example: "STRIPE" },
        },
      },
    },
  },
};
