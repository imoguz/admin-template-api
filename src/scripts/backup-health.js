#!/usr/bin/env node
"use strict";

require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});

const fs = require("fs");
const path = require("path");

class BackupHealthChecker {
  constructor() {
    this.backupDir = process.env.BACKUP_STORAGE_PATH || "./backups";
  }

  check() {
    const report = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      checks: [],
    };

    // Check backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      report.checks.push({
        check: "backup_directory",
        status: "critical",
        message: "Backup directory does not exist",
      });
      report.status = "critical";
    } else {
      report.checks.push({
        check: "backup_directory",
        status: "healthy",
        message: "Backup directory exists",
      });
    }

    // Check recent backups
    const backups = this.getRecentBackups();
    report.backups = backups;

    if (backups.length === 0) {
      report.checks.push({
        check: "recent_backups",
        status: "critical",
        message: "No recent backups found",
      });
      report.status = "critical";
    } else {
      const latestBackup = backups[0];
      const backupAge = Date.now() - latestBackup.modified.getTime();
      const ageInHours = backupAge / (1000 * 60 * 60);

      if (ageInHours > 48) {
        report.checks.push({
          check: "backup_freshness",
          status: "warning",
          message: `Latest backup is ${Math.round(ageInHours)} hours old`,
        });
        report.status = "degraded";
      } else {
        report.checks.push({
          check: "backup_freshness",
          status: "healthy",
          message: `Latest backup is ${Math.round(ageInHours)} hours old`,
        });
      }
    }

    // Check backup sizes
    const suspiciousBackups = backups.filter((b) => b.size < 1024); // 1KB'den küçük
    if (suspiciousBackups.length > 0) {
      report.checks.push({
        check: "backup_sizes",
        status: "warning",
        message: `${suspiciousBackups.length} backups seem unusually small`,
      });
      if (report.status === "healthy") report.status = "degraded";
    }

    return report;
  }

  getRecentBackups() {
    if (!fs.existsSync(this.backupDir)) return [];

    return fs
      .readdirSync(this.backupDir)
      .filter((file) => file.endsWith(".tar.gz"))
      .map((file) => {
        const filePath = path.join(this.backupDir, file);
        const stat = fs.statSync(filePath);
        return {
          name: file,
          size: stat.size,
          formattedSize: this.formatBytes(stat.size),
          modified: stat.mtime,
        };
      })
      .sort((a, b) => b.modified - a.modified)
      .slice(0, 5); // Son 5 backup
  }

  formatBytes(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }
}

// Main execution
if (require.main === module) {
  const checker = new BackupHealthChecker();
  const report = checker.check();

  console.log(`\n🔍 Backup Health Check - ${report.timestamp}`);
  console.log(`Overall Status: ${report.status.toUpperCase()}`);
  console.log("\nChecks:");

  report.checks.forEach((check) => {
    const icon =
      check.status === "healthy"
        ? "✅"
        : check.status === "warning"
        ? "⚠️"
        : "❌";
    console.log(`  ${icon} ${check.check}: ${check.message}`);
  });

  console.log("\nRecent Backups:");
  if (report.backups.length === 0) {
    console.log("  No backups found");
  } else {
    report.backups.forEach((backup) => {
      console.log(
        `  📁 ${backup.name} (${
          backup.formattedSize
        }) - ${backup.modified.toISOString()}`
      );
    });
  }

  // Exit with appropriate code
  process.exit(report.status === "critical" ? 1 : 0);
}

module.exports = BackupHealthChecker;
