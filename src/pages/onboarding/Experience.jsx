import OnboardingForm from "../../components/common/OnboardingForm";

export default function Experience() {
  return (
    <OnboardingForm
      step="3 of 7"
      title="Work experience"
      description="Add your professional experience."
      next="/onboarding/education"
      fields={[
        ["jobTitle", "Job title", "text"],
        ["company", "Company", "text"],
        [
          "period",
          "Employment period",
          "text",
        ],
        [
          "description",
          "Description",
          "textarea",
        ],
      ]}
    />
  );
}