/**
 * Yogi Baba's portrait, used wherever the astrologer speaks (chat bubbles,
 * the chat header, the voice call, the onboarding guide). `size` is in px;
 * the source is a 256px crop of public/sage.png, so it stays sharp up to 128.
 * `src` swaps in another guide's portrait (public/guides/*.webp, 384px), see guideAvatarSrc.
 */
export default function YogiBabaAvatar({
  size = 28,
  className = "",
  src = "/yogi-baba.webp",
}: {
  size?: number;
  className?: string;
  src?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a fixed small asset in /public; nothing for next/image to optimise
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 rounded-full object-cover border border-gold/40 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
