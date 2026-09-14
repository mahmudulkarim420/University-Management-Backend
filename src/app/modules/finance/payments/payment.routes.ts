import express from "express";

import { paymentController } from "./payment.controller";
import { validateRequest } from "../../../middleware/validateRequest";
import { createPaymentValidationSchema } from "./payment.validation";
import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../../middleware/checkAuth";

// import auth from "../../middleware/auth";
// import validateRequest from "../../middleware/validateRequest";

// import * as PaymentController from "./payment.controller";
// import { PaymentValidation } from "./payment.validation";

const router = express.Router();

// Create payment
// router.post(
// 	"/create",
// 	auth(Role.STUDENT),
// 	// validateRequest(PaymentValidation.createPaymentValidationSchema),
// 	paymentController.createPayment,
// );

router.post(
	"/create",
	auth(Role.STUDENT),
	// validateRequest(createPaymentValidationSchema),

	paymentController.createPayment,
);
router.post(
	"/webhook",
	paymentController.stripeWebhook,
);

// // Create Stripe checkout session
// router.post(
// 	"/checkout",
// 	auth("STUDENT"),
// 	validateRequest(PaymentValidation.createCheckoutValidationSchema),
// 	PaymentController.createCheckout,
// );

// // Get logged-in student's payments
// router.get(
// 	"/my-payments",
// 	auth("STUDENT"),
// 	PaymentController.getMyPayments,
// );

// // Get single payment
// router.get(
// 	"/:id",
// 	auth("STUDENT", "ACCOUNTANT", "ADMIN"),
// 	PaymentController.getPaymentById,
// );

export const paymentRoutes = router;
