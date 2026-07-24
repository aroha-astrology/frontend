// Typed client for the Aroha Astrology Backend (v0.1.0).
// Spec: http://13.232.179.137:3000/docs  ·  base URL from NEXT_PUBLIC_API_BASE_URL.
//
// Auth model: the backend verifies a Firebase ID token passed as
// `Authorization: Bearer <token>`. Authed calls pull a fresh token from the
// signed-in Firebase user. The backend never issues OTPs — that happens
// client-side via Firebase (see providers/auth-provider).

import { getFirebaseAuth } from "./firebase";
import { nextPollDelay } from "./poll-backoff";
import type { Category, CategoryReading, SubCategory } from "@/components/horoscope/types";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.arohaastrology.in"
).replace(/\/$/, "");

// ─── Types (mirrors components.schemas in openapi.json) ──────────────────────

export type Gender = "male" | "female" | "other" | null;

export interface PlaceOfBirth {
  name: string;
  lat: number;
  lon: number;
  tz: string;
}

export interface User {
  id: string;
  firebaseUid: string;
  phoneE164: string | null;
  displayName: string | null;
  gender: Gender;
  dateOfBirth: string | null; // YYYY-MM-DD
  timeOfBirth: string | null; // HH:mm[:ss]
  placeOfBirth: PlaceOfBirth | null;
  /** False once the user has used their one lifetime birth-detail (DOB/time/place) edit. */
  canEditBirthDetails: boolean;
  profileCompletedAt: string | null;
  /** Gates onboarding-analysis/chat/forecast/matchmaking server-side (requireConsent). */
  dataProcessingConsentActive: boolean;
  /** Wallet balance in paise, spendable for unlocking kundli house details (POST /v1/me/unlock-house). */
  walletBalancePaise: number;
  /** House numbers (1-12) already unlocked for this user; house 1 is free by default. */
  unlockedHouses: number[];
  /** True once the user has spent wallet balance to unlock the full gemstone report (POST /v1/me/unlock-gemstone). */
  gemstoneUnlocked: boolean;
  /** Referral code for this user */
  referralCode: string | null;
  /** Source of the referral (who referred this user) */
  referredByCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

export interface SessionResponse {
  user: User;
  created: boolean;
}

/** Mirrors the backend's ConsentInput — translated server-side into timestamps + an audit log row. */
export interface ConsentInput {
  marketing?: boolean;
  whatsapp?: boolean;
  /** Processing of sensitive birth/personal data for astrology features — gates onboarding/chat/matchmaking/forecast. */
  dataProcessing?: boolean;
  terms?: { version: string };
  privacy?: { version: string };
}

// ─── Device push tokens ────────────────────────────────────────────────────

export type DevicePlatform = "ios" | "android" | "web";

export interface DeviceToken {
  id: string;
  platform: DevicePlatform;
  deviceId: string | null;
  locale: string | null;
  appVersion: string | null;
  osVersion: string | null;
  pushEnabled: boolean | null;
  lastSeenAt: string | null;
  createdAt: string;
}

/** POST /v1/device-tokens body — registers/refreshes this device's push token. */
export interface RegisterDeviceTokenBody {
  token: string;
  platform: DevicePlatform;
  deviceId?: string;
  locale?: string;
  appVersion?: string;
  osVersion?: string;
  pushEnabled?: boolean;
}

/** PATCH /v1/me body — all fields optional, additionalProperties:false. */
export interface UpdateMeBody {
  displayName?: string;
  gender?: Gender;
  dateOfBirth?: string; // YYYY-MM-DD
  timeOfBirth?: string; // HH:mm[:ss]
  placeOfBirth?: PlaceOfBirth | null;
  birthTimeAccuracy?: "exact" | "approximate" | "unknown";
  currentLocation?: PlaceOfBirth | null;
  locale?: string;
  birthTimeSource?: string;
  relationshipStatus?: string;
  onboardingStatus?: string;
  consent?: ConsentInput;
  referredByCode?: string;
}

// ─── Profiles (multi-profile) ─────────────────────────────────────────────────

export type ProfileRelationship =
  | "partner"
  | "prospective_match"
  | "spouse"
  | "child"
  | "parent"
  | "sibling"
  | "friend"
  | "other";

/** One birth-data profile on this account — the primary (self) profile, or an added one (partner/family/etc). */
export interface Profile {
  /** Literally the string 'primary' for the account owner's own profile; a uuid for every added profile. */
  id: string;
  isPrimary: boolean;
  /** Exactly one profile in the list has this true — the one currently driving kundli/horoscope/chat/etc. */
  isActive: boolean;
  /** Always null for the primary profile. */
  relationship: ProfileRelationship | null;
  displayName: string | null;
  gender: Gender;
  dateOfBirth: string | null; // YYYY-MM-DD
  timeOfBirth: string | null; // HH:mm[:ss]
  placeOfBirth: PlaceOfBirth | null;
  createdAt: string; // ISO
}

/**
 * POST /v1/profiles body — same birth-data fields as UpdateMeBody, with
 * `displayName` as the only required one. Nullability differs in two spots
 * though: `timeOfBirth` is nullable here (UpdateMeBody's isn't) and
 * `placeOfBirth` is NOT nullable here (UpdateMeBody's is) — don't assume
 * edit-profile form logic built against UpdateMeBody carries over 1:1.
 */
export interface CreateProfileBody {
  displayName: string;
  gender?: Gender;
  dateOfBirth?: string; // YYYY-MM-DD
  timeOfBirth?: string | null; // HH:mm[:ss]
  placeOfBirth?: PlaceOfBirth;
  birthTimeAccuracy?: "exact" | "approximate" | "unknown";
  birthTimeSource?: string;
  birthLocationAccuracy?: "exact" | "city" | "region" | "unknown";
  relationship?: ProfileRelationship;
  /** Owner attests they may store this person's birth data — the per-profile analogue of the account's own dataProcessing consent. */
  addedWithConsent?: boolean;
}

// ─── Kundli ──────────────────────────────────────────────────────────────────

export interface KundliReady {
  status: "ready";
  id: string;
  timeKnown: boolean | null;
  ayanamsa: string | null;
  houseSystem: string | null;
  chart: Record<string, unknown> | null;
  dasha: Record<string, unknown> | null;
  yogas: Record<string, unknown> | null;
  doshas: Record<string, unknown> | null;
  generatedAt: string | null;
}

/** 202 body: kundli generation pending/in-progress (poll again). */
export interface KundliPending {
  status: "pending" | "generating" | "failed";
  message?: string;
}

/** 422 body: birth params absent — frontend must collect them. */
export interface KundliMissing {
  status: "missing_parameters";
  missing: string[]; // e.g. ["timeOfBirth", "placeOfBirth"]
  message: string;
}

// ─── Personalized horoscope ───────────────────────────────────────────────────

export type PersonalizedHoroscopePeriod = "daily" | "tomorrow" | "weekly" | "monthly" | "yearly";

export interface MonthlyBreakdownEntry {
  month: number; // 1-12
  monthLabel: string;
  summary: string;
  /** One relatable hook per sub-category for that month. Absent on rows generated before 2026-07-06. */
  categoryHooks?: Record<SubCategory, string>;
}

/**
 * Mirrors the moon-sign forecast cards' shape so the personalized card can reuse the same
 * Plain-view UI. The top-level hook/description/advice/quality/score fields mirror
 * `categories.overall` for backward compatibility with any consumer still reading the old
 * singular shape (all current UI — TodayReading.tsx and app/horoscope/page.tsx — reads
 * `categories.overall` directly; these top-level fields exist for older API consumers).
 */
export interface StructuredHoroscope {
  hook: string;
  description: string;
  advice: string;
  quality: "good" | "moderate" | "challenging" | "avoid";
  score: number; // 1-5
  luckyColor: string;
  luckyNumber: number;
  categories: Record<Category, CategoryReading>;
}

/** Plain-language reading of the user's current Vimshottari dasha — same on all 4 periods. */
export interface DashaReading {
  mahadashaPlanet: string;
  antardashaPlanet: string | null;
  hook: string;
  meaning: string;
  activeUntil: string | null;
}

// ─── Panchang ──────────────────────────────────────────────────────────────

export interface PanchangTimeWindow {
  start: string;
  end: string;
}

export interface PanchangRegionalMonth {
  region: "north" | "south" | "west" | "east";
  calendar: string;
  monthSystem: string;
  monthIndex: number;
  monthName: string;
  paksha?: string;
  year: number;
}

export interface ChoghadiyaSlot {
  name: string;
  type: "good" | "bad" | "neutral";
  startTime: string;
  endTime: string;
}

export interface HoraSlot {
  planet: string;
  startTime: string;
  endTime: string;
  isAuspicious: boolean;
}

export interface PanchangData {
  date: string;
  tithi: { number: number; name: string; paksha: string; deity: string; isAuspicious: boolean } | null;
  nakshatra: { index: number; name: string; lord: string; pada: number; deity: string } | null;
  yoga: { index: number; name: string; isAuspicious: boolean } | null;
  karana: { index: number; name: string; isFixed: boolean } | null;
  vara?: string;
  rahuKaal?: PanchangTimeWindow;
  gulikaKaal?: PanchangTimeWindow;
  yamagandaKaal?: PanchangTimeWindow;
  abhijitMuhurta?: PanchangTimeWindow;
  sunriseTime?: string;
  sunsetTime?: string;
  regionalMonths?: Record<"north" | "south" | "west" | "east", PanchangRegionalMonth>;
  choghadiya?: { day: ChoghadiyaSlot[]; night: ChoghadiyaSlot[] };
  hora?: HoraSlot[];
}

// ─── Panchang month calendar ─────────────────────────────────────────────────

export interface PanchangMonthDay {
  day: number;
  isoDate: string;
  tithiName: string;
  tithiNumber: number;
  paksha: string;
  nakshatraName: string;
  vara: string;
  isFullMoon: boolean;
  isNewMoon: boolean;
  isEkadashi: boolean;
}

// ─── Purchase plan ("Planning to Buy") ────────────────────────────────────────

export type PurchasePlanCategory = "vehicle" | "home" | "commercial" | "other";

export interface PurchasePlanDateAnalysis {
  date: string;
  provided: boolean;
  score: number;
  verdict: string;
  highlights: string[];
  warnings: string[];
  bestTimeWindows: string[];
  avoidTimes: string[];
}

export interface PurchasePlanAnalysis {
  summary: string[];
  overallScore: number;
  overallVerdict: string;
  tldr: string[];
  bookingDate: PurchasePlanDateAnalysis;
  deliveryDate: PurchasePlanDateAnalysis;
  birthChartInsights: {
    currentDasha: string;
    dashaVerdict: string;
    favorablePlanets: string[];
    challengingFactors: string[];
    keyHouses: string;
  };
  remedies: string[];
  luckyColor: string;
  luckyDirection: string;
  finalAdvice: string;
}

export interface PurchasePlan {
  id: string;
  category: PurchasePlanCategory;
  metadata: Record<string, string>;
  costBracket: string | null;
  resolvedBookingDate: string;
  resolvedDeliveryDate: string;
  status: "pending" | "processing" | "done" | "error";
  analysis: PurchasePlanAnalysis | { raw: string; parseError: true } | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AnalyzePurchasePlanBody {
  category: PurchasePlanCategory;
  metadata?: Record<string, string>;
  costBracket?: string;
  bookingDate?: string;
  deliveryDate?: string;
  panchangDate?: string;
  language?: string;
}

export interface PersonalizedHoroscope {
  forDate: string;
  period: PersonalizedHoroscopePeriod;
  periodKey: string;
  summary: string;
  /** Only present when `period === "yearly"`. */
  monthlyBreakdown?: MonthlyBreakdownEntry[];
  /** Only present for daily/weekly/monthly — the rich Plain-view fields. */
  structured?: StructuredHoroscope;
  /** Current dasha reading — same on all 4 periods; absent if no kundli yet. */
  dasha?: DashaReading;
  model: string | null;
  generatedAt: string;
}

/** Unified surface returned by `api.getKundli()` — caller branches on `status`. */
export type KundliResult = KundliReady | KundliPending | KundliMissing;

export type Kundli = KundliReady;
export type KundliResponse = KundliResult;

/** 200 body: the reading is ready. */
export type HoroscopeReady = { status: "ready" } & PersonalizedHoroscope;

/** 202 body: generation just started in the background, or the last attempt failed. */
export interface HoroscopePending {
  status: "generating" | "failed";
}

/** Unified surface returned by `api.horoscope()` — caller branches on `status`. */
export type HoroscopeResult = HoroscopeReady | HoroscopePending;

/** 200 body: the per-house insight is ready. */
export interface HouseInsightReady {
  status: "ready";
  text: string;
  strengths: string[];
  weaknesses: string[];
}

/** 202 body: generation just started in the background, or the last attempt failed. */
export interface HouseInsightPending {
  status: "generating" | "failed";
}

/** 403: the house isn't unlocked yet — distinct from "failed" so the UI doesn't retry-poll it. */
export interface HouseInsightForbidden {
  status: "forbidden";
}

/** Unified surface returned by `api.houseInsight()` — caller branches on `status`. */
export type HouseInsightResult = HouseInsightReady | HouseInsightPending | HouseInsightForbidden;

// ─── Gemstone report ─────────────────────────────────────────────────────────

export type GemstoneStrength = "weak" | "average" | "strong";

export interface GemstoneItem {
  /** Also the i18n lookup key — kundli.gemstone.data.<planet>.* — for all locale-dependent facts (name, alternatives, finger, metal, day, weight, dos, donts). */
  planet: string;
  /** Sanskrit chant text — locale-invariant, same for every language. */
  mantra: string;
  /** Practical mantra practice: N times per day for N days (uniform across all 9 stones). */
  mantraPerDay: number;
  mantraDays: number;
  /** Hex accent used to tint the stone's gem visual. */
  color: string;
  strength: GemstoneStrength;
  /** True = strongly recommended (weak/afflicted planet); false = optional. */
  recommended: boolean;
  /** 0-100 — how strongly this gemstone is preferred for the user (headline %). May be absent on reports cached before this field existed. */
  preferencePercent?: number;
  /** True only when this planet's chart-specific caution actually applies to this user — show the matching translated caution line only when true. */
  conditionalCautionApplies: boolean;
  /** AI-authored personal note (already in the requested language). */
  note: string;
}

/** 200 body: the personalized gemstone report is ready. */
export interface GemstoneReportReady {
  status: "ready";
  intro: string;
  gems: GemstoneItem[];
}

/** 202 body: generation just started in the background, or the last attempt failed. */
export interface GemstonePending {
  status: "generating" | "failed";
}

/** 403: the report isn't unlocked yet — distinct from "failed" so the UI doesn't retry-poll it. */
export interface GemstoneForbidden {
  status: "forbidden";
}

/** Unified surface returned by `api.gemstone()` — caller branches on `status`. */
export type GemstoneResult = GemstoneReportReady | GemstonePending | GemstoneForbidden;

// ─── Billing / credit purchases ────────────────────────────────────────────────

export interface TopUpAmount {
  id: string;
  amountPaise: number;
  currency: string;
  label: string;
  popular?: boolean;
}

export interface CouponValidation {
  valid: boolean;
  code: string;
  discountType?: "percent" | "flat";
  discountValue?: number;
  discountPaise?: number;
  finalAmountPaise?: number;
  message?: string;
}

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";

export interface Order {
  id: string;
  packId: string;
  amountPaise: number;
  discountPaise: number;
  finalAmountPaise: number;
  currency: string;
  couponCode: string | null;
  status: OrderStatus;
  gatewayProvider: string;
  createdAt: string;
  paidAt: string | null;
}

export type TransactionKind =
  | "recharge"
  | "chat"
  | "vastu_report"
  | "gemstone_unlock"
  | "profile_creation"
  | "house_unlock"
  | "referral_bonus"
  | "astrologer_booking"
  | "pooja_booking";

export type Transaction =
  | { id: string; kind: "recharge"; createdAt: string; amountPaise: number; status: OrderStatus }
  | {
      id: string;
      kind: Exclude<TransactionKind, "recharge" | "house_unlock">;
      createdAt: string;
      amountPaise: number;
      balanceAfterPaise: number;
      isRefund: boolean;
    }
  | {
      id: string;
      kind: "house_unlock";
      createdAt: string;
      amountPaise: number;
      balanceAfterPaise: number;
      isRefund: boolean;
      houseNumber: number;
    };

// ─── Error type ──────────────────────────────────────────────────────────────

/** Normalised backend error (`{ error: { code, message, requestId } }`). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Core request helper ──────────────────────────────────────────────────────

async function authHeader(): Promise<Record<string, string>> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new ApiError(401, "no_session", "Not signed in");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

interface RequestOpts {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, auth: needsAuth = false } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (needsAuth) Object.assign(headers, await authHeader());

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network / mixed-content / CORS failure — no HTTP response at all.
    throw new ApiError(0, "network_error", "Could not reach the server");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; requestId?: string } } | null)
      ?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "http_error",
      err?.message ?? `Request failed (${res.status})`,
      err?.requestId,
    );
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ─── Remedies ───────────────────────────────────────────────────────────────

export interface RemedyItem {
  id: string;
  title: string;
  description: string;
  remedy: string;
  category: string;
  icon: string;
  planet?: string;
}

// ─── Vastu ────────────────────────────────────────────────────────────────────

export interface VastuAnalyzeBody {
  /** room type → the direction(s) it occupies, e.g. { kitchen: ["SE"] }. */
  roomLayout: Record<string, string[]>;
  /** Free-form extra context: door/window facings, notes, overall score. */
  roomDetails?: Record<string, unknown>;
  /** e.g. "rectangle" or "L-shaped, cut corner facing NE". */
  houseShape?: string;
  /** The full editable CAD plan, stored for reload. */
  layout?: Record<string, unknown>;
}

export interface VastuPlan {
  id: string;
  status: "pending" | "processing" | "done" | "error";
  overallScore: number | null;
  roomLayout: Record<string, string[]>;
  analysis: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ─── Astrologers ────────────────────────────────────────────────────────────

export interface Astrologer {
  id: string;
  displayName: string;
  bio: string | null;
  specialties: string[];
  languages: string[];
  photoUrl: string | null;
  ratePaisePerSession: number;
  verified: boolean;
}

export type AstrologerBookingStatus = "requested" | "confirmed" | "completed" | "declined" | "cancelled" | "refunded";

export interface AstrologerBooking {
  id: string;
  astrologerId: string;
  preferredTimeWindow: string;
  notes: string | null;
  status: AstrologerBookingStatus;
  pricePaisePaid: number;
  requestedAt: string;
}

// ─── Pooja booking ───────────────────────────────────────────────────────────

export interface PoojaCatalogItem {
  id: string;
  name: string;
  description: string;
  deity: string | null;
  basePricePaise: number;
  durationMinutes: number;
}

export type PoojaBookingStatus = "requested" | "assigned" | "completed" | "cancelled" | "refunded";

export interface PoojaBooking {
  id: string;
  poojaId: string;
  panditId: string | null;
  preferredDate: string;
  shipAddress: string;
  shipPincode: string;
  status: PoojaBookingStatus;
  pricePaisePaid: number;
  notes: string | null;
}

// ─── Shagun affiliate shop ───────────────────────────────────────────────────

export type ShagunProductCategory = "gemstone" | "rudraksha" | "yantra" | "mala" | "idol" | "puja-item" | "gift-set";

export interface ShagunProduct {
  id: string;
  category: ShagunProductCategory;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceRangeText: string | null;
}

// ─── Booking chat (shared shape — a provider-portal app independently implements its own copy) ──

export type BookingType = "astrologer" | "pooja";

export interface BookingMessage {
  id: string;
  bookingType: BookingType;
  bookingId: string;
  senderRole: "customer" | "provider";
  body: string;
  readAt: string | null;
  createdAt: string;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const api = {
  /** Public liveness probe. */
  health: () => request<{ status: string; uptimeSeconds: number }>("/healthz"),

  /** Public readiness probe (DB check). */
  ready: () =>
    request<{ status: string; checks: { db: string } }>("/readyz"),

  /**
   * Exchange the current Firebase ID token for an app user. Idempotent — safe
   * to call on every launch. `created` is true when a new user row was made.
   */
  createSession: () =>
    request<SessionResponse>("/v1/auth/session", { method: "POST", auth: true }),

  /** Current user profile. */
  getMe: () => request<User>("/v1/me", { auth: true }),

  /** Update current user profile. */
  updateMe: (body: UpdateMeBody) =>
    request<User>("/v1/me", { method: "PATCH", body, auth: true }),

  /** Get user notifications */
  getNotifications: () => request<Notification[]>("/v1/me/notifications", { auth: true }),

  /** Mark all notifications as read */
  markNotificationsRead: () => request<{ success: boolean }>("/v1/me/notifications/read", { method: "PATCH", auth: true }),

  /** Erase the current account — scrubs PII/chat history server-side (see users.repo.ts anonymizeUserById). */
  deleteMe: () => request<void>("/v1/me", { method: "DELETE", auth: true }),

  /** All profiles on this account — the primary (self) profile plus any added ones. */
  listProfiles: () => request<Profile[]>("/v1/profiles", { auth: true }),

  /**
   * Add another birth-data profile (partner/family/etc) to this account.
   * Throws ApiError with status 409 if the account has insufficient credits
   * (creation costs credits, enforced server-side). Returns the new profile,
   * already active. Caller should re-fetch profiles (e.g. `refreshProfiles()`
   * from useAuth) afterward to pick up the new entry.
   */
  createProfile: (body: CreateProfileBody) =>
    request<Profile>("/v1/profiles", { method: "POST", body, auth: true }),

  /**
   * Make a profile ('primary' or a uuid) the active one for kundli/horoscope/chat/etc.
   * Throws ApiError with status 404 if `id` is unknown or not owned by this
   * account. `useAuth()`'s `switchProfile()` already wraps this call with a
   * profiles-list refresh (and propagates refresh failures) — call this
   * directly only if you're intentionally opting out of that convenience.
   */
  activateProfile: (id: string) =>
    request<Profile>(`/v1/profiles/${id}/activate`, { method: "POST", auth: true }),

  /**
   * Remove an added profile. `id` must be a uuid — the primary profile can't
   * be deleted (passing 'primary', or an unknown/unowned uuid, 404s). This
   * is the only enforcement; there's no compile-time guard against passing
   * 'primary', so callers must check `!profile.isPrimary` before offering a
   * delete action.
   */
  deleteProfile: (id: string) =>
    request<void>(`/v1/profiles/${id}`, { method: "DELETE", auth: true }),

  /**
   * Spend wallet balance to unlock a kundli house's detail view. Throws ApiError
   * with status 409 if the user has insufficient balance or the house is
   * already unlocked. Caller should re-fetch the user (e.g. `refresh()`
   * from useAuth) afterward to pick up the updated wallet balance/unlockedHouses.
   */
  unlockHouse: (houseNumber: number) =>
    request<{ success: boolean }>("/v1/me/unlock-house", {
      method: "POST",
      body: { houseNumber },
      auth: true,
    }),

  /**
   * Spend wallet balance to unlock the full gemstone report (whole report, one-time).
   * Throws ApiError with status 409 if the user has insufficient balance or the
   * report is already unlocked. Caller should re-fetch the user (`refresh()`
   * from useAuth) afterward to pick up the updated wallet balance/gemstoneUnlocked.
   */
  unlockGemstone: () =>
    request<{ success: boolean }>("/v1/me/unlock-gemstone", { method: "POST", auth: true }),

  /**
   * Current user's personalized gemstone report — generated lazily the first
   * time it's requested after unlocking, cached forever after. Caller branches
   * on `result.status`: "ready" (200), "generating"/"failed" (202, poll again),
   * or "forbidden" (403, not unlocked yet).
   */
  gemstone: (language?: string) => gemstoneRequest(language),

  /** Register/refresh this device's FCM push token. */
  registerDeviceToken: (body: RegisterDeviceTokenBody) =>
    request<DeviceToken>("/v1/device-tokens", { method: "POST", body, auth: true }),

  /** Revoke a device push token (e.g. on sign-out). */
  revokeDeviceToken: (id: string) =>
    request<void>(`/v1/device-tokens/${id}`, { method: "DELETE", auth: true }),

  /** Remedies for the user based on chart. */
  remedies: () => request<{ remedies: RemedyItem[] }>("/v1/remedies", { auth: true }),

  /**
   * Moon-sign forecast for a zodiac sign (0-11). `period` defaults to daily;
   * weekly/monthly/yearly are aggregates of the daily engine output.
   */
  moonSignForecast: (signIndex: number, period: "daily" | "weekly" | "monthly" | "yearly" = "daily", language?: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request<{ forecast: any }>(`/v1/forecast/moon-sign/${signIndex}?period=${period}${language ? `&language=${language}` : ''}`, { auth: true }),

  /**
   * Current user's natal kundli. Returns a discriminated union — caller must
   * branch on `result.status`:
   *   - "ready"              → 200, full Kundli payload
   *   - "pending"/"generating"/"failed" → 202, still computing (caller polls)
   *   - "missing_parameters" → 422, birth fields absent
   * Unexpected status codes still throw `ApiError`.
   */
  getKundli: () => kundliRequest("GET", "/v1/kundli"),

  /**
   * Current user's personalized horoscope. Returns a discriminated union —
   * caller must branch on `result.status`:
   *   - "ready"              → 200, full PersonalizedHoroscope payload
   *   - "generating"         → 202, background generation just started (caller polls)
   *   - "failed"             → 202, the last generation attempt failed
   * Unexpected status codes still throw `ApiError` (e.g. 404 if a period
   * genuinely has no reading and isn't being generated).
   */
  horoscope: (period: PersonalizedHoroscopePeriod = "daily", language?: string) =>
    horoscopeRequest(period, language),

  /**
   * Poll `horoscope(period)` until it returns "ready" or "failed", or
   * `timeoutMs` elapses. Retries on "generating" every `intervalMs`
   * (default 2 s).
   */
  pollHoroscope: (
    period: PersonalizedHoroscopePeriod = "daily",
    opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal; language?: string } = {},
  ) => pollHoroscope(period, opts),

  /**
   * Personalized insight for one kundli house (1-12) — generated lazily the
   * first time it's requested and cached forever after. Caller branches on
   * `result.status`: "ready" (200), "generating"/"failed" (202, poll again),
   * or "forbidden" (403, house isn't unlocked).
   */
  houseInsight: (house: number, language?: string) => houseInsightRequest(house, language),

  /** Poll `houseInsight(house)` until "ready"/"failed"/"forbidden", or `timeoutMs` elapses. */
  pollHouseInsight: (
    house: number,
    language?: string,
    opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
  ) => pollHouseInsight(house, language, opts),

  /** Panchang data. */
  panchang: (lat?: number, lon?: number, date?: string) => {
    const params = new URLSearchParams();
    if (lat != null) params.set("lat", String(lat));
    if (lon != null) params.set("lon", String(lon));
    if (date) params.set("date", date);
    const qs = params.toString();
    return request<PanchangData>(`/v1/panchang${qs ? `?${qs}` : ""}`, { auth: true });
  },

  /** Lightweight per-day panchang summaries for a calendar month. */
  panchangMonth: (year: number, month: number, lat?: number, lon?: number) => {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (lat != null) params.set("lat", String(lat));
    if (lon != null) params.set("lon", String(lon));
    return request<{ year: number; month: number; days: PanchangMonthDay[] }>(
      `/v1/panchang/month?${params.toString()}`,
      { auth: true },
    );
  },

  /** Request a Vedic timing analysis for a major purchase — returns immediately with a planId to poll. */
  purchasePlanAnalyze: (body: AnalyzePurchasePlanBody) =>
    request<{ planId: string }>("/v1/purchase-plan/analyze", { method: "POST", body, auth: true }),

  /** Recent purchase-plan analyses for the current user. */
  purchasePlanList: (language?: string) => request<{ plans: PurchasePlan[] }>(`/v1/purchase-plan${language ? `?language=${language}` : ''}`, { auth: true }),

  /** Poll target for a single purchase-plan analysis. */
  purchasePlanGet: (id: string, language?: string) => request<PurchasePlan>(`/v1/purchase-plan/${id}${language ? `?language=${language}` : ''}`, { auth: true }),

  /** Delete a purchase-plan analysis. */
  purchasePlanDelete: (id: string) => request<void>(`/v1/purchase-plan/${id}`, { method: "DELETE", auth: true }),

  /** Request AI Vastu remedies for a floor plan — returns immediately with a planId to poll. */
  vastuAnalyze: (body: VastuAnalyzeBody) =>
    request<{ planId: string }>("/v1/vastu/analyze", { method: "POST", body, auth: true }),

  /** Recent Vastu plans for the current user. */
  vastuList: (language?: string) =>
    request<{ plans: VastuPlan[] }>(`/v1/vastu${language ? `?language=${language}` : ""}`, { auth: true }),

  /** Poll target for a single Vastu analysis. */
  vastuGet: (id: string, language?: string) =>
    request<VastuPlan>(`/v1/vastu/${id}${language ? `?language=${language}` : ""}`, { auth: true }),

  /** Ask one free follow-up question about a completed Vastu report. */
  vastuAsk: (id: string, question: string) =>
    request<VastuPlan>(`/v1/vastu/${id}/ask`, { method: "POST", body: { question }, auth: true }),

  /** Delete a Vastu plan. */
  vastuDelete: (id: string) => request<void>(`/v1/vastu/${id}`, { method: "DELETE", auth: true }),

  /**
   * Force-regenerate the kundli (synchronous on the backend). Same union as
   * `getKundli()`. 202 here means another regenerate run is already active.
   */
  regenerateKundli: () => kundliRequest("POST", "/v1/kundli/regenerate"),

  /**
   * Poll `getKundli()` until it returns a non-pending state or `timeoutMs`
   * elapses. Retries on 202 every `intervalMs` (default 2 s, matches the
   * swagger guidance). 422 (missing parameters) is returned immediately — no
   * point polling, the user has to complete their profile first.
   */
  pollKundli: (opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {}) =>
    pollKundli(opts),

  /** Purchasable top-up amounts. */
  billingTopUpAmounts: () => request<{ amounts: TopUpAmount[] }>("/v1/billing/top-up-amounts", { auth: true }),

  /** Preview the discount a coupon would apply to a top-up amount, without redeeming it. */
  validateCoupon: (code: string, packId: string) =>
    request<CouponValidation>("/v1/billing/coupons/validate", {
      method: "POST",
      body: { code, packId },
      auth: true,
    }),

  /** Create a pending order for a top-up amount (optionally with a coupon applied). */
  checkout: (packId: string, couponCode?: string) =>
    request<Order>("/v1/billing/checkout", {
      method: "POST",
      body: couponCode ? { packId, couponCode } : { packId },
      auth: true,
    }),

  /**
   * Confirm payment for a pending order and grant its value to the wallet.
   * MOCK — stands in for a real gateway webhook until Razorpay/Stripe is
   * wired up; always succeeds for a pending order. Caller should `refresh()`
   * (useAuth) after to pick up the updated wallet balance.
   */
  confirmOrder: (orderId: string) =>
    request<{ order: Order; walletBalancePaise: number }>(`/v1/billing/orders/${orderId}/confirm`, {
      method: "POST",
      auth: true,
    }),

  /** Confirm a Google Play purchase (Android app only) and grant its value to the wallet. */
  confirmGooglePlayOrder: (params: { purchaseToken: string; productId: string }) =>
    request<{ order: Order; walletBalancePaise: number }>("/v1/billing/confirm-google-play", {
      method: "POST",
      body: params,
      auth: true,
    }),

  /** The current user's full payment history — recharges plus every spend and refund, most recent first. */
  transactionHistory: () =>
    request<{ transactions: Transaction[] }>("/v1/billing/transactions", { auth: true }),

  // ─── Astrologers ────────────────────────────────────────────────────────

  /** All astrologers available for consultation booking. */
  listAstrologers: () => request<Astrologer[]>("/v1/astrologers", { auth: true }),

  /** Request a consultation booking with an astrologer. Spends wallet balance server-side. */
  bookAstrologer: (astrologerId: string, body: { preferredTimeWindow: string; notes?: string }) =>
    request<AstrologerBooking>(`/v1/astrologers/${astrologerId}/book`, { method: "POST", body, auth: true }),

  /** Cancel a pending/confirmed astrologer booking. */
  cancelAstrologerBooking: (astrologerId: string, bookingId: string) =>
    request<AstrologerBooking>(`/v1/astrologers/${astrologerId}/bookings/${bookingId}/cancel`, {
      method: "POST",
      auth: true,
    }),

  /** The current user's astrologer bookings, most recent first. */
  myAstrologerBookings: () => request<AstrologerBooking[]>("/v1/astrologers/bookings/me", { auth: true }),

  // ─── Pooja booking ──────────────────────────────────────────────────────

  /** The fixed pooja catalog. */
  poojaCatalog: () => request<{ items: PoojaCatalogItem[] }>("/v1/pooja-bookings/catalog", { auth: true }),

  /** Request a pooja booking. Spends wallet balance server-side. */
  bookPooja: (body: { poojaId: string; preferredDate: string; shipAddress: string; shipPincode: string; notes?: string }) =>
    request<PoojaBooking>("/v1/pooja-bookings", { method: "POST", body, auth: true }),

  /** Cancel a pending/assigned pooja booking. */
  cancelPoojaBooking: (id: string) => request<PoojaBooking>(`/v1/pooja-bookings/${id}/cancel`, { method: "POST", auth: true }),

  /** The current user's pooja bookings, most recent first. */
  myPoojaBookings: () => request<{ items: PoojaBooking[] }>("/v1/pooja-bookings/me", { auth: true }),

  // ─── Shagun affiliate shop ──────────────────────────────────────────────

  /** Shagun catalog, optionally filtered to one category. Browse-only — no cart, no checkout. */
  shagunProducts: (category?: ShagunProductCategory) =>
    request<{ items: ShagunProduct[] }>(`/v1/shagun/products${category ? `?category=${category}` : ""}`, { auth: true }),

  /**
   * Resolve the authenticated redirect URL for a Shagun product. Returns
   * `{ redirectUrl }` as JSON rather than a raw 302 — the backend route
   * requires a Bearer token, which only an authenticated `fetch()` can
   * attach, so a plain `<a href>`/`window.open(url)` can't reach it directly.
   * Caller should `window.open(result.redirectUrl, "_blank", "noopener,noreferrer")`.
   */
  shagunProductRedirect: (id: string) =>
    request<{ redirectUrl: string }>(`/v1/shagun/products/${id}/redirect`, { auth: true }),

  // ─── Booking chat ───────────────────────────────────────────────────────

  /** Message history for a booking thread (astrologer or pooja), oldest first. */
  listBookingMessages: (bookingType: BookingType, bookingId: string) =>
    request<BookingMessage[]>(`/v1/bookings/${bookingType}/${bookingId}/messages`, { auth: true }),

  /** Send a message on a booking thread. */
  sendBookingMessage: (bookingType: BookingType, bookingId: string, body: string) =>
    request<BookingMessage>(`/v1/bookings/${bookingType}/${bookingId}/messages`, {
      method: "POST",
      body: { body },
      auth: true,
    }),
};

// ─── Kundli helpers ──────────────────────────────────────────────────────────

async function kundliRequest(method: "GET" | "POST", path: string): Promise<KundliResult> {
  const headers: Record<string, string> = { ...(await authHeader()) };
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method, headers });
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the server");
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (res.status === 200 || res.status === 202 || res.status === 422) {
    return data as KundliResult;
  }
  const err = (data as { error?: { code?: string; message?: string; requestId?: string } } | null)
    ?.error;
  throw new ApiError(
    res.status,
    err?.code ?? "http_error",
    err?.message ?? `Request failed (${res.status})`,
    err?.requestId,
  );
}

async function pollKundli(
  opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<KundliResult> {
  const baseMs = opts.intervalMs ?? 2000;
  const deadline = Date.now() + (opts.timeoutMs ?? 60_000);
  let attempt = 0;
  while (true) {
    if (opts.signal?.aborted) throw new ApiError(0, "aborted", "Request aborted");
    const r = await kundliRequest("GET", "/v1/kundli");
    if (r.status !== "pending" && r.status !== "generating") return r;
    const delay = nextPollDelay(attempt++, { baseMs });
    if (Date.now() + delay > deadline) return r; // give up but surface latest pending state
    await new Promise((res) => setTimeout(res, delay));
  }
}

// ─── Horoscope helpers ────────────────────────────────────────────────────────

async function horoscopeRequest(period: PersonalizedHoroscopePeriod, language?: string): Promise<HoroscopeResult> {
  const headers: Record<string, string> = { ...(await authHeader()) };
  const langQs = language ? `&language=${encodeURIComponent(language)}` : "";
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/v1/horoscope?period=${period}${langQs}`, { method: "GET", headers, cache: "no-store" });
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the server");
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (res.status === 200) {
    return { status: "ready", ...(data as PersonalizedHoroscope) };
  }
  if (res.status === 202) {
    return data as HoroscopePending;
  }
  const err = (data as { error?: { code?: string; message?: string; requestId?: string } } | null)
    ?.error;
  throw new ApiError(
    res.status,
    err?.code ?? "http_error",
    err?.message ?? `Request failed (${res.status})`,
    err?.requestId,
  );
}

async function pollHoroscope(
  period: PersonalizedHoroscopePeriod,
  opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal; language?: string } = {},
): Promise<HoroscopeResult> {
  const baseMs = opts.intervalMs ?? 2000;
  const deadline = Date.now() + (opts.timeoutMs ?? 60_000);
  let attempt = 0;
  while (true) {
    if (opts.signal?.aborted) throw new ApiError(0, "aborted", "Request aborted");
    const r = await horoscopeRequest(period, opts.language);
    if (r.status !== "generating") return r;
    const delay = nextPollDelay(attempt++, { baseMs });
    if (Date.now() + delay > deadline) return r; // give up but surface latest pending state
    await new Promise((res) => setTimeout(res, delay));
  }
}

// ─── House insight helpers ────────────────────────────────────────────────────

async function houseInsightRequest(house: number, language?: string): Promise<HouseInsightResult> {
  const headers: Record<string, string> = { ...(await authHeader()) };
  const qs = language ? `?language=${encodeURIComponent(language)}` : "";
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/v1/kundli/houses/${house}/insight${qs}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the server");
  }
  if (res.status === 403) return { status: "forbidden" };
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (res.status === 200) return data as HouseInsightReady;
  if (res.status === 202) return data as HouseInsightPending;
  const err = (data as { error?: { code?: string; message?: string; requestId?: string } } | null)
    ?.error;
  throw new ApiError(
    res.status,
    err?.code ?? "http_error",
    err?.message ?? `Request failed (${res.status})`,
    err?.requestId,
  );
}

async function gemstoneRequest(language?: string): Promise<GemstoneResult> {
  const headers: Record<string, string> = { ...(await authHeader()) };
  const qs = language ? `?language=${encodeURIComponent(language)}` : "";
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/v1/gemstone${qs}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the server");
  }
  if (res.status === 403) return { status: "forbidden" };
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (res.status === 200) return data as GemstoneReportReady;
  if (res.status === 202) return data as GemstonePending;
  const err = (data as { error?: { code?: string; message?: string; requestId?: string } } | null)
    ?.error;
  throw new ApiError(
    res.status,
    err?.code ?? "http_error",
    err?.message ?? `Request failed (${res.status})`,
    err?.requestId,
  );
}

async function pollHouseInsight(
  house: number,
  language?: string,
  opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<HouseInsightResult> {
  const baseMs = opts.intervalMs ?? 2000;
  const deadline = Date.now() + (opts.timeoutMs ?? 60_000);
  let attempt = 0;
  while (true) {
    if (opts.signal?.aborted) throw new ApiError(0, "aborted", "Request aborted");
    const r = await houseInsightRequest(house, language);
    if (r.status !== "generating") return r;
    const delay = nextPollDelay(attempt++, { baseMs });
    if (Date.now() + delay > deadline) return r; // give up but surface latest pending state
    await new Promise((res) => setTimeout(res, delay));
  }
}
