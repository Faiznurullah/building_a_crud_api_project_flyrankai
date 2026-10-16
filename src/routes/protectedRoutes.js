const express = require("express");
const { authMiddleware } = require("../middleware/auth");

function protectedRoutes() {
  const router = express.Router();

  router.get("/protected/profile", authMiddleware, (req, res) => {
    const user = req.user;
    res.status(200).json({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      user_metadata: user.user_metadata,
    });
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
