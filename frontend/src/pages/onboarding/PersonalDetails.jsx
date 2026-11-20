import OnboardingForm from "../../components/common/OnboardingForm";

export default function PersonalDetails() {
  return (
    <OnboardingForm
      step="1 of 7"
      title="Personal details"
      description="The basics employers see first. You can change any of this later."
      next="/onboarding/documents"
      fields={[
        ["fullName", "Full name", "text", { autoComplete: "name" }],
        [
          "headline",
          "Professional headline",
          "text",
          {
            placeholder: "Personal support worker",
            hint: "Your job title or the role you want next.",
          },
        ],
        [
          "location",
          "City and province",
          "text",
          { placeholder: "Brampton, ON", autoComplete: "address-level2" },
        ],
        [
          "phone",
          "Phone number",
          "tel",
          {
            placeholder: "416 555 0123",
            autoComplete: "tel",
            optional: true,
            hint: "Optional. Only shown if you choose to share it.",
          },
        ],
      ]}
    />
  );
}
