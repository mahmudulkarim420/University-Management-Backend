import app from "./app";
import config from "./app/config";
import { transporter } from "./app/lib/nodemailer";
import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";
import { seedSuperAdmin, seedTesterAccountant, seedTesterAdmin, seedTesterDepartmentHead, seedTesterInstructor, seedTesterStudent } from "./app/utils/seed";

const PORT = config.port || 5000;

const main = async () => {
	try {
		await prisma.$connect();
		console.log("Connected to the database successfully.");

		try {
			await redisClient.connect();
			console.log("Redis Connected Successfully.");
		} catch (redisErr: any) {
			console.warn("Redis Connection Warning:", redisErr?.message || redisErr);
		}

		try {
			await transporter.verify();
			console.log("Nodemailer Connected Successfully.");
		} catch (smtpErr: any) {
			console.warn("Nodemailer Verification Warning:", smtpErr?.message || smtpErr);
		}

		try {
			await seedSuperAdmin();
			await seedTesterAdmin();
			await seedTesterDepartmentHead();
			await seedTesterInstructor();
			await seedTesterStudent();
			await seedTesterAccountant();
		} catch (seedErr: any) {
			console.warn("Database Seeding Warning:", seedErr?.message || seedErr);
		}

		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

main();
