import { config } from "../../lib/config";
import { dailyUsageKey, dailyUsageLimit } from "../../middleware/dailyLimit";

/** Counter keys for one user on one UTC day. */
export const resumeBuildUsageKey = (uid: string, now: number = Date.now()) =>
  dailyUsageKey("resume-build", uid, now);
export const resumeEnhanceUsageKey = (uid: string, now: number = Date.now()) =>
  dailyUsageKey("resume-enhance", uid, now);

/** AI resume builds per user per UTC day (RESUME_BUILD_DAILY_LIMIT, default 20). */
export const resumeBuildDailyLimit = dailyUsageLimit({
  name: "resume-build",
  limit: () => config.RESUME_BUILD_DAILY_LIMIT,
  code: "RESUME_BUILD_DAILY_LIMIT",
  message: (limit) =>
    `You have used all ${limit} AI resume builds for today. Please try again tomorrow.`,
});

/** AI resume enhancements per user per UTC day (RESUME_ENHANCE_DAILY_LIMIT, default 30). */
export const resumeEnhanceDailyLimit = dailyUsageLimit({
  name: "resume-enhance",
  limit: () => config.RESUME_ENHANCE_DAILY_LIMIT,
  code: "RESUME_ENHANCE_DAILY_LIMIT",
  message: (limit) =>
    `You have used all ${limit} AI resume enhancements for today. Please try again tomorrow.`,
});
