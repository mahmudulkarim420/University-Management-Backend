import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../../middleware/checkAuth";
import { courseInstructorsController } from "./course-instructor.controller";





const router = Router();


router.post("/create", 
        auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DEPARTMENT_HEAD),
        courseInstructorsController.createCourseInstructors
);











export const courseInstructorsRoutes = router; 






















