"use strict";

const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: true,
    message:
      "Too many authentication attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const realIP = req.headers["x-real-ip"];
    const ip = forwarded ? forwarded.split(",")[0].trim() : realIP || req.ip;
    return `auth:${ip}`;
  },
  skip: (req) => {
    // only login route and POST method
    if (req.method !== "POST" || !req.originalUrl.includes("/auth/login")) {
      return true;
    }

    if (!req.body || !req.body.email || !req.body.password) {
      return true;
    }

    if (req.body.password && req.body.password.length < 8) {
      return true;
    }

    return false;
  },
});

module.exports = authLimiter;
