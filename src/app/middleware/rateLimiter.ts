// src/app/middlewares/rateLimiter.ts

import { rateLimit } from "express-rate-limit";

export const globalRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // 100 requests per IP per window

	standardHeaders: "draft-8",
	legacyHeaders: false,

	message: {
		success: false,
		statusCode: 429,
		message: "Too many requests. Please try again later.",
	},
});