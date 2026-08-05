"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Download,
  Globe,
  Loader2,
  MessageSquare,
  Moon,
  ScrollText,
  Star,
  ShieldCheck,
  LogOut,
  Sparkles,
  Trash2,
  UserCircle,
  Wallet,
} from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import Switch from "@/components/ui/Switch";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import ListRow from "@/components/ui/ListRow";
import FeedbackSheet from "@/components/FeedbackSheet";
import { PLAY_STORE_URL } from "@/lib/app-review";
import { isNativeAndroid } from "@/lib/play-billing";
import LanguagePicker from "@/components/LanguagePicker";
import ThemeSwitch from "@/components/ThemeSwitch";
import { useAuth } from "@/providers/auth-provider";
import { api, type Profile } from "@/lib/api";
import { RELATIONSHIP_KEYS } from "@/components/ProfileSwitcher";

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

  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  // The Play listing only exists for the native Android build — never offer it
  // on iOS or on the plain web app.
  const [playAvailable, setPlayAvailable] = useState(false);
  useEffect(() => {
    isNativeAndroid().then(setPlayAvailable);
  }, []);

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

  /**
   * DPDP §11 access right (and GDPR Arts. 15/20). Fetches the export and
   * saves it via an object URL — a plain anchor to the API would drop the
   * bearer token, and the endpoint is authenticated.
   */
  const handleExportData = async () => {
    setExportBusy(true);
    setExportError(null);
    try {
      const data = await api.exportMyData();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "aroha-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t("settings.downloadDataError"));
    } finally {
      setExportBusy(false);
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
          <ListRow icon={<Globe size={16} />} label={t("settings.language")} right={<LanguagePicker />} />
          <ListRow icon={<Moon size={16} />} label={t("settings.theme")} right={<ThemeSwitch />} />
          <ListRow
            icon={<MessageSquare size={16} />}
            label={t("settings.sendFeedback")}
            onClick={() => setFeedbackOpen(true)}
          />
          {playAvailable && (
            // A plain deep link, deliberately not AppReview.requestReview():
            // Google's quota can make that card silently do nothing, which reads
            // as a broken button. The listing always opens.
            <ListRow
              icon={<Star size={16} />}
              label={t("settings.rateOnPlayStore")}
              onClick={() => window.open(PLAY_STORE_URL, "_blank")}
            />
          )}
        </div>

        {feedbackOpen && <FeedbackSheet onClose={() => setFeedbackOpen(false)} />}

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
          <ListRow href="/legal/terms" icon={<ScrollText size={16} />} label={t("legal.terms")} />
          <ListRow href="/legal/privacy" icon={<ShieldCheck size={16} />} label={t("legal.privacy")} />
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
          <ListRow href="/settings/history" icon={<Wallet size={16} />} label={t("settings.paymentHistory")} />
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
            onClick={handleExportData}
            disabled={exportBusy}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {exportBusy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            <span className="text-sm font-medium">{t("settings.downloadData")}</span>
          </button>
          {exportError && (
            <p className="px-3 pb-2 text-[12px] text-red-400">{exportError}</p>
          )}
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
