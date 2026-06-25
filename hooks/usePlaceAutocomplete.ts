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
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
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
    try {
      const res = await fetch(
        `/api/places/geocode?city=${encodeURIComponent(suggestion.name)}&state=${encodeURIComponent(suggestion.state)}&district=${encodeURIComponent(suggestion.district)}`
      );
      const data = await res.json();
      if (data) {
        const place: PlaceOfBirth = {
          name: `${suggestion.name}, ${suggestion.district}, ${suggestion.state}`,
          lat: data.lat,
          lon: data.lon,
          tz: 'Asia/Kolkata',
        };
        setSelectedPlace(place);
        setQuery(place.name);
        setSuggestions([]);
      }
    } catch {}
  }, []);

  const clear = useCallback(() => {
    setQuery(''); setSuggestions([]); setSelectedPlace(null);
  }, []);

  return { query, setQuery, suggestions, loading, selectedPlace, select, clear };
}
