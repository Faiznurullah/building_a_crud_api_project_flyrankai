const express = require("express");

function protectedRoutes() {
  const router = express.Router();

  // Stage 2: only checks that a Bearer token is present. Real verification
  // (supabase.auth.getUser) is added in Stage 3.
  router.get("/protected/profile", (req, res) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const hasBearer = typeof authHeader === "string" && authHeader.startsWith("Bearer ") && authHeader.slice(7).trim() !== "";
    if (!hasBearer) {
      return res.status(401).json({ error: "Access token required" });
    }
    res.status(200).json({ message: "Token received. Verification not implemented yet." });
  });

  return router;
}

function publicRoutes() {
  const router = express.Router();
  router.get("/public/info", (req, res) => {
    res.status(200).json({ message: "Welcome stranger! This info is public." });
  });
  return router;
}

module.exports = { protectedRoutes, publicRoutes };
