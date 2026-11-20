import type { NextFunction, Request, RequestHandler, Response } from "express";
import { sendError } from "../lib/errors";
import { isAdmin } from "../modules/admin/admins.service";
import type { Feature } from "../modules/site/model";
import { getSiteSettings, isFeatureOn } from "../modules/site/service";
import { verifyBearerToken } from "./auth";
import { FEATURE_OFF_MESSAGE } from "./dailyLimit";

export const MAINTENANCE = "MAINTENANCE";
export const FEATURE_OFF = "FEATURE_OFF";
export const DEFAULT_MAINTENANCE_MESSAGE = "WestForce is down for maintenance. Please try again soon.";

/**
 * Paths under /api that work during maintenance: health checks, the public
 * site status, the admin portal and the Stripe webhook. Express matches
 * routes without case, so these are compared in lower case too.
 */
function isOpenDuringMaintenance(path: string): boolean {
  const p = path.toLowerCase().replace(/\/+$/, "");
  return (
    p === "/health" ||
    p.startsWith("/health/") ||
    p === "/site/status" ||
    p === "/admin" ||
    p.startsWith("/admin/") ||
    p === "/payments/webhook"
  );
}

/**
 * Mounted at /api, early in app.ts. While maintenance is on, every other
 * /api request gets 503 MAINTENANCE, unless its Bearer token is an admin's.
 */
export async function maintenanceGate(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (isOpenDuringMaintenance(req.path)) return next();

  const { maintenance } = await getSiteSettings();
  if (!maintenance.on) return next();

  if (req.headers.authorization) {
    const result = await verifyBearerToken(req);
    if ("user" in result && (await isAdmin(result.user))) return next();
  }

  sendError(req, res, 503, maintenance.message || DEFAULT_MAINTENANCE_MESSAGE, MAINTENANCE);
}

/** 503 FEATURE_OFF while an admin has this feature switched off. */
export function requireFeature(feature: Feature): RequestHandler {
  return async (req, res, next) => {
    if (await isFeatureOn(feature)) return next();

    sendError(req, res, 503, FEATURE_OFF_MESSAGE, FEATURE_OFF);
  };
}
