const path = require("path");
const { InMemoryRepository } = require("./inMemoryRepository");
const { SqliteRepository } = require("./sqliteRepository");
const { PostgresRepository } = require("./postgresRepository");

const DEFAULT_SQLITE_PATH = path.join(__dirname, "..", "..", "tasks.db");

/**
 * Single composition point that chooses the storage implementation.
 * Selection rule: STORE wins; otherwise Postgres when DATABASE_URL is set, else memory.
 */
function createRepository(env = process.env) {
  const store = (env.STORE || (env.DATABASE_URL ? "postgres" : "memory")).toLowerCase();

  switch (store) {
    case "postgres":
      if (!env.DATABASE_URL) {
        throw new Error("STORE=postgres requires DATABASE_URL to be set");
      }
      return new PostgresRepository({ connectionString: env.DATABASE_URL });
    case "sqlite":
      return new SqliteRepository(env.SQLITE_PATH || DEFAULT_SQLITE_PATH);
    case "memory":
      return new InMemoryRepository();
    default:
      throw new Error(`Unknown STORE "${store}" (expected: postgres | sqlite | memory)`);
  }
}

module.exports = { createRepository };
