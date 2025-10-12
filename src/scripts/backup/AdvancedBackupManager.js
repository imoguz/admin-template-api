"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const { compressFolder } = require("../utils/compress");

class AdvancedBackupManager {
  constructor() {
    this.backupDir = process.env.BACKUP_STORAGE_PATH || "./backups";
    this.logsDir = path.join(process.cwd(), "logs", "backups");
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.uploadToCloudinary =
      process.env.BACKUP_UPLOAD_TO_CLOUDINARY === "true";

    this.ensureDirs();
    this.configureCloudinary();
  }

  configureCloudinary() {
    if (this.uploadToCloudinary && process.env.CLOUDINARY_CLOUD_NAME) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
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

    // Log dosyasına yaz
    const logFile = path.join(
      this.logsDir,
      `backup-${new Date().toISOString().split("T")[0]}.log`
    );
    fs.appendFileSync(logFile, logMessage);
  }

  async createComprehensiveBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    this.backupName = backupName;
    this.backupPath = backupPath;

    try {
      this.log(`🚀 Starting comprehensive backup: ${backupName}`);

      // 1. MongoDB Dump
      const mongoResult = await this.createMongoDBDump(backupPath);

      // 2. Metadata toplama
      const metadata = await this.collectSystemMetadata(backupPath, backupName);

      // 3. Cloudinary Metadata Backup
      const cloudinaryMetadata = await this.backupCloudinaryMetadata(
        backupPath
      );
      metadata.cloudinary = cloudinaryMetadata;

      // 4. Application Config Backup
      await this.backupApplicationConfig(backupPath);

      // 5. Sıkıştırma
      const compressedPath = await this.compressBackup(backupPath, backupName);

      this.compressedPath = compressedPath;

      // 6. Cloudinary'e yükleme
      let cloudinaryResult = null;
      if (this.uploadToCloudinary) {
        cloudinaryResult = await this.uploadToCloudinaryStorage(
          compressedPath,
          backupName
        );
      }

      // 7. Temizlik
      fs.rmSync(backupPath, { recursive: true, force: true });

      // 8. Retention policy
      this.applyRetentionPolicy();

      // 9. Doğrulama
      await this.verifyBackupIntegrity(compressedPath, metadata);

      const result = {
        success: true,
        backup: `${backupName}.tar.gz`,
        metadata,
        cloudinary: cloudinaryResult,
        localPath: compressedPath,
        timestamp: new Date().toISOString(),
      };

      this.log(`✅ Backup completed successfully: ${backupName}.tar.gz`);
      await this.sendBackupNotification(result, "SUCCESS");

      return result;
    } catch (error) {
      this.log(`❌ Backup failed: ${error.message}`, "ERROR");
      await this.sendBackupNotification({ error: error.message }, "FAILED");
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

    this.log(`📦 Executing MongoDB dump for database: ${dbName}`);

    try {
      const output = execSync(command, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large dumps
      });

      const analysis = this.analyzeMongoDump(output, backupPath, dbName);
      this.log(
        `📊 MongoDB dump completed: ${analysis.collections.length} collections, ${analysis.totalSize}`
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

    // ✅ Geliştirilmiş çıktı analizi
    const lines = output.split("\n");

    lines.forEach((line) => {
      // Farklı mongodump çıktı formatlarını yakala
      if (line.includes("writing") || line.includes("done dumping")) {
        let collectionName = null;

        // Pattern 1: "writing landing-template.projects to"
        const pattern1 = line.match(/writing\s+[\w-]+\.(\w+)\s+to/);
        if (pattern1) {
          collectionName = pattern1[1];
        }

        // Pattern 2: "done dumping landing-template.projects (1 document)"
        const pattern2 = line.match(/done dumping\s+[\w-]+\.(\w+)\s+\(/);
        if (pattern2) {
          collectionName = pattern2[1];
        }

        // Pattern 3: "landing-template.projects to"
        const pattern3 = line.match(/[\w-]+\.(\w+)\s+to/);
        if (pattern3 && !collectionName) {
          collectionName = pattern3[1];
        }

        if (collectionName && !collections.includes(collectionName)) {
          collections.push(collectionName);
        }
      }
    });

    // ✅ Alternatif: Dosya sisteminden koleksiyonları kontrol et
    const dbPath = path.join(backupPath, dbName);
    if (fs.existsSync(dbPath)) {
      const files = fs.readdirSync(dbPath);
      const bsonFiles = files.filter((f) => f.endsWith(".bson.gz"));

      // Eğer çıktı analizi başarısız olduysa, dosyalardan koleksiyon isimlerini al
      if (collections.length === 0 && bsonFiles.length > 0) {
        bsonFiles.forEach((file) => {
          const collectionName = file.replace(".bson.gz", "");
          if (!collections.includes(collectionName)) {
            collections.push(collectionName);
          }
        });
      }

      // Dosya boyutlarını hesapla
      bsonFiles.forEach((file) => {
        const filePath = path.join(dbPath, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      });
    }

    this.log(
      `🔍 Dump analysis: Found ${collections.length} collections from output analysis`
    );
    this.log(`📁 Collections: ${collections.join(", ")}`);

    return {
      collections,
      totalSize: this.formatBytes(totalSize),
      fileCount: collections.length,
      rawOutput: output, // Debug için
    };
  }

  async backupCloudinaryMetadata(backupPath) {
    if (!this.uploadToCloudinary) {
      return { skipped: true, reason: "Cloudinary upload disabled" };
    }

    try {
      this.log(`☁️ Backing up Cloudinary metadata...`);

      // Cloudinary'den resource listesi al
      const result = await cloudinary.api.resources({
        type: "upload",
        prefix: process.env.CLOUDINARY_UPLOAD_FOLDER,
        max_results: 500,
      });

      const cloudinaryData = {
        resources: result.resources,
        total_count: result.resources.length,
        backup_timestamp: new Date().toISOString(),
        folder: process.env.CLOUDINARY_UPLOAD_FOLDER,
      };

      // Metadata'yı dosyaya yaz
      const cloudinaryBackupPath = path.join(
        backupPath,
        "cloudinary-metadata.json"
      );
      fs.writeFileSync(
        cloudinaryBackupPath,
        JSON.stringify(cloudinaryData, null, 2)
      );

      this.log(
        `✅ Cloudinary metadata backed up: ${result.resources.length} resources`
      );

      return {
        success: true,
        resourceCount: result.resources.length,
        totalSize: this.formatBytes(JSON.stringify(cloudinaryData).length),
      };
    } catch (error) {
      this.log(
        `⚠️ Cloudinary metadata backup failed: ${error.message}`,
        "WARN"
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async backupApplicationConfig(backupPath) {
    try {
      // 🔗 Mongo bağlantısı kontrolü
      if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        this.log("🔄 MongoDB connection not ready, reconnecting...");
        await mongoose.connect(process.env.MONGODB, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        this.log("✅ MongoDB connection established for config snapshot.");
      }

      // 📊 Koleksiyon istatistiklerini güvenli şekilde al
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      const collectionStats = {};

      for (const coll of collections) {
        try {
          const count = await db.collection(coll.name).countDocuments();
          collectionStats[coll.name] = count;
        } catch (err) {
          this.log(
            `⚠️ Failed to count documents for collection ${coll.name}: ${err.message}`,
            "WARN"
          );
        }
      }

      // ⚙️ Uygulama konfigürasyonu snapshot’ı
      const config = {
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        backupVersion: "2.2.0",
        timestamp: new Date().toISOString(),
        collections: collectionStats,
        cloudinary: {
          configured: !!process.env.CLOUDINARY_CLOUD_NAME,
          uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || "backups",
        },
        redis: {
          configured: !!process.env.REDIS_URL,
          connected: await this.checkRedisConnection(),
        },
      };

      // 📝 Dosyaya yaz
      const configPath = path.join(backupPath, "application-config.json");
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      this.log(
        `⚙️ Application config backed up (${
          Object.keys(collectionStats).length
        } collections)`
      );
      return config;
    } catch (error) {
      this.log(`⚠️ Application config backup failed: ${error.message}`, "WARN");
      return { error: error.message };
    }
  }

  async checkRedisConnection() {
    try {
      const redis = require("../../configs/redis");
      const client = redis.getClient();
      await client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async collectSystemMetadata(backupPath, backupName) {
    const dbName = this.extractDbName(process.env.MONGODB);

    const metadata = {
      name: backupName,
      timestamp: new Date().toISOString(),
      database: dbName,
      environment: process.env.NODE_ENV,
      version: "2.1.0",
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

    this.log(`🗜️ Compressing backup...`);
    await compressFolder(backupPath, outputFile);

    const stats = fs.statSync(outputFile);
    this.log(`📦 Compression completed: ${this.formatBytes(stats.size)}`);

    return outputFile;
  }

  async uploadToCloudinaryStorage(filePath, backupName) {
    if (!this.uploadToCloudinary) {
      return { skipped: true };
    }

    try {
      this.log(`☁️ Uploading to Cloudinary...`);

      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: "raw",
        folder: process.env.CLOUDINARY_BACKUP_FOLDER || "backups",
        public_id: backupName,
        overwrite: false,
        tags: ["database-backup", "automated"],
      });

      this.log(`✅ Uploaded to Cloudinary: ${result.secure_url}`);

      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
        bytes: result.bytes,
        format: result.format,
      };
    } catch (error) {
      this.log(`❌ Cloudinary upload failed: ${error.message}`, "ERROR");
      throw error;
    }
  }

  applyRetentionPolicy() {
    const files = fs
      .readdirSync(this.backupDir)
      .filter((file) => file.endsWith(".tar.gz"))
      .map((file) => ({
        name: file,
        path: path.join(this.backupDir, file),
        mtime: fs.statSync(path.join(this.backupDir, file)).mtime,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    const toDelete = files.slice(this.retentionDays);

    toDelete.forEach((file) => {
      try {
        fs.unlinkSync(file.path);
        this.log(`🗑️ Deleted old backup: ${file.name}`);
      } catch (error) {
        this.log(`⚠️ Could not delete ${file.name}: ${error.message}`, "WARN");
      }
    });

    if (toDelete.length > 0) {
      this.log(
        `🔄 Retention: Kept ${this.retentionDays}, deleted ${toDelete.length}`
      );
    }
  }

  async verifyBackupIntegrity(backupPath, metadata) {
    this.log(`🔍 Verifying backup integrity...`);

    try {
      const stats = fs.statSync(backupPath);

      if (stats.size === 0) {
        throw new Error("Backup file is empty");
      }

      // Basic checks
      if (stats.size < 1024) {
        // 1KB'den küçükse şüpheli
        this.log("⚠️ Warning: Backup file seems unusually small", "WARN");
      }

      this.log(
        `✅ Backup verification passed: ${this.formatBytes(stats.size)}`
      );
      return true;
    } catch (error) {
      this.log(`❌ Backup verification failed: ${error.message}`, "ERROR");
      throw error;
    }
  }

  async sendBackupNotification(result, status) {
    // Basit log tabanlı notification
    const notification = {
      status,
      timestamp: new Date().toISOString(),
      backup: result.backup,
      environment: process.env.NODE_ENV,
    };

    if (status === "SUCCESS") {
      this.log(`📧 Backup notification: SUCCESS - ${result.backup}`);
    } else {
      this.log(`🚨 Backup notification: FAILED - ${result.error}`, "ERROR");
    }

    // Burada email, slack vs. entegrasyonları eklenebilir
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

  analyzeMongoDumpError(error) {
    if (error.stderr) {
      const stderr = error.stderr.toString();
      if (stderr.includes("Authentication failed")) {
        return "MongoDB authentication failed";
      } else if (stderr.includes("network error")) {
        return "Network connection failed";
      }
      return stderr.substring(0, 200);
    }
    return error.message;
  }
}

module.exports = AdvancedBackupManager;
