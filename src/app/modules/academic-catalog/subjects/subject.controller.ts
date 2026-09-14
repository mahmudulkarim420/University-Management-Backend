import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { subjectsService } from "./subject.service";







const createSubject = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await subjectsService.createSubject(payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Invoice Created Successfully",
		data: result,
	});
});















export const subjectsController = {
    createSubject,

}