import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { prisma } from "../lib/prisma";
import { redisClient } from "../lib/redis";
import config from "../config";
import { transporter } from "../lib/nodemailer";

export const healthCheck = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const startTime = process.hrtime();

		// Check database
		let databaseStatus = "healthy";

		try {
			await prisma.$queryRaw`SELECT 1`;
		} catch {
			databaseStatus = "unhealthy";
		}

		// Check Redis
		let redisStatus = "healthy";

		try {
			if (redisClient.isReady) {
				await redisClient.ping();
			} else {
				redisStatus = "unhealthy";
			}
		} catch {
			redisStatus = "unhealthy";
		}


        // NodeMailer / SMTP
		let mailerStatus = "healthy";

		try {
			await transporter.verify();
		} catch {
			mailerStatus = "unhealthy";
		}

		// Response time
		const [seconds, nanoseconds] = process.hrtime(startTime);

		const responseTime = (
			seconds * 1000 +
			nanoseconds / 1_000_000
		).toFixed(2);

		const isHealthy =
			databaseStatus === "healthy" &&
			redisStatus === "healthy" &&
			mailerStatus === "healthy";

		const memory = process.memoryUsage();

		res.status(
			isHealthy
				? httpStatus.OK
				: httpStatus.SERVICE_UNAVAILABLE,
		).json({
			success: isHealthy,

			message: isHealthy
				? "University Management API is healthy"
				: "University Management API is unhealthy",

			data: {
				name: "University Management API",
                description: "University Management System Backend API",
				version: "1.0.0",
				status: isHealthy ? "healthy" : "unhealthy",

				environment: config.node_env,

				timestamp: new Date().toISOString(),

				responseTime: `${responseTime}ms`,

				uptime: {
					seconds: Math.floor(process.uptime()),
				},

				node: {
					version: process.version,
					platform: process.platform,
					architecture: process.arch,
				},

				memory: {
					rss: `${(
						memory.rss /
						1024 /
						1024
					).toFixed(2)} MB`,

					heapUsed: `${(
						memory.heapUsed /
						1024 /
						1024
					).toFixed(2)} MB`,

					heapTotal: `${(
						memory.heapTotal /
						1024 /
						1024
					).toFixed(2)} MB`,
				},

				services: {
					database: databaseStatus,
					redis: redisStatus,
                    nodemailer: mailerStatus,
				},
			},
		});
	} catch (error) {
		next(error);
	}
};