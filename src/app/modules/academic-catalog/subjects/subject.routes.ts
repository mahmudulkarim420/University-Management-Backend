import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../../middleware/checkAuth";
import { subjectsController } from "./subject.controller";




const router = Router();

router.post("/create", 
    auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DEPARTMENT_HEAD),
    subjectsController.createSubject
);









export const subjectsRoutes = router; 
