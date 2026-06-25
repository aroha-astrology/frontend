import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlaceOfBirth } from '@/lib/api';

interface Suggestion { placeId: string; description: string; }

export function usePlaceAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceOfBirth | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setSuggestions([]); return; }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data);
      } catch { setSuggestions([]); }
      setLoading(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const select = useCallback(async (placeId: string) => {
    try {
      const res = await fetch(`/api/places/resolve?placeId=${encodeURIComponent(placeId)}`);
      const place = await res.json();
      if (place) {
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
