require("dotenv").config({ quiet: true });

const { createRepository } = require("./repositories");
const { TaskService } = require("./services/taskService");
const { buildApp } = require("./app");
const { createRedisClient } = require("./redisClient");
const { supabase } = require("./lib/supabaseClient");
const { createOpenAIProvider } = require("./lib/openaiClient");
const { createAiService } = require("./services/aiService");

const PORT = process.env.PORT || 3000;

function buildAiServiceFromEnv(env) {
  if (!env.OPENAI_API_KEY) {
    console.warn("Warning: OPENAI_API_KEY not set; /ai/classify will return 500 until configured.");
  }
  const provider = createOpenAIProvider({
    apiKey: env.OPENAI_API_KEY,
    baseUrl: env.OPENAI_BASE_URL,
    model: env.OPENAI_MODEL,
  });
  return createAiService({
    provider,
    config: {
      timeoutMs: Number(env.AI_TIMEOUT_MS) || undefined,
      maxRetries: env.AI_MAX_RETRIES != null ? Number(env.AI_MAX_RETRIES) : undefined,
      maxInputChars: Number(env.AI_MAX_INPUT_CHARS) || undefined,
    },
  });
}

async function main() {
  const repository = createRepository(process.env);
  if (typeof repository.init === "function") {
    await repository.init(); // Postgres: create schema + seed if empty (with retry)
  }

  const taskService = new TaskService(repository);
  const redisClient = createRedisClient(process.env);
  const aiService = buildAiServiceFromEnv(process.env);
  const aiRequireAuth = String(process.env.AI_REQUIRE_AUTH).toLowerCase() === "true";
  const app = buildApp({ taskService, redisClient, aiService, aiRequireAuth });

  const server = app.listen(PORT, () => {
    console.log(`Task API listening on http://localhost:${PORT} (docs at /docs)`);
    if (supabase?.auth) {
      console.log("Server running and connected to Supabase");
    } else {
      console.warn("Warning: Supabase client not configured (check SUPABASE_URL / SUPABASE_KEY)");
    }
    console.log(`AI endpoint ready: POST /ai/classify (model=${process.env.OPENAI_MODEL || "gpt-4o-mini"}, auth=${aiRequireAuth})`);
  });

  const shutdown = async () => {
    server.close();
    if (typeof repository.close === "function") await repository.close();
    if (redisClient) await redisClient.quit().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
