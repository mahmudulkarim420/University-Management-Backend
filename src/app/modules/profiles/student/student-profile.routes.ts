import { Router } from "express";
import { studentProfileController } from "./student-profile.controller";
import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../../middleware/checkAuth";




const router= Router();


router.get("/profile", (req, res) => {
    res.send("Student Profile Route");
}
);


router.post("/create-profile",
    auth(Role.STUDENT),
    // validateRequest(studentProfileValidation.createStudentProfileZodSchema),
    studentProfileController.createStudentProfile
     );










export const studentProfileRoutes = router;