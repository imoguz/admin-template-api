"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const cloudinary = require("cloudinary").v2;
const { extractBackup } = require("../utils/compress");

class AdvancedRestoreManager {
  constructor() {
    this.backupDir = process.env.BACKUP_STORAGE_PATH || "./backups";
    this.logsDir = path.join(process.cwd(), "logs", "restores");
    this.ensureDirs();
  }

  ensureDirs() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  log(message, type = "INFO") {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${type}: ${message}\n`;

    console.log(logMessage.trim());

    const logFile = path.join(
      this.logsDir,
      `restore-${new Date().toISOString().split("T")[0]}.log`
    );
    fs.appendFileSync(logFile, logMessage);
  }

  async restoreBackup(backupSource, options = {}) {
    let backupPath;

    try {
      // Backup source'u belirle (local file veya cloudinary URL)
      if (backupSource.startsWith("http")) {
        backupPath = await this.downloadFromCloudinary(
          backupSource,
          options.backupName
        );
      } else {
        backupPath = path.join(this.backupDir, backupSource);
      }

      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      this.log(`🚀 Starting restore operation from: ${backupSource}`);

      // Backup analizi
      const backupInfo = await this.analyzeBackup(backupPath);

      // Dry-run kontrolü
      if (options.dryRun) {
        return await this.dryRunRestore(backupInfo, options);
      }

      // Onay iste (production'da)
      if (process.env.NODE_ENV === "production" && !options.force) {
        await this.requestConfirmation(backupInfo);
      }

      // Gerçek restore işlemi
      const result = await this.executeRestore(backupPath, backupInfo, options);

      this.log(`✅ Restore completed successfully`);
      return result;
    } catch (error) {
      this.log(`❌ Restore failed: ${error.message}`, "ERROR");
      throw error;
    } finally {
      // Temizlik
      if (
        backupSource.startsWith("http") &&
        backupPath &&
        fs.existsSync(backupPath)
      ) {
        fs.unlinkSync(backupPath);
      }
    }
  }

  async downloadFromCloudinary(url, backupName) {
    this.log(`☁️ Downloading backup from Cloudinary...`);

    // Bu kısım Cloudinary SDK ile implemente edilebilir
    // Şimdilik placeholder
    throw new Error("Cloudinary download not yet implemented");
  }

  async analyzeBackup(backupPath) {
    const tempDir = path.join(this.backupDir, `temp-analyze-${Date.now()}`);

    try {
      await extractBackup(backupPath, tempDir);

      // Metadata okuma
      const metadataPath = path.join(tempDir, "backup-metadata.json");
      const configPath = path.join(tempDir, "application-config.json");

      const metadata = fs.existsSync(metadataPath)
        ? JSON.parse(fs.readFileSync(metadataPath, "utf8"))
        : {};

      const config = fs.existsSync(configPath)
        ? JSON.parse(fs.readFileSync(configPath, "utf8"))
        : {};

      // Koleksiyonları listele
      const dbName = this.extractDbName(process.env.MONGODB);
      const dbPath = path.join(tempDir, dbName);

      const collections = fs.existsSync(dbPath)
        ? fs
            .readdirSync(dbPath)
            .filter((f) => f.endsWith(".bson.gz"))
            .map((f) => f.replace(".bson.gz", ""))
        : [];

      const backupInfo = {
        metadata,
        config,
        collections,
        dbName,
        backupSize: fs.statSync(backupPath).size,
        collectionCount: collections.length,
      };

      this.log(
        `📊 Backup analysis: ${
          collections.length
        } collections, ${this.formatBytes(backupInfo.backupSize)}`
      );

      return backupInfo;
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }

  async dryRunRestore(backupInfo, options) {
    this.log(`🔍 DRY RUN: Analyzing restore operation`);

    const report = {
      type: "dry-run",
      backup: backupInfo.metadata.name,
      timestamp: new Date().toISOString(),
      collections: {
        available: backupInfo.collections,
        toRestore: options.collections || backupInfo.collections,
        missing: [],
      },
      warnings: [],
      operations: [],
    };

    // Eksik koleksiyon kontrolü
    if (options.collections) {
      report.collections.missing = options.collections.filter(
        (col) => !backupInfo.collections.includes(col)
      );
    }

    // Mevcut veri kontrolü
    if (!options.drop) {
      report.warnings.push("Existing data will be preserved (no --drop flag)");
    }

    // Cloudinary metadata kontrolü
    if (backupInfo.metadata.cloudinary) {
      report.operations.push("Cloudinary metadata will be verified");
    }

    this.log(
      `📋 Dry run completed: ${report.collections.toRestore.length} collections to restore`
    );

    return report;
  }

  async requestConfirmation(backupInfo) {
    this.log(`⚠️  PRODUCTION RESTORE REQUESTED`);
    this.log(`📊 Backup: ${backupInfo.metadata.name}`);
    this.log(`📅 Date: ${backupInfo.metadata.timestamp}`);
    this.log(`🗃️ Collections: ${backupInfo.collections.length}`);
    this.log(`💾 Size: ${this.formatBytes(backupInfo.backupSize)}`);

    this.log(`❌ Automatic confirmation disabled in production`);
    this.log(`🔒 Use --force flag to override`);

    throw new Error("Confirmation required for production restore");
  }

  async executeRestore(backupPath, backupInfo, options) {
    const tempDir = path.join(this.backupDir, `temp-restore-${Date.now()}`);

    try {
      // Backup'ı extract et
      this.log(`📦 Extracting backup...`);
      await extractBackup(backupPath, tempDir);

      // Restore komutunu oluştur
      const restoreCommand = this.buildRestoreCommand(
        tempDir,
        backupInfo,
        options
      );

      // Restore'u çalıştır
      this.log(`🔧 Executing MongoDB restore...`);
      const startTime = Date.now();

      execSync(restoreCommand, {
        stdio: "inherit",
        maxBuffer: 50 * 1024 * 1024,
      });

      const duration = Date.now() - startTime;

      // Cloudinary metadata restore (opsiyonel)
      if (options.restoreCloudinaryMetadata) {
        await this.restoreCloudinaryMetadata(tempDir);
      }

      const result = {
        success: true,
        collections: options.collections || backupInfo.collections,
        duration: `${duration}ms`,
        backup: backupInfo.metadata.name,
        timestamp: new Date().toISOString(),
      };

      this.log(`✅ Restore completed in ${duration}ms`);
      return result;
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }

  buildRestoreCommand(tempDir, backupInfo, options) {
    const uri = process.env.MONGODB;

    if (!uri) {
      throw new Error("MONGODB environment variable is required");
    }

    let command = `mongorestore --uri="${uri}" --gzip --numParallelCollections=2`;

    if (options.drop) {
      command += " --drop";
      this.log("🗑️ Existing collections will be dropped");
    }

    if (options.collections && options.collections.length > 0) {
      // ✅ DÜZELTME: Her collection için ayrı --db ve --collection flag'leri
      command = options.collections
        .map((collection) => {
          let collCommand = `mongorestore --uri="${uri}" --gzip`;
          if (options.drop) collCommand += " --drop";
          collCommand += ` --db=${
            backupInfo.dbName
          } --collection=${collection} "${path.join(
            tempDir,
            backupInfo.dbName,
            collection
          )}.bson.gz"`;
          return collCommand;
        })
        .join(" && ");
    } else {
      // ✅ Tüm database'i restore et
      command += ` "${path.join(tempDir, backupInfo.dbName)}"`;
    }

    this.log(`🔧 Restore command: ${command}`);
    return command;
  }

  async restoreCloudinaryMetadata(tempDir) {
    const metadataPath = path.join(tempDir, "cloudinary-metadata.json");

    if (fs.existsSync(metadataPath)) {
      this.log(`☁️ Cloudinary metadata found (read-only)`);
      // Cloudinary metadata genellikle read-only'dir
      // Sadece loglama yapıyoruz
      const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      this.log(
        `📋 Cloudinary: ${metadata.resources.length} resources backed up`
      );
    }
  }

  async listAvailableBackups() {
    const backups = [];

    // Local backups
    if (fs.existsSync(this.backupDir)) {
      const localBackups = fs
        .readdirSync(this.backupDir)
        .filter((file) => file.endsWith(".tar.gz"))
        .map((file) => {
          const filePath = path.join(this.backupDir, file);
          const stat = fs.statSync(filePath);

          return {
            name: file,
            type: "local",
            size: stat.size,
            formattedSize: this.formatBytes(stat.size),
            modified: stat.mtime,
            path: filePath,
          };
        });

      backups.push(...localBackups);
    }

    // Cloudinary backups (opsiyonel)
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const cloudinaryBackups = await this.listCloudinaryBackups();
        backups.push(...cloudinaryBackups);
      } catch (error) {
        this.log(
          `⚠️ Could not fetch Cloudinary backups: ${error.message}`,
          "WARN"
        );
      }
    }

    return backups.sort((a, b) => new Date(b.modified) - new Date(a.modified));
  }

  async listCloudinaryBackups() {
    // Placeholder for Cloudinary backup listing
    return [];
  }

  // Utility methods
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
}

module.exports = AdvancedRestoreManager;
