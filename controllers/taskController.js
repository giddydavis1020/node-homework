
const pool = require("../db/pg-pool");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

const validId = (id) =>
  Number.isSafeInteger(Number(id)) && Number(id) > 0;

// CREATE
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
    const result = await pool.query(
      `INSERT INTO tasks (title, is_completed, user_id)
       VALUES ($1, $2, $3)
       RETURNING id, title, is_completed`,
      [value.title, value.isCompleted, global.user_id]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (next) return next(err);
    throw err;
  }
};

// INDEX
exports.index = async (req, res, next) => {
  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await pool.query(
      "SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
      [global.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No tasks found" });
    }

    return res.status(200).json(result.rows);
  } catch (err) {
    if (next) return next(err);
    throw err;
  }
};

// SHOW
exports.show = async (req, res, next) => {
  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!validId(req.params?.id)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  try {
    const result = await pool.query(
      `SELECT id, title, is_completed FROM tasks
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, global.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    if (next) return next(err);
    throw err;
  }
};

// UPDATE
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

  const keys = Object.keys(value);

  if (keys.length === 0) {
    return res.status(400).json({ message: "No changes provided" });
  }

  const columns = keys.map(key =>
    key === "isCompleted" ? "is_completed" : key
  );

  const setClauses = columns.map(
    (key, i) => `${key} = $${i + 1}`
  ).join(", ");

  try {
    const result = await pool.query(
      `UPDATE tasks SET ${setClauses}
       WHERE id = $${keys.length + 1}
       AND user_id = $${keys.length + 2}
       RETURNING id, title, is_completed`,
      [...Object.values(value), req.params.id, global.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    if (next) return next(err);
    throw err;
  }
};

// DELETE
exports.deleteTask = async (req, res, next) => {
  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!validId(req.params?.id)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  try {
    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, is_completed`,
      [req.params.id, global.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    if (next) return next(err);
    throw err;
  }
};
