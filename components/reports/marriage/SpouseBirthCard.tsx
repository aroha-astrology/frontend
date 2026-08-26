"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { UserRound, Calendar, Clock, MapPin, RefreshCw } from "lucide-react";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import type { PlaceOfBirth } from "@/lib/api";

export interface SpouseDetails {
  name: string;
  dob: string;
  time: string;
  place: PlaceOfBirth;
}

interface SpouseBirthCardProps {
  onSubmit: (details: SpouseDetails) => void;
  submitting?: boolean;
}

const inputClass =
  "w-full h-12 rounded-xl px-4 outline-none border text-sm transition-colors focus:border-gold/60 bg-surface border-border text-foreground placeholder:text-muted";

export default function SpouseBirthCard({ onSubmit, submitting = false }: SpouseBirthCardProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState<PlaceOfBirth | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const canSubmit = name.trim() && dob && place && !submitting;

  const handleSubmit = () => {
    if (!place) {
      setPlaceError(t("common.selectPlaceFromList", "Please select a place from the list"));
      return;
    }
    onSubmit({ name: name.trim(), dob, time: time || "12:00", place });
  };

  return (
    <section>
      <h2 className="font-display text-base text-gold mb-2">
        {t("marriageReport.spouseDetails.title", "Spouse's Birth Details")}
      </h2>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gold/20 bg-card p-4 space-y-3"
      >
        <p className="text-xs text-muted leading-relaxed">
          {t(
            "marriageReport.spouseDetails.subtitle",
            "Enter your spouse's birth information to generate a personalized reading based on both your charts."
          )}
        </p>

        {/* Name */}
        <div className="relative">
          <UserRound
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/50 pointer-events-none"
          />
          <input
            className={`${inputClass} pl-9`}
            placeholder={t("marriageReport.spouseDetails.namePlaceholder", "Spouse's full name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* DOB */}
        <div>
          <label className="text-[10px] text-muted ml-1 mb-1 flex items-center gap-1.5">
            <Calendar size={11} className="text-gold/50" />
            {t("kundliPage.dob", "Date of Birth")}
          </label>
          <input
            type="date"
            className={inputClass}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>

        {/* Time */}
        <div>
          <label className="text-[10px] text-muted ml-1 mb-1 flex items-center gap-1.5">
            <Clock size={11} className="text-gold/50" />
            {t("kundliPage.tob", "Time of Birth")}
            <span className="text-[9px] text-muted/60">({t("common.optional", "optional")})</span>
          </label>
          <input
            type="time"
            className={inputClass}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        {/* Place */}
        <div>
          <label className="text-[10px] text-muted ml-1 mb-1 flex items-center gap-1.5">
            <MapPin size={11} className="text-gold/50" />
            {t("kundliPage.birthPlace", "Place of Birth")}
          </label>
          <PlaceAutocomplete
            placeholder={t("kundliPage.birthPlace", "Place of birth (city)")}
            inputClassName={inputClass}
            worldwide
            onSelect={(p) => {
              setPlace(p);
              if (p) setPlaceError(null);
            }}
          />
          {placeError && (
            <p className="text-[11px] text-red-400 mt-1 ml-1">{placeError}</p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <RefreshCw size={15} className="animate-spin" />
              {t("marriageReport.spouseDetails.generating", "Generating…")}
            </>
          ) : (
            t("marriageReport.spouseDetails.submit", "Generate Combined Reading")
          )}
        </button>
      </motion.div>
    </section>
  );
}
