import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";

// create super admin
export const seedSuperAdmin = async () => {
    try {
        const isSuperAdminExist = await prisma.user.findFirst({
            where : {
                role : Role.SUPER_ADMIN
            }
        });

        if(isSuperAdminExist){
            console.log("Super Admin Already Exists!");
            return;
        }

        const name = config.super_admin_name
        const email = config.super_admin_email
        const password = config.super_admin_password

        if(!name || !email || !password){
            throw new Error("Super Admin Name , Email, Password Missing In Env File!!!")
        }

        const hashedPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds))

        const superAdmin = await prisma.user.create({
            data : {
                name,
                email,
                password : hashedPassword,
                role : Role.SUPER_ADMIN,
                needPasswordChange : false,
                emailVerified : true
            }
        })

        console.log("Super Admin Created : ", superAdmin);



    } catch (error) {
        console.log("Error Seeding Super Admin : ", error);

        if (config.super_admin_email) {
            await prisma.user.deleteMany({
                where: {
                    email: config.super_admin_email
                }
            });
        }
    }
}

//create tester admin 
export const seedTesterAdmin = async () => {
    try {
        const isTesterAdminExist = await prisma.user.findUnique({
            where: {
                email : config.tester_admin_email
            }
        });

        if (isTesterAdminExist) {
            console.log("Tester Admin Already Exists!");
            return;
        }

        const name = config.tester_admin_name
        const email = config.tester_admin_email
        const password = config.tester_admin_password

        if (!name || !email || !password) {
            throw new Error("Tester Admin Name , Email, Password Missing In Env File!!!")
        }

        const hashedPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds))

        const testerAdmin = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: Role.ADMIN,
                needPasswordChange: false,
                emailVerified: true
            }
        })

        console.log("Tester Admin Created : ", testerAdmin);



    } catch (error) {
        console.log("Error Seeding Tester Admin : ", error);

        if (config.tester_admin_email) {
            await prisma.user.deleteMany({
                where: {
                    email: config.tester_admin_email
                }
            });
        }
    }
}

// Create tester department head
export const seedTesterDepartmentHead = async () => {
    try {
        const isTesterDepartmentHeadExist = await prisma.user.findUnique({
            where: {
                email: config.tester_department_head_email,
            },
        });

        if (isTesterDepartmentHeadExist) {
            console.log("Tester Department Head Already Exists!");
            return;
        }

        const name = config.tester_department_head_name;
        const email = config.tester_department_head_email;
        const password = config.tester_department_head_password;

        if (!name || !email || !password) {
            throw new Error(
                "Tester Department Head Name, Email, Password Missing In Env File!!!"
            );
        }

        const hashedPassword = await bcrypt.hash(
            password,
            Number(config.bcrypt_salt_rounds)
        );

        const testerDepartmentHead = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: Role.DEPARTMENT_HEAD,
                needPasswordChange: false,
                emailVerified: true,
            },
        });

        console.log(
            "Tester Department Head Created: ",
            testerDepartmentHead
        );
    } catch (error) {
        console.log("Error Seeding Tester Department Head: ", error);

        // Delete only if the user was partially created
        if (config.tester_department_head_email) {
            await prisma.user.deleteMany({
                where: {
                    email: config.tester_department_head_email,
                },
            });
        }
    }
};

// Create tester instructor
export const seedTesterInstructor = async () => {
    try {
        const isTesterInstructorExist = await prisma.user.findUnique({
            where: {
                email: config.tester_instructor_email,
            },
        });

        if (isTesterInstructorExist) {
            console.log("Tester Instructor Already Exists!");
            return;
        }

        const name = config.tester_instructor_name;
        const email = config.tester_instructor_email;
        const password = config.tester_instructor_password;

        if (!name || !email || !password) {
            throw new Error(
                "Tester Instructor Name, Email, Password Missing In Env File!!!"
            );
        }

        const hashedPassword = await bcrypt.hash(
            password,
            Number(config.bcrypt_salt_rounds)
        );

        const testerInstructor = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: Role.INSTRUCTOR,
                needPasswordChange: false,
                emailVerified: true,
            },
        });

        console.log(
            "Tester Instructor Created: ",
            testerInstructor
        );
    } catch (error) {
        console.log("Error Seeding Tester Instructor: ", error);

        if (config.tester_instructor_email) {
            await prisma.user.deleteMany({
                where: {
                    email: config.tester_instructor_email,
                },
            });
        }
    }
};

// Create tester student
export const seedTesterStudent = async () => {
    try {
        const isTesterStudentExist = await prisma.user.findUnique({
            where: {
                email: config.tester_student_email,
            },
        });

        if (isTesterStudentExist) {
            console.log("Tester Student Already Exists!");
            return;
        }

        const name = config.tester_student_name;
        const email = config.tester_student_email;
        const password = config.tester_student_password;

        if (!name || !email || !password) {
            throw new Error(
                "Tester Student Name, Email, Password Missing In Env File!!!"
            );
        }

        const hashedPassword = await bcrypt.hash(
            password,
            Number(config.bcrypt_salt_rounds)
        );

        const testerStudent = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: Role.STUDENT,
                needPasswordChange: false,
                emailVerified: true,
            },
        });

        console.log(
            "Tester Student Created: ",
            testerStudent
        );
    } catch (error) {
        console.log("Error Seeding Tester Student: ", error);

        if (config.tester_student_email) {
            await prisma.user.deleteMany({
                where: {
                    email: config.tester_student_email,
                },
            });
        }
    }
};

// Create tester accountant
export const seedTesterAccountant = async () => {
    try {
        const isTesterAccountantExist = await prisma.user.findUnique({
            where: {
                email: config.tester_accountant_email,
            },
        });

        if (isTesterAccountantExist) {
            console.log("Tester Accountant Already Exists!");
            return;
        }

        const name = config.tester_accountant_name;
        const email = config.tester_accountant_email;
        const password = config.tester_accountant_password;

        if (!name || !email || !password) {
            throw new Error(
                "Tester Accountant Name, Email, Password Missing In Env File!!!"
            );
        }

        const hashedPassword = await bcrypt.hash(
            password,
            Number(config.bcrypt_salt_rounds)
        );

        const testerAccountant = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: Role.ACCOUNTANT,
                needPasswordChange: false,
                emailVerified: true,
            },
        });

        console.log(
            "Tester Accountant Created: ",
            testerAccountant
        );
    } catch (error) {
        console.log("Error Seeding Tester Accountant: ", error);

        if (config.tester_accountant_email) {
            await prisma.user.deleteMany({
                where: {
                    email: config.tester_accountant_email,
                },
            });
        }
    }
};