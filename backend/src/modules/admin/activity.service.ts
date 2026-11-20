import type { Request } from "express";
import { currentUser } from "../../middleware/auth";
import AdminActivity, { type ActivityAction } from "./activity.model";

export const ACTIVITY_PAGE_SIZE = 50;

/**
 * Record one admin write. A failed log write is only warned about: the change
 * itself already happened and must not be reported as failed.
 */
export async function logActivity(
  req: Request,
  action: ActivityAction,
  target: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const actorEmail = (currentUser(req).email ?? "").trim().toLowerCase();

  try {
    await AdminActivity.create({ actorEmail, action, target, details });
  } catch (error) {
    req.log.warn({ err: error, action }, "Could not log admin activity");
  }
}

/** Newest first, 50 per page. `page` starts at 1. */
export async function listActivity(page: number) {
  const [items, total] = await Promise.all([
    AdminActivity.find()
      .sort({ at: -1, _id: -1 })
      .skip((page - 1) * ACTIVITY_PAGE_SIZE)
      .limit(ACTIVITY_PAGE_SIZE)
      .select("-__v")
      .lean(),
    AdminActivity.countDocuments(),
  ]);

  return { items, total };
}
