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

const SEED = [
  { title: "Buy milk", done: 0 },
  { title: "Write trip report", done: 1 },
  { title: "Call the client", done: 0 },
];

const count = db.prepare("SELECT COUNT(*) AS n FROM tasks").get().n;
if (count === 0) {
  const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
  const seedAll = db.transaction((rows) => {
    for (const row of rows) insert.run(row.title, row.done);
  });
  seedAll(SEED);
  console.log(`Seeded ${SEED.length} tasks into ${DB_PATH}`);
}

const rowToTask = (row) => ({ id: row.id, title: row.title, done: row.done === 1 });

function getAllTasks() {
  return db.prepare("SELECT * FROM tasks ORDER BY id").all().map(rowToTask);
}

function getTaskById(id) {
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  return row ? rowToTask(row) : undefined;
}

function createTask(title) {
  const info = db.prepare("INSERT INTO tasks (title, done) VALUES (?, 0)").run(title);
  return getTaskById(info.lastInsertRowid);
}

module.exports = { db, getAllTasks, getTaskById, createTask };
