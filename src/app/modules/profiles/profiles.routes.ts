import { Router } from "express";
import { studentProfileRoutes } from "./student/student-profile.routes";

// import studentProfileRoutes from "./student/student-profile.routes";
// import instructorProfileRoutes from "./instructor/instructor-profile.routes";
// import departmentHeadProfileRoutes from "./department-head/department-head-profile.routes";
// import accountantProfileRoutes from "./accountant/accountant-profile.routes";

const router = Router();

// Student Profile
router.use("/student", studentProfileRoutes);

// // Instructor Profile
// router.use("/instructors", instructorProfileRoutes);

// // Department Head Profile
// router.use("/department-heads", departmentHeadProfileRoutes);

// // Accountant Profile
// router.use("/accountants", accountantProfileRoutes);

export const profileRoutes = router;