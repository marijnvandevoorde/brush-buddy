# 🪥 Brush Buddy

A friendly, installable **Progressive Web App** that guides you (or your kids)
through brushing all four quadrants of your teeth for a full two minutes.

## How it works

- The upper and lower teeth are split into **four quadrants**.
- Every **30 seconds** the highlighted quadrant advances, so you spend equal
  time on each: **top-right → top-left → bottom-left → bottom-right**.
- A **smiley face** in the middle gets happier as you go. It breaks into a big
  **smile at 2:00** (the recommended brushing time)…
- …and then **⭐ star eyes + confetti at 2:30** as a little reward for finishing
  with a rinse.
- A progress ring frames the face, with gentle beeps and a vibration each time
  it's time to switch quadrants.

## Features

- 📱 **Installable PWA** — add to your home screen and run full-screen, offline.
- 🔊 Sound cues (toggleable) using the Web Audio API — no audio files needed.
- 📳 Haptic feedback on supported devices.
- 💡 Keeps the screen awake while brushing (Screen Wake Lock API where available).
- 🎨 Pure HTML/CSS/SVG/JS — **no build step, no dependencies**.

## Run it locally

Because service workers require a server (not `file://`), serve the folder:

```bash
# Python
python3 -m http.server 8000
# then open http://localhost:8000
```

Or any static server (`npx serve`, etc.).

## Deploy

Live at **https://brush-buddy.small-victories.co** on **Cloudflare Pages**,
deployed straight from `main` — there is no build step, so pushing to `main`
publishes the repo root as-is. Project settings (custom domain, production
branch) live in the Cloudflare dashboard, not in this repo.

`_headers` is the one piece of deploy config that *is* committed: it stops
`sw.js` and the app-shell sources from being served from a stale HTTP cache,
which would otherwise delay a release by up to four hours. See the comments in
that file.

Nothing is Cloudflare-specific beyond `_headers`, so the site can be hosted
anywhere static (Netlify reads `_headers` too; GitHub Pages ignores it).

## Project structure

```
index.html                 # markup + SVG scene (teeth, ring, smiley)
styles.css                 # styling & animations
app.js                     # timer, quadrant logic, face states, sound, confetti
manifest.webmanifest       # PWA metadata (defaults to the fairy buddy)
manifest-<buddy>.webmanifest # one per buddy, referencing that buddy's icons
sw.js                      # offline caching service worker
icons/hero-<buddy>-*.png   # app icons, one set per buddy mascot
```

### Per-buddy home-screen icon

The installed app icon follows the buddy chosen in **Settings**. When a buddy
is picked, `app.js` swaps `<link rel="manifest">` (Android reads this at install)
and `<link rel="apple-touch-icon">` (iOS reads this at "Add to Home Screen"), so
the mascot you pick becomes the home-screen icon. Pick your buddy *before*
adding to the home screen — an already-installed icon can't be changed (an OS
limitation, not app behaviour). Icons are generated from the `hero-<buddy>.png`
art by `genheroes.py`.

## License

MIT
