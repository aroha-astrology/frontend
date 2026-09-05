"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import Card from "@/components/ui/Card";
import type { PlanetStrengthValue } from "@/lib/report-score-facts";

type Provenance = "vedic" | "upanishadic" | "traditional" | "tantric";

interface Mantra {
  slug: string;
  sanskrit: string;
  iast: string;
  provenance: Provenance;
  source: string;
}

/**
 * The report's own fixed, source-tagged mantra set -- verified against source, not
 * LLM-generated (see this report's design doc). Kept as a literal here rather than added to
 * public/shlokas/shlokas.json: that library needs audio assets and sits behind nav.shlokas
 * (currently OFF), and this card needs neither. Provenance is part of the content, not
 * decoration -- labelling Santana Gopala "Vedic", which most sites do, is exactly the
 * flattening this report's design review objected to.
 */
const MANTRAS: readonly Mantra[] = [
  {
    slug: "prajatantu",
    sanskrit: "प्रजातन्तुं मा व्यवच्छेत्सीः ।",
    iast: "prajātantuṃ mā vyavacchetsīḥ",
    provenance: "upanishadic",
    source: "Taittirīya Upaniṣad 1.11.1",
  },
  {
    slug: "garbham-dhehi",
    sanskrit: "गर्भं धेहि सिनीवालि गर्भं धेहि पृथुष्टुके ।\nगर्भं ते अश्विनौ देवावाधत्तां पुष्करस्रजौ ॥",
    iast: "garbhaṃ dhehi sinīvāli garbhaṃ dhehi pṛthuṣṭuke | garbhaṃ te aśvinau devāv ādhattāṃ puṣkarasrajau",
    provenance: "upanishadic",
    source: "Bṛhadāraṇyaka Upaniṣad 6.4.21",
  },
  {
    slug: "santana-gopala",
    sanskrit: "ॐ देवकीसुत गोविन्द वासुदेव जगत्पते ।\nदेहि मे तनयं कृष्ण त्वामहं शरणं गतः ॥",
    iast: "oṃ devakīsuta govinda vāsudeva jagatpate | dehi me tanayaṃ kṛṣṇa tvām ahaṃ śaraṇaṃ gataḥ",
    provenance: "traditional",
    source: "Mantra-Śāstra (Bhāgavata narrative)",
  },
  {
    slug: "brihaspati-bija",
    sanskrit: "ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः ।",
    iast: "oṃ grāṃ grīṃ grauṃ saḥ gurave namaḥ",
    provenance: "tantric",
    source: "Navagraha japa",
  },
] as const;

const PROVENANCE_TONE: Record<Provenance, string> = {
  vedic: "border-emerald-500/25 text-emerald-400",
  upanishadic: "border-emerald-500/25 text-emerald-400",
  traditional: "border-amber-500/25 text-amber-400",
  tantric: "border-amber-500/25 text-amber-400",
};

/** Jupiter (Putra Karaka) weak, retrograde or combust -- the one deterministic condition,
 * already computed server-side, that earns the 4th (Bṛhaspati Bīja) mantra a place on the
 * card. Deliberately not an LLM choice: a fixed condition over already-given data carries no
 * prompt-contract risk the way asking a model to "pick a mantra" would. */
function jupiterNeedsSupport(planetStrength: unknown): boolean {
  if (!Array.isArray(planetStrength)) return false;
  const jupiter = (planetStrength as PlanetStrengthValue[]).find(
    (p) => p.planet?.toLowerCase() === "jupiter",
  );
  return !!jupiter && (!jupiter.isStrong || jupiter.isRetrograde || jupiter.isCombust);
}

function MantraRow({ mantra }: { mantra: Mantra }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-border bg-muted/5 p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-semibold text-foreground">
          {t(`progenyReport.mantras.${mantra.slug}.title`)}
        </span>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide ${PROVENANCE_TONE[mantra.provenance]}`}
        >
          {t(`progenyReport.mantras.provenance.${mantra.provenance}`)}
        </span>
      </div>
      <p className="font-devanagari text-sm text-gold/90 whitespace-pre-line leading-relaxed">
        {mantra.sanskrit}
      </p>
      <p className="mt-1 text-[11px] italic text-muted">{mantra.iast}</p>
      <p className="mt-1.5 text-[10px] text-muted">{mantra.source}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-foreground/80">
        {t(`progenyReport.mantras.${mantra.slug}.meaning`)}
      </p>
    </div>
  );
}

/**
 * Classical remedy mantras -- always shown source-tagged (never a bare Sanskrit block), per
 * this report's provenance rule. Shows the opening saṅkalpa + one scriptural mantra + the
 * living-practice Santāna Gopāla by default; the Navagraha Bṛhaspati Bīja mantra joins only
 * when Jupiter itself (the classical Putra Kāraka) is weak/retrograde/combust on this chart.
 */
export default function ProgenyMantraCard({
  planetStrength,
}: {
  planetStrength?: unknown;
}) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const showBrihaspati = jupiterNeedsSupport(planetStrength);
  const mantras = MANTRAS.filter((m) => m.slug !== "brihaspati-bija" || showBrihaspati);

  return (
    <Card className="overflow-hidden">
      <div className="relative h-20 w-full bg-muted/10">
        {!imgError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/progeny/lotus.png"
            alt=""
            aria-hidden
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold mb-2.5">
          <Flame size={12} />
          {t("progenyReport.mantras.title")}
        </div>
        <div className="flex flex-col gap-2.5">
          {mantras.map((m) => (
            <MantraRow key={m.slug} mantra={m} />
          ))}
        </div>
      </div>
    </Card>
  );
}
