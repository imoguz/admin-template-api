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
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: (req) => {
    if (req.path.startsWith("/health")) return 0; // Health check için limit yok
    return 100; // IP başına 100 istek
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
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 10, // IP başına 10 login attempt
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
  windowMs: 60 * 60 * 1000, // 1 saat
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
