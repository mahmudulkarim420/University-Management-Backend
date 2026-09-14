import { Router, type Request, type Response } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";

const router = Router();

// Serve raw OpenAPI specification as JSON
router.get("/api-docs.json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Serve Swagger UI
router.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "University Management API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      docExpansion: "list",
    },
  })
);

export const docsRoutes = router;
