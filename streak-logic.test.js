/* Tests for the forgiving streak logic. Run with: node streak-logic.test.js
 * No dependencies. Exits non-zero if any assertion fails (CI-friendly).
 */
"use strict";
const L = require("./streak-logic.js");

let pass = 0, fail = 0;
function check(name, got, exp) {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}` + (ok ? "" : `  got=${JSON.stringify(got)} exp=${JSON.stringify(exp)}`));
  ok ? pass++ : fail++;
}

// Helper: apply a sequence of brush days and return the resulting state.
function run(days) {
  let s = L.blank();
  for (const d of days) s = L.applyComplete(s, d).state;
  return s;
}

// ---- dayKey / daysBetween (pure date math) --------------------------------
check("dayKey formats local date", L.dayKey(new Date(2026, 5, 9)), "2026-06-09"); // June 9
check("daysBetween consecutive", L.daysBetween("2026-06-23", "2026-06-24"), 1);
check("daysBetween same day", L.daysBetween("2026-06-23", "2026-06-23"), 0);
check("daysBetween across month", L.daysBetween("2026-06-30", "2026-07-01"), 1);
check("daysBetween across year", L.daysBetween("2026-12-31", "2027-01-01"), 1);
check("daysBetween two-day gap", L.daysBetween("2026-06-23", "2026-06-25"), 2);

// ---- core streak progression ----------------------------------------------
check("first brush → 1", run(["2026-06-23"]).current, 1);
check("two consecutive days → 2", run(["2026-06-23", "2026-06-24"]).current, 2);
check("three consecutive days → 3", run(["2026-06-23", "2026-06-24", "2026-06-25"]).current, 3);

// ---- THE forgiving rule (the key behavior) --------------------------------
check("GRACE: one skipped day survives & grows", run(["2026-06-23", "2026-06-24", "2026-06-26"]).current, 3);
check("RESET: two skipped days restart at 1", run(["2026-06-23", "2026-06-24", "2026-06-27"]).current, 1);
check("RESET keeps personal best", run(["2026-06-23", "2026-06-24", "2026-06-27"]).best, 2);

// ---- same-day repeat brushes ----------------------------------------------
{
  const twice = run(["2026-06-23", "2026-06-23"]);
  check("same-day second brush does NOT double the streak", twice.current, 1);
  check("same-day second brush counts as a bonus (todayCount)", twice.todayCount, 2);
  check("same-day second brush still earns a star", twice.stars, 2);
}

// ---- counters --------------------------------------------------------------
{
  const s = run(["2026-06-23", "2026-06-24", "2026-06-25"]);
  check("total sessions accumulate", s.total, 3);
  check("stars accumulate", s.stars, 3);
}

// ---- immutability ----------------------------------------------------------
{
  const before = L.blank();
  L.applyComplete(before, "2026-06-23");
  check("applyComplete does not mutate input", before, L.blank());
}

// ---- liveStreak (display logic) -------------------------------------------
check("live: brushed today → shows current", L.liveStreak({ lastDay: "2026-06-23", current: 5 }, "2026-06-23"), 5);
check("live: brushed yesterday → still alive", L.liveStreak({ lastDay: "2026-06-22", current: 5 }, "2026-06-23"), 5);
check("live: one grace day → still alive", L.liveStreak({ lastDay: "2026-06-21", current: 5 }, "2026-06-23"), 5);
check("live: two days missed → lapsed to 0", L.liveStreak({ lastDay: "2026-06-20", current: 5 }, "2026-06-23"), 0);
check("live: never brushed → 0", L.liveStreak(L.blank(), "2026-06-23"), 0);

// ---- summary ---------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
