const { HttpError } = require("./errors");

// --- Provider-layer errors (thrown by the HTTP client) ---------------------
// These describe how the upstream call failed. The AI service decides whether
// to retry (transient) or give up (permanent) based on the class.

class ProviderError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Timed out / aborted. Transient -> retry.
class ProviderTimeoutError extends ProviderError {}

// Connection dropped before a response. Transient -> retry.
class ProviderNetworkError extends ProviderError {}

// HTTP 429. Transient -> retry, honouring Retry-After when present.
class ProviderRateLimitError extends ProviderError {
  constructor(message, retryAfterMs = null) {
    super(message);
    this.retryAfterMs = retryAfterMs;
  }
}

// HTTP 5xx. Transient -> retry.
class ProviderServerError extends ProviderError {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// HTTP 4xx (400/401/403/404). Permanent -> do NOT retry (misconfig/bad request).
class ProviderClientError extends ProviderError {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// --- Service-layer errors (mapped to HTTP status codes) ---------------------
// The AI service catches provider errors and rethrows these so the existing
// error middleware can turn them into consistent `{ "error": ... }` responses.

class AiInputError extends HttpError {
  constructor(message) {
    super(400, message);
  }
}

// Model produced output that is not valid JSON per schema, even after one repair.
class AiInvalidResponseError extends HttpError {
  constructor(message = "AI returned an invalid response") {
    super(502, message);
  }
}

// Provider timed out on every attempt.
class AiTimeoutError extends HttpError {
  constructor(message = "AI provider timed out") {
    super(504, message);
  }
}

// Provider rate-limited / unavailable after retries.
class AiUnavailableError extends HttpError {
  constructor(message = "AI provider unavailable, try again later") {
    super(503, message);
  }
}

// Server misconfiguration (missing/invalid API key). Generic message only;
// details are logged server-side.
class AiConfigError extends HttpError {
  constructor(message = "Server misconfiguration") {
    super(500, message);
  }
}

module.exports = {
  ProviderError,
  ProviderTimeoutError,
  ProviderNetworkError,
  ProviderRateLimitError,
  ProviderServerError,
  ProviderClientError,
  AiInputError,
  AiInvalidResponseError,
  AiTimeoutError,
  AiUnavailableError,
  AiConfigError,
};
