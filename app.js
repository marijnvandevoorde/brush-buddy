/* Brush Buddy — guided 2-minute brushing with a mascot.
   Iteration 3: 6-sextant map (dedicated front-teeth sections), per child-dentist
   guidance — 4 back beats (25s) + 2 front beats (10s) = 120s. Plus in-section
   surface sub-cues, scrub-away germs, a lively buddy, and a Calm/bedtime mode. */
"use strict";

// ---- Config ----------------------------------------------------------------
// Six sextants. Child-dentist guidance: do the whole upper arch, then the lower
// arch, ENDING on Bottom-Front (lower-incisor insides — the most-missed spot).
// `center` is the angle on the ring (from top, clockwise) — fixed by anatomy;
// the array ORDER is the brushing sequence. Back sextants get 3 surface passes
// (outside → top → inside), fronts get 2 (outside → inside, brushed up & down).
const SECTIONS = [
  { key: "UR", label: "Top Right",    center: 60,  teeth: 4, type: "back",  secs: 25 },
  { key: "UF", label: "Top Front",    center: 0,   teeth: 4, type: "front", secs: 10 },
  { key: "UL", label: "Top Left",     center: 300, teeth: 4, type: "back",  secs: 25 },
  { key: "LL", label: "Bottom Left",  center: 240, teeth: 4, type: "back",  secs: 25 },
  { key: "LR", label: "Bottom Right", center: 120, teeth: 4, type: "back",  secs: 25 },
  { key: "LF", label: "Bottom Front", center: 180, teeth: 4, type: "front", secs: 10 },
];
const N_SECTIONS = SECTIONS.length;
const RING_R = 118;
const TEETH_SPAN = 44;      // angular spread of a section's teeth (deg)
const ARC_SPAN_DEG = 52;    // highlight arc a touch wider than the teeth
// Tooth types by position in the arch (front = incisors, corners = canine fangs,
// back = molars), so the ring reads like a real set of teeth from above — but
// stylised, kid-friendly. Dimensions + organic border-radii per type.
const TOOTH_DIMS = {
  incisor: { w: 13, h: 22, radii: ["34% 34% 46% 46% / 22% 22% 56% 56%", "32% 36% 44% 48% / 20% 24% 54% 58%"] },
  canine:  { w: 12, h: 27, radii: ["50% 50% 34% 34% / 64% 64% 28% 28%", "48% 52% 36% 32% / 62% 66% 30% 26%"] },
  molar:   { w: 20, h: 20, radii: ["38% 38% 40% 40% / 42% 42% 44% 44%", "36% 40% 38% 42% / 40% 44% 42% 46%"] },
};
function toothType(ang, arch) {
  const front = arch === "top" ? 0 : 180;
  let d = Math.abs(ang - front);
  d = Math.min(d, 360 - d);
  if (d <= 25) return "incisor"; // front teeth
  if (d <= 40) return "canine";  // the fang at the corner
  return "molar";                // back teeth
}

// Germs vanish surface-by-surface to nudge focus (outside → top → inside) without
// hard-splitting the timer. Each surface's germs sit at a different spot on the
// tooth (outer tip / middle / inner root-side).
const SURF = {
  out: { icon: "🦷", label: "Outsides",     hint: "tiny gentle circles", top: -2 },
  top: { icon: "⬇️", label: "Chewing tops", hint: "gentle back & forth",  top: 7 },
  in:  { icon: "👅", label: "Insides",      hint: "tiny gentle circles", top: 15 },
};
function sectionSurfaces(sec) { return sec.type === "front" ? ["out", "in"] : ["out", "top", "in"]; }

const MOUTHS = [
  "M20 32 Q50 14 80 32",   // 0 sad
  "M22 30 L78 30",         // 1 meh
  "M22 28 Q50 38 78 28",   // 2 slight
  "M20 26 Q50 46 80 26",   // 3 smile
  "M18 23 Q50 53 82 23 Z", // 4 big open
];
const SAYS = ["Ready? Let's brush!", "Nice! Keep going →", "Great brushing!", "Almost sparkling!", "All clean! 🎉"];
const CONFETTI_COLORS = ["#F4C430", "#FF6FAE", "#54C7E8", "#7FCF6E", "#B79CED", "#2D7DD2"];

// ---- Elements --------------------------------------------------------------
const els = {
  app: document.getElementById("app"),
  status: document.getElementById("status"),
  dots: document.getElementById("dots"),
  teeth: document.getElementById("teeth"),
  labels: document.getElementById("labels"),
  arc: document.getElementById("arc"),
  cdRing: document.getElementById("cdRing"),
  buddyBody: document.getElementById("buddyBody"),
  face: document.querySelector(".face"),
  mouth: document.getElementById("mouth"),
  says: document.getElementById("says"),
  surfaceCue: document.getElementById("surfaceCue"),
  primary: document.getElementById("primary"),
  reset: document.getElementById("reset"),
  soundBtn: document.getElementById("soundBtn"),
  calmBtn: document.getElementById("calmBtn"),
  fairy: document.getElementById("fairyLayer"),
};

// ---- Build ring, dots, labels (data-driven from SECTIONS) ------------------
const teethBySection = [];
const dotEls = [];
const labelEls = [];
function buildScene() {
  const teethFrag = document.createDocumentFragment();
  SECTIONS.forEach((sec, si) => {
    const arr = [];
    const N = sec.teeth;
    for (let k = 0; k < N; k++) {
      const ang = sec.center - TEETH_SPAN / 2 + k * (TEETH_SPAN / (N - 1));
      const anchor = document.createElement("div");
      anchor.className = "tooth-anchor";
      anchor.style.transform = `rotate(${ang.toFixed(2)}deg) translateY(-${RING_R}px)`;
      const tooth = document.createElement("div");
      const type = toothType(ang, sec.key[0] === "U" ? "top" : "bottom");
      tooth.className = "tooth " + type;
      const dim = TOOTH_DIMS[type];
      const w = dim.w + rnd(-1, 1.5);
      const h = dim.h + rnd(-1.5, 1.5);
      tooth.style.width = w.toFixed(1) + "px";
      tooth.style.height = h.toFixed(1) + "px";
      tooth.style.margin = `${(-h / 2).toFixed(1)}px 0 0 ${(-w / 2).toFixed(1)}px`;
      tooth.style.borderRadius = dim.radii[(k + si) % dim.radii.length];
      anchor.appendChild(tooth);
      teethFrag.appendChild(anchor);
      arr.push(tooth);
    }
    teethBySection.push(arr);

    // progress dot
    const dot = document.createElement("span");
    dot.className = "dot";
    els.dots.appendChild(dot);
    dotEls.push(dot);

    // label positioned around the ring at the section's center angle
    const rad = (sec.center * Math.PI) / 180;
    const x = 160 + 150 * Math.sin(rad);
    const y = 160 - 150 * Math.cos(rad);
    const lab = document.createElement("div");
    lab.className = "qlabel";
    lab.textContent = sec.label;
    lab.style.left = x.toFixed(1) + "px";
    lab.style.top = y.toFixed(1) + "px";
    els.labels.appendChild(lab);
    labelEls.push(lab);
  });
  els.teeth.appendChild(teethFrag);
}

// ---- Ring geometry ---------------------------------------------------------
const CD_CIRC = 2 * Math.PI * 46;
const ARC_CIRC = 2 * Math.PI * RING_R;
els.cdRing.style.strokeDasharray = CD_CIRC.toFixed(2);
els.arc.style.strokeDasharray = `${(ARC_CIRC * ARC_SPAN_DEG / 360).toFixed(2)} ${ARC_CIRC.toFixed(2)}`;

// ---- Settings: sound + calm mode ------------------------------------------
let soundOn = true;
let calm = false;
try { calm = localStorage.getItem("brushBuddy.calm") === "1"; } catch (e) {}
function applyCalm() {
  els.app.setAttribute("data-calm", calm ? "true" : "false");
  els.calmBtn.textContent = calm ? "🌙" : "☀️";
  els.calmBtn.setAttribute("aria-pressed", String(calm));
  els.calmBtn.title = calm ? "Calm mode on" : "Calm mode off";
}

// ---- Sound (Web Audio, no assets) -----------------------------------------
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}
function tone(freq, start, dur, type = "sine", gain = 0.16) {
  if (!soundOn || !audioCtx) return;
  const t0 = audioCtx.currentTime + start;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}
function sectionBeep() {
  if (calm) { tone(440, 0, 0.2, "sine", 0.07); return; }
  tone(660, 0, 0.16, "triangle"); tone(880, 0.11, 0.16, "triangle");
}
function surfaceTick() { if (!calm) tone(560, 0, 0.09, "sine", 0.06); }
function endSound() {
  if (calm) { tone(523, 0, 0.3, "sine", 0.1); tone(659, 0.18, 0.34, "sine", 0.1); return; }
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.16, 0.32, "triangle", 0.2));
}
function buzz(p) { if (calm || !navigator.vibrate) return; try { navigator.vibrate(p); } catch (e) {} }

// ---- Wake lock -------------------------------------------------------------
let wakeLock = null;
async function requestWake() {
  try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); }
  catch (e) {}
}
function releaseWake() { try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; }

// ---- Buddy reaction --------------------------------------------------------
let cheerTimer = null;
function cheerBuddy() {
  els.buddyBody.classList.remove("cheer");
  void els.buddyBody.offsetWidth;
  els.buddyBody.classList.add("cheer");
  clearTimeout(cheerTimer);
  cheerTimer = setTimeout(() => els.buddyBody.classList.remove("cheer"), 600);
}

// ---- Germs (scrub-away, sequenced by surface) ------------------------------
let activeGerms = [];
let germWindowTotal = 0;
let currentWindow = -1;
const GERM_SIZE = 12;
function spawnGermsForSurface(sectionIdx, surfKey) {
  clearGerms();
  teethBySection[sectionIdx].forEach((tooth) => {
    // Each ring tooth points radially outward: its top edge is the OUTER (cheek)
    // tip and its bottom edge is the INNER (tongue) end. Position germs relative
    // to the tooth's own size so "outside/top/inside" land correctly on every
    // tooth shape (incisor / canine / molar).
    const w = parseFloat(tooth.style.width) || 16;
    const h = parseFloat(tooth.style.height) || 24;
    let top;
    if (surfKey === "out") top = -1;                 // outer tip (cheek side)
    else if (surfKey === "in") top = h - GERM_SIZE + 1; // inner end (tongue side)
    else top = (h - GERM_SIZE) / 2;                  // chewing surface (middle)
    const left = (w - GERM_SIZE) / 2;
    const germ = document.createElement("span");
    germ.className = "germ";
    germ.style.left = (left + (Math.random() * 1.2 - 0.6)).toFixed(1) + "px";
    germ.style.top = (top + (Math.random() * 1.2 - 0.6)).toFixed(1) + "px";
    germ.style.animationDelay = (Math.random() * 1.2).toFixed(2) + "s";
    tooth.appendChild(germ);
    activeGerms.push(germ);
  });
  germWindowTotal = activeGerms.length;
}
function popGerm() {
  const germ = activeGerms.pop();
  if (!germ) return;
  germ.classList.add("pop");
  setTimeout(() => germ.remove(), 320);
}
function clearGerms() {
  activeGerms.forEach((g) => g.remove());
  activeGerms = [];
  germWindowTotal = 0;
  els.teeth.querySelectorAll(".germ").forEach((g) => g.remove());
}

// ---- Dirt on the tooth mascot (fades as it gets clean & happy) -------------
// One smudge per section, scattered over the crown, so a smudge fades each time
// a section is completed. Every smudge is generated with a random blobby shape,
// size, tint, rotation and a few scattered sand grains, so no two are alike.
const DIRT = [
  { l: 26, t: 24, s: 16 }, { l: 56, t: 22, s: 13 }, { l: 22, t: 46, s: 15 },
  { l: 60, t: 44, s: 14 }, { l: 34, t: 60, s: 14 }, { l: 50, t: 58, s: 12 },
];
const EARTH = ["#BE9A5E", "#C9A874", "#B0894C", "#B6884A", "#C4A06A", "#A87C42"];
const rnd = (a, b) => a + Math.random() * (b - a);
function blobRadius() {
  const v = () => Math.round(rnd(34, 66));
  return `${v()}% ${v()}% ${v()}% ${v()}% / ${v()}% ${v()}% ${v()}% ${v()}%`;
}
const dirtEls = [];
function buildDirt() {
  const dirt = document.getElementById("dirt");
  DIRT.forEach((d, i) => {
    const w = d.s + rnd(-3, 4);
    const h = d.s * rnd(0.7, 0.95) + rnd(-2, 3);
    const sp = document.createElement("span");
    sp.className = "dirt-spot";
    sp.style.left = (d.l + rnd(-3, 3)).toFixed(1) + "px";
    sp.style.top = (d.t + rnd(-3, 3)).toFixed(1) + "px";
    sp.style.width = w.toFixed(1) + "px";
    sp.style.height = h.toFixed(1) + "px";
    sp.style.background = EARTH[(Math.random() * EARTH.length) | 0];
    sp.style.borderRadius = blobRadius();
    sp.style.boxShadow = "inset -1px -2px 1px rgba(0,0,0,0.16)";
    sp.style.setProperty("--rot", Math.round(rnd(-35, 35)) + "deg");
    sp.style.transitionDelay = (i * 0.05).toFixed(2) + "s";
    // a few random sand grains around the smudge
    const grains = 2 + ((Math.random() * 2) | 0);
    for (let g = 0; g < grains; g++) {
      const gs = rnd(2, 5);
      const gr = document.createElement("span");
      gr.className = "dirt-grain";
      gr.style.width = gs.toFixed(1) + "px";
      gr.style.height = gs.toFixed(1) + "px";
      gr.style.left = (rnd(-4, w - gs + 4)).toFixed(1) + "px";
      gr.style.top = (rnd(-4, h - gs + 4)).toFixed(1) + "px";
      gr.style.borderRadius = blobRadius();
      sp.appendChild(gr);
    }
    dirt.appendChild(sp);
    dirtEls.push(sp);
  });
}
function updateDirt() {
  const cleaned = done ? dirtEls.length : (started ? si : 0);
  dirtEls.forEach((d, i) => d.classList.toggle("clean", i < cleaned));
}

// ---- State machine ---------------------------------------------------------
let si = 0;             // current section index, N_SECTIONS when done
let timeLeft = null;    // seconds left in the current section
let running = false;
let started = false;
let done = false;
let ticker = null;

function curSecs() { return SECTIONS[Math.min(si, N_SECTIONS - 1)].secs; }
function moodIndex() {
  if (!started) return 0;
  if (done) return 4;
  return Math.min(4, Math.round((si / N_SECTIONS) * 4));
}

function enterSection(i, announce) {
  clearGerms();
  currentWindow = -1; // germs for the first surface are spawned by updateBrushing()
  if (announce) { cheerBuddy(); sectionBeep(); buzz([110, 50, 110]); }
}

// Drives the surface cue + the surface-sequenced germs. Within a section the
// single countdown ring keeps running (no hard 18-way split); germs simply move
// outside → top → inside and vanish as the child scrubs.
function surfaceLabel(sec, surfKey) {
  const s = SURF[surfKey];
  if (sec.type === "front") {
    return `${surfKey === "in" ? "↕️" : "🦷"} ${surfKey === "in" ? "Inside front" : "Front teeth"} · brush up & down`;
  }
  return `${s.icon} ${s.label} · ${s.hint}`;
}
function updateBrushing() {
  if (!started || done || timeLeft == null) { els.surfaceCue.textContent = ""; currentWindow = -1; return; }
  const sec = SECTIONS[si];
  const surfaces = sectionSurfaces(sec);
  const winLen = sec.secs / surfaces.length;
  const into = sec.secs - timeLeft;
  const win = Math.min(surfaces.length - 1, Math.floor(into / winLen));
  if (win !== currentWindow) {
    currentWindow = win;
    spawnGermsForSurface(si, surfaces[win]);
    if (into > 0.5) surfaceTick(); // soft "move to the next surface" cue
  }
  els.surfaceCue.textContent = surfaceLabel(sec, surfaces[win]);
  // scrub this surface's germs away across its sub-window
  const inWinRemain = winLen - (into - win * winLen);
  const target = Math.ceil(germWindowTotal * (inWinRemain / winLen));
  while (activeGerms.length > target) popGerm();
}

function render() {
  const mood = moodIndex();
  els.status.textContent = !started ? "Ready" : done ? "Done!" : `${si + 1} of ${N_SECTIONS}`;

  for (let q = 0; q < N_SECTIONS; q++) {
    const active = started && !done && q === si;
    const completed = done || (started && q < si);
    dotEls[q].classList.toggle("active", active);
    dotEls[q].classList.toggle("done", completed);
    labelEls[q].classList.toggle("active", active);
    labelEls[q].classList.toggle("done", completed);
    teethBySection[q].forEach((t) => {
      t.classList.toggle("active", active);
      t.classList.toggle("done", completed);
    });
  }

  const arcVisible = started && !done;
  els.arc.classList.toggle("show", arcVisible);
  if (arcVisible) els.arc.style.transform = `rotate(${SECTIONS[si].center - 116}deg)`;

  const frac = (started && !done && timeLeft != null) ? (timeLeft / curSecs()) : (done ? 0 : 1);
  els.cdRing.style.strokeDashoffset = (CD_CIRC * (1 - frac)).toFixed(2);

  els.face.classList.toggle("sad", mood === 0);
  els.buddyBody.classList.toggle("excited", done);
  els.mouth.setAttribute("d", MOUTHS[mood]);
  els.mouth.setAttribute("fill", mood >= 4 ? "var(--mouth-excited)" : "transparent");
  els.says.textContent = SAYS[mood];

  updateDirt();
  updateBrushing();

  els.primary.textContent = !started ? "Start brushing" : done ? "Brush again" : running ? "Pause" : "Resume";
}

function tick() {
  if (!running) return;
  if (timeLeft > 1) { timeLeft -= 1; render(); return; }
  if (si < N_SECTIONS - 1) {
    si += 1;
    timeLeft = curSecs();
    enterSection(si, true);
    render();
    return;
  }
  finish();
}

function finish() {
  clearInterval(ticker);
  ticker = null;
  running = false;
  done = true;
  si = N_SECTIONS;
  timeLeft = 0;
  clearGerms();
  render();
  cheerBuddy();
  launchFairy();
  endSound();
  buzz([90, 40, 90, 40, 220]);
  releaseWake();
  document.dispatchEvent(new CustomEvent("brush:complete", { detail: { sections: N_SECTIONS, seconds: 120 } }));
}

// ---- Tooth-fairy finale ----------------------------------------------------
// A cute SVG fairy flies in along a curvy path (animateMotion), flaps her wings,
// then hovers and waves her wand ("cheering"). Reduced-motion: appears centered,
// no flight/flap.
function clearFairy() { els.fairy.innerHTML = ""; }

// Finale: the chosen hero's transparent (alpha) clip floats over the done scene,
// so it works with any colour scheme. Falls back to the built-in SVG fairy if the
// webm can't play (e.g. iOS Safari lacks VP9 alpha) or for reduced-motion.
let heroFadeTimer = null;
// Play a hero's transparent clip over the scene: fade in, then fade out shortly
// after it ends so it never lingers on top of the controls. Used for the finale
// (isFinale → SVG/reduced-motion fallback) and for previews when picking a hero.
function playHero(hero, isFinale) {
  clearFairy();
  clearTimeout(heroFadeTimer);
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (isFinale && reduced) return launchFairySVG();
  const v = document.createElement("video");
  v.className = "hero-video";
  v.muted = true; v.autoplay = true; v.playsInline = true;
  v.setAttribute("playsinline", "");
  v.innerHTML = `<source src="hero-${hero}.webm" type="video/webm">`;
  let faded = false;
  const fadeOut = () => {
    if (faded) return; faded = true;
    v.classList.remove("show");
    setTimeout(() => { if (v.parentNode) v.remove(); }, 650);
  };
  const fallback = () => { if (v.parentNode) v.remove(); if (isFinale) launchFairySVG(); };
  v.addEventListener("error", fallback, { once: true });
  v.addEventListener("loadeddata", () => {
    if (v.play) v.play().catch(() => {});
    requestAnimationFrame(() => v.classList.add("show"));
  });
  v.addEventListener("ended", () => { heroFadeTimer = setTimeout(fadeOut, 400); }, { once: true });
  els.fairy.appendChild(v);
  setTimeout(() => { if (!v.videoWidth) fallback(); }, 1500);  // asset missing → fallback
  heroFadeTimer = setTimeout(fadeOut, 5000);                   // safety: never linger
}
function launchFairy() { playHero(currentHero(), true); }

function launchFairySVG() {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const flyDur = calm ? 3.2 : 2.6;
  // loopy flight: swoop up from the lower-left, do a loop-the-loop, settle center
  const flyPath = "M -80 800 C 130 560, 285 605, 250 455 C 226 360, 150 360, 178 452 C 198 524, 286 496, 250 412 C 232 362, 210 380, 195 360";
  const motion = reduced ? "" :
    `<animateMotion id="fFly" begin="indefinite" dur="${flyDur}s" fill="freeze" calcMode="paced" path="${flyPath}"/>` +
    `<animateTransform attributeName="transform" additive="sum" type="translate" begin="${flyDur}s" dur="2.8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" values="0 0;0 -9;0 0"/>`;
  const flap = (pivot, sign) => reduced ? "" :
    `<animateTransform attributeName="transform" type="rotate" values="0 ${pivot} -4;${sign * 22} ${pivot} -4;0 ${pivot} -4" dur="0.25s" repeatCount="indefinite"/>`;
  const wandAnim = reduced ? "" :
    `<animateTransform attributeName="transform" type="rotate" begin="${flyDur}s" values="0 11 2;-22 11 2;0 11 2" dur="0.8s" repeatCount="indefinite"/>`;
  const twinkle = (begin, dur) => reduced ? "" :
    `<animateTransform attributeName="transform" type="scale" begin="${begin}" dur="${dur}" values="0.5;1.2;0.5" keyTimes="0;0.5;1" repeatCount="indefinite"/>`;
  const gOpen = reduced ? '<g transform="translate(195,360)">' : "<g>";

  const defs =
    '<defs>' +
      '<radialGradient id="fWing" cx="38%" cy="28%" r="80%">' +
        '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.97"/>' +
        '<stop offset="55%" stop-color="#d6e6ff" stop-opacity="0.72"/>' +
        '<stop offset="100%" stop-color="#b79ced" stop-opacity="0.5"/>' +
      '</radialGradient>' +
      '<radialGradient id="fGlow" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0%" stop-color="#fff3b0" stop-opacity="0.95"/>' +
        '<stop offset="100%" stop-color="#fff3b0" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="fHalo" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0%" stop-color="#ffdcec" stop-opacity="0.6"/>' +
        '<stop offset="100%" stop-color="#ffdcec" stop-opacity="0"/>' +
      '</radialGradient>' +
    '</defs>';

  const fairy = [
    '<circle cx="0" cy="-8" r="50" fill="url(#fHalo)"/>',
    `<g>${flap(-9, 1)}<ellipse cx="-32" cy="-20" rx="20" ry="31" fill="url(#fWing)" stroke="#fff" stroke-width="1.4"/><ellipse cx="-27" cy="10" rx="15" ry="22" fill="url(#fWing)" stroke="#fff" stroke-width="1.2"/></g>`,
    `<g>${flap(9, -1)}<ellipse cx="32" cy="-20" rx="20" ry="31" fill="url(#fWing)" stroke="#fff" stroke-width="1.4"/><ellipse cx="27" cy="10" rx="15" ry="22" fill="url(#fWing)" stroke="#fff" stroke-width="1.2"/></g>`,
    '<path d="M0 -2 C -11 -2 -17 6 -19 18 C -23 36 -21 48 0 50 C 21 48 23 36 19 18 C 17 6 11 -2 0 -2 Z" fill="#FF6FAE"/>',
    '<path d="M-19 34 Q0 44 19 34 Q15 48 0 50 Q-15 48 -19 34 Z" fill="#ff96c4"/>',
    '<rect x="-6" y="-12" width="12" height="16" rx="6" fill="#FDE0C4"/>',
    '<line x1="4" y1="-4" x2="12" y2="2" stroke="#FDE0C4" stroke-width="4.4" stroke-linecap="round"/>',
    '<circle cx="0" cy="-26" r="17" fill="#FDE0C4"/>',
    '<circle cx="-9" cy="-21" r="3.4" fill="#ffb0c6" opacity="0.85"/><circle cx="9" cy="-21" r="3.4" fill="#ffb0c6" opacity="0.85"/>',
    '<circle cx="-6" cy="-27" r="2.6" fill="#3a2a2a"/><circle cx="6" cy="-27" r="2.6" fill="#3a2a2a"/>',
    '<circle cx="-5.1" cy="-28" r="0.9" fill="#fff"/><circle cx="6.9" cy="-28" r="0.9" fill="#fff"/>',
    '<path d="M-5 -20 Q0 -15 5 -20" fill="none" stroke="#a85b48" stroke-width="1.7" stroke-linecap="round"/>',
    '<path d="M-17 -28 Q-15 -45 0 -45 Q15 -45 17 -28 Q8 -37 0 -36 Q-8 -37 -17 -28 Z" fill="#8a4b2f"/>',
    '<circle cx="0" cy="-44" r="6.5" fill="#8a4b2f"/>',
    `<g>${wandAnim}<line x1="11" y1="2" x2="36" y2="-22" stroke="#caa05a" stroke-width="2.8" stroke-linecap="round"/><circle cx="38" cy="-24" r="13" fill="url(#fGlow)"/><path d="M38 -34 l3 6.4 7 0.9 -5.2 4.9 1.3 7 -6.1 -3.4 -6.1 3.4 1.3 -7 -5.2 -4.9 7 -0.9 z" fill="#FFD54A" stroke="#F4B400" stroke-width="0.8"/></g>`,
    `<g transform="translate(-46,-34)"><g>${twinkle('0.2s','1.3s')}<text font-size="14">\u2728</text></g></g>`,
    `<g transform="translate(44,18)"><g>${twinkle('0.6s','1.1s')}<text font-size="12">\u2728</text></g></g>`,
    `<g transform="translate(-30,36)"><g>${twinkle('0.9s','1.5s')}<text font-size="10">\u2728</text></g></g>`,
    `<g transform="translate(30,-46)"><g>${twinkle(flyDur + 's','1.2s')}<text font-size="13">\u2b50</text></g></g>`,
  ].join("");

  els.fairy.innerHTML =
    '<svg class="fairy-svg" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">' +
      defs + gOpen + motion + '<g transform="scale(1.18)">' + fairy + '</g></g>' +
    '</svg>';
  // SMIL begin is on the document timeline, so a fairy inserted late would skip
  // its fly-in. Kick the motion off from "now" so she actually flies in + loops.
  const fly = els.fairy.querySelector("#fFly");
  if (fly && fly.beginElement) { try { fly.beginElement(); } catch (e) {} }
}

// ---- Controls --------------------------------------------------------------
function start() {
  ensureAudio();
  requestWake();
  clearInterval(ticker);
  started = true; running = true; done = false; si = 0; timeLeft = SECTIONS[0].secs;
  clearFairy();
  enterSection(0, false);
  render();
  ticker = setInterval(tick, 1000);
}
function togglePause() {
  running = !running;
  if (running) { ensureAudio(); requestWake(); } else { releaseWake(); }
  render();
}
function reset() {
  clearInterval(ticker);
  ticker = null;
  started = false; running = false; done = false; si = 0; timeLeft = null;
  currentWindow = -1;
  clearGerms();
  clearFairy();
  render();
  releaseWake();
}

els.primary.addEventListener("click", () => {
  if (!started || done) start();
  else togglePause();
});
els.reset.addEventListener("click", reset);
els.soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  els.soundBtn.textContent = soundOn ? "🔊" : "🔇";
  if (soundOn) ensureAudio();
});
els.calmBtn.addEventListener("click", () => {
  calm = !calm;
  try { localStorage.setItem("brushBuddy.calm", calm ? "1" : "0"); } catch (e) {}
  applyCalm();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && running) requestWake();
});

// ---- Settings: colour scheme + hero (saved on-device) ----------------------
const THEMES = [
  { key: "candy",        label: "Candy",    accent: "#FF6FAE", accent2: "#B79CED", happy: "#5FD0B6", bg: "#FFF0F7", text: "#6B3A56" },
  { key: "rosewater",    label: "Rosewater",accent: "#F06C9B", accent2: "#C9A7F0", happy: "#5FCBA0", bg: "#FFF4F8", text: "#5C3147" },
  { key: "peach-blossom",label: "Peach",    accent: "#FF8A6B", accent2: "#E59ACB", happy: "#6FCF97", bg: "#FFF3EC", text: "#6B3B33" },
  { key: "rocket",       label: "Rocket",   accent: "#3D6FE0", accent2: "#3FC4D6", happy: "#FF9F45", bg: "#EAF1FF", text: "#1C3061" },
  { key: "dino",         label: "Dino",     accent: "#2FA36B", accent2: "#3FBFD8", happy: "#F2A03D", bg: "#E9F8F0", text: "#173D31" },
  { key: "ocean",        label: "Ocean",    accent: "#13A6A6", accent2: "#54C7E8", happy: "#7FCF6E", bg: "#E5FAF8", text: "#0E4D4D" },
  { key: "sunshine",     label: "Sunshine", accent: "#FF9E2C", accent2: "#FFD24C", happy: "#5CC98B", bg: "#FFF8E8", text: "#5E4220" },
  { key: "mint-coral",   label: "Mint",     accent: "#FF7A6E", accent2: "#57D0C0", happy: "#52C58A", bg: "#EFFAF6", text: "#27514A" },
  { key: "bright",       label: "Bright",   accent: "#2D7DD2", accent2: "#F4C430", happy: "#3FB57E", bg: "#EAF4FF", text: "#1B3A57" },
];
const HEROES = [
  { key: "fairy",        label: "Fairy" },
  { key: "girl-dentist", label: "Girl Dentist" },
  { key: "boy-dentist",  label: "Boy Dentist" },
  { key: "girl-super",   label: "Girl Hero" },
  { key: "boy-super",    label: "Boy Hero" },
];

function currentTheme() { try { return localStorage.getItem("brushBuddy.theme") || "candy"; } catch (e) { return "candy"; } }
function currentHero() { try { return localStorage.getItem("brushBuddy.hero") || "fairy"; } catch (e) { return "fairy"; } }

function applyTheme(key) {
  const t = THEMES.find((x) => x.key === key) || THEMES[0];
  const s = document.documentElement.style;
  s.setProperty("--accent", t.accent);
  s.setProperty("--accent2", t.accent2);
  s.setProperty("--happy", t.happy);
  s.setProperty("--bg", t.bg);
  s.setProperty("--text", t.text);
  s.setProperty("--mouth-excited", t.accent);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t.accent);
  try { localStorage.setItem("brushBuddy.theme", t.key); } catch (e) {}
}
function applyHero(key) {
  try { localStorage.setItem("brushBuddy.hero", key); } catch (e) {}
}

function buildSettings() {
  const tg = document.getElementById("themeGrid");
  THEMES.forEach((t) => {
    const b = document.createElement("button");
    b.className = "swatch" + (t.key === currentTheme() ? " sel" : "");
    b.title = t.label;
    b.setAttribute("aria-label", "Colour: " + t.label);
    b.innerHTML = `<i style="background:${t.bg}"></i><b style="background:${t.accent}"></b>`;
    b.addEventListener("click", () => {
      applyTheme(t.key);
      tg.querySelectorAll(".swatch").forEach((s) => s.classList.remove("sel"));
      b.classList.add("sel");
    });
    tg.appendChild(b);
  });

  const hg = document.getElementById("heroGrid");
  HEROES.forEach((h) => {
    const b = document.createElement("button");
    b.className = "hero-pick" + (h.key === currentHero() ? " sel" : "");
    b.setAttribute("aria-label", "Buddy: " + h.label);
    b.innerHTML = `<img src="hero-${h.key}.png" alt="" /><span>${h.label}</span>`;
    b.addEventListener("click", () => {
      applyHero(h.key);
      hg.querySelectorAll(".hero-pick").forEach((s) => s.classList.remove("sel"));
      b.classList.add("sel");
      closeSettings();
      playHero(h.key, false); // preview the chosen hero, then auto fade-out
    });
    hg.appendChild(b);
  });
}

const settingsEl = document.getElementById("settings");
function openSettings() { settingsEl.hidden = false; }
function closeSettings() { settingsEl.hidden = true; }
els.settingsBtn = document.getElementById("settingsBtn");
els.settingsBtn.addEventListener("click", openSettings);
document.getElementById("settingsClose").addEventListener("click", closeSettings);
settingsEl.addEventListener("click", (e) => { if (e.target === settingsEl) closeSettings(); });

// ---- Init ------------------------------------------------------------------
buildScene();
buildDirt();
applyTheme(currentTheme());
buildSettings();
applyCalm();
reset();

// ---- Service worker --------------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
