import { diffWords, sideParts } from "../../utils/resumeDiff";

/** "experience.0.bullets.2" -> "Peel Home Care, point 3". */
function changeLabel(path, original) {
  if (path === "summary") return "Summary";
  if (path === "skills") return "Skills";
  const match = /^experience\.(\d+)\.bullets\.(\d+)$/.exec(path || "");
  if (!match) return path;
  const entry = original?.content?.experience?.[Number(match[1])];
  const where = entry?.company || entry?.position || `Job ${Number(match[1]) + 1}`;
  return `${where}, point ${Number(match[2]) + 1}`;
}

function Words({ parts }) {
  return parts.map((part, index) => {
    const text = `${index ? " " : ""}${part.text}`;
    if (part.type === "added") return <mark className="tailor-word-added" key={index}>{text}</mark>;
    if (part.type === "removed") return <del className="tailor-word-removed" key={index}>{text}</del>;
    return <span key={index}>{text}</span>;
  });
}

/** Side by side view of each change: what was there and what it says now. */
export default function TailorDiff({ changes, original }) {
  if (!changes?.length) {
    return <p className="tailor-empty">Nothing needed changing. Your resume already uses the job ad’s words.</p>;
  }

  return <ol className="tailor-diff" aria-label="Changes">
    {changes.map((change) => {
      const parts = diffWords(change.before, change.after);
      return <li className="tailor-diff-row" key={change.path}>
        <div className="tailor-diff-head">
          <strong>{changeLabel(change.path, original)}</strong>
          {change.reason && <span>{change.reason}</span>}
        </div>
        <div className="tailor-diff-sides">
          <div className="tailor-diff-side before">
            <span className="tailor-diff-side-label">Before</span>
            <p><Words parts={sideParts(parts, "before")} /></p>
          </div>
          <div className="tailor-diff-side after">
            <span className="tailor-diff-side-label">After</span>
            <p><Words parts={sideParts(parts, "after")} /></p>
          </div>
        </div>
      </li>;
    })}
  </ol>;
}
