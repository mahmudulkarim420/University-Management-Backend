import { Router } from "express";
import { invoiceRoutes } from "./invoices/invoice.routes";
import { paymentRoutes } from "./payments/payment.routes";

const router = Router();

router.use("/invoices", invoiceRoutes);
router.use("/payments", paymentRoutes);

export const financeRoutes = router;
