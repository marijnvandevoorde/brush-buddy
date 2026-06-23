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

It's a static site — host it anywhere (GitHub Pages, Netlify, Vercel, …).
For **GitHub Pages**: push to the repo, then enable Pages on the default branch
(root). The app installs straight from the served URL over HTTPS.

## Project structure

```
index.html              # markup + SVG scene (teeth, ring, smiley)
styles.css              # styling & animations
app.js                  # timer, quadrant logic, face states, sound, confetti
manifest.webmanifest    # PWA metadata
sw.js                   # offline caching service worker
icons/                  # generated PNG app icons
```

## License

MIT
