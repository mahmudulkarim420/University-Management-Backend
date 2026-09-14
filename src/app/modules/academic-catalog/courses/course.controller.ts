import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { coursesService } from "./course.service";



const createCourse = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;



	const result = await coursesService.createCourse(payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Course Created Successfully",
		data: result,
	});
});

export const courcesController = {
	createCourse,
};

