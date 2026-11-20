import { z } from "zod";
import { BANNER_TEXT_MAX, BANNER_TONES, MAINTENANCE_MESSAGE_MAX } from "./model";

/** Express leaves req.body undefined when no JSON body is sent. */
const orEmpty = (value: unknown) => (value === undefined || value === null ? {} : value);

const strict = <Shape extends z.ZodRawShape>(shape: Shape, label: string) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Unknown setting: ${issue.keys.join(", ")}.`
        : `Send ${label} as a JSON object.`,
  });

const toggle = (label: string) => z.boolean({ error: `${label} must be true or false.` }).optional();

const text = (label: string, max: number) =>
  z
    .string({ error: `${label} must be text.` })
    .trim()
    .max(max, { error: `${label} must be at most ${max} characters.` })
    .optional();

/** PATCH /api/admin/settings: any subset; only the sent fields change. */
export const settingsPatchBody = z.preprocess(
  orEmpty,
  strict(
    {
      maintenance: strict(
        { on: toggle("Maintenance"), message: text("Maintenance message", MAINTENANCE_MESSAGE_MAX) },
        "maintenance"
      ).optional(),
      banner: strict(
        {
          on: toggle("Banner"),
          text: text("Banner text", BANNER_TEXT_MAX),
          tone: z.enum(BANNER_TONES, { error: "Banner tone must be info or warning." }).optional(),
        },
        "banner"
      ).optional(),
      features: strict(
        {
          signups: toggle("Sign ups"),
          payments: toggle("Payments"),
          ai: toggle("AI"),
          jobs: toggle("Jobs"),
        },
        "features"
      ).optional(),
    },
    "the settings"
  ).refine(
    (body) => Object.values(body).some((group) => group && Object.values(group).some((value) => value !== undefined)),
    { error: "Nothing to update." }
  )
);

export type SettingsPatch = z.output<typeof settingsPatchBody>;
