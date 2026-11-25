const { userSchema } = require("../validation/userSchema");
const crypto = require("crypto");
const util = require("util");
const prisma = require("../db/prisma");

const scrypt = util.promisify(crypto.scrypt);

// Hash a password before storing it
const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);

  return `${salt}:${derivedKey.toString("hex")}`;
};

// Compare a login password with the stored hash
const comparePassword = async (inputPassword, storedHash) => {
  if (typeof storedHash !== "string") {
    return false;
  }

  const [salt, key] = storedHash.split(":");

  if (!salt || !key || !/^[0-9a-f]{128}$/i.test(key)) {
    return false;
  }

  const derivedKey = await scrypt(inputPassword, salt, 64);
  const storedKey = Buffer.from(key, "hex");

  return crypto.timingSafeEqual(derivedKey, storedKey);
};

// Register a new user and create welcome tasks in one transaction
const register = async (req, res, next) => {
  const { error, value } = userSchema.validate(req.body || {}, {
    abortEarly: false
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details
    });
  }

  const { name, email, password } = value;

  try {
    const hashedPassword = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, name, hashedPassword },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        }
      });

      const welcomeTaskData = [
        { title: "Complete your profile", userId: newUser.id, priority: "medium" },
        { title: "Add your first task", userId: newUser.id, priority: "high" },
        { title: "Explore the app", userId: newUser.id, priority: "low" }
      ];

      await tx.task.createMany({ data: welcomeTaskData });

      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map((task) => task.title) }
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true
        },
        orderBy: { id: "asc" }
      });

      return { user: newUser, welcomeTasks };
    });

    global.user_id = result.user.id;

    return res.status(201).json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success"
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Email already registered" });
    }

    return next(err);
  }
};

// Log in an existing user using Prisma
const logon = async (req, res, next) => {
  const { email, password } = req.body || {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(401).json({
      message: "Invalid email or password"
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        hashedPassword: true
      }
    });

    if (!user || !(await comparePassword(password, user.hashedPassword))) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    global.user_id = user.id;

    return res.status(200).json({
      name: user.name,
      email: user.email
    });
  } catch (err) {
    return next(err);
  }
};

// Log out the current user
const logoff = (req, res) => {
  global.user_id = null;
  return res.sendStatus(200);
};

module.exports = { register, logon, logoff };