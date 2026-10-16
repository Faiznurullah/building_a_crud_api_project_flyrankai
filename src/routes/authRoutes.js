const express = require("express");
const { supabase } = require("../lib/supabaseClient");
const { HttpError, ValidationError } = require("../services/errors");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function authRoutes() {
  const router = express.Router();

  router.post(
    "/auth/signup",
    asyncHandler(async (req, res) => {
      const { email, password } = req.body || {};
      if (!email || !password || String(email).trim() === "" || String(password).trim() === "") {
        throw new ValidationError("email and password are required");
      }
      const { data, error } = await supabase.auth.signUp({ email: String(email).trim(), password: String(password) });
      if (error) {
        return res.status(400).json({ error: error.message || "Signup failed" });
      }
      return res.status(201).json({ user: data.user });
    })
  );

  router.post(
    "/auth/login",
    asyncHandler(async (req, res) => {
      const { email, password } = req.body || {};
      if (!email || !password || String(email).trim() === "" || String(password).trim() === "") {
        throw new ValidationError("email and password are required");
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email: String(email).trim(), password: String(password) });
      if (error) {
        return res.status(401).json({ error: "Invalid login credentials" });
      }
      return res.status(200).json({
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
      });
    })
  );

  return router;
}

module.exports = { authRoutes };
