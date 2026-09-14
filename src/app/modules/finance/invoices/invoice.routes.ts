import { Router } from "express";
import { invoiceValidation } from "./invoice.validation";
import { validateRequest } from "../../../middleware/validateRequest";
import { invoiceController } from "./invoice.controller";
import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../../middleware/checkAuth";



const router = Router();






router.post(
	"/",
	auth(Role.ACCOUNTANT, Role.ADMIN),
	validateRequest(invoiceValidation.createInvoiceZodSchema),
	invoiceController.createInvoice,
);

router.post(
	"/create",
	auth(Role.ACCOUNTANT, Role.ADMIN),
	validateRequest(invoiceValidation.createInvoiceZodSchema),
	invoiceController.createInvoice,
);








export const invoiceRoutes = router;
