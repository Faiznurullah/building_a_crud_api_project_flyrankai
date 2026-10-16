const express = require("express");

const parseId = (raw) => Number.parseInt(raw, 10);
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Routes only translate HTTP <-> service calls. They contain no storage logic,
 * so they did not change when the repository was swapped.
 */
function taskRoutes(taskService) {
  const router = express.Router();

  router.get(
    "/tasks",
    asyncHandler(async (req, res) => {
      const { done, search, sort } = req.query;
      let doneFilter;
      if (done === "true") doneFilter = true;
      else if (done === "false") doneFilter = false;
      res.json(await taskService.listTasks({ done: doneFilter, search, sort }));
    })
  );

  router.get(
    "/tasks/:id",
    asyncHandler(async (req, res) => {
      res.json(await taskService.getTask(parseId(req.params.id)));
    })
  );

  router.post(
    "/tasks",
    asyncHandler(async (req, res) => {
      res.status(201).json(await taskService.createTask(req.body));
    })
  );

  router.put(
    "/tasks/:id",
    asyncHandler(async (req, res) => {
      res.json(await taskService.updateTask(parseId(req.params.id), req.body));
    })
  );

  router.delete(
    "/tasks/:id",
    asyncHandler(async (req, res) => {
      await taskService.deleteTask(parseId(req.params.id));
      res.status(204).send();
    })
  );

  router.get(
    "/stats",
    asyncHandler(async (req, res) => {
      res.json(await taskService.getStats());
    })
  );

  router.post(
    "/reset",
    asyncHandler(async (req, res) => {
      res.json(await taskService.resetTasks());
    })
  );

  return router;
}

module.exports = { taskRoutes };
