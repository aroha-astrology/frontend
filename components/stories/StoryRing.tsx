import type { ReactNode } from "react";

/** Saffron through gold to rose and back: the "there's something new" ring. */
const UNSEEN_RING = "conic-gradient(from 0deg, #FF8A3D, #F4D675, #FF5E8A, #C86BFF, #FF8A3D)";

/**
 * The story ring around the Home avatar. While any of today's stories is
 * unseen it is a slowly turning gradient with a breathing halo; once they've
 * all been opened it settles into a thin, quiet gold line. The motion lives
 * in app/globals.css and stops for readers who prefer none.
 */
export default function StoryRing({ unseen, children }: { unseen: boolean; children: ReactNode }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full p-[3px]"
      data-testid="story-ring"
      data-unseen={unseen ? "true" : "false"}
    >
      {unseen && (
        <span
          aria-hidden
          className="animate-story-ring-halo absolute -inset-1.5 rounded-full opacity-60 blur-md"
          style={{ background: UNSEEN_RING }}
        />
      )}
      <span
        aria-hidden
        className={`absolute inset-0 rounded-full ${unseen ? "animate-story-ring-spin" : ""}`}
        style={{ background: unseen ? UNSEEN_RING : "rgba(212,175,55,0.35)" }}
      />
      {/* The gap between ring and avatar, in the page's own colour. */}
      <span className="relative rounded-full bg-background p-[2px]">{children}</span>
    </span>
  );
}
