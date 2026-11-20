import type { File } from "multer";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import User from "../users/model";
import { buildResumeWithGemini, enhanceResumeWithGemini } from "./ai.service";
import Resume, { type ResumeAttrs, type ResumeDocument } from "./model";
import type { BuildBody, EnhanceBody, SaveBody } from "./schema";

const PDF = "application/pdf";
const DOC = "application/msword";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const TXT = "text/plain";

export type UploadedFile = Pick<File, "buffer" | "mimetype" | "originalname" | "size">;

/* ---------- text extraction ---------- */

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function pdfText(buffer: Buffer): Promise<string> {
  // Loaded on first use: pdf-parse pulls in pdf.js, which is large.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const text = result?.text?.trim() || "";

    if (!text) {
      throw new Error(
        "Could not extract text from the PDF. The PDF may be scanned or image-based."
      );
    }

    return text;
  } catch (error) {
    throw new AppError(400, messageOf(error, "Failed to extract text from the PDF."), {
      cause: error,
    });
  } finally {
    await parser.destroy().catch((error: unknown) => {
      logger.warn({ err: error }, "Failed to destroy PDF parser");
    });
  }
}

async function docxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const extractRawText = mammoth.extractRawText ?? mammoth.default.extractRawText;

  try {
    const result = await extractRawText({ buffer });
    const text = result?.value?.trim() || "";

    if (!text) throw new Error("Could not extract text from the DOCX file.");

    return text;
  } catch (error) {
    throw new AppError(400, messageOf(error, "Failed to extract text from the DOCX file."), {
      cause: error,
    });
  }
}

/**
 * Plain text of an uploaded resume (PDF, DOCX, or TXT when allowed).
 * Every failure is an AppError(400) with a message the user can act on.
 */
export async function extractResumeText(
  file: UploadedFile,
  { allowText = false }: { allowText?: boolean } = {}
): Promise<string> {
  let text: string;

  if (allowText && file.mimetype === TXT) {
    text = file.buffer.toString("utf8").trim();
  } else if (file.mimetype === PDF) {
    text = await pdfText(file.buffer);
  } else if (file.mimetype === DOCX) {
    text = await docxText(file.buffer);
  } else if (file.mimetype === DOC) {
    throw new AppError(
      400,
      "Legacy .doc files are not supported for AI enhancement yet. Please upload a PDF or DOCX file."
    );
  } else {
    throw new AppError(
      400,
      "Unsupported resume file type. Please upload a PDF, DOC, or DOCX file."
    );
  }

  if (!text) {
    throw new AppError(400, "No readable text could be extracted from the resume.");
  }

  return text;
}

/* ---------- AI ---------- */

/** The AI service may return the resume itself or wrap it. */
function unwrapResume(result: unknown, missing: string): unknown {
  const wrapped = result as { resume?: unknown; data?: unknown } | null | undefined;
  const resume = wrapped?.resume || wrapped?.data || result;

  if (!resume) throw new Error(missing);

  return resume;
}

export async function buildResume(firebaseUid: string, body: BuildBody): Promise<unknown> {
  const result = await buildResumeWithGemini({
    portfolio: body.portfolio,
    targetRole: body.targetRole,
    country: body.country,
    experienceLevel: body.experienceLevel,
    options: body.options,
    userId: firebaseUid,
  });

  return unwrapResume(result, "Gemini did not return a resume.");
}

export async function enhanceResume(
  firebaseUid: string,
  resumeText: string,
  body: EnhanceBody
): Promise<unknown> {
  const result = await enhanceResumeWithGemini({
    resumeText,
    portfolio: body.portfolio,
    options: body.options,
    targetRole: body.targetRole,
    country: body.country,
    userId: firebaseUid,
  });

  return unwrapResume(result, "Gemini did not return an enhanced resume.");
}

/* ---------- saved resumes ---------- */

/**
 * Which resumes belong to this user. Old records only have userId (the
 * Firebase uid); new ones also have ownerId (the Mongo User _id). Match
 * either until scripts/migrate-resume-owner.ts has filled every record.
 */
async function ownerOf(firebaseUid: string) {
  const user = await User.findOne({ firebaseUid }).select("_id");
  const filter = user
    ? { $or: [{ ownerId: user._id }, { userId: firebaseUid }] }
    : { userId: firebaseUid };

  return { ownerId: user?._id, filter };
}

export async function listResumes(firebaseUid: string): Promise<ResumeDocument[]> {
  const { filter } = await ownerOf(firebaseUid);
  return Resume.find(filter).sort({ createdAt: -1 });
}

/** For the dashboard: how many resumes, the newest few (without content) and the latest ATS score. */
export async function resumeSummary(firebaseUid: string, limit: number) {
  const { filter } = await ownerOf(firebaseUid);
  const [count, recent, scored] = await Promise.all([
    Resume.countDocuments(filter),
    Resume.find(filter).sort({ updatedAt: -1 }).limit(limit).select("-content -ai"),
    Resume.findOne({ $and: [filter, { atsScore: { $ne: null } }] })
      .sort({ updatedAt: -1 })
      .select("atsScore"),
  ]);

  return { count, recent, latestAtsScore: scored?.atsScore ?? null };
}

export async function getResume(firebaseUid: string, id: string): Promise<ResumeDocument> {
  const { filter } = await ownerOf(firebaseUid);
  const resume = await Resume.findOne({ $and: [{ _id: id }, filter] });

  if (!resume) throw new AppError(404, "Resume not found.");

  return resume;
}

type ResumeFields = { title?: string; targetRole?: string; country?: string };

export async function saveResume(firebaseUid: string, body: SaveBody): Promise<ResumeDocument> {
  const { ownerId } = await ownerOf(firebaseUid);
  const resume = body.resume as ResumeFields;

  return Resume.create({
    userId: firebaseUid,
    ownerId,
    title: body.title || resume?.title || "AI Generated Resume",
    targetRole: body.targetRole || resume?.targetRole || "",
    country: body.country || resume?.country || "",
    status: body.status || "completed",
    content: body.resume as ResumeAttrs["content"],
  });
}

export async function deleteResume(firebaseUid: string, id: string): Promise<void> {
  const { filter } = await ownerOf(firebaseUid);
  const deleted = await Resume.findOneAndDelete({ $and: [{ _id: id }, filter] });

  if (!deleted) throw new AppError(404, "Resume not found.");
}
