const prisma = require("../db/prisma");

const parsePositiveInteger = (value) => {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    value = Number(value);
  }

  return Number.isSafeInteger(value) && value >= 1 ? value : null;
};

const parseLimit = (value) => {
  const limit = parsePositiveInteger(value);
  return limit !== null && limit <= 100 ? limit : null;
};

exports.getUserAnalytics = async (req, res, next) => {
  const userId = Number(req.params.id);

  if (!Number.isSafeInteger(userId) || userId <= 0 || userId > 2147483647) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const taskStats = await prisma.task.groupBy({
      by: ["isCompleted"],
      where: { userId },
      _count: { id: true }
    });

    const recentTasks = await prisma.task.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        userId: true,
        User: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyProgress = await prisma.task.groupBy({
      by: ["createdAt"],
      where: {
        userId,
        createdAt: { gte: oneWeekAgo }
      },
      _count: { id: true }
    });

    return res.status(200).json({
      taskStats,
      recentTasks,
      weeklyProgress
    });
  } catch (err) {
    return next(err);
  }
};

exports.getUsersWithStats = async (req, res, next) => {
  const { page: rawPage = 1, limit: rawLimit = 10 } = req.query;
  const page = parsePositiveInteger(rawPage);
  const limit = parseLimit(rawLimit);

  if (page === null) {
    return res.status(400).json({
      error: "Page must be an integer greater than or equal to 1"
    });
  }

  if (limit === null) {
    return res.status(400).json({
      error: "Limit must be an integer between 1 and 100"
    });
  }

  const skip = (page - 1) * limit;

  if (!Number.isSafeInteger(skip)) {
    return res.status(400).json({ error: "Page is too large" });
  }

  try {
    const usersRaw = await prisma.user.findMany({
      include: {
        Task: {
          where: { isCompleted: false },
          select: { id: true },
          take: 5
        },
        _count: {
          select: { Task: true }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
    });

    const users = usersRaw.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      _count: user._count,
      Task: user.Task
    }));

    const total = await prisma.user.count();

    return res.status(200).json({
      users,
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

exports.searchTasks = async (req, res, next) => {
  const { q, limit: rawLimit = 20 } = req.query;
  const searchQuery = typeof q === "string" ? q.trim() : "";

  if (searchQuery.length < 2) {
    return res.status(400).json({
      error: "Search query must be at least 2 characters long"
    });
  }

  const limit = parseLimit(rawLimit);

  if (limit === null) {
    return res.status(400).json({
      error: "Limit must be an integer between 1 and 100"
    });
  }

  const searchPattern = `%${searchQuery}%`;
  const exactMatch = searchQuery;
  const startsWith = `${searchQuery}%`;

  try {
    const results = await prisma.$queryRaw`
      SELECT
        t.id,
        t.title,
        t.is_completed AS "isCompleted",
        t.priority,
        t.created_at AS "createdAt",
        t.user_id AS "userId",
        u.name AS "user_name"
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.title ILIKE ${searchPattern}
         OR u.name ILIKE ${searchPattern}
      ORDER BY
        CASE
          WHEN t.title ILIKE ${exactMatch} THEN 1
          WHEN t.title ILIKE ${startsWith} THEN 2
          WHEN t.title ILIKE ${searchPattern} THEN 3
          ELSE 4
        END,
        t.created_at DESC
      LIMIT ${limit}
    `;

    return res.status(200).json({
      results,
      query: searchQuery,
      count: results.length
    });
  } catch (err) {
    return next(err);
  }
};