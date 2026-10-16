/**
 * Optional Redis client (stretch goal). Returns null when REDIS_URL is not set,
 * so the app works with or without Redis.
 */
function createRedisClient(env = process.env) {
  if (!env.REDIS_URL) return null;
  const { createClient } = require("redis");
  const client = createClient({ url: env.REDIS_URL });
  client.on("error", () => {
    /* keep the process alive; /health reports the status */
  });
  client.connect().catch(() => {});
  return client;
}

module.exports = { createRedisClient };
