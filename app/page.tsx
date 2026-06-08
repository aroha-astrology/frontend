import Hero from "@/components/Hero";
import ZodiacWheel from "@/components/ZodiacWheel";
import HoroscopeSlider from "@/components/HoroscopeSlider";
import AIChatPreview from "@/components/AIChatPreview";
import SectionTitle from "@/components/SectionTitle";
import MoonBackground from "@/components/MoonBackground";
import ParticleBackground from "@/components/ParticleBackground";
import SplashScreen from "@/components/SplashScreen";
import ThemeSwitch from "@/components/ThemeSwitch";

export default function HomePage() {
  return (
    <main className="min-h-screen pb-28 relative">
      <ParticleBackground />
      <MoonBackground />
      <SplashScreen />

      {/* Top bar */}
      <div className="flex justify-end px-5 pt-4">
        <ThemeSwitch />
      </div>

      {/* Hero */}
      <Hero />

      {/* Zodiac Wheel */}
      <div className="px-5 mt-2">
        <SectionTitle title="✨ Cosmic Wheel" subtitle="Tap a sign for your reading below" />
        <ZodiacWheel />
      </div>

      {/* Daily Horoscopes */}
      <div className="px-5 mt-8">
        <SectionTitle title="🌟 Daily Horoscopes" subtitle="Your star sign speaks today" />
        <HoroscopeSlider />
      </div>

      {/* AI Chat Preview */}
      <div className="px-5 mt-8">
        <SectionTitle title="🔮 AI Astrologer" subtitle="Ask anything about your destiny" />
        <AIChatPreview />
      </div>

      {/* Feature cards */}
      <div className="px-5 mt-8 grid grid-cols-2 gap-4 mb-4">
        {[
          { emoji: "📜", title: "Kundli", desc: "Generate your birth chart", href: "/kundli" },
          { emoji: "❤️", title: "Compatibility", desc: "Kundli matching", href: "/compatibility" },
          { emoji: "🪔", title: "Remedies", desc: "Vedic remedies", href: "/remedies" },
          { emoji: "📖", title: "Onboarding", desc: "Learn how it works", href: "/onboarding" },
        ].map((card) => (
          <a
            key={card.title}
            href={card.href}
            className="rounded-3xl p-4 border transition-colors hover:border-yellow-500/40"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="text-3xl mb-2">{card.emoji}</div>
            <h3 className="font-semibold text-sm text-gold">{card.title}</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{card.desc}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
