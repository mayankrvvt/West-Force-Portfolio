import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import type { Request, Response } from "express";
import { config } from "../../lib/config";
import { AppError, failWith } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { currentUser } from "../../middleware/auth";
import { trackInBackground } from "../insights/controller";
import { slugParams } from "../portfolios/schema";
import { documentParams, myDocumentsQuery, protectionBody, unlockBody } from "./schema";
import {
  ACCESS_DURATION_MS,
  accessCookieName,
  documentSource,
  listMyDocuments,
  resumeSource,
  setDocumentProtection,
  unlockDocuments,
  type FileSource,
} from "./service";

export async function updateDocumentProtection(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const body = parse(protectionBody, req.body);

  const { enabled } = await failWith("Failed to update document protection.", () =>
    setDocumentProtection(uid, body)
  );

  ok(res, {
    message: enabled ? "Document protection enabled." : "Document protection disabled.",
    documentProtection: { enabled },
  });
}

export async function getMyDocuments(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const { type } = parse(myDocumentsQuery, req.query);

  const documents = await failWith("Failed to load documents.", () =>
    listMyDocuments(uid, type || undefined)
  );

  ok(res, { documents });
}

export async function unlock(req: Request, res: Response): Promise<void> {
  const { slug } = parse(slugParams, req.params);
  const { pin } = parse(unlockBody, req.body);

  const result = await failWith("Unable to unlock documents.", () =>
    unlockDocuments(slug, pin, req.ip)
  );

  switch (result.kind) {
    case "not-protected":
      ok(res, { message: "Document protection is not enabled.", unlocked: true });
      return;

    case "locked":
      res.status(429).json({
        success: false,
        message: `Too many incorrect PIN attempts. Try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      });
      return;

    case "wrong":
      res.status(401).json({
        success: false,
        message: "Incorrect PIN.",
        attemptsRemaining: result.attemptsRemaining,
      });
      return;

    case "unlocked":
      res.cookie(accessCookieName(slug), result.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.NODE_ENV === "production",
        maxAge: ACCESS_DURATION_MS,
        path: `/api/portfolios/${slug}`,
      });
      ok(res, { message: "Documents unlocked.", unlocked: true, expiresIn: ACCESS_DURATION_MS });
      // Never blocks or breaks the unlock; errors are only logged.
      trackInBackground(req, { slug, type: "unlock" });
  }
}

/** Fetch the file from storage and stream it to the client as an attachment. */
async function sendFile(
  req: Request,
  res: Response,
  source: FileSource,
  failure: { storage: string; generic: string }
): Promise<void> {
  if (source.kind === "redirect") {
    res.redirect(source.url);
    return;
  }

  try {
    const upstream = await fetch(source.url);

    if (!upstream.ok || !upstream.body) {
      req.log.error({ status: upstream.status }, "Storage download failed");
      throw new AppError(502, failure.storage);
    }

    res.set("Content-Type", source.details.mimeType);
    res.set("X-Content-Type-Options", "nosniff");
    res.attachment(source.details.filename);

    await pipeline(Readable.fromWeb(upstream.body as WebReadableStream<Uint8Array>), res);
  } catch (error) {
    if (res.headersSent) {
      req.log.error({ err: error }, "File stream failed");
      res.destroy();
      return;
    }

    if (error instanceof AppError) throw error;
    throw new AppError(500, failure.generic, { cause: error });
  }
}

export async function downloadDocument(req: Request, res: Response): Promise<void> {
  const { slug, documentId } = parse(documentParams, req.params);
  const generic = "Unable to access document.";

  const source = await failWith(generic, () =>
    documentSource(slug, documentId, req.headers.cookie)
  );

  await sendFile(req, res, source, {
    storage: "Unable to download document from storage.",
    generic,
  });

  // Only after the file was handed over; never breaks the download.
  if (res.writableFinished || !res.destroyed) trackInBackground(req, { slug, type: "document", documentId });
}

export async function downloadResume(req: Request, res: Response): Promise<void> {
  const { slug } = parse(slugParams, req.params);
  const generic = "Unable to access resume.";

  const source = await failWith(generic, () => resumeSource(slug));

  await sendFile(req, res, source, {
    storage: "Unable to download resume from storage.",
    generic,
  });
}
