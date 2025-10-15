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

// Genel API limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  max: (req) => {
    if (req.path.startsWith("/health")) return 0;
    return 100; // 100 req per IP
  },
  message: {
    error: true,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    return `global:${ip}`;
  },
});

// Auth-specific limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  max: 10, // 10 login attempt per IP
  message: {
    error: true,
    message: "Too many authentication attempts. Try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    return `auth:${ip}`;
  },
});

// Strict limiter for critical operations
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 h
  max: 20,
  message: {
    error: true,
    message: "Too many attempts. Please try again later.",
  },
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const path = req.path.replace(/\//g, ":");
    return `strict:${ip}:${path}`;
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
  strictLimiter,
};
