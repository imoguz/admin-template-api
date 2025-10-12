"use strict";

const router = require("express").Router();
const {
  apiLimiter,
  publicLimiter,
} = require("../middlewares/redisRateLimiter");

// NOT: authLimiter artık kullanılmıyor, auth.route'da custom rate limiter var

// Public routes with higher rate limits
router.use("/health", publicLimiter, require("./health.route"));

// Auth routes - artık auth.route.js içinde custom rate limiter var
router.use("/auth", require("./auth.route")); // authLimiter kaldırıldı

// API routes with standard rate limiting
router.use("/users", apiLimiter, require("./user.route"));
router.use("/projects", apiLimiter, require("./project.route"));
router.use(
  "/section-template",
  publicLimiter,
  require("./sectionTemplate.route")
);
router.use("/test", apiLimiter, require("./test.route"));
router.use("/backup", apiLimiter, require("./backup.route"));

module.exports = router;
