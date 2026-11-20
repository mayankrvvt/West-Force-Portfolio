import { z } from "zod";
import { toText } from "../../lib/text";
import { JOB_TYPES, LANGUAGES, SHIFTS } from "./model";

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

const trimmed = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`);

/**
 * Hire facts inside `profile`. Each one is optional so a partial save can
 * send just one; other profile keys pass through as before.
 */
const profileInput = z.looseObject({
  availability: z
    .object({
      jobTypes: z
        .array(z.enum(JOB_TYPES, { message: "Choose full time, part time or casual." }))
        .optional(),
      shifts: z
        .array(z.enum(SHIFTS, { message: "Choose days, evenings, nights or weekends." }))
        .optional(),
      startDate: z
        .string()
        .regex(/^(now|\d{4}-\d{2}-\d{2})?$/, "Start date must be now or a date.")
        .optional(),
    })
    .optional(),
  workArea: trimmed(120, "Work area").optional(),
  travel: z
    .object({ willing: z.boolean().optional(), ownCar: z.boolean().optional() })
    .optional(),
  languages: z
    .array(z.enum(LANGUAGES, { message: "Languages can be English or French." }))
    .optional(),
  driversLicence: trimmed(40, "Driver's licence").optional(),
});

/** POST /api/portfolios and PUT /api/portfolios/me. */
export const portfolioBody = z.preprocess(
  orEmpty,
  z.looseObject({
    slug: z.unknown().optional(),
    status: z.unknown().optional(),
    profile: profileInput.optional(),
    documentProtection: protectionInput,
  })
);

/** GET /api/portfolios/:slug (and the document routes under it). */
export const slugParams = z.looseObject({
  slug: z.preprocess((value) => toText(value).trim().toLowerCase(), z.string()),
});

export type PortfolioBody = z.output<typeof portfolioBody>;
export type ProtectionInput = NonNullable<PortfolioBody["documentProtection"]>;
