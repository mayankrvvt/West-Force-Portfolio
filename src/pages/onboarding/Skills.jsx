import OnboardingForm from "../../components/common/OnboardingForm";

export default function Skills() {
  return (
    <OnboardingForm
      step="5 of 7"
      title="Skills"
      description="Add the skills you want employers to see."
      next="/onboarding/certificates"
      fields={[
        ["skills", "Skills", "text"],
        [
          "languages",
          "Languages",
          "text",
        ],
      ]}
    />
  );
}