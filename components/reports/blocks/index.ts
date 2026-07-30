/**
 * Reusable "editorial" presentation primitives for report content — see each
 * component's own doc comment for the specific existing-convention it reuses.
 * All presentation-only: no data fetching, no report-specific business logic,
 * no i18n calls (callers pass already-resolved/translated strings), matching
 * the precedent set by AgeBandTable.tsx / ArchetypeCard.tsx / DecadeArcCard.tsx
 * / DoshaYogaPanel.tsx / TimingWindowsCard.tsx in ../.
 */

export { default as ChapterCard, resolveChapterAccent } from "./ChapterCard";
export type { ChapterCardProps } from "./ChapterCard";

export { default as Callout } from "./Callout";
export type { CalloutProps } from "./Callout";

export { default as FactCard } from "./FactCard";
export type { FactCardProps } from "./FactCard";

export { default as Checklist, normalizeChecklistItems } from "./Checklist";
export type { ChecklistItem, ChecklistProps } from "./Checklist";

export { default as PeriodBlock, PERIOD_TONE_STYLES } from "./PeriodBlock";
export type { PeriodTone, PeriodBlockProps } from "./PeriodBlock";

export { default as VerdictRow } from "./VerdictRow";
export type { VerdictRowProps } from "./VerdictRow";

export { default as Colophon } from "./Colophon";
export type { ColophonProps } from "./Colophon";
