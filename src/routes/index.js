"use strict";

const router = require("express").Router();
const { apiLimiter, publicLimiter } = require("../middlewares/rateLimiter");

// Public routes with higher rate limits
router.use("/health", publicLimiter, require("./health.route"));
router.use("/public", require("./public.route"));

// Auth routes - custom rate limiter
router.use("/auth", require("./auth.route"));

// API routes with standard rate limiting
router.use("/users", apiLimiter, require("./user.route"));
router.use("/projects", apiLimiter, require("./project.route"));
router.use(
  "/section-template",
  publicLimiter,
  require("./sectionTemplate.route")
);

module.exports = router;
