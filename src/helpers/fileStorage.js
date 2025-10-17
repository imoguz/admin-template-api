"use strict";

const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");

class FileStorage {
  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads");
    this.allowedMimeTypes = {
      image: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
      ],
      document: ["application/pdf"],
    };
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  // Upload dizinini oluştur
  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  // Güvenli dosya ismi oluştur
  generateSafeFilename(originalName, mimeType) {
    const extension = this.getFileExtension(mimeType);
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    const safeName = originalName
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .substring(0, 100);

    return `${timestamp}-${uniqueId}-${safeName}.${extension}`;
  }

  // MIME type'dan extension al
  getFileExtension(mimeType) {
    const extensions = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "application/pdf": "pdf",
    };
    return extensions[mimeType] || "bin";
  }

  // Dosya validasyonu
  validateFile(buffer, mimeType, originalName) {
    // MIME type kontrolü
    const allowedTypes = [
      ...this.allowedMimeTypes.image,
      ...this.allowedMimeTypes.document,
    ];

    if (!allowedTypes.includes(mimeType)) {
      throw new Error("Invalid file type");
    }

    // Boyut kontrolü
    if (buffer.length > this.maxFileSize) {
      throw new Error("File size too large");
    }

    // Magic number validation
    this.validateMagicNumbers(buffer, mimeType);

    return true;
  }

  // Magic number validation
  validateMagicNumbers(buffer, mimeType) {
    const magicNumbers = {
      "image/jpeg": [0xff, 0xd8, 0xff],
      "image/jpg": [0xff, 0xd8, 0xff],
      "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      "image/gif": [0x47, 0x49, 0x46, 0x38],
      "application/pdf": [0x25, 0x50, 0x44, 0x46],
    };

    const expectedMagic = magicNumbers[mimeType];
    if (expectedMagic) {
      for (let i = 0; i < expectedMagic.length; i++) {
        if (buffer[i] !== expectedMagic[i]) {
          throw new Error("Invalid file content");
        }
      }
    }
  }

  // Image optimization
  async optimizeImage(buffer, mimeType) {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Resize large images
      if (metadata.width > 1920) {
        image.resize(1920, null, {
          withoutEnlargement: true,
          fit: "inside",
        });
      }

      // Quality optimization
      const optimizedBuffer = await image
        .jpeg({ quality: 80, progressive: true })
        .png({ compressionLevel: 8, progressive: true })
        .webp({ quality: 80 })
        .toBuffer();

      return optimizedBuffer;
    } catch (error) {
      console.warn("Image optimization failed, using original:", error.message);
      return buffer;
    }
  }

  // Dosya yükleme
  async uploadFile(buffer, originalName, mimeType, optimizeImages = true) {
    await this.ensureUploadDir();

    // Validasyon
    this.validateFile(buffer, mimeType, originalName);

    let finalBuffer = buffer;

    // Image optimization
    if (optimizeImages && this.allowedMimeTypes.image.includes(mimeType)) {
      finalBuffer = await this.optimizeImage(buffer, mimeType);
    }

    // Güvenli dosya ismi
    const filename = this.generateSafeFilename(originalName, mimeType);
    const filePath = path.join(this.uploadDir, filename);

    // Dosyayı kaydet
    await fs.writeFile(filePath, finalBuffer);

    // File info
    const fileInfo = {
      filename,
      originalName,
      mimeType,
      size: finalBuffer.length,
      path: filePath,
      url: `/uploads/${filename}`,
      uploadedAt: new Date(),
    };

    return fileInfo;
  }

  // Dosya silme
  async deleteFile(filename) {
    try {
      const filePath = path.join(this.uploadDir, filename);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.warn("File deletion failed:", error.message);
      return false;
    }
  }

  // Dosya okuma (stream olarak)
  async getFileStream(filename) {
    const filePath = path.join(this.uploadDir, filename);
    try {
      await fs.access(filePath);
      return fs.createReadStream(filePath);
    } catch (error) {
      throw new Error("File not found");
    }
  }

  // Dosya bilgisi
  async getFileInfo(filename) {
    const filePath = path.join(this.uploadDir, filename);
    try {
      const stats = await fs.stat(filePath);
      return {
        filename,
        path: filePath,
        size: stats.size,
        modified: stats.mtime,
        url: `/uploads/${filename}`,
      };
    } catch (error) {
      throw new Error("File not found");
    }
  }

  // Disk kullanımı
  async getStorageInfo() {
    await this.ensureUploadDir();

    const files = await fs.readdir(this.uploadDir);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(this.uploadDir, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }

    return {
      totalFiles: files.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      uploadDir: this.uploadDir,
    };
  }
}

module.exports = new FileStorage();
