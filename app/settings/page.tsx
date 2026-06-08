"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import AppHeader from "@/components/AppHeader";

const languages = ["English", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi"];

const notificationItems = [
  {
    title: "Daily Horoscope",
    description: "Get your daily cosmic reading each morning",
    defaultOn: true,
  },
  {
    title: "Cosmic Events",
    description: "Eclipse, retrograde, and planetary alerts",
    defaultOn: true,
  },
  {
    title: "AI Insights",
    description: "Weekly AI-powered predictions for you",
    defaultOn: false,
  },
];

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <div
      className="relative flex-shrink-0 rounded-full transition-colors"
      style={{
        width: "40px",
        height: "22px",
        background: on ? "var(--gold)" : "rgba(156,163,175,0.3)",
      }}
    >
      <div
        className="absolute top-0.5 rounded-full transition-transform"
        style={{
          width: "18px",
          height: "18px",
          background: "#fff",
          transform: on ? "translateX(20px)" : "translateX(2px)",
        }}
      />
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden mb-4"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-display text-xs font-semibold tracking-widest uppercase mb-2 px-1"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </h2>
  );
}

export default function SettingsPage() {
  return (
    <motion.main
      className="min-h-screen pb-28"
      style={{ background: "var(--background)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AppHeader />

      <div className="pt-14 px-4">
        {/* Page heading */}
        <div className="py-6">
          <h1 className="font-display text-2xl font-semibold text-gold">
            Settings
          </h1>
        </div>

        {/* ─── Notifications ─── */}
        <SectionTitle>Notifications</SectionTitle>
        <SectionCard>
          {notificationItems.map((item, index) => (
            <div
              key={item.title}
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderBottom:
                  index < notificationItems.length - 1
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              <div className="flex-1 mr-3">
                <p className="text-sm font-medium text-white mb-0.5">
                  {item.title}
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {item.description}
                </p>
              </div>
              <ToggleSwitch on={item.defaultOn} />
            </div>
          ))}
        </SectionCard>

        {/* ─── Language ─── */}
        <SectionTitle>Language</SectionTitle>
        <SectionCard>
          <div className="px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {languages.map((lang) => {
                const isActive = lang === "English";
                return (
                  <span
                    key={lang}
                    className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium cursor-pointer"
                    style={{
                      background: isActive
                        ? "var(--gold)"
                        : "rgba(212,175,55,0.1)",
                      color: isActive ? "#05060A" : "var(--gold)",
                      border: isActive
                        ? "1px solid var(--gold)"
                        : "1px solid var(--border)",
                    }}
                  >
                    {lang}
                  </span>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* ─── Birth Data ─── */}
        <SectionTitle>Birth Data</SectionTitle>
        <SectionCard>
          <div className="px-4 py-5 text-center">
            <p className="text-sm font-medium text-white mb-1">
              Birth Details Not Set
            </p>
            <p
              className="text-[11px] mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Add your birth data for personalized readings
            </p>
            <button
              className="rounded-full px-5 py-2 text-xs font-semibold transition-colors"
              style={{
                border: "1px solid var(--gold)",
                color: "var(--gold)",
                background: "transparent",
              }}
            >
              Add Details
            </button>
          </div>
        </SectionCard>

        {/* ─── Account ─── */}
        <SectionTitle>Account</SectionTitle>
        <SectionCard>
          {["Privacy Policy", "Terms of Service"].map((item, index) => (
            <div
              key={item}
              className="flex items-center justify-between px-4 py-3 cursor-pointer"
              style={{
                borderBottom: index === 0 ? "1px solid var(--border)" : "none",
              }}
            >
              <span className="text-sm text-white">{item}</span>
              <ChevronRight
                size={16}
                style={{ color: "var(--text-muted)" }}
              />
            </div>
          ))}
        </SectionCard>

        {/* ─── Premium CTA ─── */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background:
              "linear-gradient(135deg, #7c5c1a 0%, #D4AF37 50%, #a07820 100%)",
          }}
        >
          <h3
            className="font-display text-lg font-semibold mb-1"
            style={{ color: "#05060A" }}
          >
            Unlock Full Cosmic Potential
          </h3>
          <p className="text-xs mb-4" style={{ color: "rgba(5,6,10,0.75)" }}>
            Get AI predictions, compatibility reports, and more
          </p>
          <button
            className="rounded-full px-5 py-2 text-xs font-bold"
            style={{
              background: "#05060A",
              color: "var(--gold)",
            }}
          >
            Go Premium ✨
          </button>
        </div>
      </div>
    </motion.main>
  );
}
