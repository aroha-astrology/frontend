"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, ChevronRight, Loader2, Trash2, Phone } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { useTranslation } from "react-i18next";
import { getFirebaseAuth } from "@/lib/firebase";

/** Set on a session that is the saved transcript of a voice call. */
type SessionCall = {
  /** When the call began. */
  startedAt: string;
  durationSeconds: number;
  /** A few sentences on what was talked about; written shortly after the call, so it can be missing. */
  recap: string | null;
};

type ChatSession = {
  id: string;
  title: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  /** Missing from a server older than call history; the row then shows as a chat. */
  call?: SessionCall | null;
};

type Filter = "all" | "chats" | "calls";
const FILTERS: { id: Filter; labelKey: string }[] = [
  { id: "all", labelKey: "chatHistory.filterAll" },
  { id: "chats", labelKey: "chatHistory.filterChats" },
  { id: "calls", labelKey: "chatHistory.filterCalls" },
];

/** A call of a few seconds still reads as a minute, never "0 min". */
const callMinutes = (call: SessionCall) => Math.max(1, Math.round(call.durationSeconds / 60));

/** The day and the time the call began, short enough to fit a phone's width on one line. */
function callWhen(call: SessionCall): string {
  const started = new Date(call.startedAt);
  const day = started.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  return `${day}, ${started.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export default function ChatHistoryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<ChatSession | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.arohaastrology.in").replace(/\/$/, "");

  useEffect(() => {
    async function fetchSessions() {
      try {
        const auth = getFirebaseAuth();
        const token = await auth.currentUser?.getIdToken();

        const response = await fetch(`${baseUrl}/v1/chat/sessions`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setSessions(data);
        } else {
          setError("Failed to load chat history");
        }
      } catch (err) {
        setError("Error loading chat history");
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, [baseUrl]);

  async function handleDeleteSession() {
    if (!deletingSession) return;
    setDeleteBusy(true);
    try {
      const auth = getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${baseUrl}/v1/chat/sessions/${deletingSession.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== deletingSession.id));
        setDeletingSession(null);
      }
    } finally {
      setDeleteBusy(false);
    }
  }

  // The filter is only worth showing to someone who has both kinds; with it
  // hidden, a stale "calls" choice must not leave the list empty.
  const hasCalls = sessions.some((s) => s.call);
  const hasChats = sessions.some((s) => !s.call);
  const showFilter = hasCalls && hasChats;
  const shown = !showFilter || filter === "all" ? sessions : sessions.filter((s) => (filter === "calls") === Boolean(s.call));

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="relative z-10 page-container pt-8">
        <div className="flex items-center gap-3 mb-6">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground flex-1">{t("menu.chatHistory", "Chat History")}</h1>
        </div>
        {showFilter && (
          <div className="flex gap-2" role="group" aria-label={t("menu.chatHistory", "Chat History")}>
            {FILTERS.map(({ id, labelKey }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={`px-4 py-1.5 rounded-full border text-sm transition-colors ${
                  filter === id ? "border-gold/50 bg-gold/15 text-gold font-medium" : "border-gold/15 text-muted"
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto page-container px-4 md:px-8 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-gold w-8 h-8" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 mt-10">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted pt-20">
            <MessageCircle size={48} className="mb-4 opacity-50" />
            <p>No chat history found.</p>
          </div>
        ) : (
          <div className="space-y-3 page-grid">
            {shown.map((session) => (
              <div
                key={session.id}
                data-testid={session.call ? "history-call" : "history-chat"}
                onClick={() => router.push(`/ai-chat?sessionId=${session.id}`)}
                className="bg-card/50 backdrop-blur-sm border border-gold/10 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-card transition-colors"
              >
                {session.call && (
                  <span className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full border border-gold/30 text-gold">
                    <Phone size={16} />
                  </span>
                )}
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-foreground font-medium truncate">{session.title}</h3>
                  {session.call ? (
                    <>
                      <p className="text-sm text-muted mt-1 truncate">
                        <span className="text-gold">{t("chatHistory.voiceCall")}</span>
                        {" · "}
                        {t("chatHistory.callLength", { minutes: callMinutes(session.call) })}
                      </p>
                      <p className="text-xs text-muted mt-0.5 truncate" data-testid="history-call-when">
                        {callWhen(session.call)}
                      </p>
                      {session.call.recap && (
                        <p className="text-sm text-foreground/80 mt-2 leading-snug line-clamp-3" data-testid="history-call-recap">
                          {session.call.recap}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted mt-1 truncate">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingSession(session);
                  }}
                  aria-label={t("chatHistory.deleteAriaLabel", { title: session.title })}
                  className="p-1.5 -m-1.5 mr-1 text-muted hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 size={18} />
                </button>
                <ChevronRight size={20} className="text-muted shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {deletingSession && (
        <BottomSheetModal
          onClose={() => !deleteBusy && setDeletingSession(null)}
          closeLabel={t("common.close")}
          header={
            <h2 className="text-base font-display text-foreground">
              {t("chatHistory.deleteConfirmTitle")}
            </h2>
          }
        >
          <p className="text-sm text-muted mb-5">{t("chatHistory.deleteConfirmBody")}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeletingSession(null)}
              disabled={deleteBusy}
              className="flex-1 px-4 py-3 rounded-2xl border border-gold/20 text-sm font-medium text-foreground disabled:opacity-50"
            >
              {t("chatHistory.cancel")}
            </button>
            <button
              onClick={handleDeleteSession}
              disabled={deleteBusy}
              className="flex-1 px-4 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {t("chatHistory.deleteConfirmButton")}
            </button>
          </div>
        </BottomSheetModal>
      )}
    </main>
  );
}
