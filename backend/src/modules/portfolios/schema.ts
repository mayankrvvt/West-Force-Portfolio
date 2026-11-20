import { z } from "zod";
import { toText } from "../../lib/text";

/** Express leaves req.body undefined when no JSON body is sent. */
const orEmpty = (value: unknown) => (value === undefined || value === null ? {} : value);

/** Fields the owner may set on create / update. Anything else is ignored. */
export const EDITABLE_FIELDS = [
  "slug",
  "status",
  "template",
  "profile",
  "hero",
  "about",
  "experience",
  "education",
  "skills",
  "documents",
  "resume",
  "socialLinks",
] as const;

/**
 * documentProtection in a portfolio body. A falsy value means "leave it",
 * as before; `pin` is checked in the service (after the 404/409 checks).
 */
const protectionInput = z.preprocess(
  (value) => (value ? value : undefined),
  z
    .looseObject({
      enabled: z.unknown().optional(),
      pin: z.unknown().optional(),
    })
    .optional()
);

/** POST /api/portfolios and PUT /api/portfolios/me. */
export const portfolioBody = z.preprocess(
  orEmpty,
  z.looseObject({
    slug: z.unknown().optional(),
    status: z.unknown().optional(),
    documentProtection: protectionInput,
  })
);

/** GET /api/portfolios/:slug (and the document routes under it). */
export const slugParams = z.looseObject({
  slug: z.preprocess((value) => toText(value).trim().toLowerCase(), z.string()),
});

export type PortfolioBody = z.output<typeof portfolioBody>;
export type ProtectionInput = NonNullable<PortfolioBody["documentProtection"]>;
