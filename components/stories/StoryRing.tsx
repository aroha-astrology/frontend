import type { ReactNode } from "react";

/** Saffron through gold to rose and back: the "there's something new" ring. */
const UNSEEN_RING = "conic-gradient(from 0deg, #FF8A3D, #F4D675, #FF5E8A, #C86BFF, #FF8A3D)";
/** Keeps only the outer 3px of the ring's layer. */
const BAND = "radial-gradient(closest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))";
/** The ring's colours as a glow. A shadow is only ever drawn outside its own circle. */
const HALO = "-5px 3px 14px rgba(255,94,138,0.6), 5px -3px 14px rgba(255,138,61,0.55), 0 5px 14px rgba(200,107,255,0.45)";

/**
 * The story ring around the Home avatar. While any of today's stories is
 * unseen it is a slowly turning gradient with a breathing halo; once they've
 * all been opened it settles into a thin, quiet gold line. The motion lives
 * in app/globals.css and stops for readers who prefer none.
 *
 * Neither layer has anything to draw where the avatar is: the ring is cut
 * down to a band and the halo is a shadow. Some phones draw the turning layer
 * over the avatar, and a filled circle there hid the initials.
 */
export default function StoryRing({ unseen, children }: { unseen: boolean; children: ReactNode }) {
  return (
    <span
      className="relative isolate inline-flex shrink-0 items-center justify-center rounded-full p-[3px]"
      data-testid="story-ring"
      data-unseen={unseen ? "true" : "false"}
    >
      {unseen && (
        <span
          aria-hidden
          className="animate-story-ring-halo absolute inset-0 rounded-full opacity-60"
          style={{ boxShadow: HALO }}
        />
      )}
      <span
        aria-hidden
        className={`absolute inset-0 rounded-full ${unseen ? "animate-story-ring-spin" : ""}`}
        style={{
          background: unseen ? UNSEEN_RING : "rgba(212,175,55,0.35)",
          WebkitMaskImage: BAND,
          maskImage: BAND,
        }}
      />
      {/* The gap between ring and avatar, in the page's own colour. */}
      <span className="relative z-10 rounded-full bg-background p-[2px]">{children}</span>
    </span>
  );
}
