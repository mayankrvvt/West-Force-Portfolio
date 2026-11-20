/*
 * Company job boards the daily collector reads. Both APIs are public and free.
 *
 * To add a company:
 *   1. Find its careers page. "boards.greenhouse.io/<slug>" or
 *      "job-boards.greenhouse.io/<slug>" means Greenhouse; "jobs.lever.co/<slug>" means Lever.
 *   2. Check the slug answers with a list of jobs:
 *        https://boards-api.greenhouse.io/v1/boards/<slug>/jobs
 *        https://api.lever.co/v0/postings/<slug>?mode=json
 *   3. Add the slug below. Only jobs located in Canada are kept, so pick
 *      companies that hire in Canada.
 */

/** Greenhouse board slugs. All had Canadian openings when added (Nov 2026). */
export const GREENHOUSE_COMPANIES: string[] = [
  "d2l",
  "geotab",
  "faire",
  "behavox",
  "shakepay",
  "hootsuite",
  "instacart",
  "stripe",
];

/** Lever posting slugs. */
export const LEVER_COMPANIES: string[] = [
  "pointclickcare",
  "getmaple",
  "fullscript",
  "achievers",
  "mistplay",
  "wattpad",
];
