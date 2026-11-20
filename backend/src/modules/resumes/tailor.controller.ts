import type { Request, Response } from "express";
import { failWith, failWithAi } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { currentUser } from "../../middleware/auth";
import { tailorBody, tailorSaveBody } from "./tailor.schema";
import { saveTailoredResume, tailorResume } from "./tailor.service";

export async function tailor(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const body = parse(tailorBody, req.body);

  req.log.info(
    { jobDescriptionLength: body.jobDescription.length, hasJobId: Boolean(body.jobId) },
    "AI resume tailor requested"
  );

  const result = await failWithAi("Failed to tailor the resume.", () => tailorResume(uid, body));

  ok(res, result);
}

export async function saveTailored(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const body = parse(tailorSaveBody, req.body);
  const resume = await failWith("Failed to save the tailored resume.", () =>
    saveTailoredResume(uid, body)
  );

  ok(res, { resume }, 201);
}
