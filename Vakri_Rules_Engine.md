# Aroha Astrology — Vakri (Retrograde) Graha Rules Engine

## 1. Purpose

This document defines the implementation specification for retrograde/Vakri planets in Aroha Astrology.

The engine must **not** use simplistic rules such as:

- `Retrograde = bad`
- `Retrograde = 3x stronger`
- `Retrograde Saturn = delayed marriage`
- `Retrograde Venus = ex returns`
- `Retrograde in Dusthana = Viparita Raja Yoga`

Instead, Vakri status must be treated as **one modifier inside a multi-layer Jyotish rules engine**.

---

# 2. Core Architecture

```text
Astronomical Motion
        ↓
Natal / Transit Vakri Status
        ↓
Planetary Strength
        ↓
House + Sign + Lordship
        ↓
Dignity
        ↓
Conjunctions
        ↓
Drishti / Aspects
        ↓
Dispositor
        ↓
Combustion / Planetary War
        ↓
Divisional Charts
        ↓
Yoga Detection
        ↓
Dasha
        ↓
Transit + Station + Shadow
        ↓
Interpretation
        ↓
Karmic / Traditional Layer
        ↓
Confidence Score
```

---

# 3. Fundamental Principle

Retrogression means that a planet's **apparent geocentric longitude temporarily reverses direction** relative to the zodiac.

In Jyotish this is called **Vakri**.

Retrogression is associated with increased **Cheshta Bala / motional strength**.

Important:

> Increased strength does not automatically mean positive results.

A strong planet has greater capacity to deliver its significations. Whether those significations are constructive, difficult, or mixed depends on:

- House
- Sign
- House lordship
- Natural nature
- Functional nature
- Dignity
- Shadbala
- Conjunctions
- Aspects
- Dispositor
- Combustion
- Planetary war
- Navamsha
- Relevant Vargas
- Yogas
- Dasha
- Transit

---

# 4. Planets That Can Be Vakri

The five classical visible planets capable of retrograde motion are:

| Planet | Sanskrit | Vakri |
|---|---|---|
| Mercury | Budha | Yes |
| Venus | Shukra | Yes |
| Mars | Mangala | Yes |
| Jupiter | Guru | Yes |
| Saturn | Shani | Yes |

The following do not behave like ordinary retrograde planets:

| Body | Treatment |
|---|---|
| Sun | Never retrograde |
| Moon | Never retrograde |
| Rahu | Usually retrograde by convention |
| Ketu | Usually retrograde by convention |

For Rahu/Ketu, keep node-specific logic separate from the retrograde strength logic of physical planets.

Mean nodes are conventionally retrograde. True-node calculations can show short deviations and therefore should be handled according to the astronomy implementation used by the application.

---

# 5. Astronomical Calculation

Do **not** determine retrograde status from the number of houses between the Sun and planet.

Incorrect rule:

```text
Planet is 5–8 houses away from Sun → retrograde
```

This should not be implemented.

Retrograde status should come from the astronomical calculation layer.

Conceptually:

```text
current_geocentric_longitude
        ↓
previous_geocentric_longitude
        ↓
calculate apparent longitudinal speed
        ↓
speed < 0
        ↓
RETROGRADE
```

The astronomy library should handle:

- Geocentric longitude
- Apparent motion
- Sidereal conversion
- 0°/360° wrapping
- Station points
- Planetary speed

---

# 6. Motion States

Do not store only:

```json
{
  "retrograde": true
}
```

Use a richer state:

```text
DIRECT
PRE_RETROGRADE_SHADOW
STATION_RETROGRADE
RETROGRADE
POST_RETROGRADE_SHADOW
STATION_DIRECT
DIRECT
```

Example:

```json
{
  "motion_state": "retrograde",
  "is_retrograde": true,
  "station_type": null
}
```

At retrograde station:

```json
{
  "motion_state": "station_retrograde",
  "is_retrograde": true,
  "station_type": "retrograde"
}
```

At direct station:

```json
{
  "motion_state": "station_direct",
  "is_retrograde": false,
  "station_type": "direct"
}
```

---

# 7. Natal vs Transit Retrograde

These must be separate.

## Natal Vakri

Determined from the birth date/time/place.

```json
{
  "natal_retrograde": true
}
```

This becomes a permanent natal chart condition.

## Transit Vakri

Determined from the current date/time.

```json
{
  "transit_retrograde": true
}
```

This is temporary.

Full object:

```json
{
  "planet": "Saturn",
  "natal_retrograde": true,
  "transit_retrograde": true
}
```

---

# 8. Cheshta Bala

Retrograde status should contribute to the planet's **Cheshta Bala**.

Do not implement:

```text
retrograde = good
```

Do not implement:

```text
retrograde = 3x strength
```

Instead:

```text
Vakri
  ↓
increased motional strength
  ↓
greater capacity to express planetary significations
```

The final quality of the result must be determined separately.

---

# 9. Strength ≠ Beneficence

This is a critical architecture rule.

Do not treat:

```text
Strong = Good
```

as equivalent.

Instead:

```text
Strength
=
Capacity to deliver

Beneficence
=
Nature/quality of what is delivered
```

A strong malefic can have greater capacity to deliver difficult results.

A strong benefic can have greater capacity to deliver supportive results.

---

# 10. Functional Nature

Functional benefic/malefic status must be calculated from the Ascendant.

Do not hard-code:

```text
Jupiter = always good
Saturn = always bad
Mars = always bad
```

Store separately:

```json
{
  "planet": "Saturn",
  "natural_nature": "malefic",
  "functional_nature": "benefic"
}
```

Functional nature depends on house lordship for the specific Lagna.

---

# 11. House Analysis

Primary house themes:

| House | Core themes |
|---|---|
| 1 | Self, body, identity |
| 2 | Wealth, speech, family, values |
| 3 | Courage, skills, siblings, communication |
| 4 | Home, mother, property, emotional foundation |
| 5 | Intelligence, children, creativity, education |
| 6 | Competition, service, debts, conflicts |
| 7 | Marriage, partnerships, business relationships |
| 8 | Transformation, inheritance, research, hidden matters |
| 9 | Dharma, higher knowledge, father, guru, fortune |
| 10 | Career, authority, status, public life |
| 11 | Gains, networks, income, ambitions |
| 12 | Foreign lands, expenditure, isolation, spirituality |

Retrograde modifies the expression of the house.

It does not automatically make the house bad.

---

# 12. House Group Logic

## Kendra

Houses:

```text
1, 4, 7, 10
```

Potential themes:

- Strong visibility
- Repeated restructuring
- Internal pressure
- Reassessment of major life areas

Do not automatically predict career change, divorce, or property problems.

---

## Trikona

Houses:

```text
5, 9
```

Potential themes:

- Education
- Intelligence
- Creativity
- Dharma
- Philosophy
- Independent belief systems

Retrograde does not automatically mean past-life talent.

That is a karmic interpretation only.

---

## Dusthana

Houses:

```text
6, 8, 12
```

Potential themes:

### 6th

- Competition
- Service
- Problem-solving
- Debts
- Conflict
- Ability to overcome obstacles

### 8th

- Research
- Transformation
- Hidden matters
- Inheritance
- Sudden changes

### 12th

- Foreign connections
- Expenditure
- Isolation
- Spirituality
- Retreat
- Behind-the-scenes activity

Do not automatically classify these as chronic disease, trauma, loss, or spiritual liberation.

---

## Upachaya

Houses:

```text
3, 6, 10, 11
```

These can show development through time, effort and experience.

A strong retrograde planet in an Upachaya can sometimes produce:

```text
Repeated challenge
        ↓
Skill development
        ↓
Persistence
        ↓
Improvement
```

---

# 13. Previous-House / "House Behind" Rule

Some Jyotish traditions apply a previous-house or previous-sign principle to Vakri planets.

This should be an **optional configuration**, not a universal rule.

Recommended configuration:

```json
{
  "vakri_previous_house_rule": {
    "enabled": false,
    "mode": "secondary_modifier"
  }
}
```

If enabled:

```text
Actual house = Primary interpretation
Previous house = Secondary interpretation
```

Never let the previous-house interpretation override the actual house.

Example:

```text
Retrograde Jupiter in 10th

Primary:
10th-house results

Optional secondary:
9th-house influence
```

The UI should disclose that this is a school-specific interpretation.

---

# 14. Sign and Dignity Engine

Each planet must be classified as:

```text
EXALTED
MOOLATRIKONA
OWN_SIGN
FRIEND_SIGN
NEUTRAL
ENEMY_SIGN
DEBILITATED
```

Retrograde must then be applied as a separate modifier.

---

# 15. Uttara Kalamrita Retrograde Strength Rule

A special classical rule should be implemented as its own rule.

Do not simply convert the planet into an ordinary exalted/debilitated planet.

Recommended representation:

```json
{
  "special_rule": "retrograde_dignity_reversal",
  "source": "Uttara Kalamrita"
}
```

Interpretation:

```text
Retrograde + Exaltation
→ special Neecha-like treatment in the relevant strength calculation

Retrograde + Debilitation
→ special exaltation-like retrograde strength
```

Important:

> This should not be interpreted as saying that every result of the planet becomes exactly identical to a normally debilitated or exalted planet.

The rule should be treated specifically as a classical strength/dignity modification.

---

# 16. Combustion

Retrogression and combustion are separate conditions.

Possible states:

```text
Direct + Non-combust
Direct + Combust
Retrograde + Non-combust
Retrograde + Combust
```

Do not implement:

```text
Combustion cancels retrograde
```

Instead:

```text
Retrograde
+
Combustion
=
two simultaneous conditions
```

Then evaluate:

- Planet
- Distance from Sun
- Applicable combustion rule
- Retrograde status
- Dignity
- House
- Strength

Do not automatically claim:

> Combustion turns the karmic loop into an internal psychological struggle.

That is an interpretive layer, not a universal classical rule.

---

# 17. Planetary War

Keep planetary war separate.

```json
{
  "retrograde": true,
  "combust": false,
  "planetary_war": true
}
```

Retrogression does not automatically cancel planetary war.

Evaluate each condition independently.

---

# 18. Conjunction Engine

For every retrograde planet, calculate all conjunctions.

Example:

```json
{
  "planet": "Saturn",
  "retrograde": true,
  "conjunctions": [
    {
      "planet": "Jupiter",
      "orb": 4.2
    }
  ]
}
```

For the second planet calculate:

- Natural nature
- Functional nature
- House lordship
- Dignity
- Strength
- Retrograde status
- Combustion
- Planetary war
- Dispositor

---

# 19. Retrograde + Benefic

Do not use:

```text
Retrograde + Jupiter = automatically good
```

Instead:

```text
Retrograde planet
+
condition of Jupiter
+
Jupiter's lordship
+
Jupiter's dignity
+
Jupiter's strength
=
final modification
```

Possible output:

```text
Supportive
Mixed
Neutral
Intensifying
Restrictive
```

---

# 20. Retrograde + Malefic

Do not use:

```text
Retrograde + Saturn = self-sabotage
```

Instead evaluate Saturn independently.

A strong functional benefic Saturn can behave very differently from an afflicted functional malefic Saturn.

---

# 21. Retrograde + Rahu/Ketu

Use separate node logic.

Potential themes may include:

- Amplification
- Obsession
- Detachment
- Unconventional expression
- Strong focus

Do not automatically call these combinations negative.

---

# 22. Two Retrograde Planets

Do not implement:

```text
two retrograde planets = severe karmic clash
```

Instead:

```text
Planet A retrograde
+
Planet B retrograde
+
conjunction/aspect
+
planetary relationship
+
house lordship
+
dignity
=
combined interpretation
```

Possible outputs:

- Strong interaction
- Internal tension
- Persistent focus
- Competing priorities
- Repeated reassessment
- Concentrated development

---

# 23. Aspect / Drishti Engine

For every planet calculate:

```text
Aspects cast
Aspects received
```

Example:

```json
{
  "planet": "Mars",
  "retrograde": true,
  "received_aspects": [
    {
      "from": "Jupiter",
      "aspect_type": "7th",
      "strength": 0.82
    }
  ]
}
```

The aspecting planet must itself be evaluated.

---

# 24. Benefic Drishti

Do not automatically translate:

```text
Jupiter aspect = someone saves you
```

Instead possible modifying themes:

- Guidance
- Wisdom
- Education
- Protection
- Expansion
- Opportunity

Whether this manifests through an actual mentor/person must be determined from the whole chart.

---

# 25. Saturn Drishti

Potential themes:

- Delay
- Responsibility
- Discipline
- Structure
- Boundaries
- Endurance
- Maturity

Do not automatically output:

> Past-life punishment/debt.

That belongs in the optional karmic layer.

---

# 26. Mutual Aspect

If:

```text
A aspects B
AND
B aspects A
```

then:

```json
{
  "mutual_aspect": true
}
```

If both are retrograde:

```json
{
  "mutual_retrograde_aspect": true
}
```

Interpret as:

- Strong interaction
- Repeated themes
- Competing priorities
- Persistent focus
- Interdependence

Do not automatically predict rebellion or authority conflict.

---

# 27. Dispositor Engine

This should be mandatory.

Example:

```text
Retrograde Jupiter
        ↓
Capricorn
        ↓
Saturn = dispositor
```

Then analyze Saturn:

- House
- Sign
- Dignity
- Strength
- Retrograde
- Combustion
- Conjunctions
- Aspects

Store:

```json
{
  "dispositor": {
    "planet": "Saturn",
    "house": 4,
    "sign": "Cancer",
    "retrograde": true,
    "combust": false
  }
}
```

---

# 28. Dispositor Chain

If needed, follow:

```text
Planet
  ↓
Sign Lord
  ↓
Sign Lord's Dispositor
  ↓
Next Dispositor
```

Stop when:

- Planet reaches own sign
- Chain loops
- Maximum depth reached

Example:

```text
Retrograde Mercury
    ↓
Pisces
    ↓
Jupiter
    ↓
Cancer
    ↓
Moon
```

This should become part of advanced interpretation.

---

# 29. Divisional Charts

Use relevant Vargas to confirm the interpretation.

Minimum recommended:

| Chart | Use |
|---|---|
| D1 | Overall life |
| D9 | Marriage, dharma, deeper strength |
| D10 | Career |
| D7 | Children |
| D12 | Parents/ancestry |
| D24 | Education |
| D60 | Advanced karmic interpretation |

D60 should only be used when birth time reliability is sufficiently high.

---

# 30. Dasha Activation

Natal retrograde status is permanent, but its manifestation is strongly timing-dependent.

Check:

```text
Mahadasha
Antardasha
Pratyantardasha
```

Example:

```text
Retrograde Saturn in 10th
+
Saturn Mahadasha
```

This strongly activates Saturn-related themes.

Do not claim that the retrograde effect is equally prominent throughout life.

---

# 31. Transit Activation

Combine:

```text
Natal Vakri
+
Current Transit
+
Dasha
```

Example:

```text
Natal Saturn = Retrograde

Current Saturn = Retrograde

Saturn Mahadasha = Active
```

This represents a strong activation according to the application's interpretive model.

---

# 32. Station Analysis

Near:

```text
Retrograde Station
Direct Station
```

planetary apparent speed becomes very low.

Store:

```json
{
  "speed": -0.002,
  "station_proximity": 0.91
}
```

Use this as a transit intensity modifier.

Do not present this as a scientifically proven effect.

---

# 33. Shadow Period

Track:

```text
Pre-shadow
Retrograde
Post-shadow
```

The UI can display:

```text
Retrograde:
Oct 24 – Nov 13

Shadow:
Before and after the retrograde period
```

Shadow periods should be an optional interpretive modifier rather than treated as equivalent to actual retrograde motion.

---

# 34. Yoga Detection Must Be Independent

Do not create:

```text
Retrograde in 6/8/12
→ Viparita Raja Yoga
```

Instead:

```text
detectViparitaRajaYoga(chart)
```

separately.

Likewise:

```text
detectNeechaBhanga(chart)
detectRajaYoga(chart)
detectDhanaYoga(chart)
detectDharmaKarmadhipati(chart)
```

Retrograde is a **modifier**, not a universal yoga creator.

---

# 35. Viparita Raja Yoga

A retrograde planet in a Dusthana does not automatically create Viparita Raja Yoga.

The engine must independently evaluate the traditional conditions involving:

- 6th lord
- 8th lord
- 12th lord
- Their placements
- Relevant relationships

Only if the actual yoga conditions are satisfied should the app report Viparita Raja Yoga.

---

# 36. Neecha Bhanga

Retrograde alone should not be reported as Neecha Bhanga.

Check separately:

- Debilitated planet
- Sign lord
- Exaltation lord
- Relevant Kendra placements
- Aspects
- Conjunctions
- Other classical cancellation conditions
- Navamsha
- Strength

Then:

```text
Neecha Bhanga = detected
```

if the applicable rule set is satisfied.

---

# 37. Interpretation Layers

Aroha should generate three separate layers.

## Layer 1 — Classical

Example:

> Saturn is retrograde, giving it significant motional strength.

## Layer 2 — Interpretive

Example:

> This can make Saturnian themes more persistent, internalized or non-linear.

## Layer 3 — Karmic

Example:

> Some Jyotish traditions interpret Vakri planets as symbols of recurring or unfinished themes. This is a traditional karmic interpretation rather than an empirically established fact.

This separation is strongly recommended.

---

# 38. Health Interpretation

Do not create deterministic rules such as:

```text
Retrograde Mercury → dental disease
Retrograde Mars → blood pressure
Retrograde Saturn → knee disease
```

If health is discussed:

```text
Traditional Jyotish associates this planet/house with...
```

The app should not present astrology as a medical diagnosis.

---

# 39. Confidence Engine

Every interpretation should have a confidence score.

## Low confidence

Only retrograde status supports the interpretation.

```text
Retrograde Saturn
```

## Medium confidence

Retrograde + house + sign + one or two modifiers.

## High confidence

Multiple independent indicators agree:

```text
Retrograde
+
House
+
Lordship
+
Dignity
+
Dispositor
+
Aspect
+
Relevant Varga
+
Dasha
+
Transit
```

Recommended output:

```json
{
  "confidence": "high",
  "confidence_score": 0.86
}
```

The score is an internal product heuristic, not a classical Jyotish measurement.

---

# 40. Recommended Data Object

```json
{
  "planet": "Saturn",

  "motion": {
    "natal_retrograde": true,
    "transit_retrograde": true,
    "state": "retrograde",
    "station_proximity": 0.82
  },

  "placement": {
    "house": 10,
    "sign": "Aries",
    "degree": 14.52,
    "nakshatra": "Bharani",
    "nakshatra_lord": "Venus"
  },

  "lordship": {
    "houses_owned": [1, 2],
    "natural_nature": "malefic",
    "functional_nature": "benefic"
  },

  "dignity": {
    "status": "debilitated",
    "retrograde_special_rule": true
  },

  "strength": {
    "cheshta_bala": "high",
    "shadbala_total": null
  },

  "conditions": {
    "combust": false,
    "planetary_war": false
  },

  "dispositor": {
    "planet": "Mars",
    "house": 7,
    "sign": "Libra",
    "retrograde": false
  },

  "conjunctions": [
    {
      "planet": "Jupiter",
      "orb": 4.2
    }
  ],

  "aspects_received": [
    {
      "planet": "Jupiter",
      "type": "7th"
    }
  ],

  "vargas": {
    "D1": {},
    "D9": {},
    "D10": {}
  },

  "dasha": {
    "mahadasha": "Saturn",
    "antardasha": "Mercury"
  },

  "yogas": [],

  "interpretation": {
    "classical": [],
    "interpretive": [],
    "karmic": []
  },

  "confidence": {
    "level": "high",
    "score": 0.86
  }
}
```

---

# 41. Rule Categories

Create separate rule modules:

```text
RETROGRADE_CORE
RETROGRADE_MOTION
RETROGRADE_CHESTABALA
RETROGRADE_HOUSE
RETROGRADE_SIGN
RETROGRADE_LORDSHIP
RETROGRADE_DIGNITY
RETROGRADE_COMBUSTION
RETROGRADE_PLANETARY_WAR
RETROGRADE_CONJUNCTION
RETROGRADE_ASPECT
RETROGRADE_MUTUAL_ASPECT
RETROGRADE_DISPOSITOR
RETROGRADE_NAVAMSHA
RETROGRADE_VARGA
RETROGRADE_YOGA
RETROGRADE_DASHA
RETROGRADE_TRANSIT
RETROGRADE_STATION
RETROGRADE_SHADOW
RETROGRADE_KARMIC
```

---

# 42. Rule Priority

For interpretation:

```text
1. Astronomical correctness
2. Actual planetary placement
3. House lordship
4. Dignity
5. Planetary strength
6. Conjunctions
7. Aspects
8. Dispositor
9. Divisional confirmation
10. Yoga detection
11. Dasha
12. Transit
13. Station/shadow modifiers
14. Interpretive layer
15. Karmic layer
```

For timing, Dasha and transit become especially important.

---

# 43. Core Function

Conceptual implementation:

```javascript
function analyzeVakriPlanet(planet, chart, date) {

    const motion = calculatePlanetaryMotion(planet, date);

    if (!motion.isRetrograde && !isNatalRetrograde(planet, chart)) {
        return null;
    }

    const result = {};

    result.motion = analyzeMotion(planet, date, chart);

    result.house = analyzeHouse(planet, chart);

    result.sign = analyzeSign(planet, chart);

    result.lordship = analyzeFunctionalLordship(
        planet,
        chart.ascendant
    );

    result.dignity = calculateDignity(
        planet,
        chart
    );

    result.cheshta = calculateCheshtaBala(
        planet,
        chart
    );

    result.combustion = calculateCombustion(
        planet,
        chart.sun
    );

    result.planetaryWar = calculatePlanetaryWar(
        planet,
        chart
    );

    result.conjunctions = analyzeConjunctions(
        planet,
        chart
    );

    result.aspects = analyzeAspects(
        planet,
        chart
    );

    result.dispositor = analyzeDispositor(
        planet,
        chart
    );

    result.vargas = analyzeRelevantVargas(
        planet,
        chart
    );

    result.yogas = detectRelevantYogas(
        planet,
        chart
    );

    result.dasha = analyzeDasha(
        planet,
        chart,
        date
    );

    result.transit = analyzeTransit(
        planet,
        chart,
        date
    );

    result.station = analyzeStation(
        planet,
        date
    );

    result.previousHouse =
        applyOptionalVakriPreviousHouseRule(
            planet,
            chart.settings
        );

    result.classical =
        generateClassicalInterpretation(result);

    result.interpretive =
        generateInterpretiveInterpretation(result);

    result.karmic =
        generateKarmicInterpretation(result);

    result.confidence =
        calculateConfidence(result);

    return result;
}
```

---

# 44. Recommended AI/NLG Architecture

Do not allow the LLM to invent astrology rules.

Use:

```text
Astronomical Engine
        ↓
Chart Engine
        ↓
Rules Engine
        ↓
Facts + Rules
        ↓
Interpretation Object
        ↓
LLM / NLG
        ↓
User Report
```

The LLM should receive facts such as:

```json
{
  "facts": [
    "Saturn is retrograde",
    "Saturn occupies the 10th house",
    "Saturn is in Aries",
    "Saturn is debilitated",
    "Mars is the dispositor",
    "Jupiter aspects Saturn",
    "Saturn Mahadasha is active"
  ]
}
```

It should then generate natural language from those facts.

---

# 45. Example Interpretation

Input:

```text
Saturn
Retrograde
10th house
Aries
Debilitated
Jupiter aspect
Mars dispositor
Saturn Mahadasha
```

Output structure:

### Classical

> Saturn is retrograde, giving it significant motional strength. It occupies the 10th house, connecting its results strongly with career, authority, responsibility and public life.

### Modifiers

> Saturn's placement in Aries requires assessment of its debilitation and the condition of Mars, its dispositor. Jupiter's influence can provide a supportive modifying factor if Jupiter is strong and functionally favorable.

### Timing

> Saturn Mahadasha makes these Saturn-related themes substantially more relevant during the current period.

### Interpretive

> Career development may follow a non-linear path, with repeated restructuring of responsibilities or professional direction.

### Karmic

> In traditions that use a karmic interpretation of Vakri planets, Saturn may symbolize recurring lessons around responsibility, patience, accountability and long-term effort.

### Confidence

> High — because multiple independent chart factors support the interpretation.

---

# 46. What NOT to Implement

Do not implement these as unconditional rules:

```text
Retrograde = bad

Retrograde = 3x stronger

Retrograde = karmic debt

Retrograde Saturn = delayed marriage

Retrograde Venus = ex returns

Retrograde Jupiter = old teacher in past life

Retrograde Mercury = dental disease

Retrograde Mars = blood pressure

Two retrograde planets = severe karmic clash

Direct Jupiter = automatically cancels retrograde

Direct Venus = automatically fixes retrograde

Saturn aspect = past-life punishment

Jupiter aspect = external savior

Retrograde in 6/8/12 = Viparita Raja Yoga

Retrograde in exaltation = ordinary debilitation

Retrograde in debilitation = automatic Raj Yoga
```

These should either be removed or converted into conditional/interpretive rules.

---

# 47. Product Recommendation

For Aroha Astrology, use this four-layer model throughout the app:

```text
┌──────────────────────────────┐
│ 1. ASTROLOGICAL FACT         │
│ "Saturn is retrograde."      │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ 2. CLASSICAL RULE            │
│ "Vakri → Cheshta Bala."      │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ 3. INTERPRETATION             │
│ "Saturn themes may become     │
│ persistent/non-linear."       │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ 4. KARMIC/TRADITIONAL LAYER  │
│ "Some schools interpret this │
│ as recurring lessons."       │
└──────────────────────────────┘
```

This architecture makes the system:

- More explainable
- Easier to debug
- Easier to expand
- Safer against hallucinated rules
- Compatible with multiple Jyotish schools
- Better for detailed Kundli reports
- Better for AI-generated explanations

---

# 48. Final Implementation Principle

The single most important rule is:

> **Never let one factor determine the prediction.**

Instead:

```text
RETROGRADE
+
HOUSE
+
SIGN
+
LORDSHIP
+
DIGNITY
+
STRENGTH
+
CONJUNCTION
+
ASPECT
+
DISPOSITOR
+
VARGA
+
YOGA
+
DASHA
+
TRANSIT
=
FINAL INTERPRETATION
```

Retrograde is a **modifier**, not the entire prediction.
