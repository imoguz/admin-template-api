"use strict";

const tar = require("tar");
const fs = require("fs");
const path = require("path");

async function compressFolder(sourceDir, outputFile) {
  try {
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Source directory not found: ${sourceDir}`);
    }

    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await tar.c(
      {
        gzip: true,
        file: outputFile,
        cwd: path.dirname(sourceDir),
        preservePaths: false,
      },
      [path.basename(sourceDir)]
    );

    const stats = fs.statSync(outputFile);
    if (stats.size === 0) {
      throw new Error("Compressed file is empty");
    }

    return outputFile;
  } catch (error) {
    throw new Error(`Compression failed: ${error.message}`);
  }
}

async function extractBackup(backupFile, targetDir) {
  try {
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const stats = fs.statSync(backupFile);
    if (stats.size === 0) {
      throw new Error("Backup file is empty");
    }

    await tar.x({
      file: backupFile,
      cwd: targetDir,
      strict: true,
      preservePaths: false,
    });

    await normalizeExtractedStructure(targetDir);

    return targetDir;
  } catch (error) {
    throw new Error(`Extraction failed: ${error.message}`);
  }
}

async function normalizeExtractedStructure(targetDir) {
  const items = fs.readdirSync(targetDir);

  if (items.length === 1) {
    const firstItem = path.join(targetDir, items[0]);
    const stat = fs.statSync(firstItem);

    if (stat.isDirectory()) {
      const innerItems = fs.readdirSync(firstItem);

      for (const item of innerItems) {
        const oldPath = path.join(firstItem, item);
        const newPath = path.join(targetDir, item);

        if (fs.existsSync(newPath)) {
          fs.rmSync(newPath, { recursive: true, force: true });
        }

        fs.renameSync(oldPath, newPath);
      }

      fs.rmSync(firstItem, { recursive: true, force: true });
    }
  }
}

async function decompressFolder(inputPath, outputPath) {
  return await extractBackup(inputPath, outputPath);
}

module.exports = {
  compressFolder,
  extractBackup,
  decompressFolder,
  normalizeExtractedStructure,
};
