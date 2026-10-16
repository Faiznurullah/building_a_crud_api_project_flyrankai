const {
  ProviderTimeoutError,
  ProviderNetworkError,
  ProviderRateLimitError,
  ProviderServerError,
  ProviderClientError,
} = require("../services/aiErrors");

const parseRetryAfterMs = (value) => {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
};

/**
 * Builds a provider function that calls an OpenAI-compatible Chat Completions
 * endpoint. The timeout is a REAL abort (AbortController), so a hanging request
 * is actually cut off instead of waiting to completion.
 *
 * The returned function has the shape:
 *   provider({ system, user, timeoutMs }) -> Promise<string>  (message content)
 *
 * It throws typed Provider* errors so the service can decide on retries.
 */
function createOpenAIProvider({ apiKey, baseUrl = "https://api.openai.com/v1", model = "gpt-4o-mini", temperature = 0, fetchImpl = fetch } = {}) {
  return async function provider({ system, user, timeoutMs = 10000 }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetchImpl(
        `${baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
          signal: controller.signal,
        }
      );
    } catch (err) {
      if (err.name === "AbortError") {
        throw new ProviderTimeoutError("Provider request aborted after timeout");
      }
      throw new ProviderNetworkError(err.message);
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 429) {
      throw new ProviderRateLimitError("Provider rate limited", parseRetryAfterMs(response.headers.get("retry-after")));
    }
    if (response.status >= 500) {
      throw new ProviderServerError(`Provider server error (${response.status})`, response.status);
    }
    if (!response.ok) {
      throw new ProviderClientError(`Provider rejected the request (${response.status})`, response.status);
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new ProviderNetworkError("Provider returned a non-JSON body");
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new ProviderNetworkError("Provider response missing message content");
    }
    return content;
  };
}

module.exports = { createOpenAIProvider };
