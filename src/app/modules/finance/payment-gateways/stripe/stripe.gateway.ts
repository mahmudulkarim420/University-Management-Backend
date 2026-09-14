// import Stripe from "stripe";

import { stripe } from "../../../../lib/stripe";
import { convertToStripeAmount } from "./stripe.utils";

// import {
//   PaymentGateway,
//   CreatePaymentPayload,
//   CreatePaymentResult,
// } from "../payment-gateway.interface";

// import { convertToStripeAmount } from "./stripe.utils";

// export class StripeGateway implements PaymentGateway {
//   private stripe: Stripe;

//   constructor() {
//     this.stripe = new Stripe(
//       process.env.STRIPE_SECRET_KEY!
//     );
//   }

//   async createPayment(
//     data: CreatePaymentPayload
//   ): Promise<CreatePaymentResult> {
// 		const stripeAmount = convertToStripeAmount(
// 			data.amount,
// 			data.currency
// 		);

//     const session =
//       await this.stripe.checkout.sessions.create({
//         mode: "payment",

//         line_items: [
//           {
//             price_data: {
//               currency:
//                 process.env.STRIPE_CURRENCY || "bdt",

//               product_data: {
//                 name: data.description,
//               },

//               unit_amount:
//                 stripeAmount,
//             },

//             quantity: 1,
//           },
//         ],

//         metadata: {
//           paymentId: data.paymentId,
//           invoiceId: data.invoiceId,
//           studentId: data.studentId,
//         },

//         success_url:
//           `${process.env.FRONTEND_URL}/payment/success?paymentId=${data.paymentId}`,

//         cancel_url:
//           `${process.env.FRONTEND_URL}/payment/cancel?paymentId=${data.paymentId}`,
//       });

//     return {
//       sessionId: session.id,

//       paymentId:
//         typeof session.payment_intent === "string"
//           ? session.payment_intent
//           : undefined,

//       checkoutUrl: session.url!,

//       gatewayData: session,
//     };
//   }
// }
















export const createPaymentbystripe = async (
 payload: any
) => {  

  // const stripeAmount = convertToStripeAmount(
  //   payload.amount,
  //   payload.currency
  // );

 const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency:
              process.env.STRIPE_CURRENCY || "bdt",

            product_data: {
              name: payload.description,
            },

            // Example:
            // 5000 BDT → 500000 paisa
            unit_amount: Math.round(payload.amount * 100),
          },

          quantity: 1,
        },
      ],

      metadata: {
        paymentId: payload.paymentId,
        invoiceId: payload.invoiceId,
        studentId: payload.studentId,
      },

      success_url:
        `${process.env.FRONTEND_URL}/payment/success` +
        `?paymentId=${payload.paymentId}`,

      cancel_url:
        `${process.env.FRONTEND_URL}/payment/cancel` +
        `?paymentId=${payload.paymentId}`,
    });

    return {
      sessionId: session.id,

      paymentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : undefined,

      checkoutUrl: session.url!,

      gatewayData: session,
    };

  }


  