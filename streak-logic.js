/* Brush Buddy — pure streak logic (no DOM, no storage).
 *
 * Kept dependency-free and side-effect-free so it can be unit-tested in Node
 * and reused by streaks.js in the browser. Loaded as a plain <script> (attaches
 * to window.BrushStreakLogic) or required in Node (module.exports).
 *
 * The streak is FORGIVING by design (validated by the child-psychology review):
 * one missed day is covered by a grace day, so a single miss never resets the
 * streak to zero. Only 2+ missed days restart it.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BrushStreakLogic = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function blank() {
    return { current: 0, best: 0, total: 0, stars: 0, lastDay: null, todayCount: 0 };
  }

  // Local calendar-day key "YYYY-MM-DD" (respects the bathroom's local midnight).
  function dayKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function parseDay(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d); // local midnight
  }
  // Whole calendar days from key `a` to key `b` (b - a). Negative if b precedes a.
  function daysBetween(a, b) {
    return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);
  }

  // Record one finished brush on calendar day `todayKey`. Returns a NEW state
  // object (does not mutate the input) plus whether the day-streak advanced.
  function applyComplete(state, todayKey) {
    const s = Object.assign(blank(), state);
    let advanced = false;

    if (s.lastDay === todayKey) {
      s.todayCount += 1; // already counted today; extra brushes are a bonus
    } else {
      const gap = s.lastDay ? daysBetween(s.lastDay, todayKey) : null;
      // gap 1 = next day, gap 2 = one grace day skipped → streak survives & grows.
      if (gap === 1 || gap === 2) s.current += 1;
      else s.current = 1; // first ever, or a true lapse (2+ missed days) → restart
      s.lastDay = todayKey;
      s.todayCount = 1;
      advanced = true;
    }
    s.total += 1;
    s.stars += 1;
    if (s.current > s.best) s.best = s.current;
    return { state: s, advanced };
  }

  // The streak as it should be DISPLAYED on `todayKey` (accounts for a lapse
  // without mutating storage until the next finished brush).
  function liveStreak(state, todayKey) {
    if (!state || !state.lastDay) return 0;
    const gap = daysBetween(state.lastDay, todayKey);
    if (gap <= 2) return state.current; // brushed within the grace window → alive
    return 0; // lapsed (more than one day missed)
  }

  return { blank, dayKey, parseDay, daysBetween, applyComplete, liveStreak };
});
