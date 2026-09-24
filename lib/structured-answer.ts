/**
 * Ask Aroha 2.0 replies (chat.structuredAnswers) arrive as marker lines:
 *   FACTOR: <title> | <detail>   (×3)
 *   MEANING: <text>
 *   TIMELINE: <text>
 *   Ask next: a | b            (handled by the chat's own chip parser)
 * The markers stay English in every language (backend OUTPUT_STYLE_STRUCTURED).
 * The parser works on a half-received stream too, so cards fill in live.
 */
export interface StructuredAnswer {
  factors: Array<{ title: string; detail: string }>;
  meaning: string;
  timeline: string;
}

const MARKER = /^\s*(FACTOR|MEANING|TIMELINE)\s*:\s*(.*)$/i;

/** True once the text has started using the card format (so a prose reply keeps its old rendering). */
export function isStructuredAnswer(text: string): boolean {
  return /^\s*(FACTOR|MEANING)\s*:/im.test(text);
}

export function parseStructuredAnswer(text: string): StructuredAnswer {
  const out: StructuredAnswer = { factors: [], meaning: "", timeline: "" };
  let last: "meaning" | "timeline" | null = null;
  for (const raw of text.split("\n")) {
    if (/^\s*ask next\s*:/i.test(raw)) {
      last = null;
      continue;
    }
    const m = raw.match(MARKER);
    if (m) {
      const kind = m[1]!.toUpperCase();
      const body = m[2]!.trim();
      if (kind === "FACTOR") {
        const [title, ...rest] = body.split("|");
        out.factors.push({ title: (title ?? "").trim(), detail: rest.join("|").trim() });
        last = null;
      } else if (kind === "MEANING") {
        out.meaning = body;
        last = "meaning";
      } else {
        out.timeline = body;
        last = "timeline";
      }
    } else if (last && raw.trim()) {
      // A model occasionally wraps a MEANING/TIMELINE paragraph onto a second line.
      out[last] = `${out[last]} ${raw.trim()}`.trim();
    }
  }
  return out;
}

function factorLine(f: { title: string; detail: string }): string {
  return f.detail ? `${f.title}: ${f.detail}` : f.title;
}

/** The answer as plain sentences for text-to-speech: no markers, no "|", meaning first. */
export function structuredToSpeech(text: string): string {
  const a = parseStructuredAnswer(text);
  return [a.meaning, ...a.factors.map(factorLine), a.timeline].filter(Boolean).join(" ");
}

/** The answer as readable text for copy and share: meaning, then one bullet per factor, then timing. */
export function structuredToPlainText(text: string): string {
  const a = parseStructuredAnswer(text);
  const bullets = a.factors.map((f) => `• ${factorLine(f)}`).join("\n");
  return [a.meaning, bullets, a.timeline].filter(Boolean).join("\n\n");
}
