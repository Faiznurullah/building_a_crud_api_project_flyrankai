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

module.exports = db;
