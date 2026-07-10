import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlaceOfBirth } from '@/lib/api';

export interface PlaceSuggestion {
  id: string;
  name: string;
  district: string;
  state: string;
  pincode: string;
  description: string;
}

export function usePlaceAutocomplete() {
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
        const res = await fetch(`/api/places/search?input=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data);
      } catch { setSuggestions([]); }
      setLoading(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const select = useCallback(async (suggestion: PlaceSuggestion) => {
    setSelectError(false);
    setGeocodingId(suggestion.id);
    try {
      const params = new URLSearchParams({
        city: suggestion.name,
        state: suggestion.state,
        district: suggestion.district,
        pincode: suggestion.pincode,
      });
      const res = await fetch(`/api/places/geocode?${params}`);
      const data = res.ok ? await res.json() : null;
      if (data && Number.isFinite(data.lat) && Number.isFinite(data.lon)) {
        const place: PlaceOfBirth = {
          name: `${suggestion.name}, ${suggestion.district}, ${suggestion.state}`,
          lat: data.lat,
          lon: data.lon,
          tz: 'Asia/Kolkata',
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
