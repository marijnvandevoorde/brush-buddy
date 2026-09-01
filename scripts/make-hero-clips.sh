#!/bin/sh
# Regenerate the HEVC-with-alpha copies of the hero clips from the VP9 masters.
#
#   scripts/make-hero-clips.sh
#
# The masters are VP9-in-WebM with a separate alpha plane (alpha_mode=1), which
# Chrome and Firefox composite and WebKit does not. WebKit instead wants HEVC
# with an alpha auxiliary layer, so each clip ships twice; playHero() in app.js
# picks per engine.
#
# Three things here are load-bearing, and all three fail *silently* — the clip
# still plays, just opaque, with the mascot in a white box:
#
#   1. -c:v libvpx-vp9 on the INPUT. ffmpeg's default VP9 decoder drops the
#      alpha plane without warning.
#   2. ProRes 4444 as the intermediate. It is the interchange format that both
#      ffmpeg and AVFoundation read with alpha intact.
#   3. avconvert, not ffmpeg, for the HEVC encode. ffmpeg's hevc_videotoolbox
#      does produce a file whose alpha ffmpeg can read back — but WebKit ignores
#      it. Verified on 2026-09-01: ffmpeg's output composited pure white in
#      WKWebView, avconvert's composited the page background correctly.
#
# Check the result by eye, or sample a pixel outside the mascot: it must be the
# page background, not white.
set -eu

cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
command -v ffmpeg    >/dev/null || { echo "error: ffmpeg not installed" >&2; exit 1; }
command -v avconvert >/dev/null || { echo "error: avconvert missing (macOS only)" >&2; exit 1; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

for src in hero-*.webm; do
  base="${src%.webm}"
  ffmpeg -y -v error -c:v libvpx-vp9 -i "$src" \
    -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le -an "$TMP/$base.mov"
  avconvert -s "$TMP/$base.mov" -o "$TMP/$base-hevc.mov" \
    -p PresetHEVCHighestQualityWithAlpha --replace >/dev/null 2>&1
  mv "$TMP/$base-hevc.mov" "$base.mp4"
  printf "%-26s %6s KB -> %-24s %6s KB\n" \
    "$src" "$(( $(stat -f%z "$src") / 1024 ))" "$base.mp4" "$(( $(stat -f%z "$base.mp4") / 1024 ))"
done
echo "done — commit the .mp4 files alongside the .webm masters"
