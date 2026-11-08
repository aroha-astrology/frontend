# Varshik Rashifal 2027: image prompts

52 images, coded A1–A53 (there is no A7). Copy each prompt as it is; the shared style is already in it.

**Saving them:**
- Name each file by its code, e.g. `A24-january.png`.
- Keep the full size and put everything in one folder.
- The words "no text, no letters" are in every prompt on purpose. All titles, names and numbers are added later as live text, so they can be translated.
- If an image comes out with a watermark or any lettering, regenerate it.

Also needed (not generated): the **Aroha logo in gold** (SVG or high-res PNG), and a **high-res Baba Ji portrait** if you have one.

## Status (2026-11-06)

**Received.** 55 images in `C:\Users\wookiee\Downloads\Aroha`. The Gemini sparkle watermark is removed from all of them.
- **Method.** Reverse alpha blending. The mark is 48 px; its alpha map was measured from 7 plain-background images and saved as `alpha48.npy`. Its position is fixed for each image size:

  | Size | Position |
  |---|---|
  | 1024² | (898,898) |
  | 1376×768 | (1255,647) |
  | 768×1376 | (647,1255) |

- **Check.** The cleaned spot matches its surroundings on every plain image. The originals are untouched.
- **Where the files are.** Cleaned PNGs are in `Downloads\Aroha-clean`. Copies named by code, with an `-a`/`-b` pick for each, are in `Downloads\Aroha-clean\coded`. `_source-map.txt` maps each original file to its code.

**In hand: 28 codes.** A1 (9:16 only), A2–A6, A8–A11, A17–A22, A24–A35.

**Actual sizes.** Gemini gives fixed sizes:

| Kind | Size |
|---|---|
| Landscape | 1376×768 (16:9) |
| Tall | 768×1376 (9:16) |
| Square | 1024² |

So:
- Month and chapter banners are 16:9, not 3:1.
- Chapter openers are 9:16 and get framed on the A4 page.
- The final asset pass upscales everything 3× with Real-ESRGAN.

**Made in code, so no need to generate:**

| Code | Made from |
|---|---|
| A36 share card | The tall cover, which is exactly 9:16 |
| A37, A38 page backgrounds | CSS/SVG |
| A39 catalogue card | A crop of the cover |
| A46 loading wheel | Cut from the cover |
| A47 ornament | SVG |
| A48 back cover | Dropped |
| A50 gold foil | CSS |

**In the app now (2026-11-07, frontend a1791c8).** The best of each a/b pair is in `public/varshphal/<code>.webp`, mapped in `components/reports/varshik/assets.ts` (`READY`): A1, A2-A6, A8-A11 (navy cut out to transparent), A17-A22, A24-A35. Made from what we have: A36 (the tall cover), A44 (the spare Mercury peepal-leaf image, cut out), A46 (the cover's wheel, feathered round), A39 (`public/reports/varshik_rashifal_2027.png`), A47 (SVG). Picks: A1-a, A2-b, A3-a, A4-a, A5-a, A6-a, A8-b, A9-a, A10-a, A11-a, A17-a, A18-b, A19-a, A20-a, A21-a, A22-a, then Jan-a, Feb-b, Mar-a, Apr-a, May-a, Jun-a, Jul-a, Aug-a, Sep-b, Oct-a, Nov-b, Dec-a.
To add a new image: save it as WebP in `public/varshphal/<code>.webp` (medallions with the background removed) and add the code to `READY`. Until then its slot draws the labelled frame, which must not ship.
Not yet upscaled 3x with Real-ESRGAN (the final pass): the banners are 1376 px wide, fine on a phone, soft on A4 (S6).

**Final asset pass DONE (2026-11-08, commit 9eca602).** The last 17 images (the loose JPGs in `Downloads`, received 2026-11-07) are cleaned, cut out where needed and in `public/varshphal/`: A1 as the 3:4 cover, A12-A16, A23, A40-A45, A49, A51, A52, A53. Every code is in `READY`. No labelled placeholder frame remains on any of the 61 sample pages (checked light and dark, phone 390 px and A4). HD tier: `public/varshphal/hd/<code>.webp` at 3x (Real-ESRGAN x4plus-anime, 4x then resized to 3x, 47 files, ~37 MB); the app files stay at native size (~10 MB). `artHd()` in `assets.ts` points at the HD files; nothing loads them yet (S6 decides for the PDF).

---

## Cover and chapter pages

**A1 cover** (2480×3508, portrait)
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. A large ornate golden zodiac wheel floating in the centre, twelve fine segments with tiny constellation dots in place of symbols, an eight-pointed star at its heart glowing with an iridescent pearl light, a thin golden orbit ring sweeping diagonally around it with small glowing planets on it, empty dark sky in the top third for a title and an empty band at the bottom for a name, symmetric and centred. Portrait format. No text, no letters, no numbers, no logo, no watermark.
```

**A2 Chapter I, "The shape of your year"** (2480×3508)
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. A golden sun completing a full circular orbit around a softly glowing birth chart drawn as a fine square diamond grid, a bright point where the orbit closes, a feeling of a new year beginning, empty sky at the top for a heading. Portrait format. No text, no letters, no numbers, no logo, no watermark.
```

**A3 Chapter II, "Seven areas of life"** (2480×3508)
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. Seven glowing gold-rimmed orbs arranged in a gentle rising arc over a calm reflective lake at night, each orb a slightly different soft colour (rose, gold, emerald, pearl, amber, violet, sky blue), empty sky at the top. Portrait format. No text, no letters, no numbers, no logo, no watermark.
```

**A4 Chapter III, "Your timing"** (2480×3508)
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. An antique brass astrolabe and an Indian stone sundial in the Samrat Yantra style under the stars, a luminous golden wave of light flowing across the scene from left to right like a gentle tide, empty sky at the top. Portrait format. No text, no letters, no numbers, no logo, no watermark.
```

**A5 Chapter IV, "Month by month"** (2480×3508)
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. Twelve lotus petals arranged in a perfect circle like a calendar ring, a different moon phase glowing above each petal, a single diya flame in the centre, empty sky at the top. Portrait format. No text, no letters, no numbers, no logo, no watermark.
```

**A6 Closing, "Carrying it with you"** (2480×1400, landscape)
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. A quiet dawn horizon with the first golden sunrise light, a single lit clay diya on a stone ledge in the foreground, stars fading in the violet upper sky. Wide landscape format. No text, no letters, no numbers, no logo, no watermark.
```

---

## Planet medallions (1024×1024 each, square)

**A8 Sun (Surya)**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it a radiant golden sun disc with soft rays, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A9 Moon (Chandra)**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it a pearl-white crescent moon with a gentle silver glow, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A10 Mars (Mangal)**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it a deep coral-red glowing orb with a small golden trident-like spark above it, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A11 Mercury (Budh)**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it an emerald-green orb with a delicate leaf-shaped light, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A12 Jupiter (Guru)**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it a warm saffron-yellow orb with a soft banded glow, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A13 Venus (Shukra)**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it a brilliant diamond-white orb with a faint rose sheen, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A14 Saturn (Shani)**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it a deep sapphire-blue planet with a thin golden ring, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A15 Rahu**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it a smoky violet shadow orb with a stylised serpent head silhouette curling at its edge, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A16 Ketu**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it a smoky amber shadow orb with a stylised serpent tail silhouette and a small flag-like flame, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

---

## Seven life areas (1600×1000 each, landscape)

**A17 Love**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. Two swans facing each other on a moonlit lotus pond, their necks forming a soft heart shape, rose-gold reflections. Landscape format. No text, no letters, no numbers, no logo, no watermark.
```

**A18 Career**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. A gently glowing stone staircase rising toward a bright star, each step edged in gold light. Landscape format. No text, no letters, no numbers, no logo, no watermark.
```

**A19 Money**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. An ornate brass kalash pot overflowing with soft golden light and a few gold coins, a lotus at its base. Landscape format. No text, no letters, no numbers, no logo, no watermark.
```

**A20 Health**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. A single open lotus floating on still water, a calm circle of breath-like light rising from it. Landscape format. No text, no letters, no numbers, no logo, no watermark.
```

**A21 Family**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. A great banyan tree with a small lit home beneath its branches, warm glowing windows, stars visible through the leaves. Landscape format. No text, no letters, no numbers, no logo, no watermark.
```

**A22 Growth**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. An open ancient book with a small lit diya beside it, a young sapling growing from the pages toward the stars. Landscape format. No text, no letters, no numbers, no logo, no watermark.
```

**A23 Travel**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. A softly glowing path of light crossing a starry map-like sky, a small paper boat sailing along it toward a distant horizon. Landscape format. No text, no letters, no numbers, no logo, no watermark.
```

---

## Twelve month banners (2400×800 each, wide; keep the centre calm)

**A24 January**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars, luxurious, calm and hopeful mood, high detail. Colourful kites rising into a clear winter dawn sky over rooftops, sesame and jaggery sweets on a brass plate in a corner. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

**A25 February**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars, luxurious, calm and hopeful mood, high detail. Endless yellow mustard fields under an early spring night sky with a crescent moon. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

**A26 March**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars, luxurious, calm and hopeful mood, high detail. Soft clouds of pink, saffron and green colour powder drifting in the air, orange palash flowers, festive and gentle. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

**A27 April**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars, luxurious, calm and hopeful mood, high detail. Golden wheat sheaves and a string of mango leaves on a doorway, a new-year harvest feeling under evening stars. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

**A28 May**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet sky with soft nebula haze, fine gold and champagne line-art, luxurious, calm and hopeful mood, high detail. A blazing summer sun setting over a still lotus pond, warm amber light. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

**A29 June**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet sky with soft nebula haze, fine gold and champagne line-art, luxurious, calm and hopeful mood, high detail. The first dark monsoon clouds rolling in with silver rain edges over parched earth. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

**A30 July**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet sky with soft nebula haze, fine gold and champagne line-art, luxurious, calm and hopeful mood, high detail. Raindrops falling on a dancing peacock's spread feathers in a lush green garden at dusk. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

**A31 August**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet sky with soft nebula haze, fine gold and champagne line-art, luxurious, calm and hopeful mood, high detail. A decorated wooden swing (jhoola) hanging from a tree in a green monsoon garden, flowers and fine silk threads. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

**A32 September**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars, luxurious, calm and hopeful mood, high detail. A full moon rising over a calm river with a few floating lotus flowers and distant temple silhouettes. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

**A33 October**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars, luxurious, calm and hopeful mood, high detail. Strings of orange marigold garlands and rows of glowing diyas, a festive night sky with soft fireworks far away. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

**A34 November**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars, luxurious, calm and hopeful mood, high detail. Hundreds of small lamps floating on a river beside stone ghats under a star-filled autumn night. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

**A35 December**
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars, luxurious, calm and hopeful mood, high detail. A misty winter night over Himalayan peaks, a clear starry sky, one warm small light in a mountain hut. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

---

## Cards, backgrounds and ornaments

**A36 share-card background** (1080×1920, tall phone format)
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, luxurious, calm and hopeful mood, high detail. A softly glowing small golden zodiac wheel at the top, the rest of the space a calm gradient night sky with sparse stars, plenty of empty space for text. Tall vertical 9:16 format. No text, no letters, no numbers, no logo, no watermark.
```

**A37 page background, dark** (2480×3508)
```
A very subtle, low-contrast deep midnight navy night-sky texture with faint scattered stars and a thin ornate gold filigree border near the edges, mostly empty, elegant and quiet, suitable as a background behind text. Portrait format. No text, no letters, no numbers, no logo, no watermark.
```

**A38 page background, light** (2480×3508)
```
Warm ivory handmade paper texture with a thin ornate gold filigree border and very faint gold star dust in the corners, mostly empty, elegant and quiet, suitable as a background behind dark text. Portrait format. No text, no letters, no numbers, no logo, no watermark.
```

**A39 catalogue card** (1200×800)
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars and pearl-white orbs, luxurious, calm and hopeful mood, high detail. An ornate golden zodiac wheel with a thin orbit ring and small glowing planets, placed on the right side, empty dark space on the left for a title. Landscape 3:2 format. No text, no letters, no numbers, no logo, no watermark.
```

**A46 loading wheel** (1500×1500)
```
Fine gold and champagne line-art, luxurious, high detail. Only an ornate golden zodiac wheel with twelve fine segments, tiny constellation dots in place of symbols and an eight-pointed star at its heart, perfectly centred and seen flat-on, on a plain flat solid #0B0B2A dark navy background, nothing else. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A47 ornament divider** (2000×300)
```
Fine gold and champagne line-art, luxurious, high detail. A thin symmetrical gold filigree divider line with a small lotus in the centre, on a plain flat solid #0B0B2A dark navy background, nothing else. Very wide thin format. No text, no letters, no numbers, no logo, no watermark.
```

**A48 back cover, optional** (2480×3508)
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, delicate faint stars, luxurious, calm mood. The same night sky as a book cover, with only one small glowing star in the centre and lots of empty space. Portrait format. No text, no letters, no numbers, no logo, no watermark.
```

**A49 wax seal** (1024×1024)
```
Luxurious, high detail. A round antique gold wax seal with an empty smooth circular centre, fine embossed lotus petals around the rim, soft realistic shine, centred on a plain flat solid #0B0B2A dark navy background. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A50 gold foil texture** (2048×2048)
```
A seamless, tileable brushed gold foil texture with subtle warm highlights and fine grain, even all over, no pattern edges, no objects. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A51 portrait frame** (1200×1500)
```
Fine gold and champagne line-art, luxurious, high detail. An ornate oval gold frame with lotus and vine filigree, an empty dark centre for a portrait, centred on a plain flat solid #0B0B2A dark navy background. Portrait format. No text, no letters, no numbers, no logo, no watermark.
```

**A52 "Your questions" banner** (2400×800)
```
Elegant Indian-cosmic illustration, deep midnight navy and violet night sky with soft nebula haze, fine gold and champagne line-art, delicate glowing stars, luxurious, calm and hopeful mood, high detail. A single brass lantern glowing on a stone path at night, lighting the way ahead into soft mist, warm and reassuring. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

**A53 "What changes" banner** (2400×800)
```
Elegant Indian-cosmic illustration, soft violet dawn sky, fine gold and champagne line-art, luxurious, calm and hopeful mood, high detail. A misty forest path opening into a sunlit clearing at dawn, the light growing stronger toward the right side. Very wide banner format, calm uncluttered centre. No text, no letters, no numbers, no logo, no watermark.
```

---

## Remedy icons (1024×1024 each)

Same medallion style as the planets.

**A40 diya**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it a lit clay diya with a steady flame, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A41 rudraksha beads**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it a string of rudraksha prayer beads in a gentle circle, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A42 feeding birds**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it two open hands offering grain to small birds, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A43 water to the sun**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it a copper pot pouring a stream of water toward a rising sun, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A44 peepal leaf**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it a single glowing green peepal leaf, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```

**A45 palm with lotus**
```
Elegant Indian-cosmic illustration, fine gold and champagne line-art, luxurious, high detail. A round medallion with an ornate thin gold rim, centred on a plain flat solid #0B0B2A dark navy background, inside it a small open palm gently holding a pink lotus flower, simple and iconic, readable at small sizes. Square. No text, no letters, no numbers, no logo, no watermark.
```
