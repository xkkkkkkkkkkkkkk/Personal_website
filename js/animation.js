/* ============================================================
   Xike Yang — Personal Academic Homepage  (V2)
   Scroll-driven 3D cube + panel deck.

   The page is one tall "deck". A sticky pin holds the cube docked to the
   top-left of the content column while .panel sections cross-fade: scrolling
   changes the content and rotates the cube to the matching face.

   Panel 0 is a cube-free hero (the intro). As you scroll out of it and into
   "01 About", the cube fades in and grows slightly, then stays docked for the
   rest of the page. Pure vanilla JS, no libraries.

   Tuning:
     STOPS       — [rotateX, rotateY] the cube shows for each panel
     EASE        — rotation damping (0 = frozen, 1 = instant; lower = smoother)
     FADE_HOLD   — how long a panel stays fully opaque before fading
     CUBE_MIN    — the cube's scale during the hero reveal (1 = no growth)

   Inspired by "Six Faces / Walking The Cow" — see README Credits.
   ============================================================ */

(function () {
  "use strict";

  var deck = document.getElementById("deck");
  var cube = document.getElementById("cube");
  if (!deck || !cube) return;

  var stage = deck.querySelector(".cube-stage");

  var panels = Array.prototype.slice.call(
    deck.querySelectorAll(".panel[data-panel]")
  );
  var N = panels.length;
  if (!N) return;

  var prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Rotation per panel (degrees): [rotateX, rotateY].
     Panel 0 is the hero (no cube), so it shares the front face with "01 About".
     Each of the six numbered faces maps to one section (the title lives in the
     panel heading, so each face shows only its index):
       FRONT 01 About · RIGHT 02 Research · BACK 03 Experience
       LEFT  04 Projects · TOP 05 Learning · BOTTOM 06 Contact
     Every stop is face-on (no corners), so the cube never ends up half-turned
     and its silhouette never grows past its reserved corner slot. */
  var STOPS = [
    [0, 0],       // 0 hero       -> front (cube hidden)
    [0, 0],       // 1 about      -> front (01)
    [0, -90],     // 2 research   -> right (02)
    [0, -180],    // 3 experience -> back (03)
    [0, -270],    // 4 projects   -> left (04)
    [-90, -360],  // 5 learning   -> top (05)
    [90, -360]    // 6 contact    -> bottom (06)
  ];

  // Keep STOPS in sync if the number of panels ever changes.
  if (STOPS.length !== N) {
    STOPS = [];
    for (var s = 0; s < N; s++) {
      var f = N > 2 ? Math.max(0, (s - 1) / (N - 2)) : 0;
      STOPS.push([Math.round(-270 * f), Math.round(-360 * f)]);
    }
  }

  var EASE = 0.14;     // rotation damping while scrolling
  var FADE_HOLD = 0.5; // panel stays fully opaque while normalized t <= this
  var EPS = 0.0004;    // settle threshold
  var CUBE_MIN = 0.72; // cube scale at the very start of its reveal

  // Which nav link is highlighted for each panel ("" = none).
  var NAV_FOR_PANEL = [
    "",           // 0 hero — no nav item is "current"
    "#about",     // 1
    "#research",  // 2
    "#experience",// 3
    "#projects",  // 4
    "#learning",  // 5
    "#contact"    // 6
  ];

  // progress (0..1) -> evenly spaced panel "centres" across the deck
  var centerOf = [];
  for (var i = 0; i < N; i++) centerOf.push((i + 0.5) / N);
  var halfStep = N > 1 ? 0.5 / N : 1;

  var stops = [];
  for (i = 0; i < N; i++) {
    stops.push({ p: centerOf[i], x: STOPS[i][0], y: STOPS[i][1] });
  }

  var deckTop = 0;
  var pinLen = 1;
  var target = 0;
  var current = 0;
  var running = false;
  var rafId = null;
  var lastActive = -1;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* Flag a panel body as scrollable (and whether it sits at the bottom) so the
     bottom fade in css/deck.css only shows when it is actually useful. */
  function syncOverflow(body) {
    if (!body) return;
    var over = body.scrollHeight - body.clientHeight > 2;
    body.classList.toggle("has-overflow", over);
    body.classList.toggle(
      "at-bottom",
      !over || body.scrollTop + body.clientHeight >= body.scrollHeight - 2
    );
  }

  function syncAllOverflow() {
    for (var k = 0; k < N; k++) {
      syncOverflow(panels[k].querySelector(".panel-body"));
    }
  }

  function measure() {
    var pin = deck.querySelector(".deck-pin");
    deckTop = deck.offsetTop;
    pinLen = Math.max(
      1,
      deck.offsetHeight - (pin ? pin.offsetHeight : window.innerHeight)
    );
  }

  function progressFromScroll() {
    return clamp01((window.scrollY - deckTop) / pinLen);
  }

  /* Linear interpolation of the rotation between the two surrounding stops. */
  function rotationAt(p) {
    if (p <= stops[0].p) return stops[0];
    for (var k = 0; k < stops.length - 1; k++) {
      var a = stops[k];
      var b = stops[k + 1];
      if (p >= a.p && p <= b.p) {
        var span = b.p - a.p || 1;
        var t = (p - a.p) / span;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
    }
    return stops[stops.length - 1];
  }

  /* 1 when the panel is centred, fading to 0 by the time the next one is.
     The deck begins at the first panel's centre and ends at the last one's, so
     the two edge panels stay fully visible past their centre — otherwise the
     opening hero would be invisible at scrollY = 0 (t would already be 1). */
  function opacityOf(p, i) {
    if (i === 0 && p <= centerOf[0]) return 1;
    if (i === N - 1 && p >= centerOf[N - 1]) return 1;
    var t = Math.abs(p - centerOf[i]) / halfStep;
    if (t <= FADE_HOLD) return 1;
    if (t >= 1) return 0;
    var o = 1 - (t - FADE_HOLD) / (1 - FADE_HOLD);
    return o * o * (3 - 2 * o); // smoothstep
  }

  /* How far the cube has "arrived": 0 across the hero, 1 by the time the
     About panel is centred. Smoothstepped so it eases in as you scroll. */
  function cubeReveal(p) {
    if (N < 2) return 1;
    var a = centerOf[0];
    var b = centerOf[1];
    var r = clamp01((p - a) / (b - a || 1));
    return r * r * (3 - 2 * r); // smoothstep
  }

  function nearestPanel(p) {
    var best = 0;
    var bestD = Infinity;
    for (var i = 0; i < N; i++) {
      var d = Math.abs(p - centerOf[i]);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function setActive(idx) {
    if (idx === lastActive) return;
    lastActive = idx;
    for (var i = 0; i < N; i++) {
      var on = i === idx;
      panels[i].classList.toggle("is-active", on);
      if (on) {
        panels[i].removeAttribute("aria-hidden");
      } else {
        panels[i].setAttribute("aria-hidden", "true");
      }
      try { panels[i].inert = !on; } catch (e) { /* older browsers */ }
    }
    // reset the internal scroll of the newly opened panel
    var body = panels[idx].querySelector(".panel-body");
    if (body) { body.scrollTop = 0; syncOverflow(body); }
  }

  function syncNav(idx) {
    var href = NAV_FOR_PANEL[idx] || "";
    var links = document.querySelectorAll('.nav-links a[href^="#"]');
    Array.prototype.forEach.call(links, function (link) {
      link.classList.toggle(
        "active",
        href !== "" && link.getAttribute("href") === href
      );
    });
  }

  function apply() {
    var best = nearestPanel(current);

    if (prefersReduced) {
      cube.style.transform = "rotateX(0deg) rotateY(0deg)";
    } else {
      var r = rotationAt(current);
      cube.style.transform =
        "rotateX(" + r.x.toFixed(2) + "deg) rotateY(" + r.y.toFixed(2) + "deg)";
    }

    // Reveal the cube as you leave the hero; keep it docked from About on.
    if (stage) {
      var rv = prefersReduced ? (best >= 1 ? 1 : 0) : cubeReveal(current);
      stage.style.opacity = rv.toFixed(3);
      stage.style.transform =
        "scale(" + (CUBE_MIN + (1 - CUBE_MIN) * rv).toFixed(3) + ")";
    }

    for (var i = 0; i < N; i++) {
      var o = prefersReduced ? (i === best ? 1 : 0) : opacityOf(current, i);
      panels[i].style.opacity = o === 1 ? "1" : o.toFixed(3);
    }
    setActive(best);
    syncNav(best);
  }

  function tick() {
    if (prefersReduced) {
      current = target;
      apply();
      running = false;
      rafId = null;
      return;
    }
    current += (target - current) * EASE;
    if (Math.abs(target - current) < EPS) {
      current = target;
      apply();
      running = false;
      rafId = null;
      return;
    }
    apply();
    rafId = requestAnimationFrame(tick);
  }

  function requestTick() {
    if (!running) {
      running = true;
      rafId = requestAnimationFrame(tick);
    }
  }

  function update() {
    target = progressFromScroll();
    if (prefersReduced) current = target;
    requestTick();
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", function () {
    measure(); update(); syncAllOverflow();
  }, { passive: true });
  window.addEventListener("load", function () {
    measure(); update(); syncAllOverflow();
  });

  // Keep each panel body's fade state in sync as it is scrolled internally.
  panels.forEach(function (panel) {
    var b = panel.querySelector(".panel-body");
    if (b) b.addEventListener("scroll", function () { syncOverflow(b); }, { passive: true });
  });

  /* ---------- Nav links: jump to the matching panel ---------- */
  function panelIndexForId(id) {
    if (!id || id === "top") return 0;
    for (var i = 0; i < N; i++) {
      if (panels[i].id === id) return i;
    }
    return -1;
  }

  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function (a) {
    a.addEventListener("click", function (e) {
      var id = (a.getAttribute("href") || "").slice(1);
      var idx = panelIndexForId(id);
      if (idx < 0) return;
      e.preventDefault();
      measure();
      var y = idx === 0 ? deckTop : deckTop + centerOf[idx] * pinLen;
      window.scrollTo({ top: y, behavior: prefersReduced ? "auto" : "smooth" });
      if (history.replaceState) history.replaceState(null, "", "#" + id);
    });
  });

  /* ---------- Init ---------- */
  measure();
  target = progressFromScroll();
  current = target;

  // Deep link: jump straight to the section in the URL, if any.
  if (location.hash) {
    var di = panelIndexForId(location.hash.slice(1));
    if (di > 0) {
      measure();
      target = centerOf[di];
      current = target;
      window.scrollTo({ top: deckTop + centerOf[di] * pinLen, behavior: "auto" });
    }
  }

  apply();
  syncAllOverflow();
})();
