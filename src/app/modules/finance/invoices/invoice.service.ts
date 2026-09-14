import httpStatus from "http-status";
import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../utils/AppError";

// import prisma from "../../../shared/prisma";
// import AppError from "../../../errors/AppError";

interface ICreateInvoicePayload {
	studentId: string;
	description?: string;
	amount: number;
	dueDate: string | Date;
}

/**
 * Generate a unique invoice number.
 *
 * Example:
 * INV-20260904-0001
 */
const generateInvoiceNumber = async (): Promise<string> => {
	const date = new Date();

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	const prefix = `INV-${year}${month}${day}`;

	const lastInvoice = await prisma.invoice.findFirst({
		where: {
			invoiceNumber: {
				startsWith: prefix,
			},
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			invoiceNumber: true,
		},
	});

	let sequence = 1;

	if (lastInvoice) {
		const lastSequence = Number(
			lastInvoice.invoiceNumber.split("-").pop()
		);

		if (!isNaN(lastSequence)) {
			sequence = lastSequence + 1;
		}
	}

	return `${prefix}-${String(sequence).padStart(4, "0")}`;
};

const createInvoice = async (
	payload: ICreateInvoicePayload
) => {
	const {
		studentId,
		description,
		amount,
		dueDate,
	} = payload;

	// ----------------------------------------
	// 1. Validate required fields
	// ----------------------------------------
	if (!studentId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Student ID is required"
		);
	}

	if (amount === undefined || amount === null) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invoice amount is required"
		);
	}

	if (Number(amount) <= 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invoice amount must be greater than 0"
		);
	}

	if (!dueDate) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Due date is required"
		);
	}

	// ----------------------------------------
	// 2. Check student exists
	// ----------------------------------------
	const student = await prisma.studentProfile.findUnique({
		where: {
			id: studentId,
		},
	});

	if (!student) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Student not found"
		);
	}

	// ----------------------------------------
	// 3. Validate due date
	// ----------------------------------------
	const parsedDueDate = new Date(dueDate);

	if (isNaN(parsedDueDate.getTime())) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invalid due date"
		);
	}

	// ----------------------------------------
	// 4. Generate invoice number
	// ----------------------------------------
	const invoiceNumber = await generateInvoiceNumber();

	// ----------------------------------------
	// 5. Create invoice
	// ----------------------------------------
	const invoice = await prisma.invoice.create({
		data: {
			studentId,
			invoiceNumber,
			description,
			amount,
			dueDate: parsedDueDate,
		},
		include: {
			student: true,
		},
	});

	return invoice;
};

export const invoiceService = {
	createInvoice,
};