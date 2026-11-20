import type { Request, Response } from "express";
import { AppError, failWith, failWithAi } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { currentUser } from "../../middleware/auth";
import { buildBody, enhanceBody, resumeIdParams, saveBody } from "./schema";
import {
  buildResume,
  deleteResume,
  enhanceResume,
  extractResumeText,
  getResume,
  listResumes,
  saveResume,
} from "./service";

export async function extractText(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new AppError(400, "Please upload a resume file.");

  const resumeText = await extractResumeText(req.file, { allowText: true });

  res.json({ fileName: req.file.originalname, resumeText });
}

export async function getResumes(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const resumes = await failWith("Failed to load resumes.", () => listResumes(uid));

  ok(res, { resumes });
}

export async function getOneResume(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const { id } = parse(resumeIdParams, req.params);
  const resume = await failWith("Failed to load resume.", () => getResume(uid, id));

  ok(res, { resume });
}

export async function build(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const body = parse(buildBody, req.body);

  if (!body.portfolio) throw new AppError(400, "Portfolio data is required.");

  req.log.info(
    { targetRole: body.targetRole, country: body.country, experienceLevel: body.experienceLevel },
    "AI resume build requested"
  );

  const resume = await failWithAi("Failed to build resume using AI.", () =>
    buildResume(uid, body)
  );

  ok(res, { resume });
}

export async function enhance(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;

  if (!req.file) throw new AppError(400, "Please upload a resume file.");

  req.log.info(
    { mimeType: req.file.mimetype, fileSize: req.file.size },
    "AI resume enhance requested"
  );

  const resumeText = await extractResumeText(req.file);
  const body = parse(enhanceBody, req.body);

  const resume = await failWithAi("Failed to enhance resume using AI.", () =>
    enhanceResume(uid, resumeText, body)
  );

  ok(res, { resume });
}

export async function save(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const body = parse(saveBody, req.body);

  if (!body.resume) throw new AppError(400, "Resume data is required.");

  const resume = await failWith("Failed to save resume.", () => saveResume(uid, body));

  ok(res, { resume }, 201);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const { id } = parse(resumeIdParams, req.params);

  await failWith("Failed to delete resume.", () => deleteResume(uid, id));

  ok(res, { message: "Resume deleted successfully." });
}
