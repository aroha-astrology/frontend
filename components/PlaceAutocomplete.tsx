"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePlaceAutocomplete, type PlaceSuggestion } from "@/hooks/usePlaceAutocomplete";
import type { PlaceOfBirth } from "@/lib/api";

interface PlaceAutocompleteProps {
  onSelect: (place: PlaceOfBirth) => void;
  placeholder?: string;
  /** Optional className applied to the outer wrapper */
  className?: string;
  /** Inline style for the input (for pages that use style props instead of classes) */
  inputClassName?: string;
  inputStyle?: React.CSSProperties;
}

export default function PlaceAutocomplete({
  onSelect,
  placeholder = "Birth Place (City)",
  className,
  inputClassName,
  inputStyle,
}: PlaceAutocompleteProps) {
  const { t } = useTranslation();
  const {
    query, setQuery, suggestions, loading, selectedPlace,
    select, clearSelection, geocodingId, selectError,
  } = usePlaceAutocomplete();
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const notifiedRef = useRef<PlaceOfBirth | null>(null);

  // Notify parent when a place is resolved. Guarded by notifiedRef (rather
  // than relying solely on the effect dependency array) because `onSelect`
  // is a fresh inline closure on every parent render — without the guard,
  // any parent re-render while this component is still mounted (e.g. the
  // parent appending a chat message right after selection) would re-fire
  // onSelect for the same place.
  useEffect(() => {
    if (selectedPlace && notifiedRef.current !== selectedPlace) {
      notifiedRef.current = selectedPlace;
      onSelect(selectedPlace);
      setOpen(false);
    }
  }, [selectedPlace, onSelect]);

  // Open the dropdown when there are suggestions
  useEffect(() => {
    if (suggestions.length > 0) {
      setOpen(true);
      setHighlightIdx(-1);
    }
  }, [suggestions]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIdx] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((i) => (i + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < suggestions.length) {
          select(suggestions[highlightIdx]);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [open, suggestions, highlightIdx, select],
  );

  const showEmpty = open && query.length >= 2 && suggestions.length === 0 && !loading;
  // Any suggestion resolving (geocoding) — block taps on other rows so a
  // second tap can't fire a second, overlapping select() while one is
  // already in flight.
  const resolving = geocodingId !== null;

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (selectedPlace) clearSelection();
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        style={inputStyle}
        autoComplete="off"
      />

      {/* Dropdown */}
      {open && (suggestions.length > 0 || loading || showEmpty || selectError) && (
        <ul
          ref={listRef}
          className="absolute left-0 right-0 bottom-full mb-1 z-50 max-h-56 overflow-y-auto bg-card/95 backdrop-blur-xl border border-gold/20 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
        >
          {loading && (
            <li className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
              <Loader2 size={14} className="animate-spin text-gold/60" />
              {t("onboarding.searching")}
            </li>
          )}
          {showEmpty && (
            <li className="px-4 py-3 text-sm text-muted">{t("onboarding.noPlacesFound")}</li>
          )}
          {selectError && (
            <li className="px-4 py-3 text-sm text-red-400">{t("onboarding.placeNotFound")}</li>
          )}
          {suggestions.map((s, i) => {
            const isResolving = geocodingId === s.id;
            return (
              <li
                key={s.id}
                role="option"
                aria-selected={i === highlightIdx}
                aria-disabled={resolving}
                onClick={() => { if (!resolving) select(s); }}
                onMouseEnter={() => setHighlightIdx(i)}
                className={`flex items-center gap-2.5 px-4 py-3 text-sm transition-colors ${
                  resolving ? "cursor-wait opacity-60" : "cursor-pointer"
                } ${i === highlightIdx ? "bg-gold/10" : !resolving ? "hover:bg-gold/10" : ""}`}
                style={{ color: "var(--foreground)" }}
              >
                {isResolving ? (
                  <Loader2 size={14} className="shrink-0 animate-spin text-gold/60" />
                ) : (
                  <MapPin size={14} className="shrink-0 text-gold/50" />
                )}
                {isResolving ? t("onboarding.locating") : s.description}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
