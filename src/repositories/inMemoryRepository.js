const DEFAULT_SEED = require("./seed");

const nowIso = () => new Date().toISOString();

/**
 * In-memory repository (kept from A2). Implements the same async interface as
 * the SQLite and Postgres repositories, so the service layer cannot tell them apart.
 */
class InMemoryRepository {
  constructor(seed = DEFAULT_SEED) {
    this._seed = seed;
    this.reset();
  }

  reset() {
    const ts = nowIso();
    this._nextId = 1;
    this._tasks = this._seed.map((t) => ({
      id: this._nextId++,
      title: t.title,
      done: Boolean(t.done),
      created_at: ts,
      updated_at: ts,
    }));
    return this.list();
  }

  async list({ done, search, sort } = {}) {
    let out = this._tasks;
    if (done === true || done === false) {
      out = out.filter((t) => t.done === done);
    }
    if (typeof search === "string" && search.length > 0) {
      const q = search.toLowerCase();
      out = out.filter((t) => t.title.toLowerCase().includes(q));
    }
    out = [...out];
    if (sort === "title") {
      out.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    } else {
      out.sort((a, b) => a.id - b.id);
    }
    return out.map((t) => ({ ...t }));
  }

  async getById(id) {
    const task = this._tasks.find((t) => t.id === id);
    return task ? { ...task } : undefined;
  }

  async create({ title }) {
    const ts = nowIso();
    const task = { id: this._nextId++, title, done: false, created_at: ts, updated_at: ts };
    this._tasks.push(task);
    return { ...task };
  }

  async update(id, fields) {
    const task = this._tasks.find((t) => t.id === id);
    if (!task) return undefined;
    if (fields.title !== undefined) task.title = fields.title;
    if (fields.done !== undefined) task.done = fields.done;
    task.updated_at = nowIso();
    return { ...task };
  }

  async remove(id) {
    const index = this._tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;
    this._tasks.splice(index, 1);
    return true;
  }

  async stats() {
    const total = this._tasks.length;
    const done = this._tasks.filter((t) => t.done).length;
    return { total, done, open: total - done };
  }
}

module.exports = { InMemoryRepository };
