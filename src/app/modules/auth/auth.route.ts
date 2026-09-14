import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { UserValidation } from "./auth.validation";

const router = Router();



router.post("/register",
	// (req : Request, res : Response, next : NextFunction) => {

	// 	try {
	// 		// const payload = req.body ? req.body : {}
	// 		const payload = req.body ?? {}

	// 		const result = PatientValidation.PatientRegistrationZodSchema.safeParse(payload);

	// 		if (!result.success) {
	// 			console.log(result.error);
	// 			console.log(result.error.issues);

	// 			throw new Error(result.error.issues[0].message)
	// 		}

	// 		req.body = result.data

	// 		next()
	// 	} catch (error) {
			
	// 		next(error)
	// 	}
	// },

	validateRequest(UserValidation.StudentRegistrationZodSchema),
	 AuthController.registerStudent);
router.post("/login",
	validateRequest(UserValidation.LoginZodSchema),
	 AuthController.loginUser);
router.get(
	"/me",
	auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DEPARTMENT_HEAD, Role.INSTRUCTOR, Role.STUDENT, Role.ACCOUNTANT ),
	// validateRequest
	AuthController.getMe,
);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/google", AuthController.googleLogin);
router.post("/forgot-password",
	validateRequest(UserValidation.ForgotPasswordZodSchema),
	 AuthController.forgotPassword);
router.post("/reset-password",
	validateRequest(UserValidation.ResetPasswordZodSchema),
	 AuthController.resetPassword);
export const AuthRoutes = router;
