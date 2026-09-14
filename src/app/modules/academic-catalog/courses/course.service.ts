import { prisma } from "../../../lib/prisma";
import { ICreateCoursePayload } from "./course.interface";

const createCourse = async (payload: ICreateCoursePayload) => {
	const {
		departmentId,
		programId,
		subjectId,
		code,
		title,
		description,
		credit,
		level,
		isActive = true,
	} = payload;

	// Check if course code already exists
	const existingCourse = await prisma.course.findUnique({
		where: {
			code,
		},
	});

	if (existingCourse) {
		throw new Error("Course with this code already exists");
	}

	// Check Department
	const department = await prisma.department.findUnique({
		where: {
			id: departmentId,
		},
	});

	if (!department) {
		throw new Error("Department not found");
	}

	// Check Program
	const program = await prisma.program.findUnique({
		where: {
			id: programId,
		},
	});

	if (!program) {
		throw new Error("Program not found");
	}

	// Check Subject
	const subject = await prisma.subject.findUnique({
		where: {
			id: subjectId,
		},
	});

	if (!subject) {
		throw new Error("Subject not found");
	}

	// Create Course
	const course = await prisma.course.create({
		data: {
			departmentId,
			programId,
			subjectId,
			code,
			title,
			description,
			credit,
			level,
			isActive,
		},
		include: {
			department: {
				select: {
					id: true,
					code: true,
					name: true,
				},
			},
			program: {
				select: {
					id: true,
					code: true,
					name: true,
				},
			},
			subject: {
				select: {
					id: true,
					code: true,
					title: true,
				},
			},
		},
	});

	return course;
};





export const coursesService = {
	createCourse,
};
