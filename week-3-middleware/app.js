const express = require("express");
const dogsRouter = require("./routes/dogs");
const { randomUUID } = require("crypto");
const app = express();

// request id middleware
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

// logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}]: ${req.method} ${req.path} ($[req.requestId])`);

  next();
});


// parse incoming JSON requests
app.use(express.json());

// serve static files from the public folder
app.use(express.static("week-3-middleware/public"));


app.use("/", dogsRouter);// Do not remove this line

// 404 handler

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    requestId: req.requestId
  });
});

// 500 error handler

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: "Internal Server Error",
    requestId: req.requestId
  });
});


if (require.main === module) {
  app.listen(3000, () => {
    console.log("Dog rescue app is listening on port 3000...");
  });
}

module.exports = app;

