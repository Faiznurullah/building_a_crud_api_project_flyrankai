require("dotenv").config({ quiet: true });

const { createRepository } = require("./repositories");
const { TaskService } = require("./services/taskService");
const { buildApp } = require("./app");
const { createRedisClient } = require("./redisClient");
const { supabase } = require("./lib/supabaseClient");

const PORT = process.env.PORT || 3000;

async function main() {
  const repository = createRepository(process.env);
  if (typeof repository.init === "function") {
    await repository.init(); // Postgres: create schema + seed if empty (with retry)
  }

  const taskService = new TaskService(repository);
  const redisClient = createRedisClient(process.env);
  const app = buildApp({ taskService, redisClient });

  const server = app.listen(PORT, () => {
    console.log(`Task API listening on http://localhost:${PORT} (docs at /docs)`);
    if (supabase?.auth) {
      console.log("Server running and connected to Supabase");
    } else {
      console.warn("Warning: Supabase client not configured (check SUPABASE_URL / SUPABASE_KEY)");
    }
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
