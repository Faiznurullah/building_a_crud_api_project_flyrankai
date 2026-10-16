const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "tasks.db");
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT    NOT NULL,
    done  INTEGER NOT NULL DEFAULT 0
  )
`);

// Migration: add timestamp columns to pre-existing databases.
const columns = db.prepare("PRAGMA table_info(tasks)").all().map((c) => c.name);
if (!columns.includes("created_at")) {
  db.exec("ALTER TABLE tasks ADD COLUMN created_at TEXT");
}
if (!columns.includes("updated_at")) {
  db.exec("ALTER TABLE tasks ADD COLUMN updated_at TEXT");
}
db.prepare(
  `UPDATE tasks
      SET created_at = COALESCE(created_at, datetime('now')),
          updated_at = COALESCE(updated_at, datetime('now'))
    WHERE created_at IS NULL OR updated_at IS NULL`
).run();

const SEED = [
  { title: "Buy milk", done: 0 },
  { title: "Write trip report", done: 1 },
  { title: "Call the client", done: 0 },
];

const insertSeed = db.prepare(
  "INSERT INTO tasks (title, done, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))"
);
const seedAll = db.transaction((rows) => {
  for (const row of rows) insertSeed.run(row.title, row.done);
});

const count = db.prepare("SELECT COUNT(*) AS n FROM tasks").get().n;
if (count === 0) {
  seedAll(SEED);
  console.log(`Seeded ${SEED.length} tasks into ${DB_PATH}`);
}

const rowToTask = (row) => ({
  id: row.id,
  title: row.title,
  done: row.done === 1,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

function getAllTasks() {
  return db.prepare("SELECT * FROM tasks ORDER BY id").all().map(rowToTask);
}

function findTasks({ done, search, sort } = {}) {
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
  return db.prepare(sql).all(...params).map(rowToTask);
}

function getTaskById(id) {
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  return row ? rowToTask(row) : undefined;
}

function createTask(title) {
  const info = db
    .prepare(
      "INSERT INTO tasks (title, done, created_at, updated_at) VALUES (?, 0, datetime('now'), datetime('now'))"
    )
    .run(title);
  return getTaskById(info.lastInsertRowid);
}

function updateTask(id, fields) {
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
  sets.push("updated_at = datetime('now')");
  params.push(id);
  const info = db.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return info.changes === 0 ? undefined : getTaskById(id);
}

function deleteTask(id) {
  return db.prepare("DELETE FROM tasks WHERE id = ?").run(id).changes > 0;
}

function getStats() {
  const total = db.prepare("SELECT COUNT(*) AS n FROM tasks").get().n;
  const done = db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE done = 1").get().n;
  return { total, done, open: total - done };
}

function resetTasks() {
  const run = db.transaction(() => {
    db.prepare("DELETE FROM tasks").run();
    seedAll(SEED);
  });
  run();
  return getAllTasks();
}

module.exports = {
  db,
  getAllTasks,
  findTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getStats,
  resetTasks,
};
