import OnboardingForm from "../../components/common/OnboardingForm";

export default function PersonalDetails() {
  return (
    <OnboardingForm
      step="1 of 7"
      title="Personal details"
      description="Tell us the basics about yourself."
      next="/onboarding/documents"
      fields={[
        ["fullName", "Full name", "text"],
        [
          "headline",
          "Professional headline",
          "text",
        ],
        [
          "location",
          "Current location",
          "text",
        ],
        [
          "phone",
          "Phone number",
          "tel",
        ],
      ]}
    />
  );
}