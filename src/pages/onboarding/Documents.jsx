import OnboardingForm from "../../components/common/OnboardingForm";

export default function Documents() {
  return (
    <OnboardingForm
      step="2 of 7"
      title="Upload your documents"
      description="Upload your resume and supporting documents."
      next="/onboarding/experience"
      fileUpload
    />
  );
}