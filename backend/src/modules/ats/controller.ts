import type { Request, Response } from "express";
import { failWithAi } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { currentUser } from "../../middleware/auth";
import { atsCheckBody } from "./schema";
import { checkResume } from "./service";

export async function check(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const body = parse(atsCheckBody, req.body);

  req.log.info(
    {
      source: body.resumeText ? "text" : "saved",
      resumeChars: body.resumeText?.length ?? 0,
      jobChars: body.jobDescription.length,
    },
    "ATS check requested"
  );

  const result = await failWithAi("Failed to check the resume. Please try again.", () =>
    checkResume(uid, body)
  );

  ok(res, { ...result });
}
