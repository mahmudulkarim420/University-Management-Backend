
import httpStatus from "http-status";
import { AppError } from "../../../utils/AppError";
import { prisma } from "../../../lib/prisma";
import { ICreateCourseInstructor } from "./course-instructor.interface";


const createCourseInstructors = async (
	payload: ICreateCourseInstructor,
) => {
	const { courseId, instructorId, isPrimary = false } = payload;

	// Validate required fields
	if (!courseId || !instructorId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"courseId and instructorId are required",
		);
	}

	// Check if course exists
	const course = await prisma.course.findUnique({
		where: {
			id: courseId,
		},
	});

	if (!course) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Course not found",
		);
	}

	// Check if instructor/user exists
	const instructor = await prisma.user.findUnique({
		where: {
			id: instructorId,
		},
	});

	if (!instructor) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Instructor not found",
		);
	}

	// Optional: verify user role
	if (instructor.role !== "INSTRUCTOR") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Selected user is not an instructor",
		);
	}

	// Check if instructor is already assigned to this course
	const existingAssignment =
		await prisma.courseInstructor.findUnique({
			where: {
				courseId_instructorId: {
					courseId,
					instructorId,
				},
			},
		});

	if (existingAssignment) {
		throw new AppError(
			httpStatus.CONFLICT,
			"This instructor is already assigned to this course",
		);
	}

	// If this instructor will be primary,
	// remove primary status from existing instructors first
	if (isPrimary) {
		await prisma.courseInstructor.updateMany({
			where: {
				courseId,
				isPrimary: true,
			},
			data: {
				isPrimary: false,
			},
		});
	}

	// Create course instructor assignment
	const result = await prisma.courseInstructor.create({
		data: {
			courseId,
			instructorId,
			isPrimary,
		},
		include: {
			course: {
				select: {
					id: true,
					code: true,
					title: true,
				},
			},
			instructor: {
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

export const courseInstructorsService = {
	createCourseInstructors,
};

