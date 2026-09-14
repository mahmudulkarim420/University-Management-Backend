import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { programsService } from "./program.service";

const createProgram = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await programsService.createProgram(payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Faculty Created Successfully",
		data: result,
	});
});







const updateProgram = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
    const {id} = req.params;

	const result = await programsService.updateProgram(id as string, payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Program updated Successfully",
		data: result,
	});
});






















































const getAllPrograms = catchAsync(async (req: Request, res: Response) => {
	const result = await programsService.getAllPrograms();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Retrieved All Programs Successfully",
		data: result,
	});
});

























export const programsController = {
	createProgram,
    getAllPrograms,
    updateProgram,
};
