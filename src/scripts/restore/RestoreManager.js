"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const { decompressFolder } = require("../utils/compress");

class RestoreManager {
  constructor() {
    this.backupDir = process.env.BACKUP_STORAGE_PATH || "./backups";
    this.tempDir = path.join(this.backupDir, "temp");
    this.logsDir = path.join(process.cwd(), "logs", "restores");

    this.ensureDirectories();
    this.configureCloudinary();
  }

  ensureDirectories() {
    const directories = [this.backupDir, this.tempDir, this.logsDir];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  configureCloudinary() {
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      this.log("☁️ Cloudinary configured");
    }
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

    this.log(`🚀 Starting restore process: ${restoreId}`);
    this.log(`📦 Backup source: ${backupSource}`);

    try {
      // 1. Backup dosyasını bul ve çıkar
      const backupInfo = await this.locateAndExtractBackup(
        backupSource,
        tempRestorePath
      );

      // 2. Backup metadata'sını doğrula
      const metadata = await this.validateBackupMetadata(tempRestorePath);

      // 3. Hedef veritabanını belirle
      const targetDatabase = options.restoreToDatabase || metadata.database;
      this.log(`🎯 Target database: ${targetDatabase}`);

      // 4. Restore öncesi snapshot
      const preRestoreSnapshot = await this.createPreRestoreSnapshot(
        targetDatabase
      );

      // 5. MongoDB restore işlemi
      const restoreResult = await this.executeMongoRestore(
        tempRestorePath,
        metadata.database,
        targetDatabase,
        options
      );

      // 6. Doğrulama
      if (!options.skipVerification) {
        await this.verifyRestore(restoreResult, targetDatabase);
      }

      // 7. Sonuçları hazırla
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

      this.log(`✅ Restore completed successfully`);
      return result;
    } catch (error) {
      this.log(`❌ Restore failed: ${error.message}`, "ERROR");
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
    this.log(`🔍 Locating backup: ${backupSource}`);

    let backupPath;

    if (
      backupSource.startsWith("http") ||
      backupSource.startsWith("cloudinary:")
    ) {
      backupPath = await this.downloadFromCloudinary(
        backupSource,
        path.dirname(extractPath)
      );
    } else {
      backupPath = this.findLocalBackup(backupSource);
    }

    if (!backupPath) {
      throw new Error(`Backup not found: ${backupSource}`);
    }

    this.log(`📦 Extracting: ${path.basename(backupPath)}`);
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

    this.log(`📊 Found ${backupFiles.length} backup files`);

    let selectedBackup;

    if (backupIdentifier === "latest") {
      selectedBackup = backupFiles[0];
      this.log(`⏰ Using latest backup: ${selectedBackup}`);
    } else {
      selectedBackup = backupFiles.find(
        (file) => file === backupIdentifier || file.includes(backupIdentifier)
      );
    }

    if (!selectedBackup) {
      throw new Error(
        `No backup found for: ${backupIdentifier}\n` +
          `Available: ${backupFiles.slice(0, 5).join(", ")}`
      );
    }

    const fullPath = path.join(this.backupDir, selectedBackup);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Backup file missing: ${fullPath}`);
    }

    this.log(`✅ Selected backup: ${selectedBackup}`);
    return fullPath;
  }

  async downloadFromCloudinary(source, downloadDir) {
    this.log(`☁️ Downloading from Cloudinary: ${source}`);

    try {
      const publicId = this.extractPublicId(source);
      const downloadUrl = this.getCloudinaryDownloadUrl(source, publicId);
      const outputPath = path.join(downloadDir, `${publicId}.tar.gz`);

      await this.downloadFile(downloadUrl, outputPath);
      this.log(`✅ Download completed: ${outputPath}`);

      return outputPath;
    } catch (error) {
      throw new Error(`Cloudinary download failed: ${error.message}`);
    }
  }

  async downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
      const https = require("https");
      const file = fs.createWriteStream(outputPath);

      https
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }

          response.pipe(file);

          file.on("finish", () => {
            file.close();
            resolve(outputPath);
          });
        })
        .on("error", (error) => {
          fs.unlink(outputPath, () => {});
          reject(new Error(`Download error: ${error.message}`));
        });
    });
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

    this.log(`📁 Found databases: ${dbFolders.join(", ")}`);
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

    this.log(`📋 Backup: ${metadata.database} @ ${metadata.timestamp}`);
    this.log(`📋 Version: ${metadata.version}`);

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

    const commandParts = [
      "mongorestore",
      `--uri="${uri}"`,
      `--nsFrom="${sourceDatabase}.*"`,
      `--nsTo="${targetDatabase}.*"`,
      `--dir="${sourceDbPath}"`,
      `--gzip`,
      options.dropCollections ? "--drop" : "",
      options.preserveIds === false ? "--noObjectIdCheck" : "",
      "--numInsertionWorkersPerCollection=4",
      "--stopOnError",
      "--maintainInsertionOrder",
    ].filter(Boolean);

    const command = commandParts.join(" ");

    this.log(`🔄 Restoring directory: ${sourceDatabase} → ${targetDatabase}`);
    this.log(`🔧 Command: ${command.substring(0, 100)}...`);

    try {
      execSync(command, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: 50 * 1024 * 1024,
      });

      // Restore tamamlandı, MongoDB'den koleksiyon ve document sayılarını al
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();

      const collectionsRestored = [];
      let totalDocuments = 0;

      for (const coll of collections) {
        try {
          const count = await db.collection(coll.name).countDocuments();
          collectionsRestored.push({
            name: coll.name,
            documents: count,
            status: "success",
          });
          totalDocuments += count;
        } catch (err) {
          collectionsRestored.push({
            name: coll.name,
            documents: 0,
            status: "error",
          });
        }
      }

      const result = {
        collections: collectionsRestored,
        documents: totalDocuments,
        duration: Date.now() - startTime,
      };

      this.log(
        `✅ Restore completed: ${result.collections.length} collections, ${result.documents} documents`
      );

      return result;
    } catch (error) {
      throw new Error(
        `MongoDB restore failed: ${this.analyzeMongoError(error)}`
      );
    }
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

  async createPreRestoreSnapshot(database) {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();

      const snapshot = {
        timestamp: new Date().toISOString(),
        database,
        collections: {},
      };

      for (const coll of collections) {
        try {
          const count = await db.collection(coll.name).countDocuments();
          snapshot.collections[coll.name] = { count };
        } catch (error) {
          snapshot.collections[coll.name] = { error: error.message };
        }
      }

      this.log(`📸 Pre-restore snapshot: ${collections.length} collections`);
      return snapshot;
    } catch (error) {
      this.log("⚠️ Could not create pre-restore snapshot", "WARN");
      return null;
    }
  }

  async verifyRestore(restoreResult, targetDatabase) {
    this.log("🔍 Verifying restore...");

    const db = mongoose.connection.db;
    let verified = 0;

    for (const coll of restoreResult.collections) {
      if (coll.status === "success") {
        try {
          const count = await db.collection(coll.name).countDocuments();

          if (count >= coll.documents) {
            verified++;
          } else {
            this.log(
              `⚠️ Count mismatch: ${coll.name} (expected ${coll.documents}, got ${count})`,
              "WARN"
            );
          }
        } catch (error) {
          this.log(
            `⚠️ Could not verify ${coll.name}: ${error.message}`,
            "WARN"
          );
        }
      }
    }

    this.log(
      `✅ Verification: ${verified}/${restoreResult.collections.length} collections`
    );
  }

  // Yardımcı fonksiyonlar
  generateRestoreId() {
    return new Date().toISOString().replace(/[:.]/g, "-");
  }

  extractPublicId(source) {
    if (source.startsWith("http")) {
      const match = source.match(/\/upload\/(?:v\d+\/)?(.+)\.tar\.gz/);
      return match ? match[1] : path.basename(source, ".tar.gz");
    }
    return source.replace("cloudinary:", "");
  }

  getCloudinaryDownloadUrl(source, publicId) {
    if (source.startsWith("http")) {
      return source;
    }
    return cloudinary.url(publicId, {
      resource_type: "raw",
      attachment: true,
    });
  }

  analyzeMongoError(error) {
    if (error.stderr) {
      const stderr = error.stderr.toString();

      if (stderr.includes("Authentication failed")) {
        return "MongoDB authentication failed";
      } else if (stderr.includes("namespace exists")) {
        return "Collection exists (use --drop)";
      } else if (stderr.includes("not found")) {
        return "Database/collection not found";
      } else if (stderr.includes("duplicate key error")) {
        return "Duplicate key (use --drop)";
      } else if (stderr.includes("error parsing uri")) {
        return "URI parsing error";
      }

      return stderr.substring(0, 200);
    }

    return error.message;
  }

  cleanupTempDirectory(tempPath) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.rmSync(tempPath, { recursive: true, force: true });
        this.log("🧹 Cleaned temp directory");
      } catch (error) {
        this.log(`⚠️ Could not clean temp directory: ${error.message}`, "WARN");
      }
    }
  }
}

module.exports = RestoreManager;
