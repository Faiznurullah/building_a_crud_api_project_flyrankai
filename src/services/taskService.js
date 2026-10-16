const { ValidationError, NotFoundError } = require("./errors");

/**
 * Business logic + validation. Depends only on the repository *interface*;
 * it has no idea whether data lives in memory, SQLite, or Postgres.
 */
class TaskService {
  constructor(repository) {
    this.repo = repository;
  }

  listTasks({ done, search, sort } = {}) {
    return this.repo.list({ done, search, sort });
  }

  async getTask(id) {
    const task = await this.repo.getById(id);
    if (!task) throw new NotFoundError(`Task ${id} not found`);
    return task;
  }

  async createTask(body = {}) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length === 0) {
      throw new ValidationError("title is required and must be a non-empty string");
    }
    return this.repo.create({ title });
  }

  async updateTask(id, body = {}) {
    // Existence is checked before validation so a missing id always yields 404.
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError(`Task ${id} not found`);

    const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
    const hasDone = Object.prototype.hasOwnProperty.call(body, "done");

    if (!hasTitle && !hasDone) {
      throw new ValidationError("body must include at least one of: title, done");
    }
    if (hasTitle && (typeof body.title !== "string" || body.title.trim().length === 0)) {
      throw new ValidationError("title must be a non-empty string");
    }
    if (hasDone && typeof body.done !== "boolean") {
      throw new ValidationError("done must be a boolean");
    }

    const fields = {};
    if (hasTitle) fields.title = body.title.trim();
    if (hasDone) fields.done = body.done;
    return this.repo.update(id, fields);
  }

  async deleteTask(id) {
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundError(`Task ${id} not found`);
  }

  getStats() {
    return this.repo.stats();
  }

  resetTasks() {
    return this.repo.reset();
  }
}

module.exports = { TaskService };
