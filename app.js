/* Brush Buddy — a visual 2-minute, quadrant-by-quadrant brushing guide. */
"use strict";

// ---- Timing ----------------------------------------------------------------
const QUADRANT_SEC = 30;   // time per quadrant
const BRUSH_SEC    = 120;  // 4 quadrants = 2 minutes (smile)
const TOTAL_SEC    = 150;  // +30s bonus -> star eyes at 2:30

// Brushing order: upper-right -> upper-left -> lower-left -> lower-right.
const QUADRANTS = [
  { id: "q-ur", label: "upper right", phase: "Top right" },
  { id: "q-ul", label: "upper left",  phase: "Top left"  },
  { id: "q-ll", label: "lower left",  phase: "Bottom left"  },
  { id: "q-lr", label: "lower right", phase: "Bottom right" },
];

// Mouth shapes that get happier as brushing progresses.
const MOUTHS = [
  "M172,214 Q200,224 228,214", // ready
  "M170,213 Q200,231 230,213", // q1
  "M168,212 Q200,238 232,212", // q2
  "M166,210 Q200,246 234,210", // q3
  "M164,209 Q200,252 236,209", // q4
  "M160,206 Q200,262 240,206", // smile @ 2:00
];
const MOUTH_OPEN = "M162,205 Q200,213 238,205 Q232,256 200,259 Q168,256 162,205 Z";

// ---- Elements --------------------------------------------------------------
const els = {
  instruction: document.getElementById("instruction"),
  clock: document.getElementById("clock"),
  phase: document.getElementById("phase"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  soundBtn: document.getElementById("soundBtn"),
  mouth: document.getElementById("mouth"),
  face: document.getElementById("face"),
  ring: document.getElementById("ring"),
  confetti: document.getElementById("confetti"),
};

// ---- Build the teeth -------------------------------------------------------
const SVG_NS = "http://www.w3.org/2000/svg";

function buildArch({ cx, cy, rx, ry, lower, rightGroup, leftGroup }) {
  const N = 10, A0 = 18, A1 = 162;
  for (let i = 0; i < N; i++) {
    const aDeg = A0 + (A1 - A0) * (i / (N - 1));
    const a = (aDeg * Math.PI) / 180;
    const x = cx + rx * Math.cos(a);
    const y = lower ? cy + ry * Math.sin(a) : cy - ry * Math.sin(a);
    // outward normal angle -> align tooth's long axis radially
    const phi = Math.atan2(lower ? Math.sin(a) : -Math.sin(a), Math.cos(a));
    const rot = (phi * 180) / Math.PI + 90;

    const t = document.createElementNS(SVG_NS, "rect");
    t.setAttribute("class", "tooth");
    t.setAttribute("x", -11);
    t.setAttribute("y", -15);
    t.setAttribute("width", 22);
    t.setAttribute("height", 30);
    t.setAttribute("rx", 9);
    t.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)})`);
    (aDeg < 90 ? rightGroup : leftGroup).appendChild(t);
  }
}

function buildTeeth() {
  buildArch({ cx: 200, cy: 200, rx: 140, ry: 120, lower: false,
    rightGroup: document.getElementById("q-ur"),
    leftGroup:  document.getElementById("q-ul") });
  buildArch({ cx: 200, cy: 200, rx: 140, ry: 120, lower: true,
    rightGroup: document.getElementById("q-lr"),
    leftGroup:  document.getElementById("q-ll") });
}

// ---- Progress ring ---------------------------------------------------------
const RING_C = 2 * Math.PI * 86;
els.ring.style.strokeDasharray = RING_C.toFixed(2);
function setRing(progress) { // 0..1
  els.ring.style.strokeDashoffset = (RING_C * (1 - Math.min(1, progress))).toFixed(2);
}

// ---- Sound (Web Audio, no assets) -----------------------------------------
let soundOn = true;
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}
function tone(freq, start, dur, type = "sine", gain = 0.18) {
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
function beepSwitch() { tone(660, 0, 0.18, "triangle"); tone(880, 0.12, 0.18, "triangle"); }
function fanfare() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.16, 0.35, "triangle", 0.22));
}
function buzz(ms) { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

// ---- Face ------------------------------------------------------------------
function setMouth(i) {
  els.mouth.classList.remove("open");
  els.mouth.setAttribute("d", MOUTHS[i]);
}
function celebrateFace() {
  els.face.classList.add("celebrate");
  els.mouth.classList.add("open");
  els.mouth.setAttribute("d", MOUTH_OPEN);
}
function resetFace() {
  els.face.classList.remove("celebrate");
  setMouth(0);
}

// ---- Confetti --------------------------------------------------------------
const COLORS = ["#fbbf24", "#fb7185", "#34d399", "#60a5fa", "#f472b6", "#ffffff"];
function launchConfetti() {
  els.confetti.innerHTML = "";
  for (let i = 0; i < 90; i++) {
    const p = document.createElement("i");
    p.style.left = Math.random() * 100 + "%";
    p.style.background = COLORS[(Math.random() * COLORS.length) | 0];
    p.style.animationDuration = (1.8 + Math.random() * 2.2) + "s";
    p.style.animationDelay = (Math.random() * 0.6) + "s";
    p.style.transform = `scale(${0.7 + Math.random()})`;
    els.confetti.appendChild(p);
  }
  setTimeout(() => { els.confetti.innerHTML = ""; }, 6000);
}

// ---- Wake lock (keep screen awake while brushing) --------------------------
let wakeLock = null;
async function requestWake() {
  try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); }
  catch (e) {}
}
function releaseWake() { try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; }

// ---- State machine ---------------------------------------------------------
let state = "idle";        // idle | running | paused | done
let elapsed = 0;           // seconds (float)
let lastTs = 0;            // performance.now() reference
let currentQuad = -1;
let ticker = null;

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

function setActiveQuad(idx) {
  QUADRANTS.forEach((q, i) => {
    const g = document.getElementById(q.id);
    g.classList.toggle("active", i === idx);
    g.classList.toggle("done", i < idx);
  });
}

function enterQuad(idx) {
  currentQuad = idx;
  const q = QUADRANTS[idx];
  setActiveQuad(idx);
  setMouth(idx + 1);
  els.instruction.innerHTML = `Brush your <strong>${q.label}</strong> teeth`;
  els.phase.textContent = `Quadrant ${idx + 1} of 4 · ${q.phase}`;
  beepSwitch();
  buzz([120, 60, 120]);
}

function reachBrushDone() {
  setActiveQuad(4);                       // mark all done
  QUADRANTS.forEach(q => document.getElementById(q.id).classList.add("done"));
  setMouth(5);                            // big smile
  els.instruction.innerHTML = `Great job! Now <strong>rinse</strong> and finish up ✨`;
  els.phase.textContent = "Almost done…";
  els.ring.style.stroke = "#fb7185";
  beepSwitch();
  buzz(200);
}

function finish() {
  state = "done";
  clearInterval(ticker);
  ticker = null;
  currentQuad = 5;
  celebrateFace();
  launchConfetti();
  fanfare();
  buzz([100, 50, 100, 50, 250]);
  els.instruction.innerHTML = `All sparkly clean! ⭐ <strong>Amazing!</strong>`;
  els.phase.textContent = "Done!";
  els.startBtn.textContent = "▶ Start";
  releaseWake();
}

function tick() {
  const now = performance.now();
  elapsed += (now - lastTs) / 1000;
  lastTs = now;

  if (elapsed >= TOTAL_SEC) { elapsed = TOTAL_SEC; render(); finish(); return; }
  render();
}

function render() {
  els.clock.textContent = fmt(elapsed);
  setRing(elapsed / BRUSH_SEC);

  if (elapsed < BRUSH_SEC) {
    const idx = Math.min(3, Math.floor(elapsed / QUADRANT_SEC));
    if (idx !== currentQuad) enterQuad(idx);
  } else if (currentQuad !== 4) {
    reachBrushDone();
    currentQuad = 4;
  }
}

// ---- Controls --------------------------------------------------------------
function start() {
  ensureAudio();
  requestWake();
  state = "running";
  lastTs = performance.now();
  ticker = setInterval(tick, 100);
  els.startBtn.textContent = "⏸ Pause";
  render();
}
function pause() {
  state = "paused";
  clearInterval(ticker);
  ticker = null;
  els.startBtn.textContent = "▶ Resume";
  els.phase.textContent = "Paused";
  releaseWake();
}
function resume() {
  ensureAudio();
  requestWake();
  state = "running";
  lastTs = performance.now();
  ticker = setInterval(tick, 100);
  els.startBtn.textContent = "⏸ Pause";
  render();
}
function reset() {
  clearInterval(ticker);
  ticker = null;
  state = "idle";
  elapsed = 0;
  currentQuad = -1;
  setActiveQuad(-1);
  QUADRANTS.forEach(q => document.getElementById(q.id).classList.remove("done", "active"));
  resetFace();
  setRing(0);
  els.ring.style.stroke = "";
  els.confetti.innerHTML = "";
  els.clock.textContent = "0:00";
  els.phase.textContent = "Ready";
  els.instruction.innerHTML = `Tap <strong>Start</strong> to begin brushing!`;
  els.startBtn.textContent = "▶ Start";
  releaseWake();
}

els.startBtn.addEventListener("click", () => {
  if (state === "idle" || state === "done") { reset(); start(); }
  else if (state === "running") pause();
  else if (state === "paused") resume();
});
els.resetBtn.addEventListener("click", reset);
els.soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  els.soundBtn.textContent = soundOn ? "🔊" : "🔇";
  if (soundOn) ensureAudio();
});

// Re-acquire wake lock when tab becomes visible again mid-session.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state === "running") requestWake();
});

// ---- Init ------------------------------------------------------------------
buildTeeth();
reset();

// ---- Service worker --------------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
