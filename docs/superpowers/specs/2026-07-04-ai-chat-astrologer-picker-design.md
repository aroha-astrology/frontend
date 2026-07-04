# AI Chat: Astrologer Picker Before Chat

## Problem

Today, tapping the "Ask AI" tab (`/ai-chat`) drops the user straight into a live chat with Yogi Baba, with the other 3 personas (Pandit Vikram, Gauri, Dr. Kavitha) available only as small pills above the message thread. This buries persona choice inside the chat UI and doesn't give each astrologer a proper introduction.

Reference UX (from `C:\Users\subir\jyotish-ai\apps\mobile`, an earlier product in the same lineage): a list screen presents astrologer/persona cards; tapping one navigates into a dedicated chat screen for that astrologer, with a back button returning to the list.

## Goal

Replace the inline picker with a two-step flow on the same `/ai-chat` route:
1. **List view** (default): cards for the 4 existing personas.
2. **Chat view**: opens on tap, scoped to the chosen persona, with a back button to return to the list.

No backend changes — personas, streaming, and the NIM-backed chat endpoint (`streamChat` in `lib/swarm-api.ts`) are unchanged. This is a client-side restructuring of `app/ai-chat/page.tsx`.

## Non-goals

- No persistence of chat history across visits or page reloads (matches today's behavior — state is in-memory only).
- No real "online" presence or ratings backend — these are static/cosmetic on the list cards, matching the reference's own hardcoded values.
- No change to the streaming/backend contract, suggestion chips content, or the 4 existing personas' identities.

## Architecture

`app/ai-chat/page.tsx` becomes a thin shell:

```tsx
const [selectedPersona, setSelectedPersona] = useState<ChatPersona | null>(null);

return selectedPersona === null
  ? <AstrologerList onSelect={setSelectedPersona} />
  : <ChatConversation key={selectedPersona} persona={selectedPersona} onBack={() => setSelectedPersona(null)} />;
```

- `key={selectedPersona}` forces React to remount `ChatConversation` fresh each time a (possibly different) persona is selected — this is what gives every visit a fresh greeting and empty history without any manual reset logic.
- Browser back button does not pop from chat to list (accepted tradeoff of staying on one URL instead of a dynamic route — no deep-linking/URL state for the selected persona).

### New files

- `lib/personas.ts` — moves the existing `PERSONAS` array (avatar, `nameKey`, `specialtyKey`) out of `page.tsx` so both new components can import it; adds a static `rating: number` per persona for the card's cosmetic star rating: `general` 4.9, `career` 4.8, `love` 4.9, `health` 5.0.
- `components/ai-chat/AstrologerList.tsx` — the new picker screen (see below).
- `components/ai-chat/ChatConversation.tsx` — today's chat logic (message state, `streamChat` wiring, thinking-indicator cycling, message bubbles, input bar) moved verbatim from `page.tsx`, adapted to take `persona: ChatPersona` and `onBack: () => void` props instead of owning persona-switch state itself. The persona pills row at the top of the current chat UI is removed (persona is now chosen before entering chat); a back button (`ChevronLeft`, reusing `common.back` for its `aria-label`) is added to the header instead.

## List screen design

Header: `aiChatPage.listTitle` ("Choose Your Astrologer") + `aiChatPage.listSubtitle` ("Ask the cosmos anything"), styled consistently with other section headers in the app (e.g. `font-display text-foreground`).

One card per persona, full-width, stacked vertically:

```
┌──────────────────────────────────────────┐
│  🧙  Yogi Baba              ★ 4.9  ●Online│
│      General & Spiritual              ›  │
└──────────────────────────────────────────┘
```

- Avatar: the existing emoji per persona, in a circular badge (reusing the same visual treatment as the current chat header avatar).
- Name / specialty: existing `nameKey` / `specialtyKey` translations — no new copy.
- Rating: static number from `lib/personas.ts`, rendered as `★ {rating}` — cosmetic only, not translated (plain digits).
- "Online" badge: static, always shown as online — these are always-available AI personas, so there's no real offline state to represent.
- Accent color: the app's existing gold/yellow accent (matching the active-pill style already used elsewhere), not the reference's per-persona colors — keeps the picker visually consistent with the rest of the app; the emoji avatars already differentiate the 4 personas.
- Whole card is tappable (`onClick`) — calls `onSelect(persona.key)`.

## i18n additions

All added to `frontend/i18n/resources.ts`, in all 7 language blocks (en, hi, bn, mr, te, ta, gu), following the existing `aiChatPage.*` namespace:

- `aiChatPage.listTitle` — "Choose Your Astrologer"
- `aiChatPage.listSubtitle` — "Ask the cosmos anything"
- `aiChatPage.online` — "Online"
- `aiChatPage.personaGreeting` — templated, replaces the existing fixed `greeting` key (which is hardcoded to Yogi Baba's name/specialty today — a latent bug once other personas are chosen without a page reload). New template: `"Namaste 🙏 I am {{name}}, your AI astrologer for {{specialty}}. Ask me anything."`, interpolated with the already-translated persona name/specialty at render time via `i18next`'s `t(key, { name, specialty })`.
- The old `greeting` key is removed (dead after this change) from all 7 blocks.
- `common.back` is reused for the new back button's `aria-label` — already translated in all 7 languages, no new key needed.
- Suggestion chips (`suggestion1..5`) are unchanged and remain shared across all personas.

## Error handling

No new error paths — `ChatConversation` keeps its existing error handling (stream errors, empty-response fallback, connect errors) unchanged, just relocated from `page.tsx`.

## Testing

Manual verification (no test suite exists for this app currently):
1. Load `/ai-chat` → see the 4-card list, no chat visible.
2. Tap each persona → chat opens with that persona's name/specialty in the header and a correctly personalized greeting.
3. Send a message, confirm streaming still works end-to-end against the live NIM backend.
4. Tap back → returns to the list; re-selecting the same or a different persona starts a fresh conversation (verifies the `key`-based remount).
5. Switch language via the existing language picker → list title/subtitle/online badge and persona greeting all render in the selected language.
