import { prisma } from "../lib/prisma";
import { DegreeType } from "../../generated/prisma/enums";
import {
  seedSuperAdmin,
  seedTesterAdmin,
  seedTesterDepartmentHead,
  seedTesterInstructor,
  seedTesterStudent,
  seedTesterAccountant,
} from "./seed";

const runSeeding = async () => {
  console.log("Starting database seeding process...");
  try {
    await prisma.$connect();
    console.log("Connected to database successfully.");

    // 1. Seed All 6 Role User Accounts
    await seedSuperAdmin();
    await seedTesterAdmin();
    await seedTesterDepartmentHead();
    await seedTesterInstructor();
    await seedTesterStudent();
    await seedTesterAccountant();

    // 2. Seed Faculty of Engineering
    let faculty = await prisma.faculty.findUnique({
      where: { code: "ENG" },
    });
    if (!faculty) {
      faculty = await prisma.faculty.create({
        data: {
          code: "ENG",
          name: "Faculty of Engineering",
          description: "School of Engineering & Technology",
        },
      });
      console.log("Faculty Created: Engineering (ENG)");
    } else {
      console.log("Faculty (ENG) Already Exists!");
    }

    // 3. Seed Department of Computer Science & Engineering
    let department = await prisma.department.findUnique({
      where: { code: "CSE" },
    });
    if (!department) {
      department = await prisma.department.create({
        data: {
          facultyId: faculty.id,
          code: "CSE",
          name: "Computer Science & Engineering",
          description: "Department of CSE",
        },
      });
      console.log("Department Created: CSE");
    } else {
      console.log("Department (CSE) Already Exists!");
    }

    // 4. Seed Academic Program (B.Sc. in CSE)
    let program = await prisma.program.findUnique({
      where: { code: "BSC-CSE" },
    });
    if (!program) {
      program = await prisma.program.create({
        data: {
          departmentId: department.id,
          code: "BSC-CSE",
          name: "B.Sc. in Computer Science & Engineering",
          degreeType: DegreeType.BACHELOR,
          durationYears: 4,
          totalCredits: 160,
          description: "Four-year undergraduate degree program in CSE",
        },
      });
      console.log("Program Created: B.Sc. in CSE (BSC-CSE)");
    } else {
      console.log("Program (BSC-CSE) Already Exists!");
    }

    console.log("\n✅ All Database Seeding Completed Successfully!");
  } catch (error) {
    console.error("Error during database seeding:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
};

runSeeding();
