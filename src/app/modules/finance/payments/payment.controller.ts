import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";
import { PaymentService } from "./payment.service";
import { AppError } from "../../../utils/AppError";
import { PaymentWebhookService } from "../payment-gateways/stripe/stripe.webhook";
// import { paymentService } from "./payment.service";



const createPayment = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const id = req.user?.id;

	if (!id) {
    throw new AppError(
        httpStatus.UNAUTHORIZED,
        "User ID not found. Please log in again."
    );
}


	console.log("userId:", id);
	const result = await PaymentService.createPayment(id as string, payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Payment Created Successfully",
		data: result,
	});
});








const stripeWebhook = catchAsync(
	async (req: Request, res: Response) => {
		const signature =
			req.headers["stripe-signature"];

		if (!signature || Array.isArray(signature)) {
			return res.status(
				httpStatus.BAD_REQUEST
			).json({
				success: false,
				message:
					"Invalid Stripe signature",
			});
		}

		await PaymentWebhookService.handleStripeWebhook(
			req.body,
			signature
		);

		return res.status(httpStatus.OK).json({
			success: true,
			message: "Webhook received",
		});
	}
);












export const paymentController = {
	createPayment,
	stripeWebhook,
};


