import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/modules/auth/auth.route";
import { profileRoutes } from "./app/modules/profiles/profiles.routes";
import { financeRoutes } from "./app/modules/finance/finance.routes";
import { globalRateLimiter } from "./app/middleware/rateLimiter";
import { healthCheck } from "./app/middleware/healthCheck";
import { organizationRoutes } from "./app/modules/organization/organization.routes";
import { academicCatalogRoutes } from "./app/modules/academic-catalog/academic-catalog.routes";
import { docsRoutes } from "./app/docs";

const app: Application = express();

// 1. Security headers
app.use(helmet());

// 2. CORS
app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// 3. Rate limiting
app.use(globalRateLimiter);

// 4. Stripe webhook - BEFORE express.json()
app.use(
	"/api/v1/finance/payments/webhook",
	express.raw({
		type: "application/json",
	}),
);

// 5. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 6. Cookies
app.use(cookieParser());

// 7. Routes
app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/profiles", profileRoutes);
app.use("/api/v1/finance", financeRoutes);
app.use("/api/v1/organization", organizationRoutes);
app.use("/api/v1/academic-catalog", academicCatalogRoutes);
app.use(docsRoutes);


// 8. Health check
app.get("/", healthCheck);

// 9. 404 not found handler
app.use(notFound);

// 10. Global error handler
app.use(globalErrorHandler);

export default app;

