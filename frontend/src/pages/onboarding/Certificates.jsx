import OnboardingForm from "../../components/common/OnboardingForm";

export default function Certificates() {
  return (
    <OnboardingForm
      step="6 of 7"
      title="Certificates & credentials"
      description="Add your professional certificates and credentials."
      next="/onboarding/review"
      fileUpload
    />
  );
}