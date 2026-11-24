``` A cute 3D Pixar-style tooth fairy for a children's app, gentle and friendly. Rounded chibi body, big sparkly eyes, auburn hair in a bun, translucent iridescent butterfly wings, pastel-pink dress, glowing gold star wand. Motion: she flies in from the lower-left along a smooth curved path, performs one playful loop-the-loop, and spins a full 360° around her own vertical axis as she travels (wings flapping throughout), then settles in the center, hovers, and happily waves her wand with a sparkle burst. Bouncy, smooth, seamless 3–4s loop. Portrait 9:16, character centered with generous margins (never cropped). Solid chroma-green #00FF00 background (for clean keying), flat even lighting, soft self-shadows only. Palette: pink #FF6FAE, lavender #B79CED, mint #5FD0B6. No scenery, no text.



However, now i want you to create other variations along the same lines, but instead of a fairy that flies in happy and bouncy:

- a boy superhero with capea, tooth on the chest as logo. cool looking though but also smiling and a tad cute. along the lines of the fairy. audience is 7 year old boys.

- same but a girl superhero

- a boy dentist coming in excited and clapping and showing the thumbs up.

- a girl densit coming in and cheering excited, celebrating





the rest is the same. all of these can be short animations, about 4 seconds each. 

```
## Unicorn (2026-11-24): still first, then image-to-video

Text-to-video drifts off-style, so the unicorn was made in two steps.

1. Gemini (Nano Banana), with a hero-fairy frame on #00FF00 attached as style reference:

```
Generate an image. Use this tooth fairy ONLY as a style reference: match exactly her 3D Pixar chibi style, rendering, materials, lighting and color softness. Create a new character: a cute baby unicorn mascot for a children's toothbrushing app (audience 6-9). Chibi proportions: big head, big sparkly brown eyes with long lashes, rosy cheeks, small happy smile. White coat with a soft pearly sheen, flowing pastel rainbow mane and tail (pink #FF6FAE, lavender #B79CED, mint #5FD0B6), glowing gold spiral horn, little pink hooves. Pose: standing calmly on all four hooves, body slightly turned three-quarter toward the viewer, looking at the camera. Full body visible, centered, with generous empty margin all around, especially above the head (she will rear up on her hind legs in an animation later). Portrait 9:16. Solid flat chroma-green #00FF00 background, no gradient, no ground shadow, no sparkles, no scenery, no text.
```

2. veo3ai.io Image to Video (Veo 3.1 Lite, 9:16, 8 s, 720p), the still (cropped to 720x1280) as both first AND last frame so it loops:

```
Animate this exact cute 3D Pixar-style baby unicorn; keep her design, colors and style identical. Fixed camera, no camera movement, no zoom. She stands happily, then joyfully rears up on her hind legs like a proud horse, front hooves kicking playfully in the air, rainbow mane and tail swishing, big smile, and a small burst of golden sparkles from her horn. She lands softly back on all four hooves and returns to exactly the starting pose. Bouncy, smooth, playful, character animation for a children's app. Her whole body including the horn stays fully inside the frame at all times, never cropped. Background stays solid flat chroma-green #00FF00 the entire time: no scenery, no ground, no shadows on the background, no text. Sparkles must stay close to the horn and disappear quickly. No sound needed.
```

3. `scripts/key-hero-clip.sh video_unicorn_raw.mp4 unicorn 1.0 4.5 2`, then the HEVC copy.
