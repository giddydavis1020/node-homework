const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

const parsePositiveInteger = (value) => {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    value = Number(value);
  }

  return Number.isSafeInteger(value) && value >= 1 ? value : null;
};

const validId = (id) =>
  Number.isSafeInteger(Number(id)) && Number(id) > 0;

const taskWithUserSelect = {
  id: true,
  title: true,
  isCompleted: true,
  priority: true,
  createdAt: true,
  User: {
    select: {
      name: true,
      email: true
    }
  }
};

exports.create = async (req, res, next) => {
  const { error, value } = taskSchema.validate(req.body || {}, {
    abortEarly: false
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details
    });
  }

  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const task = await prisma.task.create({
      data: {
        title: value.title,
        isCompleted: value.isCompleted,
        priority: value.priority,
        userId: global.user_id
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true
      }
    });

    return res.status(201).json(task);
  } catch (err) {
    return next(err);
  }
};

exports.bulkCreate = async (req, res, next) => {
  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { tasks } = req.body || {};

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks."
    });
  }

  const validTasks = [];

  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);

    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details
      });
    }

    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: global.user_id
    });
  }

  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false
    });

    return res.status(201).json({
      message: "Bulk task creation successful",
      tasksCreated: result.count,
      totalRequested: validTasks.length
    });
  } catch (err) {
    return next(err);
  }
};

exports.index = async (req, res, next) => {
  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { page: rawPage = 1, limit: rawLimit = 10, find } = req.query;
  const page = parsePositiveInteger(rawPage);
  const limit = parsePositiveInteger(rawLimit);

  if (page === null) {
    return res.status(400).json({
      error: "Page must be an integer greater than or equal to 1"
    });
  }

  if (limit === null || limit > 100) {
    return res.status(400).json({
      error: "Limit must be an integer between 1 and 100"
    });
  }

  if (find !== undefined && typeof find !== "string") {
    return res.status(400).json({ error: "Find must be a string" });
  }

  const skip = (page - 1) * limit;

  if (!Number.isSafeInteger(skip)) {
    return res.status(400).json({ error: "Page is too large" });
  }

  const whereClause = { userId: global.user_id };

  if (find) {
    whereClause.title = {
      contains: find,
      mode: "insensitive"
    };
  }

  try {
    const tasks = await prisma.task.findMany({
      where: whereClause,
      select: taskWithUserSelect,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
    });

    if (tasks.length === 0) {
      return res.status(404).json({ message: "No tasks found" });
    }

    const total = await prisma.task.count({ where: whereClause });

    return res.status(200).json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    return next(err);
  }
};

exports.show = async (req, res, next) => {
  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!validId(req.params?.id)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  const id = Number(req.params.id);

  try {
    const task = await prisma.task.findUnique({
      where: {
        id,
        userId: global.user_id
      },
      select: taskWithUserSelect
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json(task);
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  const { error, value } = patchTaskSchema.validate(req.body || {}, {
    abortEarly: false
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details
    });
  }

  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!validId(req.params?.id)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  if (Object.keys(value).length === 0) {
    return res.status(400).json({ message: "No changes provided" });
  }

  const id = Number(req.params.id);

  try {
    const task = await prisma.task.update({
      where: {
        id,
        userId: global.user_id
      },
      data: value,
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true
      }
    });

    return res.status(200).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    }

    return next(err);
  }
};

exports.deleteTask = async (req, res, next) => {
  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!validId(req.params?.id)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  const id = Number(req.params.id);

  try {
    const task = await prisma.task.delete({
      where: {
        id,
        userId: global.user_id
      },
      select: {
        id: true,
        title: true,
        isCompleted: true
      }
    });

    return res.status(200).json({
      id: task.id,
      title: task.title,
      is_completed: task.isCompleted
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    }

    return next(err);
  }
};