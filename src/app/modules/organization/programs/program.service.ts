
import httpStatus from "http-status";
import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../utils/AppError";
import type { ICreateProgramPayload, IUpdateProgram } from "./program.interface";
import { DegreeType } from "../../../../generated/prisma/enums";

const createProgram = async (payload: ICreateProgramPayload) => {
	const {
		departmentId,
		code,
		name,
		degreeType,
		durationYears,
		totalCredits,
		description,
	} = payload;

	// Check if department exists
	const department = await prisma.department.findUnique({
		where: {
			id: departmentId,
		},
		select: {
			id: true,
			isDeleted: true,
		},
	});

	if (!department || department.isDeleted) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Department not found or has been deleted",
		);
	}

	// Check duplicate program code
	const existingProgram = await prisma.program.findUnique({
		where: {
			code,
		},
		select: {
			id: true,
		},
	});

	if (existingProgram) {
		throw new AppError(
			httpStatus.CONFLICT,
			`Program with code "${code}" already exists`,
		);
	}

	// Create program
	const program = await prisma.program.create({
		data: {
			departmentId,
			code,
			name,
			degreeType,
			durationYears,
			totalCredits,
			description,
		},
		select: {
			id: true,
			code: true,
			name: true,
			degreeType: true,
			durationYears: true,
			totalCredits: true,
			description: true,
			isActive: true,
			isDeleted: true,
			createdAt: true,
			updatedAt: true,
			department: {
				select: {
					id: true,
					code: true,
					name: true,
				},
			},
		},
	});

	return program;
};







const updateProgram = async (
	id: string,
	payload: IUpdateProgram
) => {
	// Check if program exists
	const existingProgram = await prisma.program.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingProgram) {
		throw new AppError(404, "Program not found");
	}

	// Check department if departmentId is being updated
	if (payload.departmentId) {
		const department = await prisma.department.findFirst({
			where: {
				id: payload.departmentId,
				isDeleted: false,
			},
		});

		if (!department) {
			throw new AppError(404, "Department not found");
		}
	}

	// Check duplicate program code
	if (payload.code && payload.code !== existingProgram.code) {
		const existingCode = await prisma.program.findUnique({
			where: {
				code: payload.code,
			},
		});

		if (existingCode) {
			throw new AppError(409, "Program code already exists");
		}
	}

	// Update program
	const updatedProgram = await prisma.program.update({
		where: {
			id,
		},
		data: {
			...(payload.departmentId && {
				departmentId: payload.departmentId,
			}),

			...(payload.code && {
				code: payload.code,
			}),

			...(payload.name && {
				name: payload.name,
			}),

			...(payload.degreeType && {
				degreeType: payload.degreeType as DegreeType,
			}),

			...(payload.durationYears !== undefined && {
				durationYears: payload.durationYears,
			}),

			...(payload.totalCredits !== undefined && {
				totalCredits: payload.totalCredits,
			}),

			...(payload.description !== undefined && {
				description: payload.description,
			}),

			...(payload.isActive !== undefined && {
				isActive: payload.isActive,
			}),
		},
		include: {
			department: {
				select: {
					id: true,
					code: true,
					name: true,
				},
			},
		},
	});

	return updatedProgram;
};
















const getAllPrograms = async () => {
	const programs = await prisma.program.findMany({
		where: {
			isDeleted: false,
		},
		select: {
			id: true,
			code: true,
			name: true,
			degreeType: true,
			durationYears: true,
			totalCredits: true,
			description: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,

			department: {
				select: {
					id: true,
					code: true,
					name: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	return programs;
};








export const programsService = {
	createProgram,
    updateProgram,
    getAllPrograms,


};
