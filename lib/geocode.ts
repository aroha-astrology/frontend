import type { PlaceOfBirth } from "./api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const TIMEZONE_URL = "https://maps.googleapis.com/maps/api/timezone/json";

/**
 * Geocode a place name to { name, lat, lon, tz } using Google Geocoding API.
 * Falls back to null on failure.
 */
export async function geocodePlace(query: string): Promise<PlaceOfBirth | null> {
  const q = query.trim();
  if (!q || !API_KEY) return null;

  try {
    const url = `${GEOCODE_URL}?address=${encodeURIComponent(q)}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) return null;

    const result = data.results[0];
    const lat = result.geometry.location.lat;
    const lon = result.geometry.location.lng;
    const name = result.formatted_address;

    const tz = await getTimezone(lat, lon);

    return { name, lat, lon, tz: tz ?? "Asia/Kolkata" };
  } catch {
    return null;
  }
}

/**
 * Google Place Autocomplete suggestions for a search input.
 */
export async function placeAutocomplete(
  input: string,
): Promise<{ placeId: string; description: string }[]> {
  const q = input.trim();
  if (!q || !API_KEY) return [];

  try {
    const url = `${AUTOCOMPLETE_URL}?input=${encodeURIComponent(q)}&types=(cities)&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (data.status !== "OK") return [];

    return (data.predictions ?? []).map((p: { place_id: string; description: string }) => ({
      placeId: p.place_id,
      description: p.description,
    }));
  } catch {
    return [];
  }
}

/**
 * Resolve a Google Place ID to { name, lat, lon, tz }.
 */
export async function resolvePlace(placeId: string): Promise<PlaceOfBirth | null> {
  if (!placeId || !API_KEY) return null;

  try {
    const url = `${GEOCODE_URL}?place_id=${encodeURIComponent(placeId)}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) return null;

    const result = data.results[0];
    const lat = result.geometry.location.lat;
    const lon = result.geometry.location.lng;
    const name = result.formatted_address;

    const tz = await getTimezone(lat, lon);

    return { name, lat, lon, tz: tz ?? "Asia/Kolkata" };
  } catch {
    return null;
  }
}

async function getTimezone(lat: number, lon: number): Promise<string | null> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const url = `${TIMEZONE_URL}?location=${lat},${lon}&timestamp=${timestamp}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    return data.status === "OK" ? data.timeZoneId : null;
  } catch {
    return null;
  }
}
