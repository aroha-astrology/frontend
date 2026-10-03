/**
 * Yogi Baba's portrait, used wherever the astrologer speaks (chat bubbles,
 * the chat header, the voice call, the onboarding guide). `size` is in px;
 * the source is a 256px crop of public/sage.png, so it stays sharp up to 128.
 */
export default function YogiBabaAvatar({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a fixed 256px asset in /public; nothing for next/image to optimise
    <img
      src="/yogi-baba.webp"
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 rounded-full object-cover border border-gold/40 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
