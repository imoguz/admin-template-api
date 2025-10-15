#!/usr/bin/env node
"use strict";

require("dotenv").config({
  path: require("path").join(__dirname, "../../.env"),
});

const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const RestoreManager = require("./restore/RestoreManager");

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB;
  if (!uri) {
    console.error("❌ Missing MONGODB in .env file");
    process.exit(1);
  }

  console.log("🔗 Connecting to MongoDB...");
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connection established for restore operations.\n");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const backupSource = args[0];

  if (!backupSource) {
    showUsage();
    process.exit(1);
  }

  const options = {
    dropCollections: args.includes("--drop"),
    skipVerification: args.includes("--skip-verify"),
    preserveIds: !args.includes("--new-ids"),
    restoreToDatabase: getArgValue("--database"),
    restoreCloudinaryMetadata: args.includes("--with-cloudinary"),
    nsFrom: getArgValue("--nsFrom"),
    nsTo: getArgValue("--nsTo"),
  };

  // Help gösterimi
  if (backupSource === "--help" || backupSource === "-h") {
    showUsage();
    process.exit(0);
  }

  // List backups
  if (backupSource === "--list" || backupSource === "-l") {
    await listBackups();
    process.exit(0);
  }

  await connectDB();

  const manager = new RestoreManager();
  const result = await manager.createComprehensiveRestore(
    backupSource,
    options
  );

  if (result.success) {
    console.log("\n" + "=".repeat(60));
    console.log("✅ RESTORE COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(`📁 Backup: ${result.backupUsed}`);
    console.log(
      `🎯 Database: ${result.sourceDatabase} → ${result.targetDatabase}`
    );
    console.log(`📊 Collections: ${result.collectionsRestored.length}`);
    console.log(`📄 Documents: ${result.documentsRestored}`);
    console.log(`⏱️ Duration: ${result.duration}ms`);
    console.log(`🆔 Restore ID: ${result.restoreId}`);

    if (
      result.namespaceMapping &&
      Object.keys(result.namespaceMapping).length > 0
    ) {
      console.log(`🔄 Namespace Mapping:`, result.namespaceMapping);
    }

    console.log("=".repeat(60));

    await mongoose.disconnect();
    process.exit(0);
  } else {
    console.error("\n❌ RESTORE FAILED!");
    console.error(`📛 Error: ${result.error}`);
    await mongoose.disconnect();
    process.exit(1);
  }
}

function showUsage() {
  console.log(`
🔧 MongoDB Restore Script - Usage
=================================

Basic Usage:
  node restore.js <backup-file|latest|cloudinary:public_id> [options]

Examples:
  node restore.js backup-20251015-1220.tar.gz
  node restore.js latest
  node restore.js cloudinary:backup-20251015-1220
  node restore.js https://res.cloudinary.com/.../backup-20251015-1220.gz

Options:
  --drop                    Drop collections before restore
  --skip-verify            Skip integrity verification
  --new-ids                Generate new ObjectIds (don't preserve original IDs)
  --with-cloudinary        Restore Cloudinary metadata
  --database <name>        Restore to different database
  --nsFrom <pattern>       Source namespace pattern (e.g., "test.*")
  --nsTo <pattern>         Target namespace pattern (e.g., "landing-template.*")
  --help, -h               Show this help
  --list, -l               List available backups

Namespace Mapping Examples:
  node restore.js backup.tar.gz --nsFrom "test.*" --nsTo "production.*"
  node restore.js backup.tar.gz --database new-db-name
  `);
}

async function listBackups() {
  const backupDir = process.env.BACKUP_STORAGE_PATH || "./backups";

  if (!fs.existsSync(backupDir)) {
    console.log("❌ Backup directory not found:", backupDir);
    return;
  }

  const files = fs
    .readdirSync(backupDir)
    .filter((file) => file.endsWith(".tar.gz"))
    .sort()
    .reverse();

  console.log("\n📂 Available Backups:");
  console.log("=".repeat(50));

  if (files.length === 0) {
    console.log("No backup files found.");
    return;
  }

  files.forEach((file, index) => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(2) + " KB";
    const date = stats.mtime.toISOString().replace("T", " ").substring(0, 19);

    console.log(`${index + 1}. ${file}`);
    console.log(`   📏 Size: ${size} | 📅 Date: ${date}`);
  });

  console.log(`\nTotal: ${files.length} backup(s)`);
  console.log("Use: node restore.js <backup-name> to restore");
}

function getArgValue(argName) {
  const args = process.argv.slice(2);
  const index = args.indexOf(argName);
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
}

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  mongoose.disconnect().then(() => process.exit(1));
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  mongoose.disconnect().then(() => process.exit(1));
});

if (require.main === module) {
  main();
}
