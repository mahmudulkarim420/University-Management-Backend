import { z } from "zod";


const createInvoiceZodSchema = z.object({
	studentId: z
		.string()
		.uuid("Student ID must be a valid UUID"),

	description: z
		.string()
		.min(1, "Description is required")
		.max(255, "Description must not exceed 255 characters"),

	amount: z
		.string()
		.regex(
			/^\d+(\.\d{1,2})?$/,
			"Amount must be a valid monetary value with up to 2 decimal places",
		)
		.refine(
			(value) => Number(value) > 0,
			"Amount must be greater than 0",
		),

	dueDate: z
		.string()
		.datetime({
			message: "Due date must be a valid ISO-8601 datetime",
		}),
});


export const invoiceValidation = {
	createInvoiceZodSchema,
};