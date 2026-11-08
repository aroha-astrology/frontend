"use client";

import type { ReportSection } from "@/lib/reports-api";

const LATIN = /^[A-Za-z]/;

/** One section's words: optional heading, pull-quote hook, paragraphs, bullets. Drop cap for Latin scripts only. */
export default function Narrative({
  section,
  heading = false,
  dropCap = false,
  labels,
}: {
  section?: ReportSection;
  /** Show the section's own heading (the page title usually does this already). */
  heading?: boolean;
  dropCap?: boolean;
  /** Small labels above each paragraph, by index (used for the month "Living the month" page). */
  labels?: (string | undefined)[];
}) {
  if (!section) return null;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {heading ? <h3 className="vk-h3 m-0 break-words">{section.heading}</h3> : null}
      {section.hook ? <p className="vk-quote m-0 break-words">{section.hook}</p> : null}
      {section.paragraphs.map((p, i) => (
        <div key={i} className="flex min-w-0 flex-col gap-1">
          {labels?.[i] ? <span className="vk-eyebrow">{labels[i]}</span> : null}
          <p className={`vk-body m-0 break-words ${dropCap && i === 0 && LATIN.test(p) ? "vk-dropcap" : ""}`}>{p}</p>
        </div>
      ))}
      {section.bullets && section.bullets.length > 0 ? (
        <ul className="vk-body m-0 flex list-none flex-col gap-1.5 p-0">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 break-words">
              <span aria-hidden="true" style={{ color: "var(--gold)" }}>◆</span>
              <span className="min-w-0">{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
