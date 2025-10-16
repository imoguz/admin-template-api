"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const mongoose = require("mongoose");
const { decompressFolder } = require("../utils/compress");

class RestoreManager {
  constructor() {
    this.backupDir = process.env.BACKUP_STORAGE_PATH || "./backups";
    this.tempDir = path.join(this.backupDir, "temp");
    this.logsDir = path.join(process.cwd(), "logs", "restores");

    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.backupDir, this.tempDir, this.logsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  log(message, type = "INFO") {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${type}: ${message}`;
    console.log(logMessage);

    try {
      const logFile = path.join(
        this.logsDir,
        `restore-${new Date().toISOString().split("T")[0]}.log`
      );
      fs.appendFileSync(logFile, logMessage + "\n");
    } catch (error) {
      console.error("Log file error:", error.message);
    }
  }

  async createComprehensiveRestore(backupSource, options = {}) {
    const restoreId = this.generateRestoreId();
    const tempRestorePath = path.join(this.tempDir, `restore-${restoreId}`);

    this.log(`Starting restore process: ${restoreId}`);
    this.log(`Backup source: ${backupSource}`);
    this.log(`Options: ${JSON.stringify(options)}`);

    try {
      const backupInfo = await this.locateAndExtractBackup(
        backupSource,
        tempRestorePath
      );
      const metadata = await this.validateBackupMetadata(tempRestorePath);

      const targetDatabase = options.restoreToDatabase || metadata.database;
      this.log(`Target database: ${targetDatabase}`);

      const restoreResult = await this.executeMongoRestore(
        tempRestorePath,
        metadata.database,
        targetDatabase,
        options
      );

      if (!options.skipVerification) {
        await this.verifyRestore(restoreResult, targetDatabase, options);
      }

      const result = {
        success: true,
        restoreId,
        sourceDatabase: metadata.database,
        targetDatabase,
        collectionsRestored: restoreResult.collections,
        documentsRestored: restoreResult.documents,
        timestamp: new Date().toISOString(),
        backupUsed: backupInfo.name,
        duration: restoreResult.duration,
      };

      this.log(`Restore completed successfully`);
      return result;
    } catch (error) {
      this.log(`Restore failed: ${error.message}`, "ERROR");
      return {
        success: false,
        error: error.message,
        restoreId,
      };
    } finally {
      this.cleanupTempDirectory(tempRestorePath);
    }
  }

  async locateAndExtractBackup(backupSource, extractPath) {
    this.log(`Locating backup: ${backupSource}`);

    const backupPath = this.findLocalBackup(backupSource);
    if (!backupPath) {
      throw new Error(`Backup not found: ${backupSource}`);
    }

    this.log(`Extracting: ${path.basename(backupPath)}`);
    await decompressFolder(backupPath, extractPath);

    this.validateExtractedStructure(extractPath);

    return {
      path: backupPath,
      name: path.basename(backupPath),
      extractedPath: extractPath,
    };
  }

  findLocalBackup(backupIdentifier) {
    if (!fs.existsSync(this.backupDir)) {
      throw new Error(`Backup directory not found: ${this.backupDir}`);
    }

    const backupFiles = fs
      .readdirSync(this.backupDir)
      .filter((file) => file.endsWith(".tar.gz"))
      .sort()
      .reverse();

    this.log(`Found ${backupFiles.length} backup files`);

    let selectedBackup;

    if (backupIdentifier === "latest") {
      selectedBackup = backupFiles[0];
      this.log(`Using latest backup: ${selectedBackup}`);
    } else {
      selectedBackup = backupFiles.find(
        (file) => file === backupIdentifier || file.includes(backupIdentifier)
      );
    }

    if (!selectedBackup) {
      throw new Error(`No backup found for: ${backupIdentifier}`);
    }

    const fullPath = path.join(this.backupDir, selectedBackup);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Backup file missing: ${fullPath}`);
    }

    this.log(`Selected backup: ${selectedBackup}`);
    return fullPath;
  }

  validateExtractedStructure(extractPath) {
    if (!fs.existsSync(extractPath)) {
      throw new Error("Extraction failed - directory not created");
    }

    const items = fs.readdirSync(extractPath);
    const hasMetadata = items.includes("backup-metadata.json");

    if (!hasMetadata) {
      throw new Error("Invalid backup - metadata file missing");
    }

    const dbFolders = items.filter((item) => {
      const itemPath = path.join(extractPath, item);
      return fs.statSync(itemPath).isDirectory() && item !== "temp";
    });

    if (dbFolders.length === 0) {
      throw new Error("No database folders found in backup");
    }

    this.log(`Found databases: ${dbFolders.join(", ")}`);
  }

  async validateBackupMetadata(backupPath) {
    const metadataPath = path.join(backupPath, "backup-metadata.json");

    if (!fs.existsSync(metadataPath)) {
      throw new Error("Metadata file not found");
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

    const required = ["timestamp", "database", "version"];
    for (const field of required) {
      if (!metadata[field]) {
        throw new Error(`Metadata missing: ${field}`);
      }
    }

    this.log(`Backup: ${metadata.database} @ ${metadata.timestamp}`);
    this.log(`Version: ${metadata.version}`);

    return metadata;
  }

  async executeMongoRestore(
    backupPath,
    sourceDatabase,
    targetDatabase,
    options
  ) {
    const startTime = Date.now();
    const sourceDbPath = path.join(backupPath, sourceDatabase);

    if (!fs.existsSync(sourceDbPath)) {
      throw new Error(`Source database folder not found: ${sourceDbPath}`);
    }

    const uri = this.buildMongoURI(targetDatabase);
    let commandParts = [
      "mongorestore",
      `--uri="${uri}"`,
      `--dir="${sourceDbPath}"`,
      `--gzip`,
      "--numInsertionWorkersPerCollection=4",
      "--stopOnError",
    ];

    // Add options based on parameters
    if (options.dropCollections) {
      commandParts.push("--drop");
    }

    if (options.preserveIds === false) {
      commandParts.push("--noObjectIdCheck");
    }

    // Handle namespace operations
    if (options.nsInclude) {
      commandParts.push(`--nsInclude="${options.nsInclude}"`);
      this.log(`Restoring specific collection: ${options.nsInclude}`);
    }

    if (options.nsFrom && options.nsTo) {
      commandParts.push(`--nsFrom="${options.nsFrom}"`);
      commandParts.push(`--nsTo="${options.nsTo}"`);
      this.log(`Renaming namespace: ${options.nsFrom} → ${options.nsTo}`);
    } else if (!options.nsInclude) {
      // Default namespace mapping for full database restore
      commandParts.push(`--nsFrom="${sourceDatabase}.*"`);
      commandParts.push(`--nsTo="${targetDatabase}.*"`);
    }

    const command = commandParts.join(" ");
    this.log(`Executing: ${command}`);

    try {
      const output = execSync(command, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: 50 * 1024 * 1024,
      });

      this.log(`MongoDB restore command executed successfully`);

      // Analyze what was actually restored
      const restoreAnalysis = await this.analyzeRestoreResult(
        sourceDatabase,
        targetDatabase,
        options
      );

      const result = {
        collections: restoreAnalysis.collections,
        documents: restoreAnalysis.totalDocuments,
        duration: Date.now() - startTime,
      };

      this.log(
        `Restore analysis: ${result.collections.length} collections, ${result.documents} documents`
      );
      return result;
    } catch (error) {
      throw new Error(
        `MongoDB restore failed: ${this.analyzeMongoError(error)}`
      );
    }
  }

  async analyzeRestoreResult(sourceDatabase, targetDatabase, options) {
    const db = mongoose.connection.db;
    let collectionsToCheck = [];

    if (options.nsInclude) {
      // Only check the specific collection that was restored
      const collectionName = options.nsInclude.split(".").pop();
      collectionsToCheck = [{ name: collectionName }];
    } else {
      // Check all collections in target database
      try {
        collectionsToCheck = await db.listCollections().toArray();
      } catch (error) {
        this.log(`Could not list collections: ${error.message}`, "WARN");
        return { collections: [], totalDocuments: 0 };
      }
    }

    const collections = [];
    let totalDocuments = 0;

    for (const coll of collectionsToCheck) {
      try {
        const count = await db.collection(coll.name).countDocuments();
        collections.push({
          name: coll.name,
          documents: count,
          status: "success",
        });
        totalDocuments += count;
      } catch (err) {
        collections.push({
          name: coll.name,
          documents: 0,
          status: "error",
          error: err.message,
        });
      }
    }

    return {
      collections,
      totalDocuments,
    };
  }

  buildMongoURI(databaseName) {
    const originalUri = process.env.MONGODB;

    const match = originalUri.match(
      /^(mongodb(?:\+srv)?:\/\/[^/]+)(?:\/([^?]*))?(\?.*)?$/
    );

    if (!match) {
      throw new Error("Invalid MongoDB URI format");
    }

    const baseUri = match[1];
    const options = match[3] || "";

    return `${baseUri}/${databaseName}${options}`;
  }

  async verifyRestore(restoreResult, targetDatabase, options) {
    this.log("Verifying restore...");

    const db = mongoose.connection.db;
    let verified = 0;

    for (const coll of restoreResult.collections) {
      if (coll.status === "success") {
        try {
          const count = await db.collection(coll.name).countDocuments();

          if (count >= coll.documents) {
            verified++;
            this.log(`✓ ${coll.name}: ${count} documents`);
          } else {
            this.log(
              `⚠ ${coll.name}: expected ${coll.documents}, got ${count}`,
              "WARN"
            );
          }
        } catch (error) {
          this.log(`✗ ${coll.name}: ${error.message}`, "WARN");
        }
      }
    }

    this.log(
      `Verification: ${verified}/${restoreResult.collections.length} collections verified`
    );
  }

  generateRestoreId() {
    return new Date().toISOString().replace(/[:.]/g, "-");
  }

  analyzeMongoError(error) {
    if (error.stderr) {
      const stderr = error.stderr.toString();

      if (stderr.includes("Authentication failed")) {
        return "MongoDB authentication failed";
      } else if (stderr.includes("namespace exists")) {
        return "Collection exists (use --drop to replace)";
      } else if (stderr.includes("not found")) {
        return "Database/collection not found";
      } else if (stderr.includes("duplicate key error")) {
        return "Duplicate key error (use --drop to clear existing data)";
      } else if (stderr.includes("error parsing uri")) {
        return "URI parsing error";
      }

      return stderr.substring(0, 300);
    }

    return error.message;
  }

  cleanupTempDirectory(tempPath) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.rmSync(tempPath, { recursive: true, force: true });
        this.log("Cleaned temp directory");
      } catch (error) {
        this.log(`Could not clean temp directory: ${error.message}`, "WARN");
      }
    }
  }
}

module.exports = RestoreManager;
