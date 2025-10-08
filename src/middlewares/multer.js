const multer = require("multer");

const allowedTypes = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  allowedTypes.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Invalid file type."), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = {
  singleFile: (fieldName) => upload.single(fieldName),
  multipleFiles: (fieldName, maxCount) => upload.array(fieldName, maxCount),
  anyFiles: () => upload.any(),
};
