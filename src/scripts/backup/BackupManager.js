"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const mongoose = require("mongoose");
const { compressFolder } = require("../utils/compress");

class BackupManager {
  constructor() {
    this.backupDir = process.env.BACKUP_STORAGE_PATH || "./backups";
    this.logsDir = path.join(process.cwd(), "logs", "backups");
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;

    this.ensureDirs();
  }

  ensureDirs() {
    [this.backupDir, this.logsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  log(message, type = "INFO") {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${type}: ${message}\n`;

    console.log(logMessage.trim());

    const logFile = path.join(
      this.logsDir,
      `backup-${new Date().toISOString().split("T")[0]}.log`
    );
    fs.appendFileSync(logFile, logMessage);
  }

  async createComprehensiveBackup() {
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    this.backupName = backupName;
    this.backupPath = backupPath;

    try {
      this.log(`Starting backup: ${backupName}`);

      const mongoResult = await this.createMongoDBDump(backupPath);
      const metadata = await this.collectSystemMetadata(backupPath, backupName);

      await this.backupApplicationConfig(backupPath);

      const compressedPath = await this.compressBackup(backupPath, backupName);
      this.compressedPath = compressedPath;

      fs.rmSync(backupPath, { recursive: true, force: true });
      this.applyRetentionPolicy();
      await this.verifyBackupIntegrity(compressedPath, metadata);

      const result = {
        success: true,
        backup: `${backupName}.tar.gz`,
        metadata,
        localPath: compressedPath,
        timestamp: new Date().toISOString(),
      };

      this.log(`Backup completed: ${backupName}.tar.gz`);
      return result;
    } catch (error) {
      this.log(`Backup failed: ${error.message}`, "ERROR");
      return { success: false, error: error.message };
    }
  }

  async createMongoDBDump(backupPath) {
    const uri = process.env.MONGODB;
    if (!uri) {
      throw new Error("MONGODB environment variable is required");
    }

    const dbName = this.extractDbName(uri);
    const command = `mongodump --uri="${uri}" --out="${backupPath}" --gzip --verbose`;

    this.log(`Executing MongoDB dump for database: ${dbName}`);

    try {
      const output = execSync(command, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: 50 * 1024 * 1024,
      });

      const analysis = this.analyzeMongoDump(output, backupPath, dbName);
      this.log(
        `MongoDB dump completed: ${analysis.collections.length} collections, ${analysis.totalSize}`
      );

      return analysis;
    } catch (error) {
      const errorAnalysis = this.analyzeMongoDumpError(error);
      throw new Error(`MongoDB dump failed: ${errorAnalysis}`);
    }
  }

  analyzeMongoDump(output, backupPath, dbName) {
    const collections = [];
    let totalSize = 0;
    let gzFiles = [];

    const lines = output.split("\n");

    lines.forEach((line) => {
      if (line.includes("writing") || line.includes("done dumping")) {
        let collectionName = null;

        const pattern1 = line.match(/writing\s+[\w-]+\.(\w+)\s+to/);
        if (pattern1) collectionName = pattern1[1];

        const pattern2 = line.match(/done dumping\s+[\w-]+\.(\w+)\s+\(/);
        if (pattern2) collectionName = pattern2[1];

        const pattern3 = line.match(/[\w-]+\.(\w+)\s+to/);
        if (pattern3 && !collectionName) collectionName = pattern3[1];

        if (collectionName && !collections.includes(collectionName)) {
          collections.push(collectionName);
        }
      }
    });

    const dbPath = path.join(backupPath, dbName);
    if (fs.existsSync(dbPath)) {
      const files = fs.readdirSync(dbPath);
      gzFiles = files.filter((f) => f.endsWith(".gz"));

      if (collections.length === 0 && gzFiles.length > 0) {
        gzFiles.forEach((file) => {
          if (file.endsWith(".bson.gz")) {
            const collectionName = file.replace(".bson.gz", "");
            if (!collections.includes(collectionName)) {
              collections.push(collectionName);
            }
          }
        });
      }

      gzFiles.forEach((file) => {
        const filePath = path.join(dbPath, file);
        try {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        } catch (err) {
          this.log(`Could not stat file ${file}: ${err.message}`, "WARN");
        }
      });
    }

    this.log(
      `Dump analysis: ${collections.length} collections, ${
        gzFiles ? gzFiles.length : 0
      } files, ${this.formatBytes(totalSize)}`
    );

    return {
      collections,
      totalSize: this.formatBytes(totalSize),
      fileCount: gzFiles ? gzFiles.length : 0,
    };
  }

  async backupApplicationConfig(backupPath) {
    try {
      if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        this.log("MongoDB connection not ready, reconnecting...");
        await mongoose.connect(process.env.MONGODB);
      }

      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      const collectionStats = {};

      for (const coll of collections) {
        try {
          const count = await db.collection(coll.name).countDocuments();
          collectionStats[coll.name] = count;
        } catch (err) {
          this.log(
            `Failed to count documents for ${coll.name}: ${err.message}`,
            "WARN"
          );
        }
      }

      const config = {
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        backupVersion: "2.3.0",
        timestamp: new Date().toISOString(),
        collections: collectionStats,
      };

      const configPath = path.join(backupPath, "application-config.json");
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      this.log(
        `Application config backed up (${
          Object.keys(collectionStats).length
        } collections)`
      );
      return config;
    } catch (error) {
      this.log(`Application config backup failed: ${error.message}`, "WARN");
      return { error: error.message };
    }
  }

  async collectSystemMetadata(backupPath, backupName) {
    const dbName = this.extractDbName(process.env.MONGODB);

    const metadata = {
      name: backupName,
      timestamp: new Date().toISOString(),
      database: dbName,
      environment: process.env.NODE_ENV,
      version: "2.3.0",
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        arch: process.arch,
      },
    };

    const metadataPath = path.join(backupPath, "backup-metadata.json");
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return metadata;
  }

  async compressBackup(backupPath, backupName) {
    const outputFile = path.join(this.backupDir, `${backupName}.tar.gz`);

    this.log(`Compressing backup...`);
    await compressFolder(backupPath, outputFile);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const stats = fs.statSync(outputFile);
    this.log(`Compression completed: ${this.formatBytes(stats.size)}`);

    return outputFile;
  }

  applyRetentionPolicy() {
    const files = fs
      .readdirSync(this.backupDir)
      .filter((file) => file.endsWith(".tar.gz"))
      .map((file) => ({
        name: file,
        path: path.join(this.backupDir, file),
        mtime: fs.statSync(path.join(this.backupDir, file)).mtime,
      }));

    const now = Date.now();
    const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;

    const toDelete = files.filter((file) => {
      const fileAge = now - file.mtime.getTime();
      return fileAge > retentionMs;
    });

    toDelete.forEach((file) => {
      try {
        fs.unlinkSync(file.path);
        this.log(`Deleted old backup: ${file.name}`);
      } catch (error) {
        this.log(`Could not delete ${file.name}: ${error.message}`, "WARN");
      }
    });

    if (toDelete.length > 0) {
      this.log(
        `Retention: Deleted ${toDelete.length} backups older than ${this.retentionDays} days`
      );
    }
  }

  async verifyBackupIntegrity(backupPath, metadata) {
    this.log(`Verifying backup integrity...`);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = fs.statSync(backupPath);

      if (stats.size === 0) {
        throw new Error("Backup file is empty");
      }

      if (stats.size < 1024) {
        this.log("Warning: Backup file seems unusually small", "WARN");
      }

      this.log(`Backup verification passed: ${this.formatBytes(stats.size)}`);
      return true;
    } catch (error) {
      this.log(`Backup verification failed: ${error.message}`, "ERROR");
      throw error;
    }
  }

  extractDbName(uri) {
    if (process.env.MONGODB_NAME) return process.env.MONGODB_NAME;
    const match = uri.match(/\/([^/?]+)(?:\?|$)/);
    return match ? match[1] : "landing-template";
  }

  formatBytes(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  analyzeMongoDumpError(error) {
    if (error.stderr) {
      const stderr = error.stderr.toString();
      if (stderr.includes("Authentication failed")) {
        return "MongoDB authentication failed";
      } else if (stderr.includes("network error")) {
        return "Network connection failed";
      } else if (stderr.includes("bad auth")) {
        return "MongoDB authentication error - check credentials";
      }
      return stderr.substring(0, 200);
    }
    return error.message;
  }
}

module.exports = BackupManager;
