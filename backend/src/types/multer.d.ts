// Minimal types for multer 2 (no @types/multer installed). Only what the code uses.
declare module "multer" {
  import type { Request, RequestHandler } from "express";

  namespace multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    }

    type FileFilterCallback = (error: Error | null, accept?: boolean) => void;

    interface StorageEngine {
      _handleFile(...args: unknown[]): void;
      _removeFile(...args: unknown[]): void;
    }

    interface Options {
      storage?: StorageEngine;
      limits?: { fileSize?: number };
      fileFilter?: (req: Request, file: File, cb: FileFilterCallback) => void;
    }

    interface Multer {
      single(fieldName: string): RequestHandler;
    }

    class MulterError extends Error {
      readonly code: string;
      readonly field?: string;
    }

    function memoryStorage(): StorageEngine;
  }

  function multer(options?: multer.Options): multer.Multer;

  export = multer;
}
