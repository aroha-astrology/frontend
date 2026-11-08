"use client";

import { createContext, useContext } from "react";

/**
 * The calendar year the report reads (2027 for a purchase; another for the owner's accuracy test). The labels written in
 * the bundle say 2027, so they are moved to the report's year here, and date positions on the charts follow it.
 */
export const ReportYearContext = createContext<number>(2027);

export const withYear = (s: string, year: number): string => (year === 2027 ? s : s.replace(/\b(2026|2027|2028)\b/g, (m) => String(year + Number(m) - 2027)));

export function useReportYear(): number {
  return useContext(ReportYearContext);
}

/** Moves a bundle label such as "Sky calendar 2027" to the report's year. */
export function useY(): (s: string) => string {
  const year = useContext(ReportYearContext);
  return (s) => withYear(s, year);
}
