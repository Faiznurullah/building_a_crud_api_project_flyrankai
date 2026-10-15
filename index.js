const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapi = require("./openapi.json");
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getStats,
  resetTasks,
} = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const parseId = (raw) => Number.parseInt(raw, 10);

app.get("/", (req, res) => {
  res.json({ name: "Task API", version: "1.0", endpoints: ["/tasks"] });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/tasks", (req, res) => {
  const { done, search } = req.query;
  let result = getAllTasks();
  if (done === "true" || done === "false") {
    const want = done === "true";
    result = result.filter((t) => t.done === want);
  }
  if (typeof search === "string" && search.length > 0) {
    result = result.filter((t) =>
      t.title.toLowerCase().includes(search.toLowerCase())
    );
  }
  res.json(result);
});

app.get("/tasks/:id", (req, res) => {
  const task = getTaskById(parseId(req.params.id));
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
  res.status(201).json(createTask(title));
});

app.put("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!getTaskById(id)) return res.status(404).json({ error: `Task ${id} not found` });

  const body = req.body || {};
  const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
  const hasDone = Object.prototype.hasOwnProperty.call(body, "done");

  if (!hasTitle && !hasDone) {
    return res
      .status(400)
      .json({ error: "body must include at least one of: title, done" });
  }
  if (hasTitle && (typeof body.title !== "string" || body.title.trim().length === 0)) {
    return res.status(400).json({ error: "title must be a non-empty string" });
  }
  if (hasDone && typeof body.done !== "boolean") {
    return res.status(400).json({ error: "done must be a boolean" });
  }

  const fields = {};
  if (hasTitle) fields.title = body.title.trim();
  if (hasDone) fields.done = body.done;
  res.json(updateTask(id, fields));
});

app.delete("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!deleteTask(id)) return res.status(404).json({ error: `Task ${id} not found` });
  res.status(204).send();
});

app.get("/stats", (req, res) => {
  res.json(getStats());
});

app.post("/reset", (req, res) => {
  res.json(resetTasks());
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: "invalid JSON body" });
  }
  res.status(500).json({ error: "internal server error" });
});

app.listen(PORT, () => {
  console.log(`Task API listening on http://localhost:${PORT} (docs at /docs)`);
});
