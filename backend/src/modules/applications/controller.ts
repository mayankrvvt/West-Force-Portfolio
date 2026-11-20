import type { Request, Response } from "express";
import { failWith } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { idParams, parse } from "../../lib/validate";
import { currentUser } from "../../middleware/auth";
import {
  createApplicationBody,
  listApplicationsQuery,
  statusBody,
  updateApplicationBody,
} from "./schema";
import {
  createApplication,
  deleteApplication,
  listApplications,
  setApplicationStatus,
  updateApplication,
} from "./service";

export async function getApplications(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const { status } = parse(listApplicationsQuery, req.query);

  const applications = await failWith("Failed to load applications.", () =>
    listApplications(uid, status)
  );

  ok(res, { applications });
}

export async function postApplication(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const body = parse(createApplicationBody, req.body);

  const { application, created } = await failWith("Failed to save application.", () =>
    createApplication(uid, body)
  );

  if (created) {
    ok(res, { message: "Application saved.", application, created: true }, 201);
  } else {
    ok(res, { message: "Application already saved.", application, created: false });
  }
}

export async function patchApplication(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const { id } = parse(idParams, req.params);
  const body = parse(updateApplicationBody, req.body);

  const application = await failWith("Failed to update application.", () =>
    updateApplication(uid, id, body)
  );

  ok(res, { message: "Application updated.", application });
}

export async function patchApplicationStatus(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const { id } = parse(idParams, req.params);
  const { status } = parse(statusBody, req.body);

  const application = await failWith("Failed to update application status.", () =>
    setApplicationStatus(uid, id, status)
  );

  ok(res, { message: "Application status updated.", application });
}

export async function removeApplication(req: Request, res: Response): Promise<void> {
  const uid = currentUser(req).uid;
  const { id } = parse(idParams, req.params);

  await failWith("Failed to delete application.", () => deleteApplication(uid, id));

  ok(res, { message: "Application deleted." });
}
