#!/bin/sh
# Turn a raw green-screen Veo clip into a transparent hero master (VP9 WebM with alpha).
#
#   scripts/key-hero-clip.sh <raw.mp4> <name> <start-seconds> <end-seconds> [speed]
#   scripts/key-hero-clip.sh video_unicorn_raw.mp4 unicorn 1.0 4.5 2   -> hero-unicorn.webm
#
# speed (default 1) speeds the cut up; the other heroes are 1.2-1.9 s long.
#
# Then run scripts/make-hero-clips.sh for the HEVC copy WebKit needs, and pick a
# thumbnail frame for hero-<name>.png.
#
# Raw clips come from veo3ai.io (Veo 3.1 Lite, 9:16, 720p) on a #00FF00 background;
# the prompt is in scripts/video_prompt.md.
#
# Order matters: chromakey FIRST, despill AFTER. Despill before keying neutralises the
# green so the key fails; without despill the edges keep a green halo. Despill only
# touches a few pixels along the edge (eroded alpha mask): run over the whole frame it
# turns mint/teal colours on the mascot grey. Inside the mascot, green is only capped
# at red where red > blue: that turns green-tinted gold glow (sparkles) back to gold
# and leaves mint (blue > red) alone.
# The free-tier "veo3ai.io" watermark sits bottom-right; it is painted green before
# keying so it disappears with the background. Keep the mascot out of that corner.
set -eu

[ $# -ge 4 ] || { sed -n '2,7p' "$0" >&2; exit 2; }
src=$(cd "$(dirname "$1")" && pwd)/$(basename "$1") name=$2 start=$3 end=$4 speed=${5:-1}

cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
command -v ffmpeg >/dev/null || { echo "error: ffmpeg not installed" >&2; exit 1; }

ffmpeg -y -v error -ss "$start" -to "$end" -i "$src" -an \
  -filter_complex "[0:v]setpts=PTS/$speed,\
drawbox=x=iw-230:y=ih-80:w=230:h=80:color=0x00FF00:t=fill,\
chromakey=0x00FF00:0.18:0.06,format=gbrap,geq=r='r(X,Y)':b='b(X,Y)':a='alpha(X,Y)':g='if(lt(b(X,Y),r(X,Y)),min(g(X,Y),r(X,Y)),g(X,Y))',split=3[k][d][m];\
[d]despill=type=green:mix=0.6:expand=0.1[ds];\
[m]alphaextract,erosion,erosion,erosion,erosion,gblur=sigma=2,format=gbrap[mask];\
[ds][k][mask]maskedmerge,format=yuva420p" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 32 -row-mt 1 -auto-alt-ref 0 \
  "hero-$name.webm"

echo "hero-$name.webm: $(( $(stat -f%z "hero-$name.webm") / 1024 )) KB"
