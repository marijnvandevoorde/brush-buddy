/* Brush Buddy — guided 2-minute brushing with a mascot.
   Iteration 3: 6-sextant map (dedicated front-teeth sections), per child-dentist
   guidance — 4 back beats (25s) + 2 front beats (10s) = 120s. Plus in-section
   surface sub-cues, scrub-away germs, a lively buddy, and a Calm/bedtime mode. */
"use strict";

// ---- Config ----------------------------------------------------------------
// Six sextants in a continuous clockwise path from the top. Front teeth get
// their own short beats (no "chewing top"; cue inner surface + up-and-down).
// Back sextants get 2 surface passes (outsides → insides); fronts get 1.
const SECTIONS = [
  { key: "UF", label: "Top Front",    center: 0,   teeth: 4, type: "front", secs: 10 },
  { key: "UR", label: "Top Right",    center: 60,  teeth: 4, type: "back",  secs: 25 },
  { key: "LR", label: "Bottom Right", center: 120, teeth: 4, type: "back",  secs: 25 },
  { key: "LF", label: "Bottom Front", center: 180, teeth: 4, type: "front", secs: 10 },
  { key: "LL", label: "Bottom Left",  center: 240, teeth: 4, type: "back",  secs: 25 },
  { key: "UL", label: "Top Left",     center: 300, teeth: 4, type: "back",  secs: 25 },
];
const N_SECTIONS = SECTIONS.length;
const RING_R = 118;
const TEETH_SPAN = 44;      // angular spread of a section's teeth (deg)
const ARC_SPAN_DEG = 52;    // highlight arc a touch wider than the teeth
const GERMS_PER_TOOTH = 2;

const SURFACES = {
  out:   { icon: "🦷", label: "Outsides",     hint: "tiny gentle circles" },
  in:    { icon: "👅", label: "Insides",      hint: "tiny gentle circles" },
  front: { icon: "↕️", label: "Front teeth",  hint: "brush up & down — inside too!" },
};

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
  confetti: document.getElementById("confetti"),
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

// ---- Germs (scrub-away) ----------------------------------------------------
let activeGerms = [];
let germTotal = 0;
function spawnGerms(si) {
  clearGerms();
  teethBySection[si].forEach((tooth) => {
    for (let g = 0; g < GERMS_PER_TOOTH; g++) {
      const germ = document.createElement("span");
      germ.className = "germ";
      const x = g === 0 ? 0 : 7;
      const y = g === 0 ? -3 : 7;
      germ.style.left = (x + (Math.random() * 2 - 1)).toFixed(1) + "px";
      germ.style.top = (y + (Math.random() * 2 - 1)).toFixed(1) + "px";
      germ.style.animationDelay = (Math.random() * 1.2).toFixed(2) + "s";
      tooth.appendChild(germ);
      activeGerms.push(germ);
    }
  });
  activeGerms.sort(() => Math.random() - 0.5);
  germTotal = activeGerms.length;
}
function popGerm() {
  const germ = activeGerms.pop();
  if (!germ) return;
  germ.classList.add("pop");
  setTimeout(() => germ.remove(), 320);
}
function updateGerms(remainTime, sectionSecs) {
  if (!germTotal) return;
  const target = Math.ceil(germTotal * (remainTime / sectionSecs));
  while (activeGerms.length > target) popGerm();
}
function clearGerms() {
  activeGerms.forEach((g) => g.remove());
  activeGerms = [];
  germTotal = 0;
  els.teeth.querySelectorAll(".germ").forEach((g) => g.remove());
}

// ---- State machine ---------------------------------------------------------
let si = 0;             // current section index, N_SECTIONS when done
let timeLeft = null;    // seconds left in the current section
let running = false;
let started = false;
let done = false;
let ticker = null;
let currentSurface = -1;

function curSecs() { return SECTIONS[Math.min(si, N_SECTIONS - 1)].secs; }
function moodIndex() {
  if (!started) return 0;
  if (done) return 4;
  return Math.min(4, Math.round((si / N_SECTIONS) * 4));
}

function enterSection(i, announce) {
  spawnGerms(i);
  currentSurface = -1;
  if (announce) { cheerBuddy(); sectionBeep(); buzz([110, 50, 110]); }
}

function surfaceFor(sec) {
  if (sec.type === "front") return Object.assign({ phase: 0 }, SURFACES.front);
  const into = sec.secs - timeLeft;
  const phase = into < sec.secs / 2 ? 0 : 1;
  return Object.assign({ phase }, phase === 0 ? SURFACES.out : SURFACES.in);
}
function updateSurface() {
  if (!started || done || timeLeft == null) { els.surfaceCue.textContent = ""; return; }
  const s = surfaceFor(SECTIONS[si]);
  els.surfaceCue.textContent = `${s.icon} ${s.label} · ${s.hint}`;
  if (s.phase !== currentSurface) {
    if (currentSurface !== -1) surfaceTick(); // soft "move now" cue between passes
    currentSurface = s.phase;
  }
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

  updateSurface();

  els.primary.textContent = !started ? "Start brushing" : done ? "Brush again" : running ? "Pause" : "Resume";
}

function tick() {
  if (!running) return;
  if (timeLeft > 1) { timeLeft -= 1; updateGerms(timeLeft, curSecs()); render(); return; }
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
  launchConfetti();
  endSound();
  buzz([90, 40, 90, 40, 220]);
  releaseWake();
  document.dispatchEvent(new CustomEvent("brush:complete", { detail: { sections: N_SECTIONS, seconds: 120 } }));
}

// ---- Confetti --------------------------------------------------------------
function launchConfetti() {
  els.confetti.innerHTML = "";
  const n = calm ? 16 : 46;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const c = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const size = 7 + Math.random() * 9;
    const p = document.createElement("i");
    p.style.left = Math.random() * 100 + "%";
    p.style.width = size + "px";
    p.style.height = size * 1.4 + "px";
    p.style.background = c;
    p.style.animationDuration = (calm ? 2.6 : 1.6) + Math.random() * 1.4 + "s";
    p.style.animationDelay = (Math.random() * 0.8) + "s";
    frag.appendChild(p);
  }
  els.confetti.appendChild(frag);
  setTimeout(() => { if (done) els.confetti.innerHTML = ""; }, 4500);
}

// ---- Controls --------------------------------------------------------------
function start() {
  ensureAudio();
  requestWake();
  clearInterval(ticker);
  started = true; running = true; done = false; si = 0; timeLeft = SECTIONS[0].secs;
  els.confetti.innerHTML = "";
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
  currentSurface = -1;
  clearGerms();
  els.confetti.innerHTML = "";
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
applyCalm();
reset();

// ---- Service worker --------------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
