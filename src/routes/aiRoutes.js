const express = require("express");
const { authMiddleware } = require("../middleware/auth");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * POST /ai/classify — the single "AI judgement" endpoint.
 * Input validation lives in the service (so a bad request never calls the model).
 * Errors thrown by the service are HttpError subclasses mapped by the app's
 * error middleware into consistent `{ "error": ... }` responses.
 */
function aiRoutes(aiService, { requireAuth = false } = {}) {
  const router = express.Router();
  const guards = requireAuth ? [authMiddleware] : [];

  router.post(
    "/ai/classify",
    ...guards,
    asyncHandler(async (req, res) => {
      const result = await aiService.classify(req.body?.text);
      res.status(200).json(result);
    })
  );

  return router;
}

module.exports = { aiRoutes };
