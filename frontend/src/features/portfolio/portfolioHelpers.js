export function calculateProfileCompletion(
  profile = {}
) {
  const checks = [
    Boolean(profile.personalDetails),
    Boolean(profile.documents?.length),
    Boolean(profile.experience?.length),
    Boolean(profile.education?.length),
    Boolean(profile.skills?.length),
    Boolean(profile.certificates?.length),
    Boolean(profile.resume),
  ];

  return Math.round(
    (checks.filter(Boolean).length /
      checks.length) *
      100
  );
}