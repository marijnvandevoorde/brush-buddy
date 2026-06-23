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
// a few organic crown silhouettes, cycled per tooth so the ring isn't stamped
const TOOTH_SHAPES = [
  "46% 46% 38% 38% / 56% 56% 44% 44%",
  "48% 44% 40% 36% / 58% 54% 46% 42%",
  "44% 48% 36% 40% / 54% 58% 42% 46%",
  "47% 45% 39% 37% / 57% 55% 43% 45%",
];

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
      tooth.className = "tooth";
      // slight per-tooth variation so the ring looks natural, not stamped
      tooth.style.borderRadius = TOOTH_SHAPES[(k + si) % TOOTH_SHAPES.length];
      tooth.style.height = (24 + ((k * 7 + si * 3) % 4)) + "px";
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
function spawnGermsForSurface(sectionIdx, surfKey) {
  clearGerms();
  const baseTop = SURF[surfKey].top;
  teethBySection[sectionIdx].forEach((tooth) => {
    const germ = document.createElement("span");
    germ.className = "germ";
    germ.style.left = (2 + (Math.random() * 1.5 - 0.75)).toFixed(1) + "px";
    germ.style.top = (baseTop + (Math.random() * 1.5 - 0.75)).toFixed(1) + "px";
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
// a section is completed. Irregular border-radii (+ pseudo-element grains in CSS)
// keep them looking like natural sandy dirt rather than perfect circles.
const DIRT = [
  { l: 18, t: 26, s: 16, c: "#BE9A5E", r: "58% 42% 55% 45% / 50% 60% 40% 50%" },
  { l: 60, t: 23, s: 13, c: "#C9A874", r: "45% 55% 48% 52% / 60% 45% 55% 40%" },
  { l: 13, t: 50, s: 15, c: "#B0894C", r: "55% 45% 40% 60% / 45% 55% 50% 50%" },
  { l: 66, t: 47, s: 14, c: "#C9A874", r: "48% 52% 58% 42% / 55% 48% 52% 45%" },
  { l: 27, t: 65, s: 15, c: "#BE9A5E", r: "52% 48% 45% 55% / 48% 58% 42% 52%" },
  { l: 55, t: 63, s: 12, c: "#B0894C", r: "50% 50% 55% 45% / 55% 45% 50% 50%" },
];
const dirtEls = [];
function buildDirt() {
  const dirt = document.getElementById("dirt");
  DIRT.forEach((d, i) => {
    const sp = document.createElement("span");
    sp.className = "dirt-spot";
    sp.style.left = d.l + "px";
    sp.style.top = d.t + "px";
    sp.style.width = d.s + "px";
    sp.style.height = (d.s * 0.82).toFixed(1) + "px";
    sp.style.background = d.c;
    sp.style.borderRadius = d.r;
    sp.style.boxShadow = "inset -1px -2px 1px rgba(0,0,0,0.16)";
    sp.style.transitionDelay = (i * 0.05).toFixed(2) + "s";
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
function launchFairy() {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const flyDur = calm ? 3.0 : 2.2;
  const motion = reduced ? "" :
    `<animateMotion dur="${flyDur}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.22 0.1 0.25 1" path="M -70 770 C 150 560, 340 600, 195 358"/>` +
    `<animateTransform attributeName="transform" additive="sum" type="translate" begin="${flyDur}s" dur="2.6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" values="0 0;0 -10;0 0"/>`;
  const wingL = reduced ? "" : `<animateTransform attributeName="transform" type="rotate" values="0 -8 0;24 -8 0;0 -8 0" dur="0.28s" repeatCount="indefinite"/>`;
  const wingR = reduced ? "" : `<animateTransform attributeName="transform" type="rotate" values="0 8 0;-24 8 0;0 8 0" dur="0.28s" repeatCount="indefinite"/>`;
  const wandAnim = reduced ? "" : `<animateTransform attributeName="transform" type="rotate" begin="${flyDur}s" values="0 8 6;-20 8 6;0 8 6" dur="0.8s" repeatCount="indefinite"/>`;
  const gOpen = reduced ? '<g transform="translate(195,358)">' : "<g>";
  const dress = "#FF6FAE"; // candy pink dress
  els.fairy.innerHTML =
    '<svg class="fairy-svg" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">' +
      gOpen + motion +
        // wings (behind the body)
        `<g><ellipse cx="-24" cy="-6" rx="19" ry="29" fill="rgba(150,200,255,0.6)" stroke="rgba(255,255,255,0.85)" stroke-width="1.5"/>${wingL}</g>` +
        `<g><ellipse cx="24" cy="-6" rx="19" ry="29" fill="rgba(150,200,255,0.6)" stroke="rgba(255,255,255,0.85)" stroke-width="1.5"/>${wingR}</g>` +
        // dress, neck, head, hair
        `<path d="M0 4 L-20 46 Q0 56 20 46 Z" fill="${dress}"/>` +
        '<rect x="-5" y="-8" width="10" height="18" rx="5" fill="#FCD9B8"/>' +
        '<circle cx="0" cy="-20" r="14" fill="#FCD9B8"/>' +
        '<path d="M-14 -22 Q-12 -36 0 -36 Q12 -36 14 -22 Q6 -30 0 -29 Q-6 -30 -14 -22 Z" fill="#7B4B2A"/>' +
        // face
        '<circle cx="-5" cy="-20" r="1.8" fill="#2A2A2A"/><circle cx="5" cy="-20" r="1.8" fill="#2A2A2A"/>' +
        '<path d="M-5 -14 Q0 -10 5 -14" fill="none" stroke="#2A2A2A" stroke-width="1.6" stroke-linecap="round"/>' +
        // arm + wand with a star
        `<g><line x1="8" y1="6" x2="30" y2="-18" stroke="#C68A3A" stroke-width="2.4" stroke-linecap="round"/><text x="33" y="-15" font-size="20" text-anchor="middle">⭐</text>${wandAnim}</g>` +
        // sparkle trail
        '<text x="-44" y="-34" font-size="14" opacity="0.9">✨</text>' +
        '<text x="42" y="22" font-size="12" opacity="0.85">✨</text>' +
      "</g>" +
    "</svg>";
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

// ---- Init ------------------------------------------------------------------
buildScene();
buildDirt();
applyCalm();
reset();

// ---- Service worker --------------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
