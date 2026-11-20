import { dailyUsageKey, dailyUsageLimit } from "../../middleware/dailyLimit";

/** AI resume tailoring calls per user per UTC day. */
export const RESUME_TAILOR_DAILY_LIMIT = 20;

export const resumeTailorUsageKey = (uid: string, now: number = Date.now()) =>
  dailyUsageKey("resume-tailor", uid, now);

/** Daily cap for POST /api/resumes/tailor; a failed call is given back. */
export const resumeTailorDailyLimit = dailyUsageLimit({
  name: "resume-tailor",
  limit: () => RESUME_TAILOR_DAILY_LIMIT,
  code: "RESUME_TAILOR_DAILY_LIMIT",
  message: (limit) =>
    `You have used all ${limit} resume tailoring runs for today. Please try again tomorrow.`,
});
