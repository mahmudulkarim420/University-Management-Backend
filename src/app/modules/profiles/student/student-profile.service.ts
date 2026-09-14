
import httpStatus from "http-status";
import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../utils/AppError";
import { ICreateStudentProfilePayload } from "./student-profile.interface";

const createStudentProfile = async (
    userId: string,
	payload: ICreateStudentProfilePayload,
) => {
	const { programId, ...profileData } = payload;

	// Check user exists
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
	});

	if (!user) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"User not found",
		);
	}

	// Check whether profile already exists
	const existingProfile = await prisma.studentProfile.findUnique({
		where: {
			userId,
		},
	});

	if (existingProfile) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Student profile already exists for this user",
		);
	}

	// If programId is provided, verify program exists
	if (programId) {
		const program = await prisma.program.findUnique({
			where: {
				id: programId,
			},
		});

		// if (!program) {
		// 	throw new AppError(
		// 		httpStatus.NOT_FOUND,
		// 		"Program not found",
		// 	);
		// }
	}

	// Create student profile
	const studentProfile = await prisma.studentProfile.create({
		data: {
			...profileData,

			user: {
				connect: {
					id: userId,
				},
			},

			// ...(programId && {
			// 	program: {
			// 		connect: {
			// 			id: programId,
			// 		},
			// 	},
			// }),
		},

		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
				},
			},
			program: true,
		},
	});

	return studentProfile;
};

export const studentProfileService = {
	createStudentProfile,
};


