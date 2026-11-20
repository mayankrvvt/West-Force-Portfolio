import OnboardingForm from "../../components/common/OnboardingForm";

export default function Education() {
  return (
    <OnboardingForm
      step="4 of 7"
      title="Education"
      description="Add your highest diploma, degree or certificate program."
      next="/onboarding/skills"
      fields={[
        [
          "qualification",
          "Program or credential",
          "text",
          { placeholder: "Personal Support Worker certificate" },
        ],
        [
          "institution",
          "School",
          "text",
          { placeholder: "Sheridan College" },
        ],
        ["year", "Year completed", "text", { placeholder: "2021", hint: "Leave empty if you are still studying.", optional: true }],
      ]}
    />
  );
}
