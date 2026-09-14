import httpStatus from "http-status";
import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../utils/AppError";
import { ICreateFacultyPayload } from "./faculty.interface";

const createFaculty = async (payload: ICreateFacultyPayload) => {
	const { code, name, description, deanUserId } = payload;

	// Check if faculty already exists
	const existingFaculty = await prisma.faculty.findUnique({
		where: {
			code,
		},
	});

	if (existingFaculty) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Faculty with this code already exists",
		);
	}

	// If deanUserId is provided, verify that user exists
	if (deanUserId) {
		const deanUser = await prisma.user.findUnique({
			where: {
				id: deanUserId,
			},
		});

		// if (!deanUser) {
		// 	throw new AppError(
		// 		httpStatus.NOT_FOUND,
		// 		"Dean user not found",
		// 	);
		// }
	}

	// Create faculty
	const faculty = await prisma.faculty.create({
		data: {
			code,
			name,
			description,
			deanUserId,
		},
		include: {
			dean: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
		},
	});

	return faculty;
};


const getAllFaculties = async () => {
	const faculties = await prisma.faculty.findMany({
		select: {
			id: true,
			code: true,
			name: true,
			description: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,

			dean: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
		},
	});

	return faculties;
};






export const facultyService = {
	createFaculty,
	getAllFaculties,
};
