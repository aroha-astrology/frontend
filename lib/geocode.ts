import type { PlaceOfBirth } from "./api";

export interface PlaceSuggestion {
  id: string;
  name: string;
  district: string;
  state: string;
  pincode: string;
  description: string;
}

export async function searchPlaces(input: string): Promise<PlaceSuggestion[]> {
  const q = input.trim();
  if (!q || q.length < 2) return [];

  try {
    const res = await fetch(`/api/places/search?input=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function resolvePlace(suggestion: PlaceSuggestion): Promise<PlaceOfBirth | null> {
  try {
    const res = await fetch(
      `/api/places/geocode?city=${encodeURIComponent(suggestion.name)}&state=${encodeURIComponent(suggestion.state)}&district=${encodeURIComponent(suggestion.district)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;

    return {
      name: `${suggestion.name}, ${suggestion.district}, ${suggestion.state}`,
      lat: data.lat,
      lon: data.lon,
      tz: "Asia/Kolkata",
    };
  } catch {
    return null;
  }
}

export async function geocodePlace(query: string): Promise<PlaceOfBirth | null> {
  const q = query.trim();
  if (!q) return null;

  try {
    const res = await fetch(
      `/api/places/geocode?city=${encodeURIComponent(q)}&state=&district=`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;

    return {
      name: q,
      lat: data.lat,
      lon: data.lon,
      tz: "Asia/Kolkata",
    };
  } catch {
    return null;
  }
}
