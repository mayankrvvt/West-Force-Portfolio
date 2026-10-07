export function validatePortfolio(profile) {
  const errors = {};

  if (!profile?.personalDetails?.fullName) {
    errors.fullName =
      "Full name is required.";
  }

  return errors;
}