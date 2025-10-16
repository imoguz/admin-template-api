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
    console.error("Missing MONGODB in .env file");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const backupSource = args[0];

  if (!backupSource) {
    console.error("Usage: node restore.js <backup-file|latest> [options]");
    console.error("\nOptions:");
    console.error(
      "  --drop                         Drop collections before restore"
    );
    console.error(
      "  --nsInclude=<namespace>        Restore specific collection (db.collection)"
    );
    console.error(
      "  --nsFrom=<pattern> --nsTo=<pattern>  Rename namespace during restore"
    );
    console.error(
      "  --database=<dbname>            Restore to different database"
    );
    console.error("  --list, -l                    List available backups");
    process.exit(1);
  }

  const options = {
    dropCollections: args.includes("--drop"),
    skipVerification: args.includes("--skip-verify"),
    preserveIds: !args.includes("--new-ids"),
    restoreToDatabase: getArgValue("--database"),
    nsInclude: getArgValue("--nsInclude"),
    nsFrom: getArgValue("--nsFrom"),
    nsTo: getArgValue("--nsTo"),
  };

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
    console.log("✅ RESTORE COMPLETED");
    console.log(`📁 Backup: ${result.backupUsed}`);
    console.log(
      `🗄️  Database: ${result.sourceDatabase} → ${result.targetDatabase}`
    );

    if (options.nsInclude) {
      const collectionName = options.nsInclude.split(".").pop();
      console.log(`📊 Collection: ${collectionName}`);
    }

    console.log(
      `📋 Collections restored: ${result.collectionsRestored.length}`
    );
    console.log(`📄 Documents restored: ${result.documentsRestored}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);

    await mongoose.disconnect();
    process.exit(0);
  } else {
    console.error("❌ RESTORE FAILED");
    console.error(`Error: ${result.error}`);
    await mongoose.disconnect();
    process.exit(1);
  }
}

async function listBackups() {
  const backupDir = process.env.BACKUP_STORAGE_PATH || "./backups";

  if (!fs.existsSync(backupDir)) {
    console.log("No backup directory found");
    return;
  }

  const files = fs
    .readdirSync(backupDir)
    .filter((file) => file.endsWith(".tar.gz"))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log("No backup files found");
    return;
  }

  console.log("Available backups:");
  files.forEach((file, index) => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024 / 1024).toFixed(2) + " MB";
    const date = stats.mtime.toISOString().replace("T", " ").substring(0, 19);

    console.log(`${index + 1}. ${file} (${size}) - ${date}`);
  });
}

function getArgValue(argName) {
  const args = process.argv.slice(2);
  const exactMatch = args.indexOf(argName);

  // case 1: --param value
  if (
    exactMatch !== -1 &&
    args[exactMatch + 1] &&
    !args[exactMatch + 1].startsWith("--")
  ) {
    return args[exactMatch + 1];
  }

  // case 2: --param=value
  const withEqual = args.find((a) => a.startsWith(`${argName}=`));
  if (withEqual) {
    return withEqual.split("=")[1].replace(/^"|"$/g, "");
  }

  return null;
}

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

if (require.main === module) {
  main();
}
