"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
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
  const { query, setQuery, suggestions, loading, selectedPlace, select, clear } =
    usePlaceAutocomplete();
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Notify parent when a place is resolved
  useEffect(() => {
    if (selectedPlace) {
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

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (selectedPlace) clear();
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
      {open && (suggestions.length > 0 || loading || showEmpty) && (
        <ul
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1 z-50 max-h-56 overflow-y-auto bg-card/95 backdrop-blur-xl border border-gold/20 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
        >
          {loading && (
            <li className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
              <Loader2 size={14} className="animate-spin text-gold/60" />
              Searching...
            </li>
          )}
          {showEmpty && (
            <li className="px-4 py-3 text-sm text-muted">No places found</li>
          )}
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === highlightIdx}
              onClick={() => select(s)}
              onMouseEnter={() => setHighlightIdx(i)}
              className={`flex items-center gap-2.5 px-4 py-3 text-sm cursor-pointer transition-colors ${
                i === highlightIdx ? "bg-gold/10" : "hover:bg-gold/10"
              }`}
              style={{ color: "var(--foreground)" }}
            >
              <MapPin size={14} className="shrink-0 text-gold/50" />
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
