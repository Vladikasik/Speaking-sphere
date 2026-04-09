# Extraction Cards — Developer Handoff & Design System Reference

Implementation guide for rendering extraction cards after a user records a voice note in the speaking sphere. Each extraction type (mood, food, body, activities, tasks, reflections) has two card variants: **A** (280px, detail-forward) and **B** (240px, compact/visual).

---

## Design Tokens

### Layout

| Token | Value | Usage |
|---|---|---|
| `WIDTH_A` | 280px | All variant A cards |
| `WIDTH_B` | 240px | All variant B cards |
| `CARD_RADIUS` | 24px | Outer card corners |
| `INNER_RADIUS` | 14px | Sub-card elements (trigger boxes, body rows, observation blocks) |
| `MATRIX_RADIUS` | 16px | Mood matrix inner panel |
| `CARD_PAD_X` | 20px (px-5) | Horizontal padding inside card body |
| `CARD_PAD_TOP` | 12px (pt-3) | Top padding of card body (below label) |
| `CARD_PAD_BOTTOM` | 20px (pb-5) | Bottom padding of card body |
| `LABEL_PAD_TOP` | 20px (pt-5) | Top padding around label chip |

### Colors

| Token | Hex | Usage |
|---|---|---|
| `card-bg-top` | `#000000` | Gradient start |
| `card-bg-bottom` | `#111111` | Gradient end |
| `card-border` | `#2a2a2a` | Default card border |
| `inner-bg` | `#0a0a0a` | Sub-card backgrounds (body rows, activity rows, trigger boxes) |
| `inner-border` | `#1a1a1a` | Sub-card borders |
| `bar-track` | `#1a1a1a` | Background of all progress/confidence bars |
| `label-bg-top` | `#151515` | Label chip gradient start |
| `label-bg-bottom` | `#1b1b1b` | Label chip gradient end |
| `label-border` | `#252525` | Label chip border |
| `text-primary` | `#ffffff` | Headings, meal names, key values |
| `text-secondary` | `rgba(255,255,255,0.65)` | Body text, emotion chips, descriptions |
| `text-tertiary` | `rgba(255,255,255,0.4)` | Triggers, observations, sources |
| `text-muted` | `rgba(255,255,255,0.2)` | Confidence %, micro-labels |

### Semantic Colors

| Semantic | Color | When |
|---|---|---|
| `mood-positive-high-energy` | `#22c55e` (green) | valence >= 0 AND energy >= 0 |
| `mood-negative-high-energy` | `#ef4444` (red) | valence < 0 AND energy >= 0 |
| `mood-positive-low-energy` | `#60a5fa` (blue) | valence >= 0 AND energy < 0 |
| `mood-negative-low-energy` | `#a855f7` (purple) | valence < 0 AND energy < 0 |
| `valence-positive` | `#22c55e` (green) | Variant B: valence >= 0 |
| `valence-negative` | `#ef4444` (red) | Variant B: valence < 0 |
| `energy-positive` | `#f59e0b` (amber) | Variant B: energy >= 0 |
| `energy-negative` | `#6366f1` (indigo) | Variant B: energy < 0 |
| `food-accent` | `#f59e0b` (amber) | All food cards |
| `body-physical` | `#60a5fa` (blue) | Physical state |
| `body-sleep` | `#a78bfa` (violet) | Sleep state |
| `body-substance` | `#f87171` (red) | Substance warnings |
| `status-todo` | `rgba(255,255,255,0.2)` | Unfilled task circle |
| `status-in-progress` | `#3b82f6` (blue) | Active task |
| `status-done` | `#22c55e` (green) | Completed task |
| `urgency-today` | `#ef4444` | Urgent, due today |
| `urgency-this-week` | `#f59e0b` | Due this week |
| `urgency-this-month` | `#3b82f6` | Due this month |
| `urgency-someday` | `#6b7280` | No deadline pressure |
| `reflection-glow-a` | `rgba(168,85,247,0.25)` | Variant A glow |
| `reflection-glow-b` | `rgba(99,102,241,0.2)` | Variant B glow |

### Typography

| Element | Size | Weight | Family | Tracking |
|---|---|---|---|---|
| Label chip | 11px | 400 | Inter | 0.05em |
| Card title (food/meal) | 17px (A), 14px (B) | 500 | Inter | 0 |
| Calorie number | 20px (A), 16px (B) | 300 mono | system mono | 0 |
| Body text | 13px (A), 12px (B) | 400 | Inter | 0 |
| Emotion chips | 11px | 400 | Inter | 0 |
| Micro labels | 9-10px | 400 | Inter | 0.05-0.1em (uppercase) |
| Confidence % | 9px | 400 mono | system mono | 0 |
| Quadrant label | 10px | 400 | Inter | 0.1em (uppercase) |
| Valence/energy value | 13px | 400 mono | system mono | 0 |
| Reflection quote (A) | 15px | 300 italic | Inter | 0 |
| Reflection text (B) | 13px | 400 | Inter | 0 |

---

## Shared Components

### CardShell

Every card wraps its content in `CardShell`. It takes a `size` prop (`"a"` or `"b"`) that controls width, and an optional `glow`/`glowColor` for reflection cards.

```
<CardShell label="mood" size="a">        → 280px, no glow
<CardShell label="reflections" size="b" glow glowColor="rgba(99,102,241,0.2)">  → 240px, glowing border + shadow
```

When `glow` is true, the border color changes to `glowColor` and the card gets both an outer glow (`box-shadow: 0 0 60px`) and an inner glow (`inset 0 0 40px`).

### ConfidenceBar

Renders at the bottom of every card (except reflections). Sits at `mt-auto` so it always pins to the bottom regardless of content height.

- Track: 3px tall, `#1a1a1a` background, full rounded
- Fill: same height, color passed as prop, opacity 0.6
- Label: 9px mono, shows percentage

The `color` prop should match the card's semantic accent (green for positive mood, amber for food, blue for body, etc.).

### BipolarBar

Used only by MoodCardB for valence and energy meters. Renders a bar from the center outward — right for positive values, left for negative.

- Track: 6px tall, `#1a1a1a` background
- Center line: 1px white at 10% opacity
- Fill: absolute positioned, width = `|value| * 50%` of container
  - Positive: anchored at `left: 50%`, extends right
  - Negative: anchored at `right: 50%`, extends left
- Glow: `box-shadow: 0 0 8px {color}`

---

## Component: MoodCard

1:1 per note. Always present.

### Data Schema

```ts
{
  valence: number     // -1.0 to +1.0
  energy: number      // -1.0 to +1.0
  emotions: string[]  // max 4 words
  trigger: string     // free text, nullable
  confidence: number  // 0 to 1.0
}
```

### Variant A — Mood Matrix (280px)

A 2D scatter plot mapping the user's emotional state.

**Dot positioning:**
- X axis = valence: `((valence + 1) / 2) * 100` → 0% (left, negative) to 100% (right, positive)
- Y axis = energy: `((1 - (energy + 1) / 2)) * 100` → 0% (top, high energy) to 100% (bottom, low energy)

**Quadrant colors and labels — THIS IS THE KEY COLOR LOGIC:**

| Quadrant | Condition | Dot Color | Label |
|---|---|---|---|
| Top-right | valence >= 0, energy >= 0 | `#22c55e` green | "Activated Pleasant" |
| Top-left | valence < 0, energy >= 0 | `#ef4444` red | "Activated Unpleasant" |
| Bottom-right | valence >= 0, energy < 0 | `#60a5fa` blue | "Calm Pleasant" |
| Bottom-left | valence < 0, energy < 0 | `#a855f7` purple | "Calm Unpleasant" |

The dot color cascades to: dot glow (`box-shadow`), pulse ring, quadrant label text, and confidence bar fill.

**Corner labels** (7px, 12% opacity): tense (top-left), energized (top-right), depleted (bottom-left), serene (bottom-right).

**Emotion chips**: neutral style — `#1a1a1a` background, `#252525` border, 65% white text. NOT tinted by mood color (that's variant B's behavior).

**Pulse ring**: `animate-ping` at 2s duration, same position as dot, color at 20% opacity.

### Variant B — Bipolar Bars (240px)

Two horizontal BipolarBar components stacked vertically.

**Valence bar color logic:**
- valence >= 0 → `#22c55e` green bar, green numeric value, green emotion chips
- valence < 0 → `#ef4444` red bar, red numeric value, red emotion chips

**Energy bar color logic:**
- energy >= 0 → `#f59e0b` amber bar, amber numeric value
- energy < 0 → `#6366f1` indigo bar, indigo numeric value

**Emotion chip tinting**: UNLIKE variant A, variant B chips inherit the valence color:
- Background: `{valenceColor}18` (hex with alpha)
- Text: `{valenceColor}`
- Border: `{valenceColor}40`

So for positive valence (green), chips are green-tinted. For negative (red), chips are red-tinted.

**All possible mood card color combinations:**

| valence | energy | Variant A dot | B valence bar | B energy bar | B chips |
|---|---|---|---|---|---|
| +0.75 | +0.80 | green | green | amber | green |
| +0.30 | -0.50 | blue | green | indigo | green |
| -0.20 | -0.30 | purple | red | indigo | red |
| -0.60 | +0.40 | red | red | amber | red |
| 0.00 | 0.00 | green* | green* | amber* | green* |

*Zero values are treated as >= 0 (positive path).

---

## Component: FoodCard

1:1 per note. Present when food was mentioned.

### Data Schema

```ts
{
  items: string[]     // food item names
  meal: string        // "breakfast" | "lunch" | "dinner" | "snack"
  observation: string // free text, nullable
  confidence: number  // 0 to 1.0
}
```

### Calorie Estimation

The component uses an `approxCalories` lookup map. **You must populate this map** with calorie estimates for the user's common foods. Unknown items default to 120 kcal.

```ts
const approxCalories: Record<string, number> = {
  soup: 250, bread: 130, apple: 52, oatmeal: 180, banana: 105, coffee: 5,
  // ... extend as needed from extraction data
};
```

### Variant A — Item List (280px)

- Header: meal label (left) + total kcal in amber mono (right)
- Each item: name (capitalize) + proportional bar + individual kcal
- Bar width: `(itemCal / totalCal) * 100%`, opacity: `0.4 + (pct / 200)` (heavier items = more opaque)
- All bars use `#f59e0b` amber
- Observation: rendered in a sub-card with `#0d0d0d` background if present

### Variant B — Donut Chart (240px)

- SVG donut: radius 34, stroke 5, centered in 88x88 container
- Progress: `min(totalCal / 800, 1)` — assumes 800 kcal as "full meal" reference
- Stroke uses `strokeDasharray` / `strokeDashoffset` pattern, rotated -90deg
- Items shown as amber-tinted chips: `{item} · {cal}`

### Meal Label Map

| API value | Display |
|---|---|
| `breakfast` | Breakfast |
| `lunch` | Lunch |
| `dinner` | Dinner |
| `snack` | Snack |
| anything else | raw value, capitalize |

---

## Component: BodyCard

1:1 per note. Present when physical state, sleep, or substances were mentioned.

### Data Schema

```ts
{
  physical: string   // free text, nullable
  sleep: string      // free text, nullable
  substance: string  // free text, nullable
  confidence: number // 0 to 1.0
}
```

### Variant A — Status Rows (280px)

Renders up to 3 rows (only for non-null fields):

| Field | Icon | Label Color |
|---|---|---|
| physical | ⚡ | `#60a5fa` (blue) at 50% opacity |
| sleep | 🌙 | `#a78bfa` (violet) at 50% opacity |
| substance | 💊 | `#f87171` (red) at 50% opacity |

Each row: `#0a0a0a` background, `#1a1a1a` border, 14px radius.

If only `physical` is present, the card shows 1 row. If all 3 fields are null, **do not render the card**.

### Variant B — Signal Bars (240px)

Shows physical and sleep with a 5-bar signal strength indicator. Uses regex heuristics to score:

**Physical score:**
- HIGH (0.8): matches `/energi|light|good|great|strong|fresh/i`
- LOW (0.3): everything else (pain, headache, tired, etc.)

**Sleep score:**
- HIGH (0.85): matches `/[7-9]\s*hour|deep|good|well/i`
- LOW (0.3): everything else (deprived, insomnia, few hours, etc.)

**Signal bar rendering**: 5 bars, each 3px wide, heights: 6, 9, 12, 15, 18px. Bar `j` is filled (colored at 0.7 opacity) if `j/5 < score`. Otherwise `#1a1a1a`.

**Substance warning**: If `substance` is non-null, shows a separate alert-style sub-card with red-tinted background (`rgba(248,113,113,0.05)`), red border, and red text.

**Important**: If you want more granular scoring, replace the regex heuristics with a numeric score from the extraction pipeline. The regex approach is a frontend fallback.

---

## Component: ActivityCard

1:N per note. Renders an array of activities.

### Data Schema (per activity)

```ts
{
  activity_type: string        // "work" | "study" | "meeting" | "travel" | "admin" | "socializing" | "exercise" | "rest" | "health" | "creative" | "chores"
  description: string          // what was done
  duration_estimate: string    // e.g. "2h", "30m"
  location: string             // nullable
  productivity_signal: number  // 0-1.0, nullable
  confidence: number           // 0-1.0
}
```

### Emoji Map

| Type | Emoji |
|---|---|
| work | 💻 |
| study | 📚 |
| meeting | 🤝 |
| travel | ✈️ |
| admin | 📋 |
| socializing | 🍻 |
| exercise | 🏃 |
| rest | 🧘 |
| health | 💊 |
| creative | 🎨 |
| chores | 🧹 |
| fallback | 📌 |

### Variant A — Row List (280px)

Each activity in a sub-card row:
- Emoji (18px) → description (13px, truncated) + duration/location meta → optional productivity circle
- Productivity signal: only shown when not null. Displayed as a 24px circle with `Math.round(value * 100)` in 9px mono.
- No confidence bar on activity cards (they're list-type, not single-metric).

### Variant B — Timeline (240px)

Vertical timeline with a 1px line at `left: 13px`:
- Each node: 26px circle with emoji, `#111` background, `#2a2a2a` border
- Description (12px) + duration chip (9px, `#151515` background) + location
- Last item has no bottom padding; others have `pb-3`

### Edge Cases

- 1 activity: card still renders, timeline shows single node without connector
- 5+ activities: cards grow in height (no max). Consider truncating to 5 with "and X more" for mobile.
- Unknown activity_type: falls back to 📌 emoji

---

## Component: TodoCard

1:N per note. Renders extracted tasks, goals, habits.

### Data Schema (per task)

```ts
{
  content: string        // task title
  type: string           // "task" | "goal" | "habit_intention" | "question" | "event" | "decision"
  status: string         // "todo" | "in_progress" | "done"
  urgency: string        // "today" | "this_week" | "this_month" | "someday"
  confidence: number     // 0-1.0
}
```

### Type Icons

| Type | Icon | Description |
|---|---|---|
| task | ○ | Single actionable item |
| goal | ◎ | Long-term objective |
| habit_intention | ↻ | Recurring behavior to build |
| question | ? | Open question to resolve |
| event | ◇ | Scheduled event |
| decision | ⬡ | Decision to make |

### Status Icons & Colors

| Status | Icon | Color | Card Visual |
|---|---|---|---|
| todo | ○ | `rgba(255,255,255,0.2)` | Default `#0a0a0a` background |
| in_progress | ◐ | `#3b82f6` (blue) | Blue-tinted background `rgba(59,130,246,0.05)`, blue border |
| done | ● | `#22c55e` (green) | 45% opacity on entire row, strikethrough text |

### Urgency Dot Colors

Small 6px colored dot next to the urgency label:

| Urgency | Color | Meaning |
|---|---|---|
| today | `#ef4444` (red) | Needs attention now |
| this_week | `#f59e0b` (amber) | Due within the week |
| this_month | `#3b82f6` (blue) | Due within the month |
| someday | `#6b7280` (gray) | No time pressure |

### Variant A — Checklist (280px)

Full detail per task:
- Status icon (14px mono) → content (13px) → type badge + urgency dot + urgency label
- Type badge: 9px uppercase in `#151515` background pill
- Counter in header: `{done}/{total} done`
- `habit_intention` displays as "habit intention" (underscore replaced with space)

### Variant B — Grouped (240px)

Groups tasks by status (To Do → In Progress → Done), with a progress bar header:
- Progress bar: segmented, green for done + blue for in_progress, rest is track
- Percentage: `doneCount / totalCount * 100`, displayed in 18px mono
  - 100% → green text
  - < 100% → blue text
- Each item: 11px text, urgency dot, type icon on the right
- Done items: strikethrough, 30% opacity text

---

## Component: ReflectionCard

1:N per note. The most visually distinct cards — glow effects, no confidence bar.

### Data Schema (per reflection)

```ts
{
  content: string       // the insight itself
  domain: string        // "work" | "personal" | "health" | "relationships" | ... (any string from extraction)
  actionability: string // "reflection" | "habit_candidate" | "question" | "decision" | ... (any string)
  source: string        // nullable, where the insight came from
  confidence: number    // 0-1.0 (not displayed on card, but available)
}
```

### Variant A — Ethereal (280px)

- `glow` enabled with `rgba(168,85,247,0.25)` (purple)
- Two ambient orbs:
  - Top-right: 120px purple radial gradient, blur(20px)
  - Bottom-left: 90px pink radial gradient, blur(16px)
- Quote text: 15px, font-weight 300, italic, wrapped in curly quotes
- Text shadow: `0 0 30px rgba(168,85,247,0.3)` (purple glow on text)
- Domain/actionability: purple-tinted pills
- Source: 10px italic, 20% white opacity, prefixed with "—"

### Variant B — Floating Orbs (240px)

- `glow` enabled with `rgba(99,102,241,0.2)` (indigo)
- Three ambient orbs (purple, indigo, pink) scattered at different positions
- Each reflection preceded by a decorative gradient line (10px wide)
  - Colors cycle: `rgba(168,85,247,0.15)`, `rgba(99,102,241,0.12)`, `rgba(236,72,153,0.1)`
- Text: 13px, no italic, text shadow `0 0 40px rgba(99,102,241,0.25)`
- Domain/actionability as inline labels (not pills)

### Multiple Reflections

Both variants handle arrays. If 2+ reflections exist, they stack vertically with `gap-5` (20px). Each gets its own quote block, domain/actionability, and source.

---

## Integration Guide

### Which cards to render from an extraction response

After the extraction pipeline processes a voice note, you'll receive some subset of these objects. Render cards based on what's present:

```ts
interface ExtractionResponse {
  mood?: MoodExtraction          // always 1:1, almost always present
  body?: BodyExtraction          // 1:1, only if physical state mentioned
  food?: FoodExtraction          // 1:1, only if food/eating mentioned
  activities?: ActivityExtraction[]  // 1:N, only if activities mentioned
  goals_tasks?: TaskExtraction[]    // 1:N, only if tasks/goals mentioned
  reflections?: ReflectionExtraction[] // 1:N, only if reflective content
  people_mentions?: PeopleMention[]   // 1:N — no card component (handled separately)
}
```

### Rendering order

Suggested card display order (matches cognitive flow after speaking):

1. **mood** — immediate emotional snapshot
2. **body** — physical state context
3. **food** — if meal was part of the note
4. **activities** — what happened
5. **tasks** — what needs doing
6. **reflections** — deeper insights (shown last, as the "mirror" moment)

### Choosing variant A vs B

The variant choice depends on your layout context:

- **Horizontal scroll / carousel**: Use variant A (wider, more detail)
- **Vertical feed / stacked**: Use variant B (compact, scannable)
- **Side by side**: One A + one B can pair well (280 + 240 = 520px fits mobile landscape)

### Null / empty field handling

| Scenario | Behavior |
|---|---|
| `trigger` is null | Don't render trigger section |
| `substance` is null | Don't render substance row/warning |
| `sleep` is null | Skip sleep row in body card |
| `physical` AND `sleep` AND `substance` all null | Don't render body card at all |
| `observation` is null | Don't render observation box |
| `location` is null | Don't render location text |
| `productivity_signal` is null | Don't render productivity circle |
| `source` is null | Don't render source line |
| `emotions` is empty array | Don't render emotions section |
| `items` is empty array | Don't render food card |
| `activities` is empty array | Don't render activities card |
| `goals_tasks` is empty array | Don't render tasks card |
| `reflections` is empty array | Don't render reflections card |

### Calorie map extensibility

The `approxCalories` map is a simple lookup. In production, you should either:
1. Have the extraction pipeline return calorie estimates per item alongside names
2. Use a food API (e.g. Nutritionix, USDA FoodData) to look up calories
3. Fall back to 120 kcal default for unrecognized items

### Confidence threshold

All extraction objects include a `confidence` field (0–1.0). The cards display this as a subtle bar, but you may also want to filter or dim cards below a threshold:

- confidence >= 0.8 → full opacity, normal render
- confidence 0.5–0.8 → render normally, bar shows lower fill
- confidence < 0.5 → consider dimming the entire card or showing a "low confidence" indicator
- confidence < 0.3 → consider not rendering the card

### Body score heuristics

The BodyCardB regex heuristics are a frontend approximation. For production, either:
1. Add a `severity` or `score` field to the body extraction schema (recommended)
2. Or keep the regex, extended with more patterns:

```ts
// Positive physical patterns
/energi|light|good|great|strong|fresh|rested|clear|vibrant|relaxed/i

// Positive sleep patterns  
/[7-9]\s*hour|deep|good|well|rested|refreshing|solid|full/i

// These would produce score = 0.8 / 0.85 respectively
// Everything else = 0.3
```

---

## Edge Cases & Limits

| Case | Handling |
|---|---|
| Emotion list > 4 items | Chips wrap to next line, card height grows |
| Very long trigger text (100+ chars) | Text wraps naturally, card height grows |
| 7+ activities in one note | All render, card becomes tall. Consider capping at 5–6 with overflow indicator |
| 5+ tasks in one note | All render. TodoCardB groups help readability |
| Long food item names | Capitalize, truncate at container edge for variant A; chips wrap for variant B |
| 3+ reflections in one note | All render with gap-5 spacing. Card can get tall — this is intentional for reflections |
| Non-Latin text (Cyrillic, etc.) | All text fields support Unicode. Ensure Inter font has coverage or add fallback |
| RTL languages | Not currently supported. Would need `direction: rtl` on CardShell |
| Missing calorie lookup | Defaults to 120 kcal. Donut progress will still work |
| Valence/energy exactly 0.00 | Treated as positive (>= 0 path). Dot sits at exact center of matrix. Bars show zero width |
| All tasks are done (100%) | TodoCardB shows green percentage, full green progress bar |
| Only one field in body extraction | Card still renders with just that single row |
