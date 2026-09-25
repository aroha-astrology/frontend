"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Globe, Lock, X } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import FactorList from "@/components/why/FactorList";
import PassUpsell from "@/components/pass/PassUpsell";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import {
  LEVEL_CLASS,
  MAX_PLACES,
  RELOCATION_AREAS,
  levelOf,
  relocationApi,
  type PlaceResult,
  type RelocationArea,
  type RelocationPlace,
  type RelocationStatus,
} from "@/lib/relocation-api";
import { useNewFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";

type Cell = { place: number; area: RelocationArea };

function RelocationPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { refresh } = useAuth();
  const { enabled: unlockOn } = useNewFeature("paid.relocation");
  const [status, setStatus] = useState<RelocationStatus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<"funds" | "failed" | null>(null);
  const [places, setPlaces] = useState<RelocationPlace[]>([]);
  // Bumped after each pick so the search box re-mounts empty for the next city.
  const [pickerKey, setPickerKey] = useState(0);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<"notReady" | "failed" | null>(null);
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [cell, setCell] = useState<Cell | null>(null);

  function load() {
    setLoadError(false);
    relocationApi
      .status()
      .then(setStatus)
      .catch(() => setLoadError(true));
  }

  useEffect(load, []);

  async function unlock() {
    setUnlocking(true);
    setUnlockError(null);
    try {
      await relocationApi.unlock();
      void refresh();
      load();
    } catch (err) {
      setUnlockError(err instanceof ApiError && err.message === "INSUFFICIENT_CREDITS" ? "funds" : "failed");
    } finally {
      setUnlocking(false);
    }
  }

  function addPlace(place: RelocationPlace | null) {
    if (!place) return;
    setPlaces((prev) =>
      prev.length >= MAX_PLACES || prev.some((p) => p.lat === place.lat && p.lon === place.lon)
        ? prev
        : [...prev, { name: place.name, lat: place.lat, lon: place.lon }],
    );
    setPickerKey((k) => k + 1);
  }

  async function compare() {
    setComparing(true);
    setCompareError(null);
    setCell(null);
    try {
      const res = await relocationApi.compare(places);
      setResults(res.places);
    } catch (err) {
      const code = err instanceof ApiError ? err.message : "";
      // The gate or the unlock changed under us — show the page's current state instead.
      if (code === "RELOCATION_LOCKED" || code === "BIRTH_TIME_TOO_UNCERTAIN") load();
      else setCompareError(code === "CHART_NOT_READY" ? "notReady" : "failed");
    } finally {
      setComparing(false);
    }
  }

  const inputStyle = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" };
  const placeName = (p: PlaceResult) => (p.isBirthPlace ? p.name || t("relocation.birthPlace") : p.name);
  const selected = cell && results ? { place: results[cell.place]!, area: cell.area } : null;

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 px-5 pt-8 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-display flex items-center gap-2 truncate">
              <Globe size={18} className="text-gold shrink-0" />
              {t("relocation.title")}
            </h1>
            <p className="text-[11px] text-muted">{t("relocation.subtitle")}</p>
          </div>
        </div>

        {loadError && <p className="py-10 text-center text-sm text-muted">{t("relocation.error")}</p>}
        {!loadError && !status && <p className="py-10 text-center text-sm text-muted">{t("relocation.loading")}</p>}

        {status?.blocked && (
          <Card className="p-4 border-amber-500/30 space-y-3" data-testid="relocation-blocked">
            <p className="text-sm text-foreground/90">{t("relocation.blocked", { pct: status.confidence.pct })}</p>
            <Link href="/settings" className="block text-center text-sm font-semibold text-gold underline">
              {t("relocation.improve")}
            </Link>
          </Card>
        )}

        {status && !status.blocked && !status.unlock.unlocked && (
          <Card className="p-4 border-gold/20 text-center space-y-2" data-testid="relocation-locked">
            <p className="flex items-center justify-center gap-2 text-sm text-foreground">
              <Lock size={14} className="text-gold shrink-0" />
              {t("relocation.locked")}
            </p>
            {unlockOn && (
              <button
                type="button"
                disabled={unlocking}
                onClick={() => void unlock()}
                className="w-full rounded-xl bg-gold/20 px-3 py-2.5 text-sm font-semibold text-gold disabled:opacity-40"
              >
                {status.unlock.pricePaise > 0
                  ? t("relocation.unlock", { price: formatRupees(status.unlock.pricePaise) })
                  : t("relocation.unlockFree")}
              </button>
            )}
            <PassUpsell />
            {unlockError && (
              <p className="text-xs text-rose-300">
                {t(`relocation.${unlockError}`)}{" "}
                {unlockError === "funds" && (
                  <Link href="/payment" className="font-semibold text-gold underline">
                    {t("relocation.addMoney")}
                  </Link>
                )}
              </p>
            )}
          </Card>
        )}

        {status && !status.blocked && status.unlock.unlocked && (
          <>
            <Card className="p-4 border-gold/15 space-y-3">
              {places.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {places.map((p, i) => (
                    <span
                      key={`${p.lat},${p.lon}`}
                      className="flex max-w-full items-center gap-1 rounded-full border border-gold/30 bg-gold/10 py-1 pl-3 pr-1 text-xs text-foreground"
                    >
                      <span className="truncate">{p.name}</span>
                      <button
                        type="button"
                        aria-label={t("relocation.removePlace", { name: p.name })}
                        onClick={() => setPlaces((prev) => prev.filter((_, j) => j !== i))}
                        className="rounded-full p-1 text-muted"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {places.length < MAX_PLACES ? (
                <div className="space-y-1.5">
                  <span className="text-xs text-muted">{t("relocation.addPlace")}</span>
                  <PlaceAutocomplete
                    key={pickerKey}
                    worldwide
                    placeholder={t("relocation.placePlaceholder")}
                    inputClassName="w-full h-12 rounded-2xl px-4 outline-none border text-base focus:border-yellow-500/60"
                    inputStyle={inputStyle}
                    onSelect={addPlace}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted">{t("relocation.maxPlaces", { count: MAX_PLACES })}</p>
              )}
              <button
                type="button"
                disabled={places.length === 0 || comparing}
                onClick={() => void compare()}
                className="w-full rounded-xl bg-gold/20 px-3 py-2.5 text-sm font-semibold text-gold disabled:opacity-40"
              >
                {comparing ? t("relocation.comparing") : t("relocation.compare")}
              </button>
              {compareError && <p className="text-xs text-rose-300">{t(`relocation.${compareError}`)}</p>}
            </Card>

            {results && (
              <Card className="p-3 border-gold/15 space-y-2" data-testid="relocation-results">
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-1 text-xs">
                    <thead>
                      <tr>
                        <th />
                        {results.map((p) => (
                          <th key={`${p.lat},${p.lon}`} className="min-w-[4.5rem] align-bottom font-normal">
                            <span className="block truncate text-[11px] font-semibold text-foreground">
                              {placeName(p)}
                            </span>
                            {p.isBirthPlace && (
                              <span className="block text-[10px] text-gold">{t("relocation.birthPlace")}</span>
                            )}
                            <span className="block text-[10px] text-muted">
                              {t("relocation.rising", { sign: t(`zodiac.signs.${p.ascendantSign.toLowerCase()}`) })}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="pr-1 font-semibold text-gold">{t("relocation.overall")}</td>
                        {results.map((p) => (
                          <td
                            key={`${p.lat},${p.lon}`}
                            className={`rounded-lg border py-1.5 text-center font-semibold ${LEVEL_CLASS[levelOf(p.overall)]}`}
                          >
                            {p.overall}
                          </td>
                        ))}
                      </tr>
                      {RELOCATION_AREAS.map((area) => (
                        <tr key={area}>
                          <td className="pr-1 text-foreground/85">{t(`relocation.areas.${area}`)}</td>
                          {results.map((p, i) => {
                            const a = p.areas[area];
                            const active = cell?.place === i && cell.area === area;
                            return (
                              <td key={`${p.lat},${p.lon}`} className="p-0">
                                <button
                                  type="button"
                                  onClick={() => setCell(active ? null : { place: i, area })}
                                  aria-pressed={active}
                                  aria-label={`${placeName(p)} · ${t(`relocation.areas.${area}`)} · ${a.score}`}
                                  className={`w-full rounded-lg border py-1.5 text-center ${LEVEL_CLASS[a.level]} ${active ? "ring-1 ring-gold" : ""}`}
                                >
                                  {a.score}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-center text-[11px] text-muted">{t("relocation.tapHint")}</p>
              </Card>
            )}

            {selected && (
              <Card className="p-4 border-gold/15 space-y-2" data-testid="relocation-why">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {placeName(selected.place)} · {t(`relocation.areas.${selected.area}`)}
                  </p>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${LEVEL_CLASS[selected.place.areas[selected.area].level]}`}
                  >
                    {t(`relocation.level.${selected.place.areas[selected.area].level}`)}
                  </span>
                </div>
                <FactorList factors={selected.place.areas[selected.area].why} />
              </Card>
            )}
          </>
        )}

        {status && <p className="pb-2 text-center text-[10px] text-muted">{t("relocation.guidance")}</p>}
      </div>
    </main>
  );
}

export default function RelocationRoute() {
  return (
    <NewFeatureGuard featureKey="nav.relocation">
      <RelocationPage />
    </NewFeatureGuard>
  );
}
