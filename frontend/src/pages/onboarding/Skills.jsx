import OnboardingForm from "../../components/common/OnboardingForm";

export default function Skills() {
  return (
    <OnboardingForm
      step="5 of 7"
      title="Skills"
      description="List the skills you want employers to notice first."
      next="/onboarding/certificates"
      fields={[
        [
          "skills",
          "Skills",
          "text",
          {
            placeholder: "Dementia care, first aid, meal planning",
            hint: "Separate each skill with a comma.",
          },
        ],
        [
          "languages",
          "Languages",
          "text",
          { placeholder: "English, French", optional: true, hint: "Optional." },
        ],
      ]}
    />
  );
}
