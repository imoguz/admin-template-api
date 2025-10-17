"use strict";

const router = require("express").Router();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

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

router.get("/detailed", async (req, res) => {
  try {
    const dbPing = await Promise.allSettled([
      mongoose.connection.db.admin().ping(),
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
          status: dbPing[0].status === "fulfilled" ? "connected" : "error",
          state: ["disconnected", "connected", "connecting", "disconnecting"][
            mongoose.connection.readyState
          ],
          host: mongoose.connection.host,
          name: mongoose.connection.name,
        },
      },
    };

    const servicesHealthy = health.services.database.status === "connected";
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

router.get("/backup", async (req, res) => {
  try {
    const backupDir = path.join(process.cwd(), "backups");

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      return res.json({
        status: "degraded",
        message: "Backup directory created, no backups yet",
        backupSystem: "operational",
        latestBackup: "none",
        totalBackups: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const backups = fs
      .readdirSync(backupDir)
      .filter((file) => file.endsWith(".tar.gz"))
      .sort()
      .reverse();

    const latestBackup = backups[0];
    let healthStatus = "healthy";
    let message = "Backup system operational";

    if (!latestBackup) {
      healthStatus = "degraded";
      message = "No backups found";
    } else {
      const backupPath = path.join(backupDir, latestBackup);
      const backupAge = Date.now() - fs.statSync(backupPath).mtimeMs;
      const ageInDays = backupAge / (1000 * 60 * 60 * 24);

      if (ageInDays > 2) {
        healthStatus = "degraded";
        message = `Last backup is ${Math.floor(ageInDays)} days old`;
      }
    }

    res.json({
      status: healthStatus,
      message: message,
      backupSystem: "operational",
      latestBackup: latestBackup || "none",
      totalBackups: backups.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: "Backup system error: " + error.message,
    });
  }
});

module.exports = router;
