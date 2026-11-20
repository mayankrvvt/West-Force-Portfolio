import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

const questions = [
  {
    q: "What goes into my portfolio?",
    a: "Your resume, a short intro video, your TestGorilla skills report, certificates and your work history. Each has its own section, and you can add or update any of them later.",
  },
  {
    q: "Who can see my documents?",
    a: "Anyone with your link sees your name, role and summary. Your resume, certificates and other documents stay locked until someone enters the PIN you gave them.",
  },
  {
    q: "Do I need a video before I start?",
    a: (
      <>
        No. Start with your resume and add the video when it is ready. Both
        plans include video resume coaching, and our{" "}
        <Link to="/video-resume-guide">video resume guide</Link> walks you
        through planning and recording one.
      </>
    ),
  },
  {
    q: "Is there a monthly fee?",
    a: "No. You pay once, in Canadian dollars. Solo is $999 CAD. Group of 5 is $3,495 CAD, which works out to $699 per person.",
  },
  {
    q: "How does the Group of 5 plan work?",
    a: "One payment of $3,495 CAD covers five people. Each person gets their own portfolio and link, and the group shares coaching sessions.",
  },
  {
    q: "Will WestForce find me a job?",
    a: "We introduce you to employers hiring for roles that fit your experience, and your coach helps with applications and interviews. The hiring decision is always the employer’s, so no one can promise you an offer.",
  },
  {
    q: "Can I change my portfolio after I share the link?",
    a: "Yes. Your link stays the same, so employers always see your latest resume, video and certificates.",
  },
];

/*
 * Plain questions and answers (native details/summary, so it works with the
 * keyboard and without JS). The plus turns into a cross when an answer opens.
 */
export default function FAQ() {
  return (
    <section id="faq" className="home-section" aria-labelledby="faq-title">
      <div className="container home-split faq">
        <div className="home-section-head faq-head">
          <p className="home-kicker">Questions</p>

          <h2 id="faq-title">Before you sign up</h2>

          <p>
            Straight answers on privacy, pricing and what WestForce
            can and cannot do for you.
          </p>
        </div>

        <div className="faq-list">
          {questions.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>
                <span>{item.q}</span>
                <Plus className="faq-icon" size={18} strokeWidth={2} aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
