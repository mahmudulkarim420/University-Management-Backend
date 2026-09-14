import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { departmentsService } from "./department.service";

const createDepartment = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await departmentsService.createDepartment(payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Faculty Created Successfully",
		data: result,
	});
});




// const getAllDepartments = catchAsync(async (req: Request, res: Response) => {
// 	const payload = req.body;

// 	const result = await departmentsService.getAllDepartments(payload);

// 	sendResponse(res, {
// 		statusCode: httpStatus.OK,
// 		success: true,
// 		message: " Retrived All Departments Successfully",
// 		data: result,
// 	});
// });




const getAllDepartments = catchAsync(
	async (req: Request, res: Response) => {
		const payload = req.query;

		const result =
			await departmentsService.getAllDepartments({
				page: Number(payload.page) || 1,
				limit: Number(payload.limit) || 10,
				search: payload.search as string | undefined,
				facultyId: payload.facultyId as string | undefined,
				isActive:
					payload.isActive !== undefined
						? payload.isActive === "true"
						: undefined,
			});

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Retrieved All Departments Successfully",
			data: result,
		});
	},
);




const updateDepartment = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const payload = req.body;

    const result = await departmentsService.updateDepartment(id as string, payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Department updated successfully",
      data: result,
    });
  },
);












































export const departmentsController = {
    createDepartment,
    getAllDepartments,
	updateDepartment,




}