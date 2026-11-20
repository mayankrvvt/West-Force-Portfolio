import OnboardingForm from "../../components/common/OnboardingForm";

export default function Experience() {
  return (
    <OnboardingForm
      step="3 of 7"
      title="Work experience"
      description="Start with your most recent job. You can add more roles from your dashboard."
      next="/onboarding/education"
      fields={[
        ["jobTitle", "Job title", "text", { placeholder: "Personal support worker" }],
        ["company", "Employer", "text", { placeholder: "Peel Region Long Term Care" }],
        [
          "period",
          "Dates",
          "text",
          { placeholder: "Mar 2022 to present" },
        ],
        [
          "description",
          "What you did",
          "textarea",
          {
            placeholder: "Supported 12 residents each shift with daily care and mobility.",
            hint: "Two or three lines is plenty. Numbers help.",
          },
        ],
      ]}
    />
  );
}
