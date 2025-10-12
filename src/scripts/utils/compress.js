"use strict";

const tar = require("tar");
const fs = require("fs");
const path = require("path");

/**
 * Compress a folder to tar.gz
 * @param {string} sourceDir - Source directory to compress
 * @param {string} outputFile - Output tar.gz file path
 * @returns {Promise<string>} - Path to compressed file
 */
async function compressFolder(sourceDir, outputFile) {
  try {
    await tar.c(
      {
        gzip: true,
        file: outputFile,
        cwd: sourceDir,
      },
      ["."] // Compress all contents
    );

    return outputFile;
  } catch (error) {
    throw new Error(`Compression failed: ${error.message}`);
  }
}

/**
 * Extract a backup tar.gz file
 * @param {string} backupFile - Path to backup file
 * @param {string} targetDir - Target directory for extraction
 * @returns {Promise<string>} - Path to extracted directory
 */
async function extractBackup(backupFile, targetDir) {
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await tar.x({
      file: backupFile,
      cwd: targetDir,
      strict: true,
      preservePaths: false,
    });

    const extractedItems = fs.readdirSync(targetDir);
    if (
      extractedItems.length === 1 &&
      fs.statSync(path.join(targetDir, extractedItems[0])).isDirectory()
    ) {
      const innerDir = path.join(targetDir, extractedItems[0]);
      for (const item of fs.readdirSync(innerDir)) {
        fs.renameSync(path.join(innerDir, item), path.join(targetDir, item));
      }
      fs.rmSync(innerDir, { recursive: true, force: true });
    }

    return targetDir;
  } catch (error) {
    throw new Error(`Compression failed: ${error.stack || error.message}`);
  }
}

module.exports = {
  compressFolder,
  extractBackup,
};
