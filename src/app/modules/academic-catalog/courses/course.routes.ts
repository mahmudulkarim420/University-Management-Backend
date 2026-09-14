import { Router } from "express";
import { auth } from "../../../middleware/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { courcesController } from "./course.controller";

const router = Router();

router.post(
	"/create",
	auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DEPARTMENT_HEAD),
	courcesController.createCourse,
);










export const coursesRoutes = router;
