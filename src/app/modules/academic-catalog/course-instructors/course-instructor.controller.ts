import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { courseInstructorsService } from "./course-instructor.service";




const createCourseInstructors = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;



	const result = await courseInstructorsService.createCourseInstructors(payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Assigned Course Instractor Successfully",
		data: result,
	});
});

export const courseInstructorsController = {
	createCourseInstructors,
};

