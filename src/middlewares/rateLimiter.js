"use strict";

const rateLimit = require("express-rate-limit");

// IP address helper
const getClientIP = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const realIP = req.headers["x-real-ip"];

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIP) {
    return realIP.trim();
  }
  return req.ip;
};

// Rate limit configuration
const createRateLimiter = (config) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      error: true,
      message: config.message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = getClientIP(req);
      return `${config.keyPrefix}:${ip}`;
    },
    skip: (req) => {
      if (req.path.startsWith("/health")) return true;
      if (process.env.NODE_ENV === "development" && config.skipInDevelopment) {
        return true;
      }
      return false;
    },
  });
};

// Rate limit configurations
const rateLimitConfigs = {
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message:
      "Too many authentication attempts. Please try again in 15 minutes.",
    keyPrefix: "auth",
    skipInDevelopment: false,
  },
  api: {
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: "Too many requests. Please try again later.",
    keyPrefix: "api",
    skipInDevelopment: true,
  },
  public: {
    windowMs: 1 * 60 * 1000,
    max: 200,
    message: "Too many requests from your network.",
    keyPrefix: "public",
    skipInDevelopment: true,
  },
};

// Rate limit instances
const authLimiter = createRateLimiter(rateLimitConfigs.auth);
const apiLimiter = createRateLimiter(rateLimitConfigs.api);
const publicLimiter = createRateLimiter(rateLimitConfigs.public);

// Global rate limiter (fallback)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: true,
    message: "Too many requests from your IP address.",
  },
  standardHeaders: true,
});

module.exports = {
  authLimiter,
  apiLimiter,
  publicLimiter,
  globalLimiter,
  getClientIP,
};
