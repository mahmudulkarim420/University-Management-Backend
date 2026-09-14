// import Stripe from "stripe";
// import { stripe } from "./stripe.config";
// import httpStatus from "http-status";

// export const handleStripeWebhook = async (
//   req: Request,
//   res: Response
// ) => {

//   const signature =
//     req.headers["stripe-signature"];

//   if (!signature) {
//     return res.status(400).send(
//       "Missing Stripe signature"
//     );
//   }

//   let event: Stripe.Event;

//   try {

//     event = stripe.webhooks.constructEvent(
//       req.body,
//       signature,
//       process.env.STRIPE_WEBHOOK_SECRET!
//     );

//   } catch (error) {

//     return res.status(400).send(
//       `Webhook Error`
//     );
//   }

//   switch (event.type) {

//     case "checkout.session.completed": {

//       const session =
//         event.data.object as Stripe.Checkout.Session;

//       const paymentId =
//         session.metadata?.paymentId;

//       if (!paymentId) {
//         break;
//       }

//       await PaymentService.handleStripeSuccess(
//         paymentId,
//         session
//       );

//       break;
//     }

//     default:
//       break;
//   }

//   return res.status(200).json({
//     received: true,
//   });
// };



















import Stripe from "stripe";
import httpStatus from "http-status";
import { AppError } from "../../../../utils/AppError";
import { stripe } from "../../../../lib/stripe";
import { prisma } from "../../../../lib/prisma";



const handleStripeWebhook = async (
	rawBody: Buffer,
	signature: string
) => {
	if (!process.env.STRIPE_WEBHOOK_SECRET) {
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			"Stripe webhook secret is not configured"
		);
	}

	let event: Stripe.Event;

	// 1. Verify Stripe webhook signature
	try {
		event = stripe.webhooks.constructEvent(
			rawBody,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET
		);
	} catch (error) {
		console.error("Stripe webhook signature verification failed");

		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invalid Stripe webhook signature"
		);
	}

	// 2. Handle Stripe event
	switch (event.type) {
		case "checkout.session.completed": {
			const session =
				event.data.object as Stripe.Checkout.Session;

			// Stripe only considers this successfully paid
			// when payment_status === "paid"
			if (session.payment_status !== "paid") {
				break;
			}

			// We put our internal paymentId in metadata
			const paymentId = session.metadata?.paymentId;

			if (!paymentId) {
				console.error(
					"Payment ID missing from Stripe session metadata"
				);
				break;
			}

			// 3. Find our internal payment
			const payment = await prisma.payment.findUnique({
				where: {
					id: paymentId,
				},
			});

			if (!payment) {
				console.error(
					`Payment not found: ${paymentId}`
				);
				break;
			}

			// 4. Idempotency
			// Webhooks can be delivered more than once.
			if (payment.status === "SUCCESS") {
				break;
			}

			// 5. Update payment + invoice atomically
			await prisma.$transaction([
				prisma.payment.update({
					where: {
						id: payment.id,
					},
					data: {
						status: "SUCCESS",
						gatewayPaymentIntentId:
							typeof session.payment_intent ===
							"string"
								? session.payment_intent
								: undefined,
						getewayRowData:
							session as any,
					},
				}),

				prisma.invoice.update({
					where: {
						id: payment.invoiceId,
					},
					data: {
						status: "PAID",
					},
				}),
			]);

			console.log(
				`Payment ${payment.id} marked as PAID`
			);

			break;
		}

		case "checkout.session.expired": {
			const session =
				event.data.object as Stripe.Checkout.Session;

			const paymentId = session.metadata?.paymentId;

			if (!paymentId) break;

			await prisma.payment.updateMany({
				where: {
					id: paymentId,
					status: "PENDING",
				},
				data: {
					status: "FAILED",
					getewayRowData: session as any,
				},
			});

			break;
		}

		default:
			console.log(
				`Unhandled Stripe event: ${event.type}`
			);
	}

	return {
		received: true,
	};
};

export const PaymentWebhookService = {
	handleStripeWebhook,
};