"use strict";

// ----- Run app on express -----
const express = require("express");
const app = express();

// ----- .env variables -----
require("dotenv").config();
const PORT = process.env.PORT || 8000;

// ----- Environment Validation -----
try {
  require("./src/configs/env-validation");
} catch (error) {
  console.error("Environment validation failed:", error.message);
  process.exit(1);
}

// ----- Security Headers with Helmet -----
const helmet = require("helmet");
app.use(helmet());

// ----- Database Connection -----
require("./src/configs/dbConnection")();

// ----- HTTP Logging with Morgan -----
if (process.env.NODE_ENV === "development") {
  app.use(require("morgan")("dev"));
}

// ----- Convert to JSON -----
app.use(express.json({ limit: "1mb" }));

// ----- cors configuration -----
const cors = require("cors");

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: This origin is not allowed."));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Allow-Credentials",
  ],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// ----- Rate Limiting -----
// const { globalLimiter } = require("./src/middlewares/rateLimiter");
// app.use(globalLimiter);

// ----- middlewares -----

// -----Query Handler -----
const queryHandler = require("./src/middlewares/queryHandler");
app.use(queryHandler);

// ----- NoSQL Injection Protection -----
const sanitize = require("./src/middlewares/sanitize");
app.use(sanitize);

// -----Logger -----
const logger = require("./src/middlewares/logger");
app.use(logger);

// ----- swagger documents -----
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./src/configs/swagger");
app.use("/api-docs/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// ----- routes -----
const routes = require("./src/routes");
app.use("/api/v1", routes);

// ----- Health Check Route -----
app.use("/health", require("./src/routes/health.route"));

// ----- 404 Catch-All Middleware -----
app.use((req, res, next) => {
  res.status(404).json({ error: "Not found" });
});

// ----- Error Handler -----
const errorHandler = require("./src/middlewares/errorHandler");
app.use(errorHandler);

// ----- Start server -----
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
