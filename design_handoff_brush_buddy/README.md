# Handoff: Brush Buddy

## Overview
Brush Buddy is a phone-portrait toothbrushing guide for ~7-year-olds. A friendly mascot sits in the center of a circular "mouth" of teeth. The child brushes one quadrant at a time; a per-quadrant countdown advances automatically through all four quadrants, the active quadrant blinks and glows so it's unmistakable, and the mascot grows happier as quadrants complete, ending in a confetti celebration.

## About the Design Files
The file in this bundle (`Tooth Brush Buddy.dc.html`) is a **design reference created in HTML** — a working prototype showing the intended look and behavior. It is **not production code to copy directly**. The task is to **recreate this design in the target codebase's existing environment** (React, React Native, SwiftUI, Flutter, etc.) using that project's established patterns, component library, and styling approach. If no environment exists yet, choose the most appropriate framework for a kids' interactive app and implement there.

The prototype is built as a single self-contained component with inline styles and a small state machine. Treat the structure as guidance, not gospel — re-architect into idiomatic components for your stack.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, layout, animations, and interactions are all specified below and should be reproduced faithfully. Use the exact hex values, sizes, and timings.

## Screenshots
Reference captures (candy theme + monster buddy) are in `screens/`:
- `screens/01-ready.png` — initial Ready state
- `screens/02-brushing.png` — Brushing, active quadrant (Top Left) glowing + blinking
- `screens/03-done.png` — Done, all teeth complete, happy mascot, confetti

## Screens / Views
There is a **single screen** with three runtime states (Ready → Brushing → Done). All three share the same layout; only content and highlight states change.

### Layout (top → bottom), phone portrait 390 × 844
1. **Header** — padding `22px 24px 8px`, vertical flex, gap `14px`.
   - Row: title "Brush Buddy" (left) + status pill (right), space-between.
   - Progress dots: a flex row of 4 equal-width bars, gap `8px`, each `height:8px; border-radius:999px`.
2. **Stage** — `flex:1`, vertical flex, centered horizontally, top-aligned, gap `16px`, padding `18px 18px 0`. Contains a fixed `320 × 320` relative box:
   - SVG arc ring (active-quadrant highlight) at `inset:0`.
   - 20 teeth absolutely positioned in a circle (5 per quadrant).
   - 4 quadrant labels at the box's diagonal corners.
   - Centered mascot (`150 × 150`) with countdown ring, z-index above teeth.
   - Below the box: the mascot's speech line.
3. **Controls** — padding `16px 24px 28px`, vertical flex, gap `10px`: primary button + a quiet "Start over" text button.
4. **Confetti** — absolutely-positioned full-bleed overlay, only present in the Done state.

### Components

**Title** — "Brush Buddy", font `Baloo 2` weight 800, `24px`, line-height 1.

**Status pill** — text varies: `Ready` / `1 of 4`…`4 of 4` / `Done!`. Font `Nunito` weight 800, `15px`. Background `rgba(255,255,255,0.6)`, padding `6px 12px`, border-radius `999px`.

**Progress dots (×4)** — each `flex:1; height:8px; border-radius:999px`. Color: completed = `happy`; active = `accent2`; idle = `rgba(0,0,0,0.1)`.

**Teeth ring (×20, 5 per quadrant)** — each tooth `16 × 25px`, white fill, `2.5px` solid border, border-radius `8px 8px 5px 5px`, shadow `0 2px 5px rgba(0,0,0,0.12)`.
- Positioned radially: ring radius **118px** from center. Each tooth = an anchor at center (`left:50%; top:50%`) transformed `rotate(angle) translateY(-118px)`, with the tooth centered on the anchor via negative margins. Tooth points outward.
- Angle per quadrant: arc start angles (measured from top, clockwise) are **Top-Left 270°, Top-Right 0°, Bottom-Right 90°, Bottom-Left 180°**. Within each quadrant, 5 teeth at `base + 11 + k*17` degrees (k = 0..4), leaving visible gaps between quadrants.
- Border color: completed quadrant = `happy`; active quadrant = `accent`; idle = `rgba(0,0,0,0.10)`.
- Active quadrant teeth animate with `toothpulse` (see Animations).

**Active-quadrant arc** — SVG `viewBox 0 0 320 320`. Base track: circle `r=118`, stroke `rgba(0,0,0,0.04)`, stroke-width `34`. Highlight arc: same circle, stroke `accent2`, stroke-width `34`, `stroke-linecap:round`, a 90°-minus-gap dash (`dasharray = "(2π·118)/4 − 22  ,  2π·118"`), rotated to the active quadrant (`rotate(baseAngle − 90 + 11)deg`, transform-origin `160px 160px`). Only rendered while Brushing; animates with `arc` blink.

**Quadrant labels (×4)** — text "Top Left / Top Right / Bottom Right / Bottom Left", positioned at the four corners of the 320px box (TL top-left, TR top-right, BR bottom-right, BL bottom-left). Font weight 800, `11px`, letter-spacing `0.5px`, uppercase. Color: active = `accent`; completed = `happy`; idle = `rgba(0,0,0,0.32)`.

**Mascot** — centered `150 × 150`, z-index 3, with a `bg`-colored circular halo at `inset:-6px` so it cleanly overlaps the ring. Three selectable styles (configurable; default **monster**):
- `tooth`: white body, border-radius `46% 46% 40% 40% / 56% 56% 46% 46%`, plus a small `bg`-colored notch at the bottom to suggest tooth roots.
- `smiley`: `128px` yellow (`accent2`) circle.
- `monster`: `accent`-colored blob, border-radius `50% 50% 44% 44% / 58% 58% 42% 42%`.
- All bodies use inset shadow `inset -10px -12px 0 rgba(0,0,0,0.05–0.16)` + drop shadow, and float gently (`float` animation).
- **Face**: two eyes (`14px` wide, height 13px sad / 17px otherwise, `#2A2A2A`, blink animation) and an SVG mouth whose path morphs by mood. Mouth paths (viewBox `0 0 100 50`, stroke `#2A2A2A` width 5):
  - mood 0 (sad): `M20 32 Q50 14 80 32`
  - mood 1: `M22 30 L78 30`
  - mood 2: `M22 28 Q50 38 78 28`
  - mood 3: `M20 26 Q50 46 80 26`
  - mood 4 (excited, filled `#C2447A`): `M18 23 Q50 53 82 23 Z`
- Mood index = number of completed quadrants (0–4). At mood 4, two sparkle "✨" emoji pulse near the mascot.

**Countdown ring** — SVG inside the mascot box, rotated `-90deg`. Track circle `r=46` stroke `rgba(0,0,0,0.06)` width 6; progress circle stroke `accent` width 6, round cap, `stroke-dashoffset` driven by remaining time (`offset = circumference × (1 − timeLeft/secondsPerQuadrant)`), transition `0.9s linear`.

**Speech line** — `Baloo 2` weight 700, `19px`, centered. Text by mood: "Ready? Let's brush!", "Nice! Keep going →", "Great brushing!", "Almost sparkling!", "All clean! 🎉".

**Primary button** — full width, `Baloo 2` weight 800, `20px`, white text, background `accent`, padding `16px`, border-radius `20px`, shadow `0 6px 0 rgba(0,0,0,0.12)`. Label: `Start brushing` (idle) / `Pause` (running) / `Resume` (paused) / `Brush again` (done).

**Start over button** — text only, `Nunito` weight 700, `14px`, color `text`, opacity `0.6`.

**Confetti** — 46 pieces, each `7–16px` wide × ~1.4× tall, random color from `[#F4C430,#FF6FAE,#54C7E8,#7FCF6E,#B79CED,#2D7DD2]`, border-radius `2px`, starting at `top:-30px`, random `left`. Each falls (`confetti` animation) with random duration `1.6–3.0s` and random delay `0–0.8s`, then fades and exits below the screen.

## Interactions & Behavior
- **Start brushing**: begins the timer at quadrant 0 (Top Left), `secondsPerQuadrant` countdown.
- **Auto-advance**: each second decrements `timeLeft`; at 0 it moves to the next quadrant in order **Top Left → Top Right → Bottom Right → Bottom Left** and resets the countdown.
- **Completion**: after the 4th quadrant, state becomes Done — mascot hits mood 4 (excited + sparkles), confetti fires, button becomes "Brush again", status shows "Done!".
- **Pause/Resume**: primary button toggles `running` while brushing (timer holds).
- **Start over**: full reset to Ready.
- **Active-quadrant cue (key requirement)**: the active quadrant's arc, its teeth borders, its corner label, and its progress dot all switch to highlight colors AND blink/pulse (see animations) so it's obvious which area to brush.

## Animations & Transitions
- `blink` (eyes): 4.5s loop, eyes squish to `scaleY(0.1)` briefly near the end.
- `float` (mascot body): 3s ease-in-out loop, ±10px vertical.
- `arc` (active arc): 0.9s ease-in-out loop, opacity `0.6 ↔ 0.18`.
- `toothpulse` (active teeth): 0.7s ease-in-out loop, `translateY(-3px) scale(1.12)` at midpoint.
- `sparkle`: 1.0–1.3s loop, opacity `0.2↔1` + scale.
- `confetti`: one-shot, `translateY(-20px)→900px` + `rotate(720deg)`, opacity holds then fades to 0.
- Countdown ring `stroke-dashoffset`: `0.9s linear` transition. Mouth path: `0.4s ease` transition.

## State Management
- `idx` (0–3): current quadrant; set to 4 when done.
- `timeLeft`: seconds remaining in the current quadrant.
- `running`, `started`, `done`: booleans for the state machine.
- `confetti`: generated array of piece styles, created on completion.
- Derived: `moodIndex = started ? min(idx,4) : 0` (also reaches 4 on done) → drives mascot face + speech; `completed/active` flags per quadrant → drive all highlight colors.
- A 1-second interval timer drives the countdown; clear it on pause, reset, completion, and unmount.

## Design Tokens
Three themes (configurable; default **candy**). Each: `accent`, `accent2`, `happy`, `bg`, `text`.
- **bright**: accent `#2D7DD2`, accent2 `#F4C430`, happy `#3FB57E`, bg `#EAF4FF`, text `#1B3A57`
- **candy** (default): accent `#FF6FAE`, accent2 `#B79CED`, happy `#5FD0B6`, bg `#FFF0F7`, text `#6B3A56`
- **ocean**: accent `#13A6A6`, accent2 `#54C7E8`, happy `#7FCF6E`, bg `#E5FAF8`, text `#0E4D4D`

Other values:
- Neutrals: `rgba(0,0,0,0.04 / 0.06 / 0.10 / 0.32)`, white surfaces `rgba(255,255,255,0.6 / 0.97)`.
- Mood-4 mouth fill: `#C2447A`. Eyes: `#2A2A2A`.
- Border radius: pills `999px`, button `20px`, teeth `8px 8px 5px 5px`.
- Shadows: button `0 6px 0 rgba(0,0,0,0.12)`, teeth `0 2px 5px rgba(0,0,0,0.12)`, mascot drop `0 10px 22px rgba(0,0,0,0.12–0.16)`.
- Ring radius `118px`; mascot `150px`; stage box `320 × 320`; frame `390 × 844`.

## Configurable Props (defaults chosen by stakeholder)
- `theme`: `bright | candy | ocean` — **default `candy`**
- `buddyStyle`: `tooth | smiley | monster` — **default `monster`**
- `secondsPerQuadrant`: 5–60 — **default `30`** (≈2 minutes total across 4 quadrants)

Expose these as settings in the real app (e.g. a parent/settings screen). Total brush time = `secondsPerQuadrant × 4`.

## Typography
- **Baloo 2** (weights 500–800) — title, status, speech line, primary button.
- **Nunito** (weights 600–800) — body / secondary text.
Both from Google Fonts. Substitute with your codebase's rounded display + friendly sans if it has equivalents.

## Assets
No raster images. The mascot, teeth, and mouth are all CSS shapes + small inline SVG paths — recreate as views/shapes in your framework, or commission illustrated art if you want richer characters. Sparkle "✨" and "🎉" are system emoji. No external icons.

## Files
- `Tooth Brush Buddy.dc.html` — the full prototype (markup + state logic). All measurements, colors, and animation keyframes above are taken directly from it; open it to see exact values in context.

## Notes for implementation
- Prioritize the **active-quadrant cue** — the original problem was that it wasn't obvious enough. Keep the layered redundancy (arc glow + tooth highlight + label color + progress dot + blink) so it reads instantly for a young child.
- Consider adding real audio cues (the prototype is visual-only) and accessibility (reduced-motion fallback that swaps blinking for a static high-contrast highlight).
