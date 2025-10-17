"use strict";

const router = require("express").Router();
const {
  getPublishedProjectBySlug,
  getAllPublishedProjects,
} = require("../controllers/public.controller");

const rateLimit = require("express-rate-limit");

// Rate limit
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  max: 100, // 100 req per IP
  message: {
    success: false,
    error: "Too many requests from this IP",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(publicLimiter);

router.get("/projects", getAllPublishedProjects);
router.get("/projects/:slug", getPublishedProjectBySlug);

module.exports = router;
