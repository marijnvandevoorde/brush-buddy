/* ===== Screenshot scenes =====
 *
 * Injected into the running app (iOS WKWebView / Android WebView) by the
 * capture scripts so every store screenshot shows the same state on every
 * device instead of whatever the timer happened to be doing.
 *
 * Everything here drives the app through its own DOM and its own functions —
 * tapping the real buttons, and fast-forwarding with the app's own tick() —
 * so a scene can never show a state the app cannot actually reach. Nothing in
 * this file ships inside the app.
 *
 *   await __scene("finale")   // resolves once the state is on screen
 */
(function () {
  "use strict";

  var $ = function (sel) { return document.querySelector(sel); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  async function waitFor(test, what, timeout) {
    var deadline = Date.now() + (timeout || 6000);
    while (Date.now() < deadline) {
      if (test()) return;
      await wait(50);
    }
    throw new Error("timed out waiting for " + (what || "condition"));
  }

  function tap(target) {
    var node = typeof target === "string" ? $(target) : target;
    if (!node) throw new Error("scene: missing element " + target);
    node.click();
    return wait(60);
  }

  /**
   * Fast-forward the brushing timer.
   *
   * A real run is two minutes, which is far too long to sit through six times
   * per device. tick() is the app's own one-second step, so calling it in a
   * loop reaches exactly the state the clock would have reached — germs
   * spawned, dirt cleared, quadrant advanced — without the wait. Anything that
   * pokes si/timeLeft directly would skip enterSection() and produce a screen
   * the app never actually shows.
   */
  function fastForward(seconds) {
    for (var i = 0; i < seconds; i++) {
      if (typeof done !== "undefined" && done) break;
      tick();
    }
    return wait(120);
  }

  async function startBrushing() {
    await tap("#primary");
    await waitFor(function () { return running === true; }, "the timer to start");
  }

  async function openSettings() {
    await tap("#settingsBtn");
    await waitFor(function () { return !$("#settings").hasAttribute("hidden"); }, "settings to open");
    await wait(320);   // panel slide
  }

  async function closeSettings() {
    if (!$("#settings").hasAttribute("hidden")) await tap("#settingsClose");
    await wait(320);
  }

  /** Language picker is rebuilt per language, so match on the button's lang attr. */
  async function setLanguage(code) {
    await openSettings();
    var btn = $('.lang-pick[lang="' + code + '"]');
    if (btn && !btn.classList.contains("sel")) { await tap(btn); await wait(200); }
    await closeSettings();
  }

  async function pickBuddy(key) {
    await openSettings();
    var grid = $("#heroGrid");
    var idx = ["fairy", "girl-dentist", "boy-dentist", "girl-super", "boy-super"].indexOf(key);
    var btn = grid && grid.children[idx];
    if (!btn) throw new Error("scene: no buddy " + key);
    await tap(btn);        // also closes settings and previews the buddy
    await wait(400);
  }

  // ---------------------------------------------------------------- scenes ---

  var SCENES = {
    /** Home screen, before the first brush of the day. */
    async ready() {
      await wait(300);
    },

    /**
     * Mid-run: a back quadrant with germs still on the buddy and the ring
     * filling. 40s rather than 10s deliberately — the buddy's caption is keyed
     * to the quadrant index, so before the first boundary at 25s it still reads
     * "Ready? Let's brush!", which looks wrong next to a Pause button.
     */
    async brushing() {
      await startBrushing();
      await fastForward(40);
    },

    /** Later in the run: several quadrants done, buddy visibly cleaner. */
    async brushing_late() {
      await startBrushing();
      await fastForward(78);
    },

    /** The finish: cheering buddy with the chosen hero's clip over the scene. */
    async finale() {
      await startBrushing();
      await fastForward(130);
      await waitFor(function () { return done === true; }, "the run to finish");
      await wait(900);   // let the hero clip fade in
    },

    /** Settings panel: language, colour theme and buddy picker. */
    async settings() {
      await openSettings();
    },

    /** Settings scrolled to the buddy picker, which is the differentiator. */
    async buddies() {
      await openSettings();
      var head = $("#buddyHead");
      if (head) head.scrollIntoView({ block: "start" });
      await wait(400);
    },

    /** A colour theme other than the default, to show the app is themeable. */
    async theme_ocean() {
      await openSettings();
      var grid = $("#themeGrid");
      var btn = grid && grid.children[5];   // ocean
      if (btn) await tap(btn);
      await wait(300);
      await closeSettings();
    },

    /** Home screen after a completed brush: the streak pill reads "today done". */
    async streak() {
      await startBrushing();
      await fastForward(130);
      await waitFor(function () { return done === true; }, "the run to finish");
      await wait(300);
      await tap("#reset");
      await wait(500);
    },

    /** A different buddy chosen, previewing over the home screen. */
    async buddy_super() {
      await pickBuddy("boy-super");
      await wait(500);
    },
  };

  // Dutch variants of the shots where the copy is the point.
  ["ready", "settings", "finale", "buddies"].forEach(function (name) {
    SCENES[name + "_nl"] = async function () {
      await setLanguage("nl");
      await SCENES[name]();
    };
  });

  window.__scene = async function (name) {
    var fn = SCENES[name];
    if (!fn) return "unknown scene " + name;
    try {
      await fn();
      return "ok";
    } catch (e) {
      return (e && e.message) || String(e);
    }
  };
})();
true;
