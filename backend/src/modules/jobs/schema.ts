import { z } from "zod";

/** Missing or blank -> "". */
const searchText = (label: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().max(100, { error: `${label} is too long.` })
  );

const positiveInt = (fallback: number, max: number, label: string) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? fallback : value),
    z.coerce
      .number({ error: `${label} must be a number.` })
      .int({ error: `${label} must be a whole number.` })
      .min(1, { error: `${label} must be at least 1.` })
      .max(max, { error: `${label} must be at most ${max}.` })
  );

/** GET /api/jobs?query&location&page&limit */
export const jobSearchQuery = z.looseObject({
  query: searchText("Search text"),
  location: searchText("Location"),
  page: positiveInt(1, 100, "Page"),
  limit: positiveInt(20, 50, "Limit"),
});

export type JobSearchQuery = z.output<typeof jobSearchQuery>;
