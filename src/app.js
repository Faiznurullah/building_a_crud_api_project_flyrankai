const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapi = require("../openapi.json");
const { taskRoutes } = require("./routes/taskRoutes");
const { authRoutes } = require("./routes/authRoutes");
const { HttpError } = require("./services/errors");

/**
 * Builds the Express app from injected dependencies. Storage and Redis are
 * provided from the composition root, so this file contains no configuration.
 */
function buildApp({ taskService, redisClient = null } = {}) {
  const app = express();
  app.use(express.json());

  app.get("/", (req, res) => {
    res.json({ name: "Task API", version: "1.0", endpoints: ["/tasks", "/auth/signup", "/auth/login"] });
  });

  app.get("/health", async (req, res) => {
    let redis = "not_configured";
    if (redisClient) {
      try {
        await redisClient.ping();
        redis = "ok";
      } catch {
        redis = "down";
      }
    }
    res.json({ status: "ok", redis });
  });

  app.use(authRoutes());
  app.use(taskRoutes(taskService));

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

  app.use((req, res) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
      return res.status(400).json({ error: "invalid JSON body" });
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "internal server error" });
  });

  return app;
}

module.exports = { buildApp };
