"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import ListRow from "@/components/ui/ListRow";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { guideName, usePersona } from "@/hooks/usePersona";

/**
 * Settings → "Your guide" (switch chat.personas): who answers in chat and on calls. Four guides for
 * the reader's current look; the pick applies at once. Hidden while the switch is off.
 */
export default function GuideRow() {
  const { t } = useTranslation();
  const { enabled, info, choose } = usePersona();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "bad" } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!enabled || !info) return null;

  const nameOf = (id: string, plain: string) => (id === "yogi-baba" ? t("aiChatPage.personaGeneral") : plain);

  async function pick(id: string) {
    if (id === info!.current) {
      setOpen(false);
      return;
    }
    setBusy(true);
    const ok = await choose(id);
    setBusy(false);
    const name = nameOf(id, info!.options.find((o) => o.id === id)?.name ?? id);
    setMessage(ok ? { text: t("guide.done", { name }), tone: "ok" } : { text: t("guide.error"), tone: "bad" });
    setOpen(false);
  }

  return (
    <>
      <div id="guide" data-testid="guide-row">
        <ListRow
          icon={<UserRound size={16} />}
          label={t("guide.row")}
          subtitle={guideName(info, t("aiChatPage.personaGeneral"))}
          onClick={() => setOpen(true)}
        />
        {message && (
          <p
            role="status"
            data-testid="guide-message"
            className={`mt-1.5 ml-1 text-xs ${message.tone === "ok" ? "text-gold" : "text-red-400"}`}
          >
            {message.text}
          </p>
        )}
      </div>

      {open && (
        <BottomSheetModal
          onClose={() => !busy && setOpen(false)}
          closeLabel={t("common.close")}
          header={<h2 className="text-base font-semibold text-foreground">{t("guide.title")}</h2>}
        >
          <div className="space-y-3 p-1 pb-4">
            <p className="text-sm text-muted">{t("guide.sub")}</p>
            {info.options.map((o) => (
              <button
                key={o.id}
                type="button"
                data-testid={`guide-option-${o.id}`}
                aria-pressed={o.id === info.current}
                disabled={busy}
                onClick={() => void pick(o.id)}
                className={`flex w-full flex-col rounded-2xl border px-4 py-3 text-left ${
                  o.id === info.current ? "border-gold bg-gold/10" : "border-gold/20"
                }`}
              >
                <span className="text-sm font-semibold text-foreground">{nameOf(o.id, o.name)}</span>
                <span className="text-[11px] text-muted">{t(`guide.tag.${o.id}`)}</span>
              </button>
            ))}
          </div>
        </BottomSheetModal>
      )}
    </>
  );
}
