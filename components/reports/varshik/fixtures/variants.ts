import type { ReportReady } from "@/hooks/useReport";
import type { ReportSection } from "@/lib/reports-api";

/** DEV PREVIEW / TEST ONLY: shapes a fixture report for the PDF tests. */

const QUESTIONS: { heading: string; key: string }[] = [
  { heading: "Whether to change your job this year", key: "new_work" },
  { heading: "Moving to a new city", key: "move_home" },
  { heading: "When to start the business you have been planning", key: "start_business" },
  { heading: "Whether this is the year to get married", key: "marriage" },
  { heading: "How to repair the relationship with your brother", key: "family_repair" },
];

/** The same report with exactly `n` question pages (0-5). */
export function withQuestions(base: ReportReady, n: number): ReportReady {
  const sections = (base.sections as ReportSection[]).filter((s) => !s.id?.startsWith("question_"));
  const template = (base.sections as ReportSection[]).find((s) => s.id === "question_1");
  const para = template?.paragraphs ?? ["Placeholder."];
  for (let i = 0; i < n; i++) {
    const q = QUESTIONS[i]!;
    sections.push({
      id: `question_${i + 1}`,
      heading: q.heading,
      paragraphs: para,
      uiData: { key: q.key, windowFrom: "2027-09-10", windowTo: "2027-10-28", peak: "2027-10-02", tier: "dark_green", weak: false, next: { from: "2027-12-01", to: "2027-12-20" } },
    } as ReportSection);
  }
  return { ...base, sections } as ReportReady;
}

const INDIC: Record<string, string> = {
  hi: "यह अवधि साझेदारी, स्वभाव और ऊर्जा को छूती है, इसलिए शांत रहकर निर्णय लेना और अपने परिवार के साथ समय बिताना अच्छा रहेगा।",
  ta: "இந்தக் காலம் கூட்டாண்மை, மனநிலை மற்றும் சக்தியைத் தொடுகிறது, எனவே அமைதியாக முடிவெடுப்பது நல்லது, குடும்பத்துடன் நேரம் செலவிடுவதும் நல்லது.",
};

/** Replaces every paragraph with Indic text of the same length (about 1.15 x for Hindi, 1.3 x for Tamil, which wrap longer). */
export function inIndic(base: ReportReady, lang: string): ReportReady {
  const unit = INDIC[lang];
  if (!unit) return base;
  const grow = lang === "ta" ? 1.3 : 1.15;
  const make = (len: number) => {
    let out = "";
    while (out.length < len * grow) out += `${unit} `;
    return out.trim();
  };
  const sections = (base.sections as ReportSection[]).map((s) => ({
    ...s,
    paragraphs: s.paragraphs?.map((p) => make(p.length)),
  }));
  return { ...base, sections } as ReportReady;
}
