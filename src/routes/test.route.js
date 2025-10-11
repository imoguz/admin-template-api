"use strict";

const router = require("express").Router();
const Project = require("../models/project.model");
const cache = require("../helpers/cache");
const cacheService = require("../services/cache.service");

// Cache status with detailed info
router.get("/cache-status", async (req, res) => {
  try {
    const health = await cache.healthCheck();
    const status = cache.getStatus();

    res.json({
      redis: health,
      status: status,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Smart cache test
router.get("/cache-test", async (req, res) => {
  try {
    const cacheKey = "test:public:projects";
    const status = cache.getStatus();

    // Fallback mode kontrolü
    if (status.fallbackMode) {
      console.log("💡 Cache test: Running in fallback mode, skipping cache");

      const projects = await Project.find().sort({ createdAt: -1 }).limit(5);
      return res.json({
        source: "database",
        cache: "disabled (fallback mode)",
        data: { data: projects },
        timestamp: new Date().toISOString(),
      });
    }

    // Normal cache işlemi
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({
        source: "cache",
        data: cached,
        timestamp: new Date().toISOString(),
      });
    }

    const projects = await Project.find().sort({ createdAt: -1 }).limit(5);
    const response = { data: projects };

    await cache.set(cacheKey, response, 120);

    res.json({
      source: "database",
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cache test error:", err);
    res.status(500).json({
      error: "Test failed",
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/clear-cache/:pattern", async (req, res) => {
  try {
    const { pattern } = req.params;
    await cacheService.deletePattern(pattern);
    res.json({
      success: true,
      message: `Cache cleared for pattern: ${pattern}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
