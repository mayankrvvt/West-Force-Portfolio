import Application from "../applications/model";
import { recommendedJobs } from "../jobs/service";
import { resumeSummary } from "../resumes/service";
import User from "../users/model";

const RECENT_RESUMES = 3;
const RECENT_APPLICATIONS = 5;
const RECOMMENDED_JOBS = 6;

/**
 * GET /api/dashboard/summary. Same shape the old demo API returned:
 * { stats, recentResumes, recentApplications, recommendedJobs }.
 * A user without a Mongo record yet just gets empty lists.
 */
export async function dashboardSummary(firebaseUid: string) {
  const user = await User.findOne({ firebaseUid }).select("_id");
  const resumes = await resumeSummary(firebaseUid, RECENT_RESUMES);

  const ownerId = user?._id;
  const [statusCounts, recentApplications, appliedJobIds] = ownerId
    ? await Promise.all([
        Application.aggregate<{ _id: string; count: number }>([
          { $match: { ownerId } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Application.find({ ownerId }).sort({ updatedAt: -1 }).limit(RECENT_APPLICATIONS),
        Application.distinct("jobId", { ownerId, jobId: { $type: "objectId" } }),
      ])
    : [[], [], []];

  const countOf = (status: string) =>
    statusCounts.find((entry) => entry._id === status)?.count ?? 0;
  const applicationCount = statusCounts.reduce((sum, entry) => sum + entry.count, 0);

  // Match jobs to what the user is aiming for: latest resume role, else latest application role.
  const hint = resumes.recent[0]?.targetRole || recentApplications[0]?.role || undefined;
  const jobs = await recommendedJobs(hint, RECOMMENDED_JOBS, appliedJobIds);

  return {
    stats: {
      resumes: resumes.count,
      applications: applicationCount,
      interviews: countOf("Interview"),
      savedJobs: countOf("Saved"),
      latestAtsScore: resumes.latestAtsScore,
    },
    recentResumes: resumes.recent,
    recentApplications,
    recommendedJobs: jobs,
  };
}
