#!/bin/sh
# Mirror the canonical web app at the repo root into a native wrapper's asset
# directory.
#
#   scripts/sync-web-assets.sh <destination-dir>
#
# The repo root is the single source of truth. Both wrappers call this, so a
# change to the web app reaches Android and iOS the same way and neither can
# quietly drift from the other. Everything the app needs is copied in; nothing
# is fetched at runtime, so the wrappers work with the device offline.
set -eu

DEST=${1:?usage: sync-web-assets.sh <destination-dir>}
SRC=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

# sw.js is deliberately excluded: the wrappers serve every file from inside the
# bundle already, so a service worker would only add a second, staler cache.
# privacy.html is web-only — the stores link to the policy on small-victories.co.
FILES="index.html styles.css fonts.css app.js streak-logic.js streaks.js manifest.webmanifest"
DIRS="fonts icons"
HEROES="fairy girl-dentist boy-dentist girl-super boy-super"

[ -f "$SRC/index.html" ] || { echo "error: no index.html at $SRC" >&2; exit 1; }

rm -rf "$DEST"
mkdir -p "$DEST"

for f in $FILES; do cp "$SRC/$f" "$DEST/$f"; done
for d in $DIRS;  do cp -R "$SRC/$d" "$DEST/$d"; done
for h in $HEROES; do
  cp "$SRC/manifest-$h.webmanifest" "$DEST/"
  cp "$SRC/hero-$h.png"  "$DEST/"
  cp "$SRC/hero-$h.webm" "$DEST/"
done

# A stray absolute URL in anything the browser parses would mean the app tries to
# reach the network — which the wrappers cannot do. Fail loudly rather than ship
# it. Only markup/style/script/manifest files are scanned; fonts/OFL.txt is a
# licence whose URLs are prose, not fetches.
HITS=$(find "$DEST" \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.webmanifest' \) \
       -exec grep -InoE 'https?://[^"'"'"'` )<>]+' {} + 2>/dev/null || true)
if [ -n "$HITS" ]; then
  echo "error: bundled web assets reference an absolute URL:" >&2
  echo "$HITS" >&2
  exit 1
fi

echo "Synced $(find "$DEST" -type f | wc -l | tr -d ' ') web files into $DEST"
