"use strict";

const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redisManager = require("../configs/redis");

const createAuthRateLimiter = () => {
  const store = redisManager.isConnected
    ? new RedisStore({
        sendCommand: (...args) => redisManager.getClient().sendCommand(args),
        prefix: "rate_limit:auth:",
      })
    : undefined;

  return rateLimit({
    store: store,
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
      console.log("🔍 Rate Limiter Debug:", {
        path: req.originalUrl,
        method: req.method,
        hasBody: !!req.body,
        hasEmail: !!(req.body && req.body.email),
        hasPassword: !!(req.body && req.body.password),
        passwordLength: req.body?.password?.length,
      });

      // Sadece login route'u ve POST methodu
      if (req.method !== "POST" || !req.originalUrl.includes("/auth/login")) {
        console.log("Skipped - Not login route");
        return true;
      }

      if (!req.body || !req.body.email || !req.body.password) {
        console.log("Skipped - Missing email or password");
        return true;
      }

      if (req.body.password && req.body.password.length < 8) {
        console.log("Skipped - Password too short");
        return true;
      }

      console.log("Applying rate limiting for this request");
      return false;
    },
  });
};

const authLimiter = createAuthRateLimiter();

module.exports = authLimiter;
