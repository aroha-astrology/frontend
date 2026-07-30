import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlaceOfBirth } from '@/lib/api';

export interface PlaceSuggestion {
  id: string;
  name: string;
  district: string;
  state: string;
  pincode: string;
  description: string;
  /** Present only for worldwide (Nominatim) suggestions — lets `select` skip a redundant geocode round-trip. */
  lat?: number;
  lon?: number;
}

/**
 * @param worldwide Search all cities/towns worldwide (Nominatim) instead of
 * India Post's post-office index. Intended for users who signed in without
 * a phone number (Google/Apple) — see PlaceAutocomplete's callers, which
 * derive this from `!user?.phoneE164`.
 */
export function usePlaceAutocomplete(worldwide = false) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceOfBirth | null>(null);
  const [geocodingId, setGeocodingId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSelectError(false);
    if (query.length < 2) { setSuggestions([]); return; }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ input: query });
        if (worldwide) params.set('worldwide', '1');
        const res = await fetch(`/api/places/search?${params}`);
        const data = await res.json();
        setSuggestions(data);
      } catch { setSuggestions([]); }
      setLoading(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, worldwide]);

  const select = useCallback(async (suggestion: PlaceSuggestion) => {
    setSelectError(false);
    setGeocodingId(suggestion.id);
    try {
      // Worldwide (Nominatim) suggestions already carry coordinates from the
      // search step — skip straight to a timezone lookup instead of
      // re-geocoding from a name, which for India Post goes through a
      // separate, more involved city/state/district/pincode search.
      const hasCoords = Number.isFinite(suggestion.lat) && Number.isFinite(suggestion.lon);
      const params = hasCoords
        ? new URLSearchParams({ lat: String(suggestion.lat), lon: String(suggestion.lon) })
        : new URLSearchParams({
            city: suggestion.name,
            state: suggestion.state,
            district: suggestion.district,
            pincode: suggestion.pincode,
          });
      const res = await fetch(`/api/places/geocode?${params}`);
      const data = res.ok ? await res.json() : null;
      if (data && Number.isFinite(data.lat) && Number.isFinite(data.lon) && data.tz) {
        const name = hasCoords
          ? suggestion.description
          : `${suggestion.name}, ${suggestion.district}, ${suggestion.state}`;
        const place: PlaceOfBirth = {
          name,
          lat: data.lat,
          lon: data.lon,
          tz: data.tz,
        };
        setSelectedPlace(place);
        setQuery(place.name);
        setSuggestions([]);
      } else {
        setSelectError(true);
      }
    } catch {
      setSelectError(true);
    } finally {
      setGeocodingId(null);
    }
  }, []);

  // Deselects without touching the (already-updated) query text, so editing
  // a resolved place's name doesn't get clobbered back to empty — see
  // PlaceAutocomplete's onChange handler.
  const clearSelection = useCallback(() => {
    setSelectedPlace(null); setSelectError(false);
  }, []);

  return {
    query, setQuery, suggestions, loading, selectedPlace,
    select, clearSelection, geocodingId, selectError,
  };
}
