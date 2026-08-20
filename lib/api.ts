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
import type { RegionId } from "@/lib/panchang/regions";

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
  /** Set for Google sign-in users (no phone claim on the token); may also backfill onto a phone user. */
  email: string | null;
  displayName: string | null;
  gender: Gender;
  dateOfBirth: string | null; // YYYY-MM-DD
  timeOfBirth: string | null; // HH:mm[:ss]
  placeOfBirth: PlaceOfBirth | null;
  /** False once the user has used their one lifetime birth-detail (DOB/time/place) edit. */
  canEditBirthDetails: boolean;
  profileCompletedAt: string | null;
  /**
   * This account was erased once and the same person has signed back in. Their
   * phone number is deliberately kept on the account shell, so they land on the
   * SAME account with every detail blank rather than a brand-new one — this is
   * only used to greet them with "welcome back, we'll need your details again"
   * instead of treating them as a first-time user.
   */
  previouslyDeleted: boolean;
  /**
   * ISO timestamp of a deletion request awaiting admin review, or null. While
   * set, the account still works but receives no push notifications and no
   * generated horoscopes.
   */
  deletionRequestedAt: string | null;
  /** Gates onboarding-analysis/chat/forecast/matchmaking server-side (requireConsent). */
  dataProcessingConsentActive: boolean;
  /**
   * Version of the Terms the user actually agreed to. Compared against
   * LEGAL_VERSION in AuthGuard to re-prompt when the documents change —
   * null for accounts that consented before versions were recorded.
   */
  termsVersion: string | null;
  /** Wallet balance in paise, spendable for unlocking kundli house details (POST /v1/me/unlock-house). */
  walletBalancePaise: number;
  /** House numbers (1-12) already unlocked for this user; house 1 is free by default. */
  unlockedHouses: number[];
  /** True once the user has spent wallet balance to unlock the full gemstone report (POST /v1/me/unlock-gemstone). */
  gemstoneUnlocked: boolean;
  /**
   * True once this user has rated us through our own feedback sheet, on any
   * device. FeedbackPrompt reads it so a reinstall or a second phone doesn't
   * re-ask someone who already answered. Nothing to do with the Play Store
   * card, which reports no outcome back and can never set it.
   */
  feedbackGiven: boolean;
  /**
   * Keys (e.g. "independence_day_2026") of every one-time claim campaign this
   * user has already redeemed via POST /v1/me/claim-bonus/{campaignKey} — see
   * the backend's config/campaigns.ts. Server truth, so a claim modal never
   * offers a claim a second device already redeemed.
   */
  claimedCampaigns: string[];
  /**
   * Whichever self-claim gift campaign (festival or custom) is currently
   * live and eligible for this user, or null. Server-computed — see
   * resolveActiveClaimableCampaign in the backend's users.service.ts.
   */
  activeClaimableCampaign: {
    key: string;
    title: string;
    amountPaise: number;
    validUntil: string;
  } | null;
  /** Referral code for this user */
  referralCode: string | null;
  /** Source of the referral (who referred this user) */
  referredByCode: string | null;
  /**
   * Server-side admin feature toggles, keyed by feature id (e.g. "nav.vastu",
   * "home.matchmaking", "paid.gemstone", "reports.marriage"). A key absent
   * from this map (old cached response, or a key this client build doesn't
   * know about yet) must be treated as enabled — see hooks/useFeature.ts,
   * which fails open on a missing key. Never trust a blank/missing map as
   * "everything disabled".
   */
  features: Record<string, FeatureState>;
  /** True for admin accounts — gates the (separate, not-yet-built) /admin dashboard. */
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

/** One entry in `User.features` — an admin-controlled toggle for a nav tab, home card, or paid feature. */
export interface FeatureState {
  enabled: boolean;
  /** Server-resolved price in paise for a paid feature, or null when the feature has no price (e.g. a nav tab). */
  pricePaise: number | null;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  /** Where tapping this notification should navigate to, e.g. '/reports/abc123'. Null for
   * notifications with nothing to deep-link to. */
  link: string | null;
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
  region: RegionId;
  calendar: string;
  monthSystem: string;
  monthIndex: number;
  monthName: string;
  dayOfMonth?: number;
  paksha?: string;
  year: number;
  isAdhikMaas?: boolean;
  adhikMaasLabel?: string;
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
  tithi:
    | {
        number: number;
        name: string;
        paksha: string;
        deity: string;
        isAuspicious: boolean;
        /** HH:mm this tithi ends (i.e. when the next one begins) — computed via swe_rise_trans-style angle-crossing search, not present on cached rows written before this field existed. */
        endsAt?: string;
        /** Name of the tithi that begins at `endsAt`. */
        nextName?: string;
      }
    | null;
  nakshatra:
    | {
        index: number;
        name: string;
        lord: string;
        pada: number;
        deity: string;
        /** HH:mm this nakshatra ends (i.e. when the next one begins). */
        endsAt?: string;
        /** Name of the nakshatra that begins at `endsAt`. */
        nextName?: string;
      }
    | null;
  yoga: { index: number; name: string; isAuspicious: boolean } | null;
  karana: { index: number; name: string; isFixed: boolean } | null;
  vara?: string;
  rahuKaal?: PanchangTimeWindow;
  gulikaKaal?: PanchangTimeWindow;
  yamagandaKaal?: PanchangTimeWindow;
  abhijitMuhurta?: PanchangTimeWindow;
  sunriseTime?: string;
  sunsetTime?: string;
  /** Local HH:mm moonrise, computed via swe_rise_trans (SE_MOON). Absent (not just missing — legitimately null-able) on days the Moon doesn't rise in the civil-day window. */
  moonriseTime?: string;
  /** Local HH:mm moonset, computed via swe_rise_trans (SE_MOON). Same absence caveat as moonriseTime. */
  moonsetTime?: string;
  regionalMonths?: Record<RegionId, PanchangRegionalMonth>;
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
  regionalMonths?: Record<RegionId, PanchangRegionalMonth> | null;
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
  /** Recommended gemstone weight in carats, computed from the body weight (kg) captured at
   * unlock time. Null when no weight was ever supplied (e.g. unlocked before this existed). */
  recommendedCarats: number | null;
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
  | "report_unlock";

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
  /** Overridable for tests; defaults to DEFAULT_REQUEST_TIMEOUT_MS. */
  timeoutMs?: number;
}

/**
 * A stalled connection (bad mobile network, a hung backend, a dropped
 * WebView socket) used to leave callers `await`-ing forever with no
 * error and no way to recover — e.g. onboarding's confirm button showing
 * an infinite spinner. Every request is now bounded by this ceiling.
 */
const DEFAULT_REQUEST_TIMEOUT_MS = 25_000;

/**
 * Exported so `lib/admin-api.ts` (and any other typed client that needs the
 * same fetch/auth/error-parsing behavior) can reuse it directly instead of
 * duplicating this logic — see request()'s own contract below.
 */
export async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, auth: needsAuth = false, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const run = async (): Promise<T> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (needsAuth) Object.assign(headers, await authHeader());

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch {
      // Network / mixed-content / CORS failure, or the timeout below aborting mid-flight.
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
  };

  try {
    // Races run() against the same abort signal so a stall BEFORE fetch()
    // even starts (e.g. Firebase's own getIdToken() network call inside
    // authHeader()) is also bounded — not just a stalled fetch() itself.
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () =>
          reject(new ApiError(0, "timeout", "Request timed out — check your connection and try again")),
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Uploads raw bytes (a captured/selected photo) with `Content-Type: image/jpeg` — separate
 * from `request()` because that helper always JSON.stringifies `body`, which would mangle a
 * Blob. Used by lib/palm-api.ts to POST a palm-capture frame directly (the backend now stores
 * these on local disk on the API server itself, not a signed-URL cloud bucket, so the bytes
 * go straight through this one authenticated call).
 */
export async function requestBinaryUpload(path: string, blob: Blob): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "image/jpeg" };
  Object.assign(headers, await authHeader());

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers, body: blob });
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the server");
  }

  if (!res.ok) {
    const text = await res.text();
    const data = text ? safeJson(text) : null;
    const err = (data as { error?: { code?: string; message?: string; requestId?: string } } | null)
      ?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "http_error",
      err?.message ?? `Request failed (${res.status})`,
      err?.requestId,
    );
  }
}

/** Authenticated binary download — returns the raw response as a Blob. Used to load a
 * captured palm frame into an `<img>` via `URL.createObjectURL`, since the backend serves it
 * from local disk behind the same bearer-token auth every other route uses (no signed URL —
 * an `<img src>` can't carry an Authorization header, so the caller fetches the bytes here and
 * hands the resulting object URL to the `<img>` instead). */
export async function requestBinaryDownload(path: string): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method: "GET", headers: await authHeader() });
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the server");
  }
  if (!res.ok) {
    throw new ApiError(res.status, "http_error", `Request failed (${res.status})`);
  }
  return res.blob();
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
  /** Planet name, or "General" for the chartless fallback entries. */
  planet: string;
  title: string;
  remedy: string;
  icon: string;
  /** Slugs for the shared image-per-remedy asset library. */
  actions?: string[];

  /* Detailed Lal Kitab fields — sent for the nine per-planet entries, absent
   * on general/fallback ones. See RemedyItem in the backend's
   * modules/astro/astro.service.ts for the authoritative definitions. */
  remedies?: string[];
  totke?: string[];
  natalHouse?: number;
  /** Lal Kitab's fixed-house number (Aries = 1st house), which legitimately
   * differs from the ascendant-based natalHouse — both are shown. */
  lalKitabHouse?: number;
  pakkaGhar?: number;
  isInPakkaGhar?: boolean;
  displacement?: string;
  blindness?: "blind" | "half-blind";
  blindReason?: string;

  /* Local-only fields on REMEDIES_FALLBACK entries; the API never sends these. */
  id?: string;
  description?: string;
  category?: string;
}

/** An ancestral/karmic debt (Rin) detected in the chart. Only debts actually
 * present are returned — never the full set of eight. */
export interface LalKitabDebt {
  /** e.g. "Pitra Rin". A proper noun; left untranslated. */
  type: string;
  /** The chart placements that flagged this debt. */
  indicators: string[];
  remedies: string[];
}

/** Lal Kitab's arithmetic year chart: every planet advances one house per
 * year of age, so this refreshes on the reader's birthday. */
export interface AnnualRotation {
  age: number;
  /** The year's point of focus, counted from the natal Ascendant. */
  muntha: number;
  planets: {
    planet: string;
    natalHouse: number;
    annualHouse: number;
    dignityDelta: number;
    remedies: string[];
    totke: string[];
  }[];
  /** The year's benefactor. */
  kismatKaGrah: string | null;
  /** Where the year's turbulence comes from — prioritise this one's remedy. */
  dhokheKaGrah: string | null;
}

/** The plain-language layer, generated once per profile and cached server-side.
 * Keys are planet names and debt types, matching RemedyItem.planet and
 * LalKitabDebt.type — those stay English even in a translated payload, because
 * they are lookup identifiers rather than display text. */
export interface RemedySimpleText {
  intro: string;
  planets: Record<string, string>;
  debts: Record<string, string>;
}

export interface RemediesResponse {
  remedies: RemedyItem[];
  debts: LalKitabDebt[];
  annual: AnnualRotation | null;
  /** Null until generation finishes; the rest of the page renders without it. */
  simple: RemedySimpleText | null;
  /** 'generating' means it is worth polling again shortly. */
  simpleStatus: "ready" | "generating" | "unavailable";
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
  /** UI language to generate the AI remedies in — backend defaults to 'en' if omitted. */
  language?: string;
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

// ─── Support tickets ────────────────────────────────────────────────────────

/** Caller-facing shape — no `userId` (implicit: always the caller's own). `adminNote` is the support team's reply, shown to the user. */
export interface SupportTicket {
  id: string;
  category: string;
  message: string;
  locale: string | null;
  appVersion: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
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

  /**
   * Request deletion of the current account. This does NOT erase anything — it
   * files a request an admin reviews within 3–7 business days, and only their
   * approval runs the actual scrub (users.repo.ts anonymizeUserById). The
   * account keeps working until then, minus push notifications and horoscopes.
   * Idempotent: calling it again keeps the original request date.
   */
  deleteMe: () => request<void>("/v1/me", { method: "DELETE", auth: true }),
  /**
   * DPDP §11 / GDPR Art. 15 & 20 data export. Returns the raw JSON so the
   * caller can hand it straight to a download — deliberately untyped, since
   * the payload is a snapshot of many tables rather than a fixed contract.
   */
  exportMyData: () => request<unknown>("/v1/me/export", { auth: true }),

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
   * Claim a one-time wallet bonus campaign (e.g. "independence_day_2026" —
   * see the backend's config/campaigns.ts). `claimed: false` in the response
   * means this user already claimed it before, not an error. Throws ApiError
   * with status 409 if the claim window has closed or the offer is disabled.
   * Caller should re-fetch the user (`refresh()` from useAuth) afterward to
   * pick up the updated wallet balance/claimedCampaigns.
   */
  claimCampaignBonus: (campaignKey: string) =>
    request<{ claimed: boolean; walletBalancePaise: number }>(
      `/v1/me/claim-bonus/${campaignKey}`,
      { method: "POST", auth: true },
    ),

  /**
   * Spend wallet balance to unlock the full gemstone report (whole report, one-time).
   * `weightKg` (20-300) is captured here and used server-side to compute a recommended
   * gemstone carat weight (see GemstoneReportReady.recommendedCarats) — stored for reuse
   * elsewhere too, not just this one calculation.
   * Throws ApiError with status 409 if the user has insufficient balance or the
   * report is already unlocked. Caller should re-fetch the user (`refresh()`
   * from useAuth) afterward to pick up the updated wallet balance/gemstoneUnlocked.
   */
  unlockGemstone: (weightKg?: number) =>
    request<{ success: boolean }>("/v1/me/unlock-gemstone", {
      method: "POST",
      auth: true,
      body: { weightKg },
    }),

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

  /** Full Lal Kitab remedy reading for the active profile: every classical
   * planet in its natal house, plus the karmic debts present in the chart.
   * `language` selects the language of the plain-language layer only — the
   * deterministic remedy text is served as-is. */
  remedies: (language?: string) =>
    request<RemediesResponse>(
      `/v1/remedies${language ? `?language=${encodeURIComponent(language)}` : ""}`,
      { auth: true },
    ),

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
  getKundli: (language?: string) =>
    kundliRequest("GET", `/v1/kundli${language ? `?language=${encodeURIComponent(language)}` : ""}`),

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
    return request<{
      year: number;
      month: number;
      days: PanchangMonthDay[];
      regionalMonths?: Record<RegionId, PanchangRegionalMonth>;
    }>(`/v1/panchang/month?${params.toString()}`, { auth: true });
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

  /** Ask one free follow-up question about a completed Vastu report — answered directly in `language` (defaults to the plan's original generation language server-side). */
  vastuAsk: (id: string, question: string, language?: string) =>
    request<VastuPlan>(`/v1/vastu/${id}/ask`, { method: "POST", body: { question, language }, auth: true }),

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
  pollKundli: (opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal; language?: string } = {}) =>
    pollKundli(opts),

  /** Purchasable top-up amounts. */
  billingTopUpAmounts: () =>
    request<{ amounts: TopUpAmount[]; razorpayEnabled: boolean }>("/v1/billing/top-up-amounts", {
      auth: true,
    }),

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

  /** Create a pending order plus its Razorpay order — everything checkout.js needs to open the modal. */
  razorpayCheckout: (packId: string, couponCode?: string) =>
    request<{ order: Order; razorpayOrderId: string; razorpayKeyId: string }>(
      "/v1/billing/razorpay/order",
      { method: "POST", body: couponCode ? { packId, couponCode } : { packId }, auth: true },
    ),

  /** Hand Razorpay's payment ids back to the server, which verifies the signature before granting. */
  verifyRazorpayPayment: (params: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) =>
    request<{ order: Order; walletBalancePaise: number }>("/v1/billing/razorpay/verify", {
      method: "POST",
      body: params,
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

  /**
   * File a new support ticket. `locale`/`appVersion` fall back server-side to
   * the user's own row when omitted — pass them explicitly to reflect the
   * language/build the user is actually on right now.
   */
  createSupportTicket: (body: { category: string; message: string; locale?: string; appVersion?: string }) =>
    request<SupportTicket>("/v1/support/tickets", { method: "POST", body, auth: true }),

  /** The current user's own support tickets, newest first — never another user's. */
  listMySupportTickets: () =>
    request<{ tickets: SupportTicket[] }>("/v1/support/tickets", { auth: true }),

  /** Our own star rating + written comment. Unrelated to the Play Store review
   * card (lib/app-review.ts), which reports nothing back and stores nothing here. */
  submitFeedback: (body: { rating: number; comment?: string }) =>
    request<{ id: string; received: boolean }>("/v1/feedback", { method: "POST", body, auth: true }),
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
  opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal; language?: string } = {},
): Promise<KundliResult> {
  const baseMs = opts.intervalMs ?? 2000;
  const deadline = Date.now() + (opts.timeoutMs ?? 60_000);
  const path = `/v1/kundli${opts.language ? `?language=${encodeURIComponent(opts.language)}` : ""}`;
  let attempt = 0;
  while (true) {
    if (opts.signal?.aborted) throw new ApiError(0, "aborted", "Request aborted");
    const r = await kundliRequest("GET", path);
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

/* -------------------------------------------------------------------------- */
/* Prediction accuracy                                                        */
/*                                                                            */
/* The app records every dated claim it makes (prediction_outcomes on the      */
/* backend). These two calls are the half that only the user can supply:       */
/* whether the thing actually happened. Without them the accuracy table fills  */
/* with predictions and never gets a single verdict.                          */
/* -------------------------------------------------------------------------- */

export interface DuePrediction {
  id: string;
  surface: string;
  domain: string | null;
  claim: string;
  windowStart: string | null;
  windowEnd: string | null;
  confidence: string | null;
}

/** Predictions whose window has CLOSED and which this user has not yet rated. */
export async function getDuePredictions(): Promise<DuePrediction[]> {
  const res = await request<{ predictions: DuePrediction[] }>("/v1/astro/predictions/due", {
    auth: true,
  });
  return res.predictions ?? [];
}

/** -1 = did not happen, 0 = unclear, 1 = happened. */
export async function ratePrediction(
  id: string,
  rating: -1 | 0 | 1,
): Promise<void> {
  await request<{ ok: boolean }>(`/v1/astro/predictions/${id}/rate`, {
    method: "POST",
    body: { rating, happened: rating === 1 },
    auth: true,
  });
}

/* -------------------------------------------------------------------------- */
/* Birth-time rectification                                                   */
/* -------------------------------------------------------------------------- */

export type RectifyDomain =
  | "job_started"
  | "promotion"
  | "job_loss"
  | "business_started"
  | "retirement"
  | "engagement"
  | "marriage"
  | "divorce"
  | "childbirth"
  | "bereavement"
  | "property_bought"
  | "vehicle_bought"
  | "big_financial_gain"
  | "relocation"
  | "health_crisis"
  | "accident_injury"
  | "legal_case"
  | "foreign_travel"
  | "education_milestone";

export interface RectifyEvent {
  /** 'YYYY-MM-DD'. */
  date: string;
  domain: RectifyDomain;
}

export interface RectifySuggestion {
  time: string;
  offsetMinutes: number;
  ascendantSign: string;
  matched: number;
  confidence: "low" | "medium" | "high";
  reasoning: string;
}

/**
 * Asks the server to suggest a corrected birth time from dated life events.
 *
 * Returns null when the events cannot single out a time. The server NEVER
 * applies the suggestion by itself — changing a stored birth time would rewrite
 * every chart and report already generated, so accepting it stays an explicit
 * user action.
 */
export async function rectifyBirthTime(
  events: RectifyEvent[],
  windowMinutes?: number,
): Promise<RectifySuggestion | null> {
  const res = await request<{ suggestion: RectifySuggestion | null }>("/v1/astro/rectify", {
    method: "POST",
    body: windowMinutes ? { events, windowMinutes } : { events },
    auth: true,
  });
  return res.suggestion;
}
