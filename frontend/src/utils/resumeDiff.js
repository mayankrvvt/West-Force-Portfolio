/**
 * Word diff for the tailor view. Returns parts in reading order:
 * { type: "same" | "added" | "removed", text }. Words are compared without
 * case or trailing punctuation, so "care," and "care" count as the same word.
 */

// Past this many word pairs the table gets slow; show a whole swap instead.
const MAX_CELLS = 250000;

const words = (text) => String(text || "").split(/\s+/).filter(Boolean);
const key = (word) => word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}+#]+$/gu, "");

export function diffWords(before, after) {
  const a = words(before);
  const b = words(after);

  if (!a.length && !b.length) return [];
  if (a.length * b.length > MAX_CELLS) {
    return [
      ...(a.length ? [{ type: "removed", text: a.join(" ") }] : []),
      ...(b.length ? [{ type: "added", text: b.join(" ") }] : []),
    ];
  }

  // Longest common subsequence table, filled from the end.
  const ka = a.map(key);
  const kb = b.map(key);
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = new Uint32Array(rows * cols);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * cols + j] = ka[i] === kb[j]
        ? table[(i + 1) * cols + j + 1] + 1
        : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1]);
    }
  }

  const parts = [];
  const push = (type, text) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += ` ${text}`;
    else parts.push({ type, text });
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (ka[i] === kb[j]) {
      push("same", b[j]);
      i += 1;
      j += 1;
    } else if (table[(i + 1) * cols + j] >= table[i * cols + j + 1]) {
      push("removed", a[i]);
      i += 1;
    } else {
      push("added", b[j]);
      j += 1;
    }
  }
  while (i < a.length) push("removed", a[i++]);
  while (j < b.length) push("added", b[j++]);

  return parts;
}

/** Parts for one side: the "before" side drops added words, the "after" side drops removed ones. */
export function sideParts(parts, side) {
  const hidden = side === "before" ? "added" : "removed";
  return parts.filter((part) => part.type !== hidden);
}
