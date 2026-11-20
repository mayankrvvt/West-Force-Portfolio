import { dailyUsageKey, dailyUsageLimit } from "../../middleware/dailyLimit";

export const ATS_DAILY_LIMIT = 20;

/** Counter key for one user on one UTC day. */
export const atsUsageKey = (uid: string, now: number = Date.now()) => dailyUsageKey("ats", uid, now);

/** 20 ATS checks per user per UTC day; a failed check is given back (see dailyUsageLimit). */
export const atsDailyLimit = dailyUsageLimit({
  name: "ats",
  limit: () => ATS_DAILY_LIMIT,
  code: "ATS_DAILY_LIMIT",
  message: (limit) => `You have used all ${limit} ATS checks for today. Please try again tomorrow.`,
});
