/* ============================================================
   Xike Yang — Personal Academic Homepage  (V3)
   Celebration confetti for the feedback form.

   A small particle burst drawn on a throwaway full-screen <canvas>.
   Pure vanilla JS: no library, no build step, nothing to install.

   js/feedback.js calls window.confettiBurst(anchorEl) once a message has
   really been saved. It lives in its own file so the form stays about the
   form, and so the effect can be reused elsewhere later.

   Design notes:
     - The canvas is pointer-events:none and aria-hidden, so it can never
       swallow a click or be announced by a screen reader.
     - It is created on demand and removed from the DOM as soon as the last
       piece lands, so an idle page carries no extra layer.
     - Visitors who set the OS "reduce motion" preference get no animation.
       The form's own success message is the real confirmation either way,
       so nothing is lost by skipping it.
   ============================================================ */

(function () {
  "use strict";

  /* Site palette (--accent / --primary in style.css) plus two lighter tints
     so the pieces stay legible against the pale page. */
  var COLORS = [
    "#2b5b8b", "#17263d", "#4a8fd4",
    "#8fb8e0", "#c9d8ea", "#e0a94a"
  ];

  var GRAVITY = 1250;   /* px/s^2 */
  var DRAG = 0.22;      /* fraction of velocity left after 1s of flight */
  var COUNT = 110;      /* pieces per burst */
  var MAX_DPR = 2;      /* cap so 3x phones don't render 9x the pixels */

  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)");

  var canvas = null;
  var ctx = null;
  var rafId = 0;
  var last = 0;
  var particles = [];
  var viewW = 0;   /* the canvas box, in CSS pixels */
  var viewH = 0;

  /* ---------------------------------------------------------------
     Canvas lifecycle
     --------------------------------------------------------------- */

  function resize() {
    /* Measure the canvas's own box rather than window.innerWidth: innerWidth
       includes the scrollbar, so sizing the drawing buffer from it would
       stretch the picture by the scrollbar's width on desktop. */
    viewW = canvas.clientWidth || window.innerWidth;
    viewH = canvas.clientHeight || window.innerHeight;

    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    /* Draw in CSS pixels; the transform handles the device pixel ratio. */
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function onResize() {
    if (canvas) resize();
  }

  function stop() {
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
    last = 0;
    particles = [];
    window.removeEventListener("resize", onResize);
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null;
    ctx = null;
  }

  /* ---------------------------------------------------------------
     Particles
     --------------------------------------------------------------- */

  function spawn(origin) {
    /* Mostly upward (-90deg +/- 76deg): the submit button sits near the
       bottom of the viewport, so the pieces need to rise before they fall. */
    var spread = Math.PI * 0.85;

    for (var i = 0; i < COUNT; i++) {
      var angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      var speed = 320 + Math.random() * 620;

      particles.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 5 + Math.random() * 5,
        h: 8 + Math.random() * 7,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 14,
        flip: Math.random() * Math.PI * 2,
        round: Math.random() < 0.22,
        age: 0,
        ttl: 1.5 + Math.random() * 0.9
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, viewW, viewH);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var t = p.age / p.ttl;
      /* Hold full opacity, then fade over the last quarter of the life. */
      var alpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;

      ctx.save();
      ctx.globalAlpha = alpha < 0 ? 0 : alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;

      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        /* Squashing one axis over time fakes a piece of paper tumbling. */
        ctx.scale(1, Math.cos(p.age * 7 + p.flip));
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
  }

  function step(now) {
    if (!last) last = now;
    /* Clamp so a background tab or a dropped frame can't teleport pieces. */
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    var damp = Math.pow(DRAG, dt);
    var alive = [];

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.age += dt;
      if (p.age >= p.ttl) continue;

      p.vy += GRAVITY * dt;
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;

      /* Retire anything that has fallen well past the bottom edge. */
      if (p.y - p.h > viewH + 40) continue;
      alive.push(p);
    }

    particles = alive;
    draw();

    if (particles.length) {
      rafId = window.requestAnimationFrame(step);
    } else {
      stop();
    }
  }

  /* ---------------------------------------------------------------
     Public API
     --------------------------------------------------------------- */

  /* Burst from an element (usually the submit button) or, if none is given,
     from the middle of the viewport. */
  function originOf(anchor) {
    if (anchor && anchor.getBoundingClientRect) {
      var r = anchor.getBoundingClientRect();
      if (r.width || r.height) {
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
    }
    return { x: viewW / 2, y: viewH * 0.62 };
  }

  window.confettiBurst = function (anchor) {
    /* Honour the OS setting. The caller always shows its own success
       message, so returning false here costs the visitor nothing. */
    if (reduced && reduced.matches) return false;
    if (!window.requestAnimationFrame) return false;

    /* A second submit while pieces are still flying just adds to the
       shower instead of stacking a second canvas on top. */
    if (canvas) {
      spawn(originOf(anchor));
      return true;
    }

    canvas = document.createElement("canvas");
    canvas.className = "confetti-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);

    ctx = canvas.getContext("2d");
    if (!ctx) {
      stop();
      return false;
    }

    resize();
    window.addEventListener("resize", onResize);
    spawn(originOf(anchor));
    rafId = window.requestAnimationFrame(step);
    return true;
  };
})();
