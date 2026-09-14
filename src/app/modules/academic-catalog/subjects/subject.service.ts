



import httpStatus from "http-status";
import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../utils/AppError";
import { ICreateSubject } from "./subject.interface";


const createSubject = async (payload: ICreateSubject) => {
	const { code, title, description, subjectType, credit, isActive } = payload;

	// Check if subject already exists
	const isSubjectExists = await prisma.subject.findUnique({
		where: {
			code,
		},
	});

	if (isSubjectExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Subject with this code already exists",
		);
	}

	const subject = await prisma.subject.create({
		data: {
			code,
			title,
			description,
			subjectType,
			credit,
			isActive: isActive ?? true,
		},
	});

	return subject;
};
























export const subjectsService = {
	createSubject,
};

