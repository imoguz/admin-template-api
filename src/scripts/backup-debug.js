#!/usr/bin/env node
"use strict";

require("dotenv").config({
  path: require("path").join(__dirname, "../../.env"),
});

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

class BackupDebug {
  constructor() {
    this.backupDir = "./backups/debug";
    this.ensureDirs();
  }

  ensureDirs() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  log(message) {
    console.log(`[DEBUG] ${message}`);
  }

  async runComprehensiveDebug() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const debugBackupPath = path.join(this.backupDir, `debug-${timestamp}`);

    this.log("🚀 Starting comprehensive backup debug...");

    // 1. MongoDB connection test
    await this.testMongoConnection();

    // 2. Manual mongodump test
    const dumpResult = await this.manualMongoDump(debugBackupPath);

    // 3. Analyze dump files
    this.analyzeDumpFiles(debugBackupPath);

    // 4. Test document counts
    await this.testDocumentCounts();

    this.log("✅ Debug completed");
    return dumpResult;
  }

  async testMongoConnection() {
    this.log("\n🔗 Testing MongoDB connection...");
    try {
      const { execSync } = require("child_process");
      const uri = process.env.MONGODB;
      const command = `mongosh "${uri}" --eval "db.adminCommand('ping')" --quiet`;

      const output = execSync(command, { encoding: "utf8" });
      this.log("✅ MongoDB connection: SUCCESS");
      this.log(`📊 Response: ${output.trim()}`);
    } catch (error) {
      this.log("❌ MongoDB connection: FAILED");
      this.log(`📛 Error: ${error.message}`);
    }
  }

  async manualMongoDump(backupPath) {
    this.log("\n📦 Executing manual mongodump...");
    const uri = process.env.MONGODB;
    const dbName = this.extractDbName(uri);

    const command = `mongodump --uri="${uri}" --out="${backupPath}" --gzip --verbose`;

    try {
      this.log(
        `🔧 Command: ${command.replace(uri, "mongodb://****:****@...")}`
      );

      const output = execSync(command, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.log("✅ Manual mongodump: SUCCESS");

      // Detaylı output analizi
      this.analyzeDumpOutput(output, backupPath, dbName);

      return { success: true, output };
    } catch (error) {
      this.log("❌ Manual mongodump: FAILED");
      this.log(`📛 Error: ${error.message}`);
      if (error.stderr) {
        this.log(`📛 Stderr: ${error.stderr.toString().substring(0, 500)}`);
      }
      return { success: false, error: error.message };
    }
  }

  analyzeDumpOutput(output, backupPath, dbName) {
    this.log("\n📊 Dump Output Analysis:");
    this.log("=======================");

    const lines = output.split("\n");
    let collectionsDumped = 0;
    let documentsDumped = 0;

    lines.forEach((line) => {
      if (line.includes("writing") || line.includes("dumping")) {
        console.log(`   ${line}`);

        // Document count extraction
        const docMatch = line.match(/\((\d+) document/);
        if (docMatch) {
          documentsDumped += parseInt(docMatch[1]);
        }

        if (line.includes("writing")) {
          collectionsDumped++;
        }
      }
    });

    this.log(
      `\n📈 Summary: ${collectionsDumped} collections, ${documentsDumped} documents`
    );
  }

  analyzeDumpFiles(backupPath) {
    this.log("\n📁 Dump File Analysis:");
    this.log("=====================");

    const dbName = this.extractDbName(process.env.MONGODB);
    const dbPath = path.join(backupPath, dbName);

    if (!fs.existsSync(dbPath)) {
      this.log("❌ Database directory not found!");
      return;
    }

    const files = fs.readdirSync(dbPath);
    this.log(`📂 Files in ${dbPath}: ${files.length}`);

    files.forEach((file) => {
      const filePath = path.join(dbPath, file);
      const stats = fs.statSync(filePath);
      const size = this.formatBytes(stats.size);

      this.log(`   ${file}: ${size}`);

      // Check if file has content
      if (stats.size === 0) {
        this.log(`   ⚠️  WARNING: ${file} is EMPTY!`);
      }
    });

    // Check BSON file sizes
    const bsonFiles = files.filter((f) => f.endsWith(".bson.gz"));
    const totalSize = bsonFiles.reduce((sum, file) => {
      return sum + fs.statSync(path.join(dbPath, file)).size;
    }, 0);

    this.log(`\n📦 Total BSON size: ${this.formatBytes(totalSize)}`);
    this.log(
      `📊 Average per collection: ${this.formatBytes(
        totalSize / bsonFiles.length
      )}`
    );
  }

  async testDocumentCounts() {
    this.log("\n🔢 Testing Document Counts in Live Database:");
    this.log("============================================");

    try {
      const mongoose = require("mongoose");
      await mongoose.connect(process.env.MONGODB);

      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();

      for (const collection of collections) {
        try {
          const count = await db.collection(collection.name).countDocuments();
          const stats = await db.collection(collection.name).stats();
          this.log(
            `   ${collection.name}: ${count} documents, ${this.formatBytes(
              stats.size
            )}`
          );
        } catch (err) {
          this.log(`   ${collection.name}: ERROR - ${err.message}`);
        }
      }

      await mongoose.disconnect();
    } catch (error) {
      this.log(`❌ Document count test failed: ${error.message}`);
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
}

// Execute
if (require.main === module) {
  const debug = new BackupDebug();
  debug.runComprehensiveDebug().then(() => {
    console.log("\n🎯 Debug completed. Check the output above for issues.");
  });
}

module.exports = BackupDebug;
