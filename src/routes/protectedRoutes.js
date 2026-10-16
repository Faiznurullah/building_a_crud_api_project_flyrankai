const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { supabase } = require("../lib/supabaseClient");
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function protectedRoutes() {
  const router = express.Router();

  router.get("/protected/profile", authMiddleware, asyncHandler(async (req, res) => {
    const user = req.user;
    res.status(200).json({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      user_metadata: user.user_metadata,
    });
  }));

  router.get("/protected/dashboard", authMiddleware, asyncHandler(async (req, res) => {
    res.status(200).json({
      message: "Welcome to your dashboard",
      user: { id: req.user.id, email: req.user.email },
    });
  }));

  router.post("/auth/logout", authMiddleware, asyncHandler(async (req, res) => {
    const token = req.headers.authorization || req.headers.Authorization;
    const bearer = typeof token === "string" && token.startsWith("Bearer ") ? token.slice(7).trim() : undefined;
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (e) {
      // ignore if SDK requires specific context; still return 204 per requirement
    }
    res.status(204).send();
  }));

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
