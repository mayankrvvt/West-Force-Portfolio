import { Link } from "react-router-dom";
import { Award, BriefcaseBusiness, FileText, PlayCircle } from "lucide-react";
import { OnboardingShell } from "../../components/common/OnboardingForm";

const WHAT_YOU_ADD = [
  { icon: FileText, title: "Your resume", detail: "Upload the one you already have." },
  { icon: BriefcaseBusiness, title: "Work history", detail: "Your recent jobs, in a line or two each." },
  { icon: Award, title: "Certificates", detail: "Kept behind a PIN that you share." },
  { icon: PlayCircle, title: "Intro video", detail: "Optional, a minute is plenty." },
];

export default function Welcome() {
  return (
    <OnboardingShell
      exitTo={null}
      title="Let's build your portfolio"
      description="One link for employers with everything they ask for. It takes about ten minutes, and you can skip anything and come back later."
    >
      <ul className="ob-welcome-list">
        {WHAT_YOU_ADD.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title}>
              <span className="ob-welcome-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="ob-welcome-text">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="ob-welcome-actions">
        <Link to="/onboarding/create-portfolio" className="btn btn-primary btn-lg">
          Start building
        </Link>
        <Link to="/dashboard" className="ob-skip">
          I'll do this later
        </Link>
      </div>
    </OnboardingShell>
  );
}
