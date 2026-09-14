import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { facultyService } from "./faculty.service";


const createFaculty = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await facultyService.createFaculty(payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Faculty Created Successfully",
		data: result,
	});
});





const getAllFaculties = catchAsync(async (req: Request, res: Response) => {
	const result = await facultyService.getAllFaculties();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Faculties Retrieved Successfully",
		data: result,
	});
});




export const facultyController = {
	createFaculty,
	getAllFaculties,
};
