import { rateLimit } from "express-rate-limit";

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
