





import httpStatus from "http-status";
import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../utils/AppError";
import { CreatePaymentPayload } from "./payment.interface";
import { createPaymentbystripe } from "../payment-gateways/stripe/stripe.gateway";

const createPayment = async (
	id: string,
	payload: CreatePaymentPayload
) => {
	// 1. Find user + student profile
	const user = await prisma.user.findUnique({
		where: {
			id: id,
		},
		include: {
			studentProfile: {
				select: {
					id: true,
				},
			},
		},
	});

	if (!user) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"User not found"
		);
	}

	if (!user.studentProfile) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Student profile not found"
		);
	}

	const studentId = user.studentProfile.id;

	// 2. Find invoice
	const invoice = await prisma.invoice.findUnique({
		where: {
			id: payload.invoiceId,
		},
	});

	if (!invoice) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Invoice not found"
		);
	}

	// 3. Verify invoice belongs to this student
	if (invoice.studentId !== studentId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You cannot pay this invoice"
		);
	}

	// 4. Check invoice status
	if (invoice.status === "PAID") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invoice is already paid"
		);
	}



	// 6. Create internal payment
	const payment = await prisma.payment.create({
		data: {
			invoiceId: invoice.id,
			studentId,
			amount: invoice.amount,
			method: payload.method,
			gateway: payload.gateway,
			status: "PENDING",
		},
	});

	try {
		// 7. Create payment in gateway


		const checkout = await createPaymentbystripe({
			paymentId: payment.id,
			invoiceId: invoice.id,
			studentId,
			amount: Number(invoice.amount),
			currency:
				process.env.STRIPE_CURRENCY || "bdt",
			description:
				invoice.description ??
				`Invoice ${invoice.invoiceNumber}`,
		});

		// 8. Save gateway response
		const updatedPayment =
			await prisma.payment.update({
				where: {
					id: payment.id,
				},
				data: {
					gatewaySessionId:
						checkout.sessionId,

					gatewayPaymentIntentId:
						checkout.paymentId,

					getewayRowData:
						checkout.gatewayData as any,
				},
			});

		return {
			paymentId: updatedPayment.id,
			checkoutUrl: checkout.checkoutUrl,
		};
	} catch (error) {
		await prisma.payment.update({
			where: {
				id: payment.id,
			},
			data: {
				status: "FAILED",
			},
		});

		throw error;
	}
};

export const PaymentService = {
	createPayment,
};