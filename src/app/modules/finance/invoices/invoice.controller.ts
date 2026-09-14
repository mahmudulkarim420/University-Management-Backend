import { Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../../utils/sendResponse";
import { catchAsync } from "../../../utils/catchAsync";
import { invoiceService } from "./invoice.service";


const createInvoice = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await invoiceService.createInvoice(payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Invoice Created Successfully",
		data: result,
	});
});

export const invoiceController = {
	createInvoice,
};


