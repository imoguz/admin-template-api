"use strict";

// Global Error Handling Middleware

module.exports = (err, req, res, next) => {
  console.error("Error caught:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;

  const response = {
    error: true,
    message: err.message || "Internal Server Error",
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).send(response);
};
