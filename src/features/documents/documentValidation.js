const allowedTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

export function validateDocument(file) {
  if (!allowedTypes.includes(file.type)) {
    return "Unsupported file type.";
  }

  if (file.size > 10 * 1024 * 1024) {
    return "File must be smaller than 10MB.";
  }

  return null;
}