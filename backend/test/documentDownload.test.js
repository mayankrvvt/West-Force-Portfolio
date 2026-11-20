import { describe, expect, test } from "vitest";
import { getDocumentDownloadDetails } from "../src/modules/documents/documentDownload";

describe("getDocumentDownloadDetails", () => {
  test("keeps a safe uploaded PDF filename and its extension", () => {
    expect(
      getDocumentDownloadDetails({
        name: "../../Jordan Lee - Resume.pdf",
        mimeType: "application/pdf",
        format: "pdf",
      })
    ).toEqual({
      filename: "Jordan_Lee_-_Resume.pdf",
      format: "pdf",
      mimeType: "application/pdf",
    });
  });

  test("uses the uploaded file MIME type instead of forcing PDF", () => {
    expect(
      getDocumentDownloadDetails({
        name: "Reference Letter",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
    ).toEqual({
      filename: "Reference_Letter.docx",
      format: "docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  });

  test("repairs a filename extension that conflicts with the uploaded MIME type", () => {
    expect(
      getDocumentDownloadDetails({
        name: "Portfolio.pdf",
        mimeType: "image/png",
      })
    ).toEqual({
      filename: "Portfolio.png",
      format: "png",
      mimeType: "image/png",
    });
  });

  test("falls back to the stored format for older documents without MIME metadata", () => {
    expect(
      getDocumentDownloadDetails({
        name: "certificate",
        format: "doc",
      })
    ).toEqual({
      filename: "certificate.doc",
      format: "doc",
      mimeType: "application/msword",
    });
  });
});
