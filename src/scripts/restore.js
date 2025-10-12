#!/usr/bin/env node
"use strict";

require("dotenv").config({
  path: require("path").join(__dirname, "../../.env"),
});

const AdvancedRestoreManager = require("./restore/AdvancedRestoreManager");

async function main() {
  const manager = new AdvancedRestoreManager();
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "list") {
    // List backups
    const backups = await manager.listAvailableBackups();

    console.log("\n📦 Available Backups:");
    console.log("====================");

    backups.forEach((backup, index) => {
      console.log(
        `${index + 1}. ${backup.name} (${backup.formattedSize}) - ${
          backup.type
        } - ${backup.modified.toISOString()}`
      );
    });

    if (backups.length === 0) {
      console.log("No backups found.");
    }

    process.exit(0);
  }

  // Parse command line options
  const backupName = args[0];
  const options = {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    drop: args.includes("--drop"),
    collections: null,
  };

  // Parse collections
  const collectionsArg = args.find((arg) => arg.startsWith("--collections="));
  if (collectionsArg) {
    options.collections = collectionsArg.split("=")[1].split(",");
  }

  try {
    const result = await manager.restoreBackup(backupName, options);

    if (options.dryRun) {
      console.log("\n🔍 Dry Run Results:");
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("\n✅ Restore completed successfully!");
      console.log(`📁 Backup: ${result.backup}`);
      console.log(`🗃️ Collections: ${result.collections.length}`);
      console.log(`⏱️ Duration: ${result.duration}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Restore failed!");
    console.error(`📛 Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
