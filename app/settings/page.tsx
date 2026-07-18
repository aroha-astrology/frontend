"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Globe,
  Moon,
  ScrollText,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Sparkles,
  Trash2,
  UserCircle,
  Wallet,
} from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import Switch from "@/components/ui/Switch";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import LanguagePicker from "@/components/LanguagePicker";
import ThemeSwitch from "@/components/ThemeSwitch";
import { useAuth } from "@/providers/auth-provider";
import { api, type Profile } from "@/lib/api";
import { RELATIONSHIP_KEYS } from "@/components/ProfileSwitcher";

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

function ProfileRow({ profile, onDelete }: { profile: Profile; onDelete: () => void }) {
  const { t } = useTranslation();
  const name = profile.displayName?.trim() || t("profileSwitcher.unnamed");
  const secondary = profile.isPrimary
    ? t("settings.profilePrimary")
    : profile.relationship
      ? t(RELATIONSHIP_KEYS[profile.relationship])
      : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-gold/15 bg-card">
      <span className="text-gold">
        <UserCircle size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{name}</p>
        {secondary && <p className="text-xs text-muted mt-0.5 truncate">{secondary}</p>}
      </div>
      {!profile.isPrimary && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={t("settings.deleteProfileAriaLabel", { name })}
          className="p-1.5 -m-1.5 text-muted hover:text-red-400 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, signOut, refresh, profiles, refreshProfiles } = useAuth();

  const [consentBusy, setConsentBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [deleteProfileBusy, setDeleteProfileBusy] = useState(false);
  const [deleteProfileError, setDeleteProfileError] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/sign-in");
    }
  };

  const handleToggleConsent = async (next: boolean) => {
    setConsentBusy(true);
    try {
      await api.updateMe({ consent: { dataProcessing: next } });
      await refresh();
    } finally {
      setConsentBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteBusy(true);
    try {
      await api.deleteMe();
      await signOut();
    } finally {
      setDeleteBusy(false);
      setShowDeleteConfirm(false);
      router.replace("/sign-in");
    }
  };

  const handleDeleteProfile = async () => {
    if (!deletingProfile) return;
    setDeleteProfileBusy(true);
    setDeleteProfileError(null);
    try {
      await api.deleteProfile(deletingProfile.id);
      await refreshProfiles();
      setDeletingProfile(null);
    } catch {
      setDeleteProfileError(t("settings.deleteProfileError"));
    } finally {
      setDeleteProfileBusy(false);
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

        {/* Profiles */}
        {profiles !== null && (
          <>
            <SectionLabel>{t("settings.profiles")}</SectionLabel>
            <div className="space-y-2.5 mb-6">
              {profiles.map((profile) => (
                <ProfileRow
                  key={profile.id}
                  profile={profile}
                  onDelete={() => {
                    setDeleteProfileError(null);
                    setDeletingProfile(profile);
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Legal */}
        <SectionLabel>{t("settings.legal")}</SectionLabel>
        <div className="space-y-2.5 mb-6">
          <SettingsLink href="/legal/terms" icon={<ScrollText size={16} />} label={t("legal.terms")} />
          <SettingsLink href="/legal/privacy" icon={<ShieldCheck size={16} />} label={t("legal.privacy")} />
        </div>

        {/* Privacy */}
        <SectionLabel>{t("legal.privacy")}</SectionLabel>
        <div className="space-y-2.5 mb-6">
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border border-gold/15 bg-card">
            <span className="text-gold mt-0.5">
              <Sparkles size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{t("settings.dataConsent")}</p>
              <p className="text-xs text-muted mt-0.5">{t("settings.dataConsentDescription")}</p>
            </div>
            <Switch
              checked={user?.dataProcessingConsentActive ?? false}
              onChange={handleToggleConsent}
              disabled={consentBusy || !user}
              aria-label={t("settings.dataConsent")}
            />
          </div>
        </div>

        {/* Account */}
        <SectionLabel>{t("settings.account")}</SectionLabel>
        <div className="space-y-2.5 mb-2.5">
          <SettingsLink href="/settings/history" icon={<Wallet size={16} />} label={t("settings.rechargeHistory")} />
        </div>
        <Card className="p-1 mb-2.5">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={16} />
            <span className="text-sm font-medium">{t("menu.signOut")}</span>
          </button>
        </Card>
        <Card className="p-1">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={16} />
            <span className="text-sm font-medium">{t("settings.deleteAccount")}</span>
          </button>
        </Card>
      </div>

      {showDeleteConfirm && (
        <BottomSheetModal
          onClose={() => !deleteBusy && setShowDeleteConfirm(false)}
          closeLabel={t("common.close")}
          header={
            <h2 className="text-base font-display text-foreground">
              {t("settings.deleteAccountConfirmTitle")}
            </h2>
          }
        >
          <p className="text-sm text-muted mb-5">{t("settings.deleteAccountConfirmBody")}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteBusy}
              className="flex-1 px-4 py-3 rounded-2xl border border-gold/20 text-sm font-medium text-foreground disabled:opacity-50"
            >
              {t("settings.cancel")}
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteBusy}
              className="flex-1 px-4 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {t("settings.deleteAccountConfirmButton")}
            </button>
          </div>
        </BottomSheetModal>
      )}

      {deletingProfile && (
        <BottomSheetModal
          onClose={() => !deleteProfileBusy && setDeletingProfile(null)}
          closeLabel={t("common.close")}
          header={
            <h2 className="text-base font-display text-foreground">
              {t("settings.deleteProfileConfirmTitle")}
            </h2>
          }
        >
          <p className="text-sm text-muted mb-5">
            {t("settings.deleteProfileConfirmBody", {
              name: deletingProfile.displayName?.trim() || t("profileSwitcher.unnamed"),
            })}
          </p>
          {deleteProfileError && <p className="text-sm text-red-400 mb-4">{deleteProfileError}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => setDeletingProfile(null)}
              disabled={deleteProfileBusy}
              className="flex-1 px-4 py-3 rounded-2xl border border-gold/20 text-sm font-medium text-foreground disabled:opacity-50"
            >
              {t("settings.cancel")}
            </button>
            <button
              onClick={handleDeleteProfile}
              disabled={deleteProfileBusy}
              className="flex-1 px-4 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {t("settings.deleteProfileConfirmButton")}
            </button>
          </div>
        </BottomSheetModal>
      )}
    </main>
  );
}
