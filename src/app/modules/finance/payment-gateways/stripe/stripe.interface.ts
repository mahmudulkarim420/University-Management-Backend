import Stripe from "stripe";

export interface StripePaymentMetadata {
  paymentId: string;
  invoiceId: string;
  studentId: string;
}

export interface StripeCheckoutResult {
  session: Stripe.Checkout.Session;
}