# Aroha Astrology — PII & Data-Privacy Compliance Audit

**Date:** 2026-07-11
**Scope:** Live TypeScript backend (`backend/src`), frontend (this repo), and mobile native shell (`C:\dev\aroha-astrology\mobile`).
**Method:** Direct code read (schema, routes, services, middleware, legal content, Android manifest). No code was changed.

> This is a technical/code-level assessment, not legal advice. The codebase's own privacy policy already says its text is "a considered draft, not legal advice" and needs review by qualified Indian counsel before it's legally effective — that stands.

## Verdict

Closer to launch-ready than a typical MVP, but **not yet "good to go"** — two concrete blockers, plus several smaller gaps. The hard architectural work (consent modeling, audit trail, deletion endpoint, no rogue trackers) is already done well; what's missing is finishing the last mile.

---

## What's already solid (matches or beats typical astrology-app practice)

- **A real, DPDP Act–literate Privacy Policy/Terms/Disclaimer** already exist and are live-linked in the app: `lib/legal-content.ts`. They correctly cite DPDP Act §§5, 6, 8(6), 11–16, IT Act/SPDI Rules, IT Intermediary Rules 2021 grievance timelines, the Consumer Protection Act, and even the Drugs and Magic Remedies Act (relevant because "remedies"/gemstone content could otherwise look like a cure claim). More thorough than most Indian astrology apps bother to publish.
- **Consent is properly modeled, not just a checkbox**: an append-only `user_consent_log` table records IP/user-agent/timestamp/policy-version per grant or withdrawal, separately for terms/privacy/marketing/data-processing/WhatsApp (`backend/src/db/schema.ts:466-495`). Onboarding and the retrofit `ConsentGate` both correctly call the real persistence endpoint (`components/ConsentGate.tsx:31-37`, `app/onboarding/page.tsx:298-304`) and link the actual policy text before the checkbox can be ticked.
- **Account deletion exists**: `DELETE /v1/me` cascades to soft-delete third-party birth profiles and revoke push tokens (`backend/src/modules/users/users.service.ts:396-403`).
- **Mobile permissions are minimal and justified** — just `INTERNET`, coarse/fine location (for the Panchang feature, commented as such), and `POST_NOTIFICATIONS`. No contacts/storage/camera grabs.
- **No ad-tech/analytics trackers found anywhere** (no Google Analytics, Meta Pixel, Mixpanel, Hotjar) — matches the policy's own claim of "we do not use it for third-party advertising."
- **Request logging is PII-clean** (method/path/status/duration only, never bodies) — `backend/src/middleware/logger.ts`.

---

## Blockers — fix before calling this launch-ready

### 1. The shipped Privacy Policy/Terms still contain literal placeholders

`[AROHA LEGAL ENTITY NAME]`, `[REGISTERED ADDRESS, INDIA]`, `[GRIEVANCE OFFICER NAME]`, `[grievance@aroha.app]`, `[CITY, STATE]` jurisdiction all appear verbatim in the live document (`lib/legal-content.ts:44,144,209`).

A policy that names no real legal entity or grievance officer doesn't satisfy the DPDP Act §5 notice requirement or the IT Rules 2021 grievance-officer mandate. This is the single most visible gap a reviewer — or a comparison against an established competitor like AstroTalk, which names a real registered entity and grievance officer — would flag first.

### 2. The policy promises something the code doesn't do

Privacy Policy §6 states deleted accounts are "permanently erased from active systems within 30 days." In reality:

- `DELETE /v1/me` only sets `deletedAt` (soft delete) — no cron or job ever anonymizes or hard-deletes the row.
- The `anonymizedAt` column exists in the schema (`backend/src/db/schema.ts:350`) but is **never written anywhere** in the application code.
- The only hard-delete path, `hardDeleteUserById` (`backend/src/modules/users/users.repo.ts:106`), is reachable exclusively from an internal Telegram admin-bot command (`backend/src/modules/telegram-bot/telegram-bot.commands.ts:48`) — not any automated user-facing or scheduled process.

A stated erasure promise the system doesn't actually honor is a real DPDP Act liability, not just tech debt — either build the 30-day purge job, or soften the policy language to match reality.

---

## Smaller gaps worth fixing

- **No minimum-age enforcement.** Terms §1 requires users 18+, but nothing validates `dateOfBirth` against that at signup — a minor's birth data could be onboarded with nothing technically blocking it, despite the DPDP Act's strict verifiable-parental-consent requirement for under-18 data (which the Terms explicitly say the Service doesn't support).
- **Domain mismatch.** The legal docs and `GET /legal/current` reference `aroha.app` (`aroha.app/legal/*`, `grievance@aroha.app`) while the live product is on `arohaastrology.in` (`backend/src/modules/legal/legal.routes.ts:49-51`). If `aroha.app` isn't an owned, live domain, these are dead links/addresses inside a legal document.
- **`POST /legal/accept` is a wired, documented, but dead no-op** ("TODO: persist acceptance timestamps...", `backend/src/modules/legal/legal.routes.ts:84-89`). Not currently harmful since the real UI paths use `PATCH /v1/me`'s `consent` object instead, but it's a live public API route that silently does nothing if anything ever calls it expecting persistence — fix or remove it.
- **Payments are mock-only** (`gatewayProvider: 'mock'`, `backend/src/modules/billing/billing.service.ts:107`) — no real Razorpay/Stripe integration, DPA, or webhook-signature verification exists yet. Needs a tokenized/hosted-checkout integration (never touching raw card data server-side) before real money moves through the app.
- **`/docs` and `/openapi.json` are unauthenticated and public**, exposing the full internal API surface (including cron/Telegram route shapes). Fine for staging; worth a deliberate decision before production.
- **`android:allowBackup="true"`** in `AndroidManifest.xml` lets the app's local storage ride along in Android's automatic cloud backup — worth restricting given how identity-linked (birth data, gotra, sankalpa name) the stored data is.
- **Unverified DB transport encryption.** Couldn't confirm the production `DATABASE_URL` enforces TLS (`sslmode=require`) — it's an environment secret not inspected in this audit. Confirm directly on the EC2 box's `.env`.

---

## Recommended next steps, in order

1. Finalize the registered legal entity name, address, and grievance officer contact; replace every bracketed placeholder in `lib/legal-content.ts` and the backend's `/legal/current` response.
2. Decide: either implement the 30-day anonymization/purge job the policy promises, or rewrite that clause to describe what the system actually does today.
3. Add a client + server minimum-age check on `dateOfBirth` at onboarding.
4. Confirm `aroha.app` is a real, owned, live domain — or switch all legal references to `arohaastrology.in`.
5. Remove or properly wire `POST /legal/accept`.
6. Before enabling real payments: integrate a licensed payment aggregator (Razorpay/Cashfree) via hosted/tokenized checkout, with signed webhook verification.
7. Get the finished policy text reviewed and signed off by a qualified Indian data-privacy lawyer — required both by the document's own header and by the stakes of handling payment + sensitive birth/identity data at scale.
