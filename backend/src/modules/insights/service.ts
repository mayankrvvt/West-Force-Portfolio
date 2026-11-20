import mongoose, { type Types } from "mongoose";
import { auth } from "../../lib/clients/firebase";
import { AppError } from "../../lib/errors";
import Portfolio from "../portfolios/model";
import User from "../users/model";
import PortfolioEvent, { type EventType } from "./model";
import { hashVisitor, isBot, utcDay } from "./visitor";

/** What a public request tells us about its sender. Used only to build the hash. */
export type VisitorContext = {
  ip: string;
  userAgent: string;
  authorization?: string;
};

type PublishedRef = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  documents?: { _id: Types.ObjectId; name?: string | null }[];
};

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 11000;
}

/**
 * True when the request carries a valid Bearer token whose user owns the
 * portfolio, so owners looking at their own page are not counted. A bad or
 * expired token is treated as a normal visitor.
 */
export async function isOwnerRequest(
  authorization: string | undefined,
  ownerUserId: Types.ObjectId
): Promise<boolean> {
  if (!authorization?.startsWith("Bearer ")) return false;

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return false;

  try {
    const decoded = await auth.verifyIdToken(token);
    return Boolean(await User.exists({ _id: ownerUserId, firebaseUid: decoded.uid }));
  } catch {
    return false;
  }
}

export type RecordInput = {
  portfolioId: Types.ObjectId | string;
  type: EventType;
  documentId?: string | null;
  documentName?: string;
  ip: string;
  userAgent: string;
  now?: Date;
};

/**
 * Store one event, at most once per visitor, day, type (and document).
 * Returns true only when a new row was written. Bots are skipped.
 */
export async function recordEvent(input: RecordInput): Promise<boolean> {
  if (isBot(input.userAgent)) return false;

  const now = input.now ?? new Date();
  const day = utcDay(now);
  const portfolioId = String(input.portfolioId);
  const visitorHash = hashVisitor({ day, portfolioId, ip: input.ip, userAgent: input.userAgent });

  try {
    const result = await PortfolioEvent.updateOne(
      {
        portfolioId: new mongoose.Types.ObjectId(portfolioId),
        type: input.type,
        day,
        visitorHash,
        documentId: input.documentId ?? null,
      },
      { $setOnInsert: { documentName: input.documentName ?? "", createdAt: now } },
      { upsert: true }
    );

    return result.upsertedCount === 1;
  } catch (error) {
    // Two requests raced on the same unique key: the other one recorded it.
    if (isDuplicateKey(error)) return false;
    throw error;
  }
}

export type TrackInput = {
  slug: string;
  type: EventType;
  documentId?: string;
  visitor: VisitorContext;
  now?: Date;
};

/** Record an event for a published portfolio by slug. 404 when it is not published. */
export async function recordForSlug(input: TrackInput): Promise<boolean> {
  const portfolio = await Portfolio.findOne({ slug: input.slug, status: "published" })
    .select("_id userId documents._id documents.name")
    .lean<PublishedRef>();

  if (!portfolio) throw new AppError(404, "Published portfolio not found.");

  if (isBot(input.visitor.userAgent)) return false;

  let documentName = "";

  if (input.type === "document") {
    const document = portfolio.documents?.find((item) => String(item._id) === input.documentId);
    if (!document) return false;
    documentName = document.name || "Document";
  }

  if (await isOwnerRequest(input.visitor.authorization, portfolio.userId)) return false;

  return recordEvent({
    portfolioId: portfolio._id,
    type: input.type,
    documentId: input.type === "document" ? (input.documentId ?? null) : null,
    documentName,
    ip: input.visitor.ip,
    userAgent: input.visitor.userAgent,
    now: input.now,
  });
}

/* ---------- owner summary ---------- */

export type InsightsSummary = {
  totals: { views: number; uniqueVisitors: number; unlocks: number; documentOpens: number };
  daily: { day: string; views: number; unlocks: number }[];
  documents: { documentId: string; name: string; opens: number; lastOpenedAt: Date }[];
  recent: { type: EventType; documentName: string | null; at: Date }[];
};

type FacetResult = {
  byDay: { _id: { day: string; type: EventType }; count: number }[];
  visitors: { count: number }[];
  documents: { _id: string; name: string; opens: number; lastOpenedAt: Date }[];
  recent: { type: EventType; documentName?: string; createdAt: Date }[];
};

const RECENT_LIMIT = 10;
const DOCUMENT_LIMIT = 20;

/** The last `days` UTC days, oldest first, ending with today. */
export function lastDays(days: number, now: Date = new Date()): string[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return Array.from({ length: days }, (_, index) =>
    utcDay(new Date(today - (days - 1 - index) * 86_400_000))
  );
}

/** Views, unlocks and document opens for the caller's own portfolio only. */
export async function insightsSummary(
  firebaseUid: string,
  days: number,
  now: Date = new Date()
): Promise<InsightsSummary> {
  const dayList = lastDays(days, now);
  const summary: InsightsSummary = {
    totals: { views: 0, uniqueVisitors: 0, unlocks: 0, documentOpens: 0 },
    daily: dayList.map((day) => ({ day, views: 0, unlocks: 0 })),
    documents: [],
    recent: [],
  };

  const user = await User.findOne({ firebaseUid }).select("_id").lean<{ _id: Types.ObjectId }>();
  const portfolio = user
    ? await Portfolio.findOne({ userId: user._id }).select("_id").lean<{ _id: Types.ObjectId }>()
    : null;

  if (!portfolio) return summary;

  const [facet] = await PortfolioEvent.aggregate<FacetResult>([
    { $match: { portfolioId: portfolio._id, day: { $gte: dayList[0] ?? utcDay(now) } } },
    {
      $facet: {
        byDay: [{ $group: { _id: { day: "$day", type: "$type" }, count: { $sum: 1 } } }],
        // The hash changes daily, so this counts visitor-days, never people over time.
        visitors: [{ $group: { _id: "$visitorHash" } }, { $count: "count" }],
        documents: [
          { $match: { type: "document" } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: "$documentId",
              name: { $first: "$documentName" },
              opens: { $sum: 1 },
              lastOpenedAt: { $max: "$createdAt" },
            },
          },
          { $sort: { opens: -1, lastOpenedAt: -1 } },
          { $limit: DOCUMENT_LIMIT },
        ],
        recent: [
          { $sort: { createdAt: -1 } },
          { $limit: RECENT_LIMIT },
          { $project: { _id: 0, type: 1, documentName: 1, createdAt: 1 } },
        ],
      },
    },
  ]);

  if (!facet) return summary;

  const dailyByDay = new Map(summary.daily.map((row) => [row.day, row]));

  for (const { _id, count } of facet.byDay) {
    if (_id.type === "view") summary.totals.views += count;
    if (_id.type === "unlock") summary.totals.unlocks += count;
    if (_id.type === "document") summary.totals.documentOpens += count;

    const row = dailyByDay.get(_id.day);
    if (row && _id.type === "view") row.views += count;
    if (row && _id.type === "unlock") row.unlocks += count;
  }

  summary.totals.uniqueVisitors = facet.visitors[0]?.count ?? 0;

  summary.documents = facet.documents.map((item) => ({
    documentId: item._id,
    name: item.name || "Document",
    opens: item.opens,
    lastOpenedAt: item.lastOpenedAt,
  }));

  summary.recent = facet.recent.map((item) => ({
    type: item.type,
    documentName: item.type === "document" ? item.documentName || "Document" : null,
    at: item.createdAt,
  }));

  return summary;
}
