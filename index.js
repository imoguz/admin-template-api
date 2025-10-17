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
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com",
        ],
        connectSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      },
    },
  })
);

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
app.use(require("./src/middlewares/rateLimiter").globalLimiter);

// ----- Security Middlewares -----
// 1. URL Security
const urlSecurity = require("./src/middlewares/urlSecurity");
app.use(urlSecurity);

// 2. Query Handler
const queryHandler = require("./src/middlewares/queryHandler");
app.use(queryHandler);

// 3. NoSQL Injection Protection
const sanitize = require("./src/middlewares/sanitize");
app.use(sanitize);

// 4. File Upload Security
const fileUploadSecurity = require("./src/middlewares/fileUploadSecurity");
app.use(fileUploadSecurity);

// 5. XSS Protection
const xssSanitize = require("./src/middlewares/xssSanitize");
app.use(xssSanitize);

// ----- Static File Serving -----
const path = require("path");
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "1d",
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      // Security headers for static files
      res.set("X-Content-Type-Options", "nosniff");
      res.set("X-Frame-Options", "DENY");
    },
  })
);

// -----Logger -----
const logger = require("./src/middlewares/logger");
app.use(logger);

// ----- Audit Middleware -----
const { auditMiddleware } = require("./src/helpers/audit.helper");
app.use(auditMiddleware);

// ----- swagger documents -----
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./src/configs/swagger");
app.use("/api-docs/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// ----- routes -----
const routes = require("./src/routes");
app.use("/api/v1", routes);

// ----- 404 Catch-All Middleware -----
app.use((req, res, next) => {
  res.status(404).json({ error: "Not found" });
});

// ----- Error Handler -----
const errorHandler = require("./src/middlewares/errorHandler");
app.use(errorHandler);

// ----- Start server -----
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
