/* Brush Buddy — streaks & stars, persisted in the browser (localStorage).
 *
 * Drop-in module. It:
 *   1. listens for a `brush:complete` CustomEvent dispatched by app.js,
 *   2. keeps a forgiving day-streak + lifetime stars on-device (no accounts,
 *      no network — data never leaves the browser),
 *   3. renders a small streak pill (into #streak-mount if present) and injects
 *      its own CSS, themed to match the app.
 *
 * All streak math lives in streak-logic.js (BrushStreakLogic), which is unit
 * tested. This file is just persistence + DOM.
 */
"use strict";

(function () {
  const L = window.BrushStreakLogic;
  if (!L) { console.warn("streaks.js: streak-logic.js must load first"); return; }

  const KEY = "brushBuddy.streaks.v1";
  const today = () => L.dayKey(new Date());

  // Pull copy from the shared i18n layer (app.js → window.BrushI18n). Falls back
  // to English if app.js hasn't defined it (e.g. loaded standalone).
  const I18N_FALLBACK = {
    oneDay: "1 day", nDays: (n) => `${n} days`, todayDone: "✓ today", brushToday: "brush today!",
    startAgain: "Let's start again", best: (n) => `best: ${n}`, newStreak: "New!", firstBrush: "first brush today",
  };
  function tr() {
    return (window.BrushI18n && window.BrushI18n.t && window.BrushI18n.t()) || I18N_FALLBACK;
  }

  // ---- Persistence ----------------------------------------------------------
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? Object.assign(L.blank(), JSON.parse(raw)) : L.blank();
    } catch (e) {
      return L.blank();
    }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  let state = load();

  // ---- UI --------------------------------------------------------------------
  let pill, countEl, hintEl, starsEl;

  function injectStyles() {
    if (document.getElementById("streak-styles")) return;
    const css = `
      .streak {
        display: inline-flex; align-items: center; gap: .5rem;
        margin: 0 auto; padding: .42rem .9rem;
        width: max-content; max-width: 92%;
        background: rgba(255,255,255,0.6);
        border-radius: 999px;
        font-family: 'Baloo 2', system-ui, sans-serif;
        font-weight: 700; font-size: 15px; line-height: 1;
        color: var(--text, #6B3A56);
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        user-select: none; -webkit-user-select: none;
      }
      .streak__flame { font-size: 1.05rem; line-height: 1; }
      .streak__count { font-variant-numeric: tabular-nums; }
      .streak__hint  { opacity: .72; font-weight: 600; font-size: 13px; }
      .streak__stars { font-weight: 700; }
      .streak.is-asleep .streak__flame { filter: grayscale(1) opacity(.6); }
      .streak.bump { animation: streak-bump .6s ease; }
      @keyframes streak-bump {
        0% { transform: scale(1); } 35% { transform: scale(1.18); } 100% { transform: scale(1); }
      }
      @media (prefers-reduced-motion: reduce) { .streak.bump { animation: none; } }
    `;
    const tag = document.createElement("style");
    tag.id = "streak-styles";
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  function mount() {
    injectStyles();
    pill = document.createElement("div");
    pill.className = "streak";
    pill.setAttribute("role", "status");
    pill.setAttribute("aria-live", "polite");
    pill.innerHTML =
      '<span class="streak__flame" aria-hidden="true">🔥</span>' +
      '<span class="streak__count"></span>' +
      '<span class="streak__hint"></span>' +
      '<span class="streak__stars" aria-hidden="true"></span>';
    countEl = pill.querySelector(".streak__count");
    hintEl  = pill.querySelector(".streak__hint");
    starsEl = pill.querySelector(".streak__stars");

    const slot = document.getElementById("streak-mount")
      || document.querySelector(".topbar") || document.querySelector("header");
    if (slot && slot.id === "streak-mount") slot.appendChild(pill);
    else if (slot && slot.parentNode) slot.parentNode.insertBefore(pill, slot.nextSibling);
    else (document.querySelector("main") || document.body).prepend(pill);

    render();
  }

  function render() {
    const t = today();
    const gap = state.lastDay ? L.daysBetween(state.lastDay, t) : null;
    const live = L.liveStreak(state, t);
    const asleep = live === 0 && state.best > 0;
    pill.classList.toggle("is-asleep", asleep);

    const d = tr();
    if (live > 0) {
      countEl.textContent = live === 1 ? d.oneDay : d.nDays(live);
      hintEl.textContent = gap === 0 ? d.todayDone : d.brushToday;
    } else if (asleep) {
      // Gentle "jump back in" framing — never a shaming "0 / you failed".
      countEl.textContent = d.startAgain;
      hintEl.textContent = d.best(state.best);
    } else {
      countEl.textContent = d.newStreak;
      hintEl.textContent = d.firstBrush;
    }
    starsEl.textContent = state.stars > 0 ? `· ⭐ ${state.stars}` : "";
  }

  function celebrate() {
    pill.classList.remove("bump");
    void pill.offsetWidth; // restart the animation
    pill.classList.add("bump");
  }

  // ---- Wire up ---------------------------------------------------------------
  document.addEventListener("brush:complete", () => {
    const res = L.applyComplete(state, today());
    state = res.state;
    save(state);
    render();
    celebrate();
  });

  // Re-render the pill when the language changes (dispatched by app.js).
  document.addEventListener("brush:langchange", function () { if (pill) render(); });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  // Small API for debugging / a future "reset progress" button.
  window.BrushStreaks = {
    get: () => Object.assign({}, state, { live: L.liveStreak(state, today()) }),
    reset: () => { state = L.blank(); save(state); render(); },
  };
})();
