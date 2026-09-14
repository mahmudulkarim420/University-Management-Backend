import { Router } from "express";
import { programsController } from "./program.controller";
import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../../middleware/checkAuth";


const router = Router();


router.post("/create", auth(Role.SUPER_ADMIN, Role.ADMIN),  programsController.createProgram)
router.patch("/update/:id", auth(Role.SUPER_ADMIN, Role.ADMIN),  programsController.updateProgram)
router.post("/all",  programsController.getAllPrograms)




















export const programsRoutes = router; 



