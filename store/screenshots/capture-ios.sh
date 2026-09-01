#!/bin/zsh
# Capture App Store screenshots from the iOS simulators.
#
#   ./capture-ios.sh [scene ...]
#
# Builds the debug app once, then for each simulator below boots it, drives the
# app through each scene (see scenes.js) and grabs a screenshot. Output lands in
# ./ios/<profile>/<scene>.png.
#
# The two-minute brushing timer is fast-forwarded through the app's own tick(),
# so a full run costs milliseconds rather than two minutes per shot.
#
# The device list covers the sizes App Store Connect asks for. A 6.9" iPhone
# set plus a 13" iPad set is all that is required; the 6.3" iPhone is extra
# material to choose from.
#   6.9" iPhone  1320x2868 portrait / 2868x1320 landscape
#   6.3" iPhone  1206x2622 portrait / 2622x1206 landscape
#   13"  iPad    2064x2752 portrait / 2752x2064 landscape
set -euo pipefail

HERE=${0:A:h}
ROOT=${HERE:h:h}
PROJ=$ROOT/ios/BrushBuddy.xcodeproj
BUNDLE_ID=co.smallvictories.brushbuddy
OUT=$HERE/ios
DERIVED=$ROOT/ios/build
SCENE_TIMEOUT=45

# profile|simulator name|orientation
#
# Portrait only. Brush Buddy declares orientation: portrait in its manifest and
# is designed as a single upright column — its landscape rules exist so the app
# stays usable when Android 16 ignores the lock, not because landscape is a good
# shop window. Add landscape rows here if that ever changes.
DEVICES=(
  "iphone-6.9-portrait|iPhone 17 Pro Max|portrait"
  "iphone-6.3-portrait|iPhone 17|portrait"
  "ipad-13-portrait|iPad Pro 13-inch (M4)|portrait"
)

SCENES=(
  ready brushing brushing_late finale streak
  settings buddies buddy_super theme_ocean
  ready_nl settings_nl finale_nl buddies_nl
)
[[ $# -gt 0 ]] && SCENES=("$@")

SCENE_LIB=$(base64 < "$HERE/scenes.js" | tr -d '\n')

echo "==> Building the app"
# No web build step: Brush Buddy is plain static files at the repo root, and the
# Xcode "Sync web app build" phase copies them into the bundle.
xcodebuild -project "$PROJ" -scheme BrushBuddy -configuration Debug \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath "$DERIVED" \
  CODE_SIGNING_ALLOWED=NO build >/dev/null
APP=$DERIVED/Build/Products/Debug-iphonesimulator/BrushBuddy.app
[[ -d $APP ]] || { echo "Build produced no app bundle." >&2; exit 1; }

# Resolve a simulator name to a udid, preferring the newest runtime it exists on.
udid_for() {
  xcrun simctl list devices available -j \
    | python3 -c '
import json,sys
name=sys.argv[1]
data=json.load(sys.stdin)["devices"]
best=None
for runtime, devices in data.items():
    if "iOS" not in runtime: continue
    for d in devices:
        if d["name"] == name:
            key=[int(p) for p in runtime.rsplit(".",1)[-1].replace("-",".").split(".") if p.isdigit()]
            if best is None or key > best[0]: best=(key, d["udid"])
print(best[1] if best else "")' "$1"
}

failed=()

for entry in $DEVICES; do
  profile=${entry%%|*}; rest=${entry#*|}
  device=${rest%%|*};   orientation=${rest##*|}

  udid=$(udid_for "$device")
  if [[ -z $udid ]]; then
    echo "==> $profile: no simulator named '$device' — skipping" >&2
    failed+=("$profile (missing simulator)")
    continue
  fi

  echo "==> $profile ($device, $orientation)"
  mkdir -p "$OUT/$profile"

  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b >/dev/null 2>&1 || true
  # Fixed status bar, in case a future layout ever shows it.
  xcrun simctl status_bar "$udid" override \
    --time "9:41" --batteryState charged --batteryLevel 100 \
    --cellularMode active --cellularBars 4 --wifiBars 3 2>/dev/null || true
  xcrun simctl install "$udid" "$APP" >/dev/null

  for scene in $SCENES; do
    # Reinstall per scene so each one starts from a fresh app: no streak, the
    # default buddy and theme, and English. Without this the language picked by
    # a _nl scene survives in localStorage and silently turns later English
    # scenes Dutch, and yesterday's scene leaves a streak on today's shot.
    xcrun simctl terminate "$udid" "$BUNDLE_ID" >/dev/null 2>&1 || true
    xcrun simctl uninstall "$udid" "$BUNDLE_ID" >/dev/null 2>&1 || true
    xcrun simctl install "$udid" "$APP" >/dev/null

    container=$(xcrun simctl get_app_container "$udid" "$BUNDLE_ID" data)
    status_file="$container/Documents/scene-status.txt"
    rm -f "$status_file"

    xcrun simctl launch "$udid" "$BUNDLE_ID" \
      -sceneLibrary "$SCENE_LIB" -sceneName "$scene" \
      -sceneOrientation "$orientation" >/dev/null

    # The app writes DONE/FAIL to its Documents dir once the state is on screen.
    scene_status=""
    for _ in {1..$((SCENE_TIMEOUT * 5))}; do
      [[ -f $status_file ]] && { scene_status=$(<"$status_file"); break; }
      sleep 0.2
    done

    case "$scene_status" in
      DONE*)
        sleep 0.3
        shot="$OUT/$profile/$scene.png"
        xcrun simctl io "$udid" screenshot --type=png "$shot" >/dev/null 2>&1
        # The app rotates its own UI, but the simulated device frame stays
        # portrait, so a landscape capture comes out sideways in a portrait
        # image. Rotating the file gives a true landscape screenshot at the
        # dimensions App Store Connect expects.
        [[ $orientation == landscape ]] && sips --rotate 270 "$shot" >/dev/null
        echo "    $scene" ;;
      FAIL*)
        echo "    !! $scene_status" >&2; failed+=("$profile/$scene") ;;
      *)
        echo "    !! $scene timed out" >&2; failed+=("$profile/$scene") ;;
    esac
  done

  xcrun simctl shutdown "$udid" >/dev/null 2>&1 || true
done

if (( ${#failed} )); then
  echo "==> ${#failed} scene(s) failed: ${failed[*]}" >&2
  exit 1
fi
echo "==> Done: $OUT"
