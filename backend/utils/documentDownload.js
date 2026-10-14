const path = require("path");

const EXTENSIONS_BY_MIME_TYPE = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

function sanitizeFilename(filename) {
  const baseName = path
    .basename(String(filename || "").replace(/\\/g, "/"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+$/, "");

  return baseName || "document";
}

function getDocumentDownloadDetails(document) {
  const mimeType = String(document.mimeType || "").toLowerCase();
  const acceptedExtensions = EXTENSIONS_BY_MIME_TYPE[mimeType] || [];
  const originalFilename = sanitizeFilename(document.name);
  const originalExtension = path.extname(originalFilename).toLowerCase();

  let filename = originalFilename;
  let extension = originalExtension;

  if (acceptedExtensions.length > 0) {
    if (!acceptedExtensions.includes(originalExtension)) {
      const baseName = path.basename(originalFilename, originalExtension);
      extension = acceptedExtensions[0];
      filename = `${baseName || "document"}${extension}`;
    }
  } else if (!extension) {
    const storedFormat = String(document.format || "")
      .toLowerCase()
      .replace(/^\./, "");

    if (/^[a-z0-9]{1,10}$/.test(storedFormat)) {
      extension = `.${storedFormat}`;
      filename = `${filename}${extension}`;
    }
  }

  return {
    filename,
    cloudinaryAttachmentFilename: filename.replace(/\./g, "%2E"),
    format: extension ? extension.slice(1) : "",
  };
}

module.exports = {
  getDocumentDownloadDetails,
};
