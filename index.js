const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapi = require("./openapi.json");

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

app.put("/tasks/:id", (req, res) => {
  const task = findTask(parseId(req.params.id));
  if (!task) return res.status(404).json({ error: `Task ${req.params.id} not found` });

  const body = req.body || {};
  const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
  const hasDone = Object.prototype.hasOwnProperty.call(body, "done");

  if (!hasTitle && !hasDone) {
    return res
      .status(400)
      .json({ error: "body must include at least one of: title, done" });
  }
  if (hasTitle && (typeof body.title !== "string" || body.title.trim().length === 0)) {
    return res
      .status(400)
      .json({ error: "title must be a non-empty string" });
  }
  if (hasDone && typeof body.done !== "boolean") {
    return res.status(400).json({ error: "done must be a boolean" });
  }

  if (hasTitle) task.title = body.title.trim();
  if (hasDone) task.done = body.done;
  res.json(task);
});

app.delete("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return res.status(404).json({ error: `Task ${id} not found` });
  tasks.splice(index, 1);
  res.status(204).send();
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

app.listen(PORT, () => {
  console.log(`Task API listening on http://localhost:${PORT} (docs at /docs)`);
});
