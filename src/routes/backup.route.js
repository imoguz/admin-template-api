"use strict";

const router = require("express").Router();
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const requirePermission = require("../middlewares/requirePermission");

// List available backups
router.get("/list", requirePermission("VIEW_BACKUPS"), (req, res) => {
  try {
    const backupDir = path.join(process.cwd(), "backups");

    if (!fs.existsSync(backupDir)) {
      return res.json({ backups: [] });
    }

    const backups = fs
      .readdirSync(backupDir)
      .filter((file) => file.endsWith(".tar.gz"))
      .map((file) => {
        const filePath = path.join(backupDir, file);
        const stat = fs.statSync(filePath);

        return {
          name: file,
          size: formatBytes(stat.size),
          modified: stat.mtime,
          age: calculateAge(stat.mtime),
        };
      })
      .sort((a, b) => b.modified - a.modified);

    res.json({ success: true, backups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create manual backup
router.post("/create", (req, res) => {
  try {
    const result = execSync("node src/scripts/backup.js", { encoding: "utf8" });

    res.json({
      success: true,
      message: "Backup created successfully",
      output: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Utility functions
function formatBytes(bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

function calculateAge(date) {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days === 0 ? "Today" : `${days} days ago`;
}

module.exports = router;
