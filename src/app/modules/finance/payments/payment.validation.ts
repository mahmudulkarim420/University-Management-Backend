import { z } from "zod";

export const createPaymentValidationSchema =
  z.object({
    body: z.object({
      invoiceId: z.string().uuid(),

      method: z.enum([
        "CASH",
        "CARD",
        "BANK_TRANSFER",
        "MOBILE_BANKING",
        "OTHER",
      ]),

      gateway: z.enum([
        "STRIPE",
        "SSLCOMMERZ",
        "BKASH",
        "MANUAL",
      ]),
    }),
  });