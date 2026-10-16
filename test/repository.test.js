const { test } = require("node:test");
const assert = require("node:assert/strict");

const { InMemoryRepository } = require("../src/repositories/inMemoryRepository");
const { SqliteRepository } = require("../src/repositories/sqliteRepository");
const { TaskService } = require("../src/services/taskService");
const { ValidationError, NotFoundError } = require("../src/services/errors");

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// The same expectations run against every implementation, proving the
// repositories are interchangeable.
function repositorySuite(name, makeRepo) {
  test(`[${name}] seeds three tasks`, async () => {
    const repo = makeRepo();
    const tasks = await repo.list();
    assert.equal(tasks.length, 3);
    assert.deepEqual(
      tasks.map((t) => t.title),
      ["Buy milk", "Write trip report", "Call the client"]
    );
    assert.equal(typeof tasks[0].done, "boolean");
    assert.match(tasks[0].created_at, ISO);
    assert.match(tasks[0].updated_at, ISO);
    if (repo.close) await repo.close();
  });

  test(`[${name}] create assigns id, done=false and timestamps`, async () => {
    const repo = makeRepo();
    const task = await repo.create({ title: "New task" });
    assert.equal(typeof task.id, "number");
    assert.equal(task.title, "New task");
    assert.equal(task.done, false);
    assert.match(task.created_at, ISO);
    assert.match(task.updated_at, ISO);
    if (repo.close) await repo.close();
  });

  test(`[${name}] getById returns task or undefined`, async () => {
    const repo = makeRepo();
    assert.equal((await repo.getById(1)).id, 1);
    assert.equal(await repo.getById(9999), undefined);
    if (repo.close) await repo.close();
  });

  test(`[${name}] list filters by done, searches and sorts`, async () => {
    const repo = makeRepo();
    const doneOnly = await repo.list({ done: true });
    assert.deepEqual(doneOnly.map((t) => t.title), ["Write trip report"]);

    const openOnly = await repo.list({ done: false });
    assert.equal(openOnly.length, 2);

    const searched = await repo.list({ search: "milk" });
    assert.deepEqual(searched.map((t) => t.title), ["Buy milk"]);

    const sorted = await repo.list({ sort: "title" });
    assert.deepEqual(
      sorted.map((t) => t.title),
      ["Buy milk", "Call the client", "Write trip report"]
    );
    if (repo.close) await repo.close();
  });

  test(`[${name}] update changes fields and bumps updated_at`, async () => {
    const repo = makeRepo();
    const before = await repo.getById(1);
    const updated = await repo.update(1, { title: "Buy oat milk", done: true });
    assert.equal(updated.title, "Buy oat milk");
    assert.equal(updated.done, true);
    assert.ok(updated.updated_at >= before.updated_at);
    assert.equal(await repo.update(9999, { done: true }), undefined);
    if (repo.close) await repo.close();
  });

  test(`[${name}] remove deletes and reports result`, async () => {
    const repo = makeRepo();
    assert.equal(await repo.remove(1), true);
    assert.equal(await repo.getById(1), undefined);
    assert.equal(await repo.remove(9999), false);
    if (repo.close) await repo.close();
  });

  test(`[${name}] stats and reset`, async () => {
    const repo = makeRepo();
    assert.deepEqual(await repo.stats(), { total: 3, done: 1, open: 2 });
    await repo.remove(1);
    const restored = await repo.reset();
    assert.equal(restored.length, 3);
    assert.deepEqual(await repo.stats(), { total: 3, done: 1, open: 2 });
    if (repo.close) await repo.close();
  });
}

repositorySuite("memory", () => new InMemoryRepository());

let hasSqlite = true;
try {
  require("better-sqlite3");
} catch {
  hasSqlite = false;
}
if (hasSqlite) {
  repositorySuite("sqlite", () => new SqliteRepository(":memory:"));
} else {
  test("sqlite suite skipped (optional better-sqlite3 not installed)", () => {});
}

test("service maps validation and not-found errors", async () => {
  const service = new TaskService(new InMemoryRepository());

  await assert.rejects(() => service.createTask({}), ValidationError);
  await assert.rejects(() => service.createTask({ title: "   " }), ValidationError);
  await assert.rejects(() => service.getTask(9999), NotFoundError);
  await assert.rejects(() => service.updateTask(9999, { done: true }), NotFoundError);
  await assert.rejects(() => service.updateTask(1, {}), ValidationError);
  await assert.rejects(() => service.updateTask(1, { done: "yes" }), ValidationError);
  await assert.rejects(() => service.deleteTask(9999), NotFoundError);

  const created = await service.createTask({ title: "  Trim me  " });
  assert.equal(created.title, "Trim me");
  assert.equal(created.done, false);
});
