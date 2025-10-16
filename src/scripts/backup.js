"use strict";

require("dotenv").config({
  path: require("path").join(__dirname, "../../.env"),
});

const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const BackupManager = require("./backup/BackupManager");

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB;
  if (!uri) {
    console.error("Missing MONGODB in .env file");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected for backup");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

async function main() {
  await connectDB();

  const manager = new BackupManager();
  const result = await manager.createComprehensiveBackup();

  if (result.success) {
    const backupFilePath = result.localPath;

    let fileSize = "N/A";
    if (backupFilePath && fs.existsSync(backupFilePath)) {
      try {
        const stats = fs.statSync(backupFilePath);
        fileSize = `${(stats.size / 1024).toFixed(2)} KB`;
      } catch (err) {
        console.warn("Could not determine file size:", err.message);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("BACKUP COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log(`File: ${result.backup}`);
    console.log(`Size: ${fileSize}`);
    console.log(`Time: ${result.timestamp}`);
    console.log(`Collections: ${result.metadata?.collections?.length || 0}`);
    console.log("=".repeat(50));

    await mongoose.disconnect();
    process.exit(0);
  } else {
    console.error(`Error: ${result.error}`);
    await mongoose.disconnect();
    process.exit(1);
  }
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
