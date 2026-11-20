import { z } from "zod";
import { toText } from "../../lib/text";

/** Express leaves req.body undefined when no JSON body is sent. */
const orEmpty = (value: unknown) => (value === undefined || value === null ? {} : value);

/** PUT /api/portfolios/me/document-protection. The PIN rule is checked in the service. */
export const protectionBody = z.preprocess(
  orEmpty,
  z.looseObject({
    enabled: z.unknown().optional(),
    pin: z.unknown().optional(),
  })
);

/** POST /api/portfolios/:slug/unlock-documents. The PIN rule is checked after the 404. */
export const unlockBody = z.preprocess(
  orEmpty,
  z.looseObject({
    pin: z.preprocess((value) => toText(value || ""), z.string()),
  })
);

/** GET /api/portfolios/me/documents?type=certificate */
export const myDocumentsQuery = z.looseObject({
  type: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : undefined),
    z.string().max(100, { error: "Document type is too long." }).optional()
  ),
});

export const documentParams = z.looseObject({
  slug: z.preprocess((value) => toText(value).trim().toLowerCase(), z.string()),
  documentId: z.preprocess((value) => toText(value), z.string()),
});

export type ProtectionBody = z.output<typeof protectionBody>;
