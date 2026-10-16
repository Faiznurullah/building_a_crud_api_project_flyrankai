const path = require("path");
const DEFAULT_SEED = require("./seed");

const DEFAULT_PATH = path.join(__dirname, "..", "..", "tasks.db");

// SQLite has no boolean type: store 0/1 and convert back to true/false.
// Timestamps are stored as ISO strings; legacy "YYYY-MM-DD HH:MM:SS" (UTC) is
// normalized so responses look identical across repositories.
const nowIso = () => new Date().toISOString();
const toIso = (value) => {
  if (value == null) return value;
  if (value.includes("T")) return value;
  return new Date(value.replace(" ", "T") + "Z").toISOString();
};
const rowToTask = (row) => ({
  id: row.id,
  title: row.title,
  done: row.done === 1,
  created_at: toIso(row.created_at),
  updated_at: toIso(row.updated_at),
});

class SqliteRepository {
  constructor(dbPath = DEFAULT_PATH, seed = DEFAULT_SEED) {
    // Lazy require so the app runs (Postgres/memory) even if the native module is absent.
    let Database;
    try {
      Database = require("better-sqlite3");
    } catch {
      throw new Error(
        'STORE=sqlite requires the optional "better-sqlite3" dependency (run `npm install`).'
      );
    }
    this.seed = seed;
    this.db = new Database(dbPath);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        title      TEXT    NOT NULL,
        done       INTEGER NOT NULL DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      )
    `);

    const columns = this.db.prepare("PRAGMA table_info(tasks)").all().map((c) => c.name);
    if (!columns.includes("created_at")) this.db.exec("ALTER TABLE tasks ADD COLUMN created_at TEXT");
    if (!columns.includes("updated_at")) this.db.exec("ALTER TABLE tasks ADD COLUMN updated_at TEXT");

    this._insert = this.db.prepare(
      "INSERT INTO tasks (title, done, created_at, updated_at) VALUES (?, ?, ?, ?)"
    );

    this.seedIfEmpty();
  }

  seedIfEmpty() {
    const count = this.db.prepare("SELECT COUNT(*) AS n FROM tasks").get().n;
    if (count === 0) this._seedAll();
  }

  _seedAll() {
    const ts = nowIso();
    const seedAll = this.db.transaction((rows) => {
      for (const row of rows) this._insert.run(row.title, row.done ? 1 : 0, ts, ts);
    });
    seedAll(this.seed);
  }

  async list({ done, search, sort } = {}) {
    const where = [];
    const params = [];
    if (done === true || done === false) {
      where.push("done = ?");
      params.push(done ? 1 : 0);
    }
    if (typeof search === "string" && search.length > 0) {
      where.push("title LIKE ?");
      params.push(`%${search}%`);
    }
    let sql = "SELECT * FROM tasks";
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += sort === "title" ? " ORDER BY title COLLATE NOCASE ASC" : " ORDER BY id";
    return this.db.prepare(sql).all(...params).map(rowToTask);
  }

  async getById(id) {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    return row ? rowToTask(row) : undefined;
  }

  async create({ title }) {
    const ts = nowIso();
    const info = this._insert.run(title, 0, ts, ts);
    return this.getById(info.lastInsertRowid);
  }

  async update(id, fields) {
    const sets = [];
    const params = [];
    if (fields.title !== undefined) {
      sets.push("title = ?");
      params.push(fields.title);
    }
    if (fields.done !== undefined) {
      sets.push("done = ?");
      params.push(fields.done ? 1 : 0);
    }
    if (sets.length === 0) return undefined;
    sets.push("updated_at = ?");
    params.push(nowIso());
    params.push(id);
    const info = this.db.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    return info.changes === 0 ? undefined : this.getById(id);
  }

  async remove(id) {
    return this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id).changes > 0;
  }

  async stats() {
    const total = this.db.prepare("SELECT COUNT(*) AS n FROM tasks").get().n;
    const done = this.db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE done = 1").get().n;
    return { total, done, open: total - done };
  }

  async reset() {
    const run = this.db.transaction(() => {
      this.db.prepare("DELETE FROM tasks").run();
      this._seedAll();
    });
    run();
    return this.list();
  }

  async close() {
    this.db.close();
  }
}

module.exports = { SqliteRepository };
