
const express = require("express");
const timeRouter = require("./routes/timeRoutes");

// assignment 3 imports
const userRoutes = require("./routes/userRoutes");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

const app = express();

// initialize temporary database
global.user_id = null;
global.users = [];
global.tasks = [];

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

// assignment 3 user routes
app.use("/api/users", userRoutes);

// handle routes that don't exist
app.use(notFound);

// handle server errors
app.use(errorHandler);

// start server
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}...`);
});

module.exports = { app, server };
