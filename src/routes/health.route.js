"use strict";

const router = require("express").Router();
const mongoose = require("mongoose");
const cacheService = require("../services/cache.service");
const redisManager = require("../configs/redis");

// Basic health check
router.get("/", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
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
      host: mongoose.connection.host,
      name: mongoose.connection.name,
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
    const redisHealth = await cacheService.healthCheck();
    const redisStatus = redisManager.getStatus();

    res.json({
      redis: redisHealth.status,
      message: redisHealth.message,
      isConnected: redisStatus.isConnected,
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

// Cache health check
router.get("/cache", async (req, res) => {
  try {
    // Test cache functionality
    const testKey = "health:test";
    const testData = { test: true, timestamp: new Date().toISOString() };

    const setResult = await cacheService.set(testKey, testData, 60);
    const getResult = await cacheService.get(testKey);
    const deleteResult = await cacheService.delete(testKey);

    res.json({
      cache: "operational",
      set: setResult,
      get: getResult !== null,
      delete: deleteResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      cache: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Comprehensive health check
router.get("/detailed", async (req, res) => {
  try {
    const [dbPing, redisHealth, cacheHealth] = await Promise.allSettled([
      mongoose.connection.db.admin().ping(),
      cacheService.healthCheck(),
      cacheService.set("health:detailed", { check: true }, 10),
    ]);

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
          status: dbPing.status === "fulfilled" ? "connected" : "error",
          state: ["disconnected", "connected", "connecting", "disconnecting"][
            mongoose.connection.readyState
          ],
          host: mongoose.connection.host,
          name: mongoose.connection.name,
        },
        redis: {
          status:
            redisHealth.status === "fulfilled"
              ? redisHealth.value.status
              : "error",
          message:
            redisHealth.status === "fulfilled"
              ? redisHealth.value.message
              : redisHealth.reason?.message,
          isConnected: redisManager.isConnected,
        },
        cache: {
          status:
            cacheHealth.status === "fulfilled" && cacheHealth.value
              ? "operational"
              : "error",
        },
      },
    };

    // Overall status'ü belirle
    const servicesHealthy =
      health.services.database.status === "connected" &&
      health.services.redis.status === "connected" &&
      health.services.cache.status === "operational";

    health.status = servicesHealthy ? "healthy" : "degraded";

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
