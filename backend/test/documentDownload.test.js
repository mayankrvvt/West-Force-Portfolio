const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getDocumentDownloadDetails,
} = require("../utils/documentDownload");

test("keeps a safe uploaded PDF filename and its extension", () => {
  assert.deepEqual(
    getDocumentDownloadDetails({
      name: "../../Jordan Lee - Resume.pdf",
      mimeType: "application/pdf",
      format: "pdf",
    }),
    {
      filename: "Jordan_Lee_-_Resume.pdf",
      format: "pdf",
      mimeType: "application/pdf",
    }
  );
});

test("uses the uploaded file MIME type instead of forcing PDF", () => {
  assert.deepEqual(
    getDocumentDownloadDetails({
      name: "Reference Letter",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    {
      filename: "Reference_Letter.docx",
      format: "docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
  );
});

test("repairs a filename extension that conflicts with the uploaded MIME type", () => {
  assert.deepEqual(
    getDocumentDownloadDetails({
      name: "Portfolio.pdf",
      mimeType: "image/png",
    }),
    {
      filename: "Portfolio.png",
      format: "png",
      mimeType: "image/png",
    }
  );
});

test("falls back to the stored format for older documents without MIME metadata", () => {
  assert.deepEqual(
    getDocumentDownloadDetails({
      name: "certificate",
      format: "doc",
    }),
    {
      filename: "certificate.doc",
      format: "doc",
      mimeType: "application/msword",
    }
  );
});
