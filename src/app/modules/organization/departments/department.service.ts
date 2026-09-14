import httpStatus from "http-status";

import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../utils/AppError";
import { CreateDepartmentPayload, GetAllDepartmentsPayload, IUpdateDepartmentPayload } from "./department.interface";
import { Role } from "../../../../generated/prisma/enums";




const createDepartment = async (payload: CreateDepartmentPayload) => {
	const {
		facultyId,
		code,
		name,
		description,
		headUserId,
	} = payload;

	// 1. Check faculty exists
	const faculty = await prisma.faculty.findFirst({
		where: {
			id: facultyId,
			isDeleted: false,
			isActive: true,
		},
	});

	if (!faculty) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Faculty not found or inactive",
		);
	}

	// 2. Check duplicate department code
	const existingDepartment = await prisma.department.findUnique({
		where: {
			code,
		},
	});

	if (existingDepartment) {
		throw new AppError(
			httpStatus.CONFLICT,
			"A department with this code already exists",
		);
	}

	// 3. Validate department head if provided
	if (headUserId) {
		const headUser = await prisma.user.findUnique({
			where: {
				id: headUserId,
			},
			select: {
				id: true,
				role: true,
				departmentId: true,
			},
		});

		if (!headUser) {
			throw new AppError(
				httpStatus.NOT_FOUND,
				"Department head user not found",
			);
		}

		// User must have DEPARTMENT_HEAD role
		if (headUser.role !== Role.DEPARTMENT_HEAD) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Selected user is not a Department Head",
			);
		}

		// User must belong to this department.
		// IMPORTANT:
		// At department creation time, department does not exist yet,
		// so headUser.departmentId cannot equal this new department ID.
		//
		// Therefore, if your business flow requires assigning the head
		// during department creation, this validation should happen
		// AFTER the department is created.
	}

	// 4. Create department
	const department = await prisma.department.create({
		data: {
			facultyId,
			code,
			name,
			description,
			headUserId: headUserId ?? null,
		},
		include: {
			faculty: {
				select: {
					id: true,
					code: true,
					name: true,
				},
			},
			head: {
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
				},
			},
		},
	});

	return department;
};





// Example requests and filtering 
// GET /api/departments
// GET /api/departments?page=1&limit=10
// GET /api/departments?search=computer
// GET /api/departments?search=computer
// GET /api/departments?facultyId=550e8400-e29b-41d4-a716-446655440000
// GET /api/departments?isActive=true
// GET /api/departments?page=1&limit=10&search=computer&facultyId=550e8400-e29b-41d4-a716-446655440000&isActive=true

const getAllDepartments = async (
	payload: GetAllDepartmentsPayload,
) => {
	const {
		page = 1,
		limit = 10,
		search,
		facultyId,
		isActive,
	} = payload;

	const skip = (page - 1) * limit;

	const where = {
		isDeleted: false,

		...(facultyId && {
			facultyId,
		}),

		...(isActive !== undefined && {
			isActive,
		}),

		...(search && {
			OR: [
				{
					name: {
						contains: search,
						mode: "insensitive" as const,
					},
				},
				{
					code: {
						contains: search,
						mode: "insensitive" as const,
					},
				},
			],
		}),
	};

	const [departments, total] = await prisma.$transaction([
		prisma.department.findMany({
			where,
			skip,
			take: limit,

			orderBy: {
				createdAt: "desc",
			},

			select: {
				id: true,
				code: true,
				name: true,
				description: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,

				faculty: {
					select: {
						id: true,
						code: true,
						name: true,
					},
				},

				head: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},

				_count: {
					select: {
						users: true,
						programs: true,
						courses: true,
					},
				},
			},
		}),

		prisma.department.count({
			where,
		}),
	]);

	return {
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},

		data: departments,
	};
};










const updateDepartment = async (id: string, payload: IUpdateDepartmentPayload) => {
  // 1. Check if department exists and is not soft-deleted
  const existingDepartment = await prisma.department.findFirst({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!existingDepartment) {
    throw new AppError(httpStatus.NOT_FOUND, "Department not found");
  }

  // 2. If code is being updated, check uniqueness
  if (payload.code && payload.code !== existingDepartment.code) {
    const codeExists = await prisma.department.findFirst({
      where: {
        code: payload.code as string,
        isDeleted: false,
        NOT: { id },
      },
    });

    if (codeExists) {
      throw new AppError(httpStatus.CONFLICT, "Department code already exists");
    }
  }

  // 3. Optional but recommended: Validate headUserId (as per your model comment)
  if (payload.headUserId) {
    const headUser = await prisma.user.findFirst({
      where: {
        id: payload.headUserId as string,
        role: "DEPARTMENT_HEAD",
        departmentId: id, // must belong to this department
        isDeleted: false,
      },
    });

    if (!headUser) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Invalid department head. User must have role DEPARTMENT_HEAD and belong to this department"
      );
    }
  }

  // 4. Perform the update
  const result = await prisma.department.update({
    where: { id },
    data: {
      ...payload,
      // Protect sensitive fields (optional but recommended)
      isDeleted: undefined,
      deletedAt: undefined,
    },
    include: {
      faculty: true,
      head: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return result;
};
























export const departmentsService = {
	createDepartment,
    getAllDepartments,
	updateDepartment,

};







