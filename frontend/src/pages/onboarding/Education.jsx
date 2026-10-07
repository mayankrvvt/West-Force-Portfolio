import OnboardingForm from "../../components/common/OnboardingForm";

export default function Education() {
  return (
    <OnboardingForm
      step="4 of 7"
      title="Education"
      description="Add your education and training."
      next="/onboarding/skills"
      fields={[
        [
          "qualification",
          "Qualification",
          "text",
        ],
        [
          "institution",
          "Institution",
          "text",
        ],
        ["year", "Year", "text"],
      ]}
    />
  );
}