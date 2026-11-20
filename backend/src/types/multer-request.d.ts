import type { File } from "multer";

declare global {
  namespace Express {
    interface Request {
      /** Set by multer .single() (see src/modules/uploads/multer.ts). */
      file?: File;
    }
  }
}

export {};
