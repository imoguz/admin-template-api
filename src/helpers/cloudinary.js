const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinaryBuffer = async (buffer, filename) => {
  return new Promise((resolve, reject) => {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: process.env.CLOUDINARY_UPLOAD_FOLDER,
        public_id: nameWithoutExt,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

const deleteFromCloudinary = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
};

module.exports = {
  uploadToCloudinaryBuffer,
  deleteFromCloudinary,
};
