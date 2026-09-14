import { Router } from "express";
import { facultiesRoutes } from "./faculties/faculty.routes";
import { departmentsRoutes } from "./departments/department.routes";
import { programsRoutes } from "./programs/program.routes";




const router = Router();

router.use("/faculties", facultiesRoutes);
router.use("/departments", departmentsRoutes);
router.use("/programs", programsRoutes);





export const organizationRoutes = router;