const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const SEED = [
  { id: 1, title: "Buy milk", done: false },
  { id: 2, title: "Write trip report", done: true },
  { id: 3, title: "Call the client", done: false },
];

let tasks = SEED.map((t) => ({ ...t }));
let nextId = tasks.length + 1;

const findTask = (id) => tasks.find((t) => t.id === id);
const parseId = (raw) => Number.parseInt(raw, 10);

app.get("/", (req, res) => {
  res.json({ name: "Task API", version: "1.0", endpoints: ["/tasks"] });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/tasks", (req, res) => {
  res.json(tasks);
});

app.get("/tasks/:id", (req, res) => {
  const task = findTask(parseId(req.params.id));
  if (!task) return res.status(404).json({ error: `Task ${req.params.id} not found` });
  res.json(task);
});

app.post("/tasks", (req, res) => {
  const body = req.body || {};
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length === 0) {
    return res
      .status(400)
      .json({ error: "title is required and must be a non-empty string" });
  }
  const task = { id: nextId++, title, done: false };
  tasks.push(task);
  res.status(201).json(task);
});

app.listen(PORT, () => {
  console.log(`Task API listening on http://localhost:${PORT}`);
});
