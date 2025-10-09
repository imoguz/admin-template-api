"use strict";

const router = require("express").Router();
const mongoose = require("mongoose");
const cache = require("../helpers/cache");

// Basic health check
router.get("/", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
  });
});

// Database health check
router.get("/db", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStates = [
      "disconnected",
      "connected",
      "connecting",
      "disconnecting",
    ];

    await mongoose.connection.db.admin().ping();

    res.json({
      database: "connected",
      state: dbStates[dbState],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Redis health check
router.get("/redis", async (req, res) => {
  try {
    const redisHealth = await cache.healthCheck();
    res.json({
      redis: redisHealth.status,
      message: redisHealth.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      redis: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Comprehensive health check
router.get("/detailed", async (req, res) => {
  try {
    const [redisHealth] = await Promise.all([cache.healthCheck()]);

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: {
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(
            process.memoryUsage().heapTotal / 1024 / 1024
          )} MB`,
          heapUsed: `${Math.round(
            process.memoryUsage().heapUsed / 1024 / 1024
          )} MB`,
        },
        uptime: `${Math.round(process.uptime())} seconds`,
      },
      services: {
        database: {
          state: ["disconnected", "connected", "connecting", "disconnecting"][
            mongoose.connection.readyState
          ],
          host: mongoose.connection.host,
          name: mongoose.connection.name,
        },
        redis: redisHealth,
      },
    };

    // Overall status'ü belirle
    if (
      mongoose.connection.readyState !== 1 ||
      redisHealth.status !== "connected"
    ) {
      health.status = "degraded";
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
