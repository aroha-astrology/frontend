// Resolve a free-text place to the { name, lat, lon, tz } shape the backend's
// placeOfBirth requires. Uses Open-Meteo's geocoding API (free, no API key).
// Docs: https://open-meteo.com/en/docs/geocoding-api

import type { PlaceOfBirth } from "./api";

interface OpenMeteoResult {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  admin1?: string;
  country?: string;
}

/**
 * Geocode the top match for `query`. Returns null when nothing is found or the
 * request fails. A friendly display name is built from city + region + country.
 */
export async function geocodePlace(query: string): Promise<PlaceOfBirth | null> {
  const q = query.trim();
  if (!q) return null;

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", q);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  let data: { results?: OpenMeteoResult[] };
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    data = await res.json();
  } catch {
    return null;
  }

  const top = data.results?.[0];
  if (!top || !top.timezone) return null;

  const displayName = [top.name, top.admin1, top.country]
    .filter(Boolean)
    .join(", ");

  return {
    name: displayName,
    lat: top.latitude,
    lon: top.longitude,
    tz: top.timezone,
  };
}
