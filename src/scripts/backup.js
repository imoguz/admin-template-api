#!/usr/bin/env node
"use strict";

/**
 * Advanced Backup Script
 * -----------------------
 * - Connects to MongoDB before backup
 * - Executes full backup using AdvancedBackupManager
 * - Handles file size reporting correctly
 * - Outputs Cloudinary link cleanly
 */

require("dotenv").config({
  path: require("path").join(__dirname, "../../.env"),
});

const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const AdvancedBackupManager = require("./backup/AdvancedBackupManager");

// ✅ 1. Mongoose bağlantısını garantiye al
async function connectDB() {
  if (mongoose.connection.readyState === 1) return; // zaten bağlıysa tekrar bağlanma
  const uri = process.env.MONGODB;
  if (!uri) {
    console.error("❌ Missing MONGODB in .env file");
    process.exit(1);
  }

  console.log("🔗 Connecting to MongoDB...");
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connection established for backup operations.\n");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

// ✅ 2. Ana backup işlemi
async function main() {
  await connectDB(); // Mongo bağlantısını aç

  const manager = new AdvancedBackupManager();
  const result = await manager.createComprehensiveBackup();

  if (result.success) {
    const backupFilePath =
      result.localPath ||
      manager.compressedPath ||
      (manager.backupDir && manager.backupName
        ? path.join(manager.backupDir, `${manager.backupName}.tar.gz`)
        : null);

    let fileSize = "N/A";
    if (backupFilePath) {
      try {
        const stats = fs.statSync(backupFilePath);
        fileSize = `${(stats.size / 1024).toFixed(2)} KB`;
      } catch (err) {
        console.warn("⚠️ Could not determine file size:", err.message);
      }
    } else {
      console.warn(
        "⚠️ Backup file path is not available in result or manager instance."
      );
    }

    const displayedFileName =
      (result.backup && result.backup) ||
      (result.localPath && path.basename(result.localPath)) ||
      (manager.backupName ? `${manager.backupName}.tar.gz` : "unknown");

    console.log("\n✅ Backup completed successfully!");
    console.log(`📁 File: ${displayedFileName}`);
    console.log(`📊 Size: ${fileSize}`);
    console.log(`🕒 Time: ${result.timestamp}`);

    if (result.cloudinary && result.cloudinary.success) {
      const url = result.cloudinary.url;
      console.log(`☁️ Cloudinary: ${url}`);
    }

    // Bağlantıyı temiz kapat
    await mongoose.disconnect();
    process.exit(0);
  } else {
    console.error("\n❌ Backup failed!");
    console.error(`📛 Error: ${result.error}`);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// ✅ 3. Global error handlers
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  mongoose.disconnect().then(() => process.exit(1));
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  mongoose.disconnect().then(() => process.exit(1));
});

// ✅ 4. Entry point
if (require.main === module) {
  main();
}
