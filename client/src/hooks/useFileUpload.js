import { useState } from "react";

import {
  validateDocument,
} from "../features/documents/documentValidation";

import {
  getDocumentMetadata,
} from "../features/documents/documentUpload";

export default function useFileUpload() {
  const [files, setFiles] =
    useState([]);

  const [error, setError] =
    useState("");

  function addFiles(selected) {
    const list =
      Array.from(selected);

    for (const file of list) {
      const validationError =
        validateDocument(file);

      if (validationError) {
        setError(
          validationError
        );

        return;
      }
    }

    setError("");

    setFiles((current) => [
      ...current,
      ...list.map(
        getDocumentMetadata
      ),
    ]);
  }

  function removeFile(fileName) {
    setFiles((current) =>
      current.filter(
        (file) =>
          file.name !== fileName
      )
    );
  }

  return {
    files,
    error,
    addFiles,
    removeFile,
  };
}