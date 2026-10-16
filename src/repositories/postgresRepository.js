const { Pool } = require("pg");
const DEFAULT_SEED = require("./seed");

const toIso = (value) => (value instanceof Date ? value.toISOString() : value);

const rowToTask = (row) => ({
  id: row.id,
  title: row.title,
  done: row.done,
  created_at: toIso(row.created_at),
  updated_at: toIso(row.updated_at),
});

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS tasks (
    id         SERIAL PRIMARY KEY,
    title      TEXT        NOT NULL,
    done       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

class PostgresRepository {
  constructor({ connectionString, pool } = {}) {
    this.pool = pool || new Pool({ connectionString });
    this.seed = DEFAULT_SEED;
  }

  /**
   * Ensure schema exists and seed only when the table is empty.
   * Retries briefly so the app survives a not-yet-ready database.
   */
  async init({ retries = 10, delayMs = 1000 } = {}) {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.pool.query(SCHEMA);
        const { rows } = await this.pool.query("SELECT COUNT(*)::int AS n FROM tasks");
        if (rows[0].n === 0) await this._seedAll();
        return;
      } catch (err) {
        if (attempt >= retries) throw err;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  async _seedAll() {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const row of this.seed) {
        await client.query("INSERT INTO tasks (title, done) VALUES ($1, $2)", [row.title, !!row.done]);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async list({ done, search, sort } = {}) {
    const where = [];
    const params = [];
    if (done === true || done === false) {
      params.push(done);
      where.push(`done = $${params.length}`);
    }
    if (typeof search === "string" && search.length > 0) {
      params.push(`%${search}%`);
      where.push(`title ILIKE $${params.length}`);
    }
    let sql = "SELECT * FROM tasks";
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += sort === "title" ? " ORDER BY lower(title) ASC" : " ORDER BY id";
    const { rows } = await this.pool.query(sql, params);
    return rows.map(rowToTask);
  }

  async getById(id) {
    const { rows } = await this.pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
    return rows[0] ? rowToTask(rows[0]) : undefined;
  }

  async create({ title }) {
    const { rows } = await this.pool.query(
      "INSERT INTO tasks (title, done) VALUES ($1, FALSE) RETURNING *",
      [title]
    );
    return rowToTask(rows[0]);
  }

  async update(id, fields) {
    const sets = [];
    const params = [];
    if (fields.title !== undefined) {
      params.push(fields.title);
      sets.push(`title = $${params.length}`);
    }
    if (fields.done !== undefined) {
      params.push(fields.done);
      sets.push(`done = $${params.length}`);
    }
    if (sets.length === 0) return undefined;
    sets.push("updated_at = now()");
    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE tasks SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ? rowToTask(rows[0]) : undefined;
  }

  async remove(id) {
    const { rowCount } = await this.pool.query("DELETE FROM tasks WHERE id = $1", [id]);
    return rowCount > 0;
  }

  async stats() {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE done)::int AS done
         FROM tasks`
    );
    const { total, done } = rows[0];
    return { total, done, open: total - done };
  }

  async reset() {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM tasks");
      for (const row of this.seed) {
        await client.query("INSERT INTO tasks (title, done) VALUES ($1, $2)", [row.title, !!row.done]);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    return this.list();
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = { PostgresRepository };
