"use strict";

const router = require("express").Router();
const RestoreManager = require("../scripts/backup/BackupManager");
const requirePermission = require("../middlewares/requirePermission");

// Restore listesi (available backups)
router.get(
  "/available",
  requirePermission("VIEW_RESTORES"),
  async (req, res) => {
    try {
      const manager = new RestoreManager();
      const backups = manager.getAvailableBackups();

      res.json({
        success: true,
        backups,
        count: backups.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Restore işlemi başlatma
router.post(
  "/start",
  requirePermission("EXECUTE_RESTORE"),
  async (req, res) => {
    try {
      const {
        backupSource,
        restoreToDatabase,
        dropCollections = false,
        skipVerification = false,
        preserveIds = true,
        withCloudinary = false,
      } = req.body;

      if (!backupSource) {
        return res.status(400).json({
          success: false,
          error: "backupSource is required",
        });
      }

      const manager = new RestoreManager();

      // Async olarak başlat (background process)
      manager
        .createComprehensiveRestore(backupSource, {
          restoreToDatabase,
          dropCollections,
          skipVerification,
          preserveIds,
          restoreCloudinaryMetadata: withCloudinary,
        })
        .then((result) => {
          // Result logging yapılacak
          console.log(`Restore completed: ${result.restoreId}`);
        })
        .catch((error) => {
          console.error(`Restore failed: ${error.message}`);
        });

      res.json({
        success: true,
        message: "Restore process started",
        restoreId: `restore-${new Date().toISOString().replace(/[:.]/g, "-")}`,
        startedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Restore status kontrolü
router.get(
  "/status/:restoreId",
  requirePermission("VIEW_RESTORES"),
  async (req, res) => {
    try {
      // Burada restore status'unu takip eden bir sistem implement edilebilir
      // Şimdilik basit bir response
      res.json({
        success: true,
        status: "completed", // veya "in-progress", "failed"
        message: "Restore status tracking will be implemented",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Restore history
router.get("/history", requirePermission("VIEW_RESTORES"), async (req, res) => {
  try {
    const manager = new RestoreManager();
    const history = manager.getRestoreHistory();

    res.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
