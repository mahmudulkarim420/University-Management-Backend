// import type { NextFunction, Request, Response } from "express";
// import type { JwtPayload } from "jsonwebtoken";
// import type { Role } from "../../generated/prisma/enums";
// import config from "../config";
// import { prisma } from "../lib/prisma";
// import { catchAsync } from "../utils/catchAsync";
// import { jwtUtils } from "../utils/jwt";

// declare global {
// 	namespace Express {
// 		interface Request {
// 			user?: {
// 				email: string;
// 				name: string;
// 				userId: string;
// 				role: Role;
// 			};
// 		}
// 	}
// }

// // auth(Role.ADMIN, Role.USER, Role.Author)
// // auth() => ...requiredRoles => [Role.ADMIN, Role.USER, Role.AUTHOR]
// export const auth = (...requiredRoles: Role[]) => {
// 	return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
// 		const token = req.cookies.accessToken
// 			? req.cookies.accessToken
// 			: req.headers.authorization?.startsWith("Bearer ")
// 				? req.headers.authorization?.split(" ")[1]
// 				: req.headers.authorization;

// 		if (!token) {
// 			throw new Error(
// 				"You are not logged in. Please log in to access this resource.",
// 			);
// 		}

// 		const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

// 		if (!verifiedToken.success) {
// 			throw new Error(verifiedToken.error);
// 		}

// 		const { email, name, userId, role } = verifiedToken.data as JwtPayload;

// 		if (requiredRoles.length && !requiredRoles.includes(role)) {
// 			throw new Error(
// 				"Forbidden. You don't have permission to access this resource.",
// 			);
// 		}

// 		const user = await prisma.user.findUnique({
// 			where: {
// 				id: userId,
// 				email,
// 				name,
// 				role,
// 			},
// 		});

// 		if (!user) {
// 			throw new Error("User not found. Please log in again.");
// 		}

// 		if (user.isActive === false) {
// 			throw new Error("Your account has been blocked. Please contact support.");
// 		}

// 		req.user = {
// 			email,
// 			name,
// 			userId,
// 			role,
// 		};

// 		next();
// 	});
// };

// import { NextFunction, Request, Response } from "express";
// import { Role } from "../../generated/prisma/enums";
// import { catchAsync } from "../utils/catchAsync";
// import { jwtUtils } from "../utils/jwt";
// import config from "../config";
// import { JwtPayload } from "jsonwebtoken";
// import HttpStatus from "http-status";
// import { prisma } from "../lib/prisma";

import { NextFunction, Request, Response } from "express";
import { Role } from "../../generated/prisma/enums";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";
import config from "../config";
import HttpStatus from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma";

import { AppError } from "../utils/AppError";

declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string;
				email: string;
				name: string;
				role: Role;
			};
		}
	}
}

export const auth = (...requiredRoles: Role[]) => {
	return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
		const token = req.cookies.accessToken
			? req.cookies.accessToken
			: req.headers.authorization?.startsWith("Bearer ")
				? req.headers.authorization?.split(" ")[1]
				: req.headers.authorization;

		if (!token) {
			throw new AppError(
				HttpStatus.UNAUTHORIZED,
				"You are not logged in. Please log in to access this resource.",
			);
		}

		const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

		if (!verifiedToken.success) {
			throw new AppError(
				HttpStatus.UNAUTHORIZED,
				verifiedToken.error || "Invalid or expired token",
			);
		}

		const { email, name, id, role } = verifiedToken.data as JwtPayload;

		if (requiredRoles.length && !requiredRoles.includes(role)) {
			return res.status(HttpStatus.FORBIDDEN).json({
				success: false,
				statusCode: HttpStatus.FORBIDDEN,
				message:
					"Forbidden. You don't have permission to access this resource.",
			});
		}

		const user = await prisma.user.findUnique({
			where: {
				id,
				email,
				name,
				role,
			},
		});

		if (!user) {
			throw new AppError(HttpStatus.UNAUTHORIZED, "User not found. Please log in again.");
		}

		if (user.isActive === false) {
			throw new AppError(HttpStatus.FORBIDDEN, "Your account has been blocked. Please contact support.");
		}

		req.user = {
			id,
			email,
			name,
			role,
		};
		console.log(req.user, "from middleware");

		next();
	});
};
