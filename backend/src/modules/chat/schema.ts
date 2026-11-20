import { z } from "zod";

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_HISTORY_MESSAGES = 20;

/** POST /api/chat — a missing or non-string message reads as "" (then rejected). */
export const chatBody = z.preprocess(
  (value) => (value && typeof value === "object" ? value : {}),
  z.object({
    message: z
      .unknown()
      .optional()
      .transform((value) => (typeof value === "string" ? value.trim() : ""))
      .pipe(
        z
          .string()
          .min(1, "Please enter a message.")
          .max(
            MAX_MESSAGE_LENGTH,
            `Your message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`
          )
      ),
    // Cleaned (not rejected) by buildContents: bad entries are dropped.
    history: z.unknown().optional(),
  })
);

export type ChatBody = z.output<typeof chatBody>;
