"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { adminApi, type AdminStoryStats } from "@/lib/admin-api";
import { formatShares } from "@/lib/stories/admin-format";
import type { AdminRangeValue } from "./DateRangePicker";

const STORY_NAMES: Record<string, string> = {
  panchang: "Panchang",
  hora: "Hora",
  deity: "Today's Deity",
  gita: "Gita",
};

/**
 * Admin overview: Daily Stories (the story ring on the Home avatar) for the
 * date range chosen at the top of the page. How many people opened the
 * stories, how many share taps there were and where they went, and the same
 * per story. Quietly absent on a backend that doesn't have the endpoint yet.
 */
export default function StoryStatsCard({ range, canFetch }: { range: AdminRangeValue; canFetch: boolean }) {
  const [stats, setStats] = useState<AdminStoryStats | null>(null);

  useEffect(() => {
    if (!canFetch) return;
    let cancelled = false;
    adminApi
      .storyStats({ preset: range.preset, from: range.from || undefined, to: range.to || undefined })
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [range.preset, range.from, range.to, canFetch]);

  if (!stats) return null;

  return (
    <section className="mb-8" data-testid="admin-story-stats">
      <h2 className="text-sm font-semibold text-foreground mb-3">Daily Stories</h2>
      <Card className="p-4">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <dt className="text-[11px] text-muted uppercase tracking-wide">Visitors</dt>
            <dd className="text-lg font-semibold text-foreground" data-testid="story-stats-visitors">
              {stats.visitors}
            </dd>
            <dd className="text-[11px] text-muted">people who opened a story</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted uppercase tracking-wide">Story views</dt>
            <dd className="text-lg font-semibold text-foreground">{stats.views}</dd>
            <dd className="text-[11px] text-muted">each story once per person per day</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[11px] text-muted uppercase tracking-wide">Share clicks</dt>
            <dd className="text-lg font-semibold text-foreground" data-testid="story-stats-shares">
              {formatShares(stats.shares, stats.shareChannels)}
            </dd>
            <dd className="text-[11px] text-muted">
              by {stats.sharers} {stats.sharers === 1 ? "person" : "people"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-muted uppercase tracking-wide">
                <th className="py-1.5 pr-4 font-medium">Story</th>
                <th className="py-1.5 pr-4 font-medium">Viewers</th>
                <th className="py-1.5 font-medium">Share clicks</th>
              </tr>
            </thead>
            <tbody>
              {stats.stories.map((story) => (
                <tr key={story.storyId} className="border-t border-gold/10" data-testid={`story-stats-row-${story.storyId}`}>
                  <td className="py-1.5 pr-4 text-foreground">{STORY_NAMES[story.storyId] ?? story.storyId}</td>
                  <td className="py-1.5 pr-4 text-foreground">{story.viewers}</td>
                  <td className="py-1.5 text-foreground">{formatShares(story.shares, story.shareChannels)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-muted">
          For the date range chosen above. A share click is a tap on a place in the share sheet (WhatsApp, Instagram and
          so on); it does not tell us the post was finished there.
        </p>
      </Card>
    </section>
  );
}
