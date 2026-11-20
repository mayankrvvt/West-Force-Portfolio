import OnboardingForm from "../../components/common/OnboardingForm";

export default function Certificates() {
  return (
    <OnboardingForm
      step="6 of 7"
      title="Certificates and licences"
      description="Add the certificates that back up your work, like CPR, first aid or a trade licence."
      next="/onboarding/review-profile"
      fileUpload
    />
  );
}
