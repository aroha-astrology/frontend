"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Globe, Moon, ScrollText, ShieldCheck, LogOut, ChevronRight } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import LanguagePicker from "@/components/LanguagePicker";
import ThemeSwitch from "@/components/ThemeSwitch";
import { useAuth } from "@/providers/auth-provider";

function SettingsRow({
  icon,
  label,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-gold/15 bg-card">
      <span className="text-gold">{icon}</span>
      <span className="flex-1 text-sm text-foreground">{label}</span>
      {action}
    </div>
  );
}

function SettingsLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-gold/15 bg-card text-foreground hover:bg-gold/10 transition-colors group"
    >
      <span className="text-gold">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <ChevronRight size={14} className="text-muted group-hover:text-gold transition-colors" />
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted uppercase tracking-wider mb-2 ml-1">{children}</p>;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/sign-in");
    }
  };

  return (
    <main className="min-h-screen pb-tab-safe bg-background">
      <div className="px-5 pt-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground">{t("settings.title")}</h1>
        </div>

        {/* Preferences */}
        <SectionLabel>{t("settings.preferences")}</SectionLabel>
        <div className="space-y-2.5 mb-6">
          <SettingsRow icon={<Globe size={16} />} label={t("settings.language")} action={<LanguagePicker />} />
          <SettingsRow icon={<Moon size={16} />} label={t("settings.theme")} action={<ThemeSwitch />} />
        </div>

        {/* Legal */}
        <SectionLabel>{t("settings.legal")}</SectionLabel>
        <div className="space-y-2.5 mb-6">
          <SettingsLink href="/legal/terms" icon={<ScrollText size={16} />} label={t("legal.terms")} />
          <SettingsLink href="/legal/privacy" icon={<ShieldCheck size={16} />} label={t("legal.privacy")} />
        </div>

        {/* Account */}
        <SectionLabel>{t("settings.account")}</SectionLabel>
        <Card className="p-1">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={16} />
            <span className="text-sm font-medium">{t("menu.signOut")}</span>
          </button>
        </Card>
      </div>
    </main>
  );
}
