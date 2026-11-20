import { ipKeyGenerator, rateLimit } from "express-rate-limit";

const HEALTH_PATHS = new Set(["/health", "/health/ready"]);

/**
 * General /api limit: 300 requests / 15 min per client IP. The Stripe webhook
 * is registered before this limiter, and health checks are skipped so uptime
 * checks are never blocked.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => HEALTH_PATHS.has(req.path),
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

/**
 * Admin writes (POST, PATCH, DELETE): 60 / 15 min per signed-in user, on top
 * of apiLimiter. Run after authenticateUser so req.user is set.
 */
export const adminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? `uid:${req.user.uid}` : ipKeyGenerator(req.ip ?? "")),
  message: {
    success: false,
    message: "Too many changes. Please wait a few minutes and try again.",
  },
});

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * POST /api/auth/password-reset: 5 / 15 min per client IP, on top of
 * apiLimiter. Public, so it is kept low to stop mail flooding.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  message: {
    success: false,
    message: "Too many reset requests. Please wait 15 minutes and try again.",
  },
});

/** POST /api/auth/send-verification: 5 / 15 min per signed in user. Run after authenticateUser. */
export const verificationEmailLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? `uid:${req.user.uid}` : ipKeyGenerator(req.ip ?? "")),
  message: {
    success: false,
    message: "Too many verification emails. Please wait 15 minutes and try again.",
  },
});
