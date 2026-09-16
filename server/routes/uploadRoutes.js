const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");

const cloudinary = require("../config/cloudinary");
const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Only PDF, DOC, DOCX, JPG and PNG files are allowed."
        )
      );
    }

    cb(null, true);
  },
});

function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "westforce/portfolios",
        resource_type: "raw",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    Readable.from(file.buffer).pipe(stream);
  });
}

router.post(
  "/",
  authenticateUser,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file was uploaded.",
        });
      }

      const result = await uploadToCloudinary(req.file);

      return res.status(201).json({
        message: "File uploaded successfully.",
        file: {
          name: req.file.originalname,
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format,
          size: req.file.size,
        },
      });
    } catch (error) {
      console.error("Cloudinary upload error:", error);

      return res.status(500).json({
        message:
          error.message ||
          "Failed to upload file.",
      });
    }
  }
);

module.exports = router;