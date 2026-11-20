import { isDbReady } from "../../lib/db";
import SiteSettings, { SITE_SETTINGS_ID, type Feature } from "./model";
import type { SettingsPatch } from "./schema";

export type SiteStatus = {
  maintenance: { on: boolean; message: string };
  banner: { on: boolean; text: string; tone: "info" | "warning" };
  features: Record<Feature, boolean>;
};

export type SiteSettingsView = SiteStatus & { updatedBy: string | null; updatedAt: Date | null };

/** Settings are read from the database at most this often per server. */
export const SETTINGS_CACHE_MS = 15 * 1000;

const DEFAULTS: SiteSettingsView = {
  maintenance: { on: false, message: "" },
  banner: { on: false, text: "", tone: "info" },
  features: { signups: true, payments: true, ai: true, jobs: true },
  updatedBy: null,
  updatedAt: null,
};

let cache: { value: SiteSettingsView; expires: number } | null = null;

export function clearSiteSettingsCache(): void {
  cache = null;
}

type StoredSettings = {
  maintenance?: { on?: boolean | null; message?: string | null } | null;
  banner?: { on?: boolean | null; text?: string | null; tone?: string | null } | null;
  features?: Partial<Record<Feature, boolean | null>> | null;
  updatedBy?: string | null;
  updatedAt?: Date | null;
};

/** A stored document (maybe partial or missing) filled in with the defaults. */
function withDefaults(doc: StoredSettings | null): SiteSettingsView {
  const features = { ...DEFAULTS.features };
  for (const key of Object.keys(features) as Feature[]) {
    const value = doc?.features?.[key];
    if (typeof value === "boolean") features[key] = value;
  }

  return {
    maintenance: {
      on: doc?.maintenance?.on ?? DEFAULTS.maintenance.on,
      message: doc?.maintenance?.message ?? DEFAULTS.maintenance.message,
    },
    banner: {
      on: doc?.banner?.on ?? DEFAULTS.banner.on,
      text: doc?.banner?.text ?? DEFAULTS.banner.text,
      tone: doc?.banner?.tone === "warning" ? "warning" : "info",
    },
    features,
    updatedBy: doc?.updatedBy || null,
    updatedAt: doc?.updatedAt ?? null,
  };
}

/** Current settings (cached ~15 s). With no database yet, the defaults. */
export async function getSiteSettings(): Promise<SiteSettingsView> {
  if (cache && cache.expires > Date.now()) return cache.value;
  if (!isDbReady()) return withDefaults(null);

  const doc = await SiteSettings.findById(SITE_SETTINGS_ID).lean();
  const value = withDefaults(doc);
  cache = { value, expires: Date.now() + SETTINGS_CACHE_MS };
  return value;
}

/** The public part, for GET /api/site/status. */
export function publicStatus({ maintenance, banner, features }: SiteSettingsView): SiteStatus {
  return { maintenance, banner, features };
}

export async function isFeatureOn(feature: Feature): Promise<boolean> {
  return (await getSiteSettings()).features[feature];
}

/** { banner: { text: "x" } } to { "banner.text": "x" }: only sent fields are set. */
export function dottedChanges(patch: SettingsPatch): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const [group, fields] of Object.entries(patch)) {
    for (const [field, value] of Object.entries(fields ?? {})) {
      if (value !== undefined) changes[`${group}.${field}`] = value;
    }
  }
  return changes;
}

export async function updateSiteSettings(
  changes: Record<string, unknown>,
  updatedBy: string
): Promise<SiteSettingsView> {
  try {
    const doc = await SiteSettings.findOneAndUpdate(
      { _id: SITE_SETTINGS_ID },
      { $set: { ...changes, updatedBy } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return withDefaults(doc);
  } finally {
    clearSiteSettingsCache();
  }
}
