
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

const validId = (id) =>
  Number.isSafeInteger(Number(id)) && Number(id) > 0;

// CREATE - Prisma
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
        userId: global.user_id
      },
      select: {
        id: true,
        title: true,
        isCompleted: true
      }
    });

    return res.status(201).json({
      id: task.id,
      title: task.title,
      isCompleted: task.isCompleted
    });
  } catch (err) {
    return next(err);
  }
};

// INDEX - Prisma
exports.index = async (req, res, next) => {
  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const tasks = await prisma.task.findMany({
      where: {
        userId: global.user_id
      },
      select: {
        title: true,
        isCompleted: true,
        id: true
      }
    });

    if (tasks.length === 0) {
      return res.status(404).json({ message: "No tasks found" });
    }

    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      is_completed: task.isCompleted
    }));

    return res.status(200).json(formattedTasks);
  } catch (err) {
    return next(err);
  }
};

// SHOW - Prisma
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
      select: {
        id: true,
        title: true,
        isCompleted: true
      }
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json({
      id: task.id,
      title: task.title,
      is_completed: task.isCompleted
    });
  } catch (err) {
    return next(err);
  }
};

// UPDATE - Prisma
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
      data: value,
      where: {
        id,
        userId: global.user_id
      },
      select: {
        title: true,
        isCompleted: true,
        id: true
      }
    });

    return res.status(200).json({
      id: task.id,
      title: task.title,
      is_completed: task.isCompleted
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Task not found" });
    }

    return next(err);
  }
};

// DELETE - Prisma
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
      return res.status(404).json({
        message: "Task not found"
      });
    }

    return next(err);
  }
};
