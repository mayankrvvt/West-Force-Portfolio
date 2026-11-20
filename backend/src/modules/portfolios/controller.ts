import type { NextFunction, Request, Response } from "express";
import { failWith } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { currentUser } from "../../middleware/auth";
import { requirePaidUser } from "../../middleware/requirePaid";
import { portfolioBody, slugParams } from "./schema";
import {
  createPortfolio,
  deletePortfolio,
  findOwnPortfolio,
  ownerView,
  publicPortfolio,
  updatePortfolio,
} from "./service";

/** Publishing needs a paid plan; saving a draft does not. */
export function requirePaymentToPublish(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> | void {
  if ((req.body as { status?: unknown } | undefined)?.status !== "published") {
    next();
    return;
  }

  return requirePaidUser(req, res, next);
}

export async function getMyPortfolio(req: Request, res: Response): Promise<void> {
  const portfolio = await failWith("Failed to load portfolio.", () =>
    findOwnPortfolio(currentUser(req).uid)
  );

  ok(res, { portfolio: ownerView(portfolio) });
}

export async function createMyPortfolio(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const body = parse(portfolioBody, req.body);

  const portfolio = await failWith("Failed to create portfolio.", () =>
    createPortfolio(uid, body)
  );

  req.log.info({ portfolioId: portfolio.id, status: portfolio.status }, "Portfolio created");

  ok(
    res,
    { message: "Portfolio created successfully.", portfolio: ownerView(portfolio) },
    201
  );
}

export async function updateMyPortfolio(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const body = parse(portfolioBody, req.body);

  const portfolio = await failWith("Failed to update portfolio.", () =>
    updatePortfolio(uid, body)
  );

  ok(res, { message: "Portfolio updated successfully.", portfolio: ownerView(portfolio) });
}

export async function deleteMyPortfolio(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;

  await failWith("Failed to delete portfolio.", () => deletePortfolio(uid));

  ok(res, { message: "Portfolio deleted successfully." });
}

export async function getPublicPortfolio(req: Request, res: Response): Promise<void> {
  const { slug } = parse(slugParams, req.params);

  const portfolio = await failWith("Failed to load public portfolio.", () =>
    publicPortfolio(slug)
  );

  ok(res, { portfolio });
}
