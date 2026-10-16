const { supabase } = require("../lib/supabaseClient");
const { HttpError } = require("../services/errors");

class AuthError extends HttpError {
  constructor(status, message) {
    super(status, message);
  }
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (token.length === 0) return null;
  return token;
}

async function authMiddleware(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.user = data.user;
  next();
}

module.exports = { authMiddleware, extractBearerToken };
