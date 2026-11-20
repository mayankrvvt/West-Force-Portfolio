import path from "node:path";
import { toText } from "../../lib/text";

const EXTENSIONS_BY_MIME_TYPE: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export type DownloadSource = {
  name?: string | null;
  mimeType?: string | null;
  format?: string | null;
};

export type DownloadDetails = {
  filename: string;
  format: string;
  mimeType: string;
};

function sanitizeFilename(filename: unknown): string {
  const baseName = path
    .basename(toText(filename || "").replace(/\\/g, "/"))
    // eslint-disable-next-line no-control-regex -- strips control characters on purpose
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+$/, "");

  return baseName || "document";
}

/** A safe download filename, file format and MIME type for a stored document. */
export function getDocumentDownloadDetails(document: DownloadSource): DownloadDetails {
  const mimeType = String(document.mimeType || "").toLowerCase();
  const acceptedExtensions = EXTENSIONS_BY_MIME_TYPE[mimeType] || [];
  const originalFilename = sanitizeFilename(document.name);
  const originalExtension = path.extname(originalFilename).toLowerCase();

  let filename = originalFilename;
  let extension = originalExtension;

  if (acceptedExtensions.length > 0) {
    if (!acceptedExtensions.includes(originalExtension)) {
      const baseName = path.basename(originalFilename, originalExtension);
      extension = acceptedExtensions[0] ?? "";
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
    format: extension ? extension.slice(1) : "",
    mimeType: MIME_TYPE_BY_EXTENSION[extension] || "application/octet-stream",
  };
}
