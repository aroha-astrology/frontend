"use client";

import { useTranslation } from "react-i18next";
import type { BookChart } from "@/lib/report-book";
import { SCORE_FACT_LABEL_KEYS } from "@/lib/report-score-facts";

/**
 * The book's graphs, drawn as plain SVG in the book's own palette (navy page, gold ink) so they
 * read the same in the app's light and dark themes. Every chart is built from data the report
 * already carries (see buildBookCharts); the page around it supplies the title.
 */

const GOLD = "#dfb564";
const GOLD_LIGHT = "#fbe09b";
const ROSE = "#c99a8b";
const SLATE = "#6e7aa8";
const GRID = "rgba(223,181,100,0.28)";
const INK = "#f3ecd9";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function monthYear(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 7) : d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function Radar({ points }: { points: Extract<BookChart, { type: "radar" }>["points"] }) {
  const { t } = useTranslation();
  const n = points.length;
  const cx = 130;
  const cy = 120;
  const r = 76;
  const at = (i: number, frac: number): [number, number] => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r * frac, cy + Math.sin(a) * r * frac];
  };
  const ring = (frac: number) => points.map((_, i) => at(i, frac).join(",")).join(" ");
  const shape = points.map((p, i) => at(i, p.pct / 100).join(",")).join(" ");
  return (
    <svg viewBox="0 0 260 240" role="img" className="w-full" data-testid="book-chart-radar">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke={GRID} strokeWidth={0.8} />
      ))}
      {points.map((_, i) => {
        const [x, y] = at(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={GRID} strokeWidth={0.8} />;
      })}
      <polygon points={shape} fill="rgba(223,181,100,0.28)" stroke={GOLD} strokeWidth={1.8} strokeLinejoin="round" />
      {points.map((p, i) => {
        const [x, y] = at(i, p.pct / 100);
        const [lx, ly] = at(i, 1.2);
        const labelKey = SCORE_FACT_LABEL_KEYS[p.key];
        const label = clip(labelKey ? t(labelKey, p.label) : p.label, 16);
        const anchor = lx < cx - 8 ? "end" : lx > cx + 8 ? "start" : "middle";
        return (
          <g key={p.key}>
            <circle cx={x} cy={y} r={2.6} fill={GOLD_LIGHT} />
            <text x={lx} y={ly} fill={INK} fontSize={8.5} textAnchor={anchor} dominantBaseline="middle">
              {label}
            </text>
            <text x={lx} y={ly + 9} fill={GOLD} fontSize={8} fontWeight={700} textAnchor={anchor} dominantBaseline="middle">
              {Math.round(p.pct)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Bars({ bars }: { bars: Extract<BookChart, { type: "bars" }>["bars"] }) {
  const row = 34;
  return (
    <svg viewBox={`0 0 260 ${bars.length * row + 6}`} role="img" className="w-full" data-testid="book-chart-bars">
      {bars.map((b, i) => {
        const y = i * row + 4;
        const w = (b.pct / 100) * 142;
        return (
          <g key={b.label}>
            <text x={0} y={y + 13} fill={INK} fontSize={11.5} dominantBaseline="middle">
              {clip(b.label, 11)}
            </text>
            <rect x={68} y={y + 6} width={142} height={14} rx={7} fill="rgba(223,181,100,0.14)" />
            <rect x={68} y={y + 6} width={Math.max(4, w)} height={14} rx={7} fill={b.pct >= 100 ? GOLD_LIGHT : GOLD} />
            <text x={258} y={y + 13} fill={GOLD} fontSize={11} fontWeight={700} textAnchor="end" dominantBaseline="middle">
              {Math.round(b.pct)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const LEVEL_FILL = { HIGH: GOLD_LIGHT, MEDIUM: ROSE, LOW: SLATE } as const;

function Windows({ windows }: { windows: Extract<BookChart, { type: "windows" }>["windows"] }) {
  const { t } = useTranslation();
  const t0 = Math.min(...windows.map((w) => new Date(w.start).getTime()));
  const t1 = Math.max(...windows.map((w) => new Date(w.end).getTime()));
  const span = Math.max(1, t1 - t0);
  const x = (iso: string) => 10 + ((new Date(iso).getTime() - t0) / span) * 240;
  const row = 44;
  const axisY = windows.length * row + 6;
  return (
    <svg viewBox={`0 0 260 ${axisY + 46}`} role="img" className="w-full" data-testid="book-chart-windows">
      {windows.map((w, i) => {
        const y = i * row + 6;
        const x0 = x(w.start);
        const width = Math.max(10, x(w.end) - x0);
        const mid = Math.max(50, Math.min(210, x0 + width / 2));
        return (
          <g key={`${w.start}-${i}`}>
            <rect x={x0} y={y} width={width} height={16} rx={8} fill={LEVEL_FILL[w.level]} opacity={0.95} />
            <text x={mid} y={y + 29} fill={INK} fontSize={9.5} textAnchor="middle">
              {monthYear(w.start)} – {monthYear(w.end)}
            </text>
          </g>
        );
      })}
      <line x1={10} y1={axisY} x2={250} y2={axisY} stroke={GRID} />
      <text x={10} y={axisY + 14} fill={GOLD} fontSize={9}>
        {monthYear(new Date(t0).toISOString())}
      </text>
      <text x={250} y={axisY + 14} fill={GOLD} fontSize={9} textAnchor="end">
        {monthYear(new Date(t1).toISOString())}
      </text>
      {(["HIGH", "MEDIUM", "LOW"] as const).map((lv, i) => (
        <g key={lv} transform={`translate(${52 + i * 66},${axisY + 34})`}>
          <circle r={4} fill={LEVEL_FILL[lv]} />
          <text x={8} fill={INK} fontSize={9} dominantBaseline="middle">
            {t(`reports.book.level.${lv}`, lv.toLowerCase())}
          </text>
        </g>
      ))}
    </svg>
  );
}

const TONE_FILL = { challenging: SLATE, mixed: ROSE, favorable: GOLD_LIGHT } as const;

function Arc({ points }: { points: Extract<BookChart, { type: "arc" }>["points"] }) {
  const scores = points.map((p) => p.score);
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  const range = hi - lo || 1;
  const w = 240;
  const x = (i: number) => 10 + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (s: number) => 100 - ((s - lo) / range) * 80;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.score)}`).join(" ");
  return (
    <svg viewBox="0 0 260 150" role="img" className="w-full" data-testid="book-chart-arc">
      {[20, 60, 100].map((gy) => (
        <line key={gy} x1={10} y1={gy} x2={250} y2={gy} stroke={GRID} strokeDasharray="2 3" />
      ))}
      <path d={`${d} L${x(points.length - 1)},108 L${x(0)},108 Z`} fill="rgba(223,181,100,0.14)" />
      <path d={d} fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={`${p.label}-${i}`}>
          <circle cx={x(i)} cy={y(p.score)} r={3.4} fill={TONE_FILL[p.tone]} stroke="#0f1633" strokeWidth={1} />
          <text x={x(i)} y={122 + (i % 2) * 11} fill={INK} fontSize={6.8} textAnchor="middle">
            {clip(p.label, 13)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function BookChartView({ chart }: { chart: BookChart }) {
  switch (chart.type) {
    case "radar":
      return <Radar points={chart.points} />;
    case "bars":
      return <Bars bars={chart.bars} />;
    case "windows":
      return <Windows windows={chart.windows} />;
    case "arc":
      return <Arc points={chart.points} />;
  }
}
