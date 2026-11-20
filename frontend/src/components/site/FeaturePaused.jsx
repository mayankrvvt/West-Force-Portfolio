import { PauseCircle } from "lucide-react";

import { PAUSED_TEXT, useFeature } from "../../hooks/useSiteStatus";

/** A short note next to an entry point an admin has switched off. Renders nothing when it is on. */
export default function FeaturePaused({ feature, className = "" }) {
  const on = useFeature(feature);
  if (on) return null;

  return (
    <p className={`feature-paused ${className}`.trim()} role="status">
      <PauseCircle size={14} aria-hidden="true" />
      <span>{PAUSED_TEXT[feature]}</span>
    </p>
  );
}
