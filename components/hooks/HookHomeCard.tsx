"use client";

import Link from "next/link";
import { BedDouble, ClockArrowUp, Flame, MessageCircleHeart, Receipt, ScrollText, ShieldHalf, Sparkles } from "lucide-react";
import Card from "@/components/ui/Card";
import { useHookView } from "@/hooks/useHookView";
import { useNewFeature } from "@/hooks/useFeature";
import { hookMeta, inMinutes } from "@/lib/hooks-copy";
import type {
  DiyaView,
  HookKey,
  KavachView,
  MysteryView,
  RahasyaView,
  ReceiptsView,
  ShubhLabhView,
  SleepView,
} from "@/lib/hooks-types";

/**
 * The Home cards of the eight daily-return hooks (switches hooks.*, all off at first). Each shows one
 * line from the same answer its page uses, and opens the page. The card is hidden while the switch
 * is off, while loading and when the answer fails, so a Home that is not using hooks looks as before.
 */
function Shell({ hook, icon, line, sub }: { hook: HookKey; icon: React.ReactNode; line: string; sub?: string }) {
  const meta = hookMeta(hook);
  return (
    <Link href={`/hooks/${meta.slug}`} className="block" data-testid={`hook-card-${meta.slug}`}>
      <Card className="p-5 border-gold/25">
        <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gold">
          {icon}
          {meta.title}
        </p>
        <p className="text-base font-semibold text-foreground">{line}</p>
        {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      </Card>
    </Link>
  );
}

export function RahasyaHomeCard() {
  const meta = hookMeta("kundliRahasya");
  const { enabled, data } = useHookView<RahasyaView>(meta.feature, meta.path);
  if (!enabled || !data) return null;
  return (
    <Shell
      hook="kundliRahasya"
      icon={<ScrollText size={14} />}
      line={`${data.openCount} of 17 scrolls open`}
      sub={data.next ? `The next opens at ${data.next.opensAtLocal}` : "Every scroll is open"}
    />
  );
}

export function ShubhLabhHomeCard() {
  const meta = hookMeta("shubhLabh");
  const { enabled, data } = useHookView<ShubhLabhView>(meta.feature, meta.path);
  if (!enabled || !data) return null;
  const now = data.now;
  const line = now?.window
    ? `Now: ${now.window.color}`
    : data.best
      ? `Best window ${data.best.start} to ${data.best.end}`
      : "No green window today";
  const sub = now?.nextGreen ? `Next green ${inMinutes(now.nextGreen.inMin)}, score ${now.nextGreen.score}` : undefined;
  return <Shell hook="shubhLabh" icon={<ClockArrowUp size={14} />} line={line} sub={sub} />;
}

export function KavachHomeCard() {
  const meta = hookMeta("gharKavach");
  const { enabled, data } = useHookView<KavachView>(meta.feature, meta.path);
  if (!enabled || !data || data.state === "empty") return null;
  return (
    <Shell
      hook="gharKavach"
      icon={<ShieldHalf size={14} />}
      line={data.state === "done" ? "Today's chant is done" : `Chant for ${data.today?.name ?? ""} today`}
      sub={`${data.streak} ${data.streak === 1 ? "day" : "days"} in a row`}
    />
  );
}

export function DiyaHomeCard() {
  const meta = hookMeta("sankalpDiya");
  const { enabled, data } = useHookView<DiyaView>(meta.feature, meta.path);
  if (!enabled || !data) return null;
  const line = data.lit
    ? "Your diya is lit"
    : data.state === "open"
      ? "The window is open. Light your diya"
      : data.state === "before"
        ? `Opens ${data.opensInMin !== null ? inMinutes(data.opensInMin) : "later"}`
        : "Today's window has passed";
  return <Shell hook="sankalpDiya" icon={<Flame size={14} />} line={line} sub={`${data.window.start} to ${data.window.end}`} />;
}

export function ReceiptsHomeCard() {
  const meta = hookMeta("cosmicReceipts");
  const { enabled, data } = useHookView<ReceiptsView>(meta.feature, meta.path);
  if (!enabled || !data) return null;
  const live = data.cards.find((c) => c.status === "live") ?? data.cards.find((c) => c.status === "upcoming") ?? data.cards[2]!;
  return (
    <Shell
      hook="cosmicReceipts"
      icon={<Receipt size={14} />}
      line={live.headline}
      sub={data.yesterdayCheck ? "A card from yesterday is waiting for your mark" : `${data.share.rated} of 3 marked today`}
    />
  );
}

/** Text timing needs a person picked first, so the card is a doorway and asks for nothing. */
export function TextHomeCard() {
  const { enabled } = useNewFeature("hooks.textTiming");
  if (!enabled) return null;
  return <Shell hook="textTiming" icon={<MessageCircleHeart size={14} />} line="Text them now?" sub="A timing suggestion for getting in touch" />;
}

export function SleepHomeCard() {
  const meta = hookMeta("sleepSync");
  const { enabled, data } = useHookView<SleepView>(meta.feature, meta.path);
  if (!enabled || !data) return null;
  return (
    <Shell
      hook="sleepSync"
      icon={<BedDouble size={14} />}
      line={data.logged ? `Last night: ${data.logged} of 5` : "How did you sleep?"}
      sub={`The Moon was in ${data.lastNight.nakshatra}`}
    />
  );
}

export function MysteryHomeCard() {
  const meta = hookMeta("mysteryDrop");
  const { enabled, data } = useHookView<MysteryView>(meta.feature, meta.path);
  if (!enabled || !data || data.state === "empty") return null;
  return (
    <Shell
      hook="mysteryDrop"
      icon={<Sparkles size={14} />}
      line={data.state === "waiting" ? "Tonight's card appears at 6 PM" : data.cards.some((c) => !c.scratched) ? "Your mystery card is ready" : "Today's card is revealed"}
      sub={data.state === "waiting" && data.opensInMin !== null ? inMinutes(data.opensInMin) : undefined}
    />
  );
}
