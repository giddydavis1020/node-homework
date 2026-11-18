
const express = require("express");
const prisma = require("./db/prisma");
const timeRouter = require("./routes/timeRoutes");
const authMiddleware = require("./middleware/auth");
const taskRouter = require("./routes/taskRoutes");

// assignment 3 imports
const userRoutes = require("./routes/userRoutes");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

const app = express();

// assignment 5 uses PostgreSQL for users and tasks
global.user_id = null;

// parse JSON requests
app.use(express.json());

// assignment 2 routes
app.use("/api", timeRouter);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.post("/testpost", (req, res) => {
  res.status(200).json({
    message: "POST route works",
  });
});

// database health check using Prisma
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({
      status: "error",
      db: "not connected",
      error: err.message,
    });
  }
});

// assignment 3 user routes
app.use("/api/users", userRoutes);

// assignment 4 protected task routes
app.use("/api/tasks", authMiddleware, taskRouter);

// handle routes that don't exist
app.use(notFound);

// handle server errors
app.use(errorHandler);

// start server
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}...`);
});

// graceful shutdown
let isShuttingDown = false;

async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Shutting down gracefully...");

  try {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log("HTTP server closed.");
    
  } catch (err) {
    console.error("Error during shutdown:", err);
    code = 1;
  } finally {
    try {
      await prisma.$disconnect();
      console.log("Prisma disconnected");
    } catch (err) {
      console.error("Error disconnecting Prisma:", err);
      code = 1;
    }

    process.exit(code);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

module.exports = { app, server };
