/* Scroll drives an ornamental constellation. No idle JS animation loop. */
(function () {
  "use strict";
  var background = document.querySelector(".math-background");
  var deck = document.getElementById("deck");
  if (!background || !deck) return;

  var pin = deck.querySelector(".deck-pin");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var touchDevice = window.matchMedia("(hover: none) and (pointer: coarse)");
  // Desktop constellations; phone sketches are positioned entirely by CSS.
  var names = ["gradient", "network", "cnn", "transformer", "backprop"];
  var scenes = names.map(function (name) {
    var el = background.querySelector(".math-" + name);
    var box = el.getAttribute("viewBox").split(/\s+/).map(Number);
    return { name: name, el: el, ratio: box[3] / box[2] };
  });
  var connectionSvg = background.querySelector(".math-connections");
  var links = Array.prototype.slice.call(connectionSvg.querySelectorAll("path"));
  var width = 0;
  var height = 0;
  var size = 0;
  var mobile = false;
  var current = 0;
  var target = 0;
  var raf = null;
  var scrollAttached = false;

  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function progress() {
    return clamp((window.scrollY - deck.offsetTop) /
      Math.max(1, deck.offsetHeight - height), 0, 1);
  }
  function measure() {
    var nextWidth = window.innerWidth;
    var nextMobile = nextWidth < 1024 || touchDevice.matches;
    if (mobile && nextMobile && nextWidth === width) return;
    var wasMobile = mobile;
    // Mobile URL-bar height changes must not re-map the scroll or the routes.
    if (!height || nextWidth !== width || !mobile) {
      height = pin ? pin.offsetHeight : window.innerHeight;
    }
    width = nextWidth;
    mobile = nextMobile;
    background.style.setProperty("--math-viewport-height", height + "px");
    if (mobile) {
      if (raf !== null) window.cancelAnimationFrame(raf);
      raf = null;
      // Remove desktop overrides when a tablet/window crosses the breakpoint.
      if (!wasMobile) scenes.forEach(function (scene) {
        ["--scene-size", "--scene-x", "--scene-y", "--scene-rotation", "--scene-opacity", "visibility"].forEach(function (property) {
          scene.el.style.removeProperty(property);
        });
      });
    } else {
      size = clamp(width * 0.17, 180, 250);
      connectionSvg.setAttribute("viewBox", "0 0 " + width + " " + height);
      connectionSvg.style.height = height + "px";
    }
    syncScrollListener();
  }
  function render(p) {
    if (mobile) return;
    var centers = {};
    scenes.forEach(function (scene, i) {
      var x, y, weight, rotation;
      var angle = Math.PI + i * Math.PI * 2 / scenes.length + p * Math.PI * 0.90;
      x = width * (0.5 + 0.37 * Math.cos(angle));
      y = height * (0.5 + 0.33 * Math.sin(angle)) + Math.sin(p * Math.PI * 2 + i) * 12;
      weight = 0.88 + 0.12 * Math.sin(angle) * Math.sin(angle);
      rotation = Math.sin(angle) * 2.4;
      var sceneHeight = size * scene.ratio;
      scene.el.style.setProperty("--scene-size", size.toFixed(2) + "px");
      scene.el.style.setProperty("--scene-x", (x - size / 2).toFixed(2) + "px");
      scene.el.style.setProperty("--scene-y", (y - sceneHeight / 2).toFixed(2) + "px");
      scene.el.style.setProperty("--scene-rotation", rotation.toFixed(2) + "deg");
      scene.el.style.setProperty("--scene-opacity", (0.612 * weight).toFixed(3));
      scene.el.style.visibility = weight > 0.005 ? "visible" : "hidden";
      centers[scene.name] = { x: x, y: y, weight: weight };
    });
    links.forEach(function (link) {
      var a = centers[link.getAttribute("data-from")];
      var b = centers[link.getAttribute("data-to")];
      var bend = Math.min(55, Math.abs(b.x - a.x) * 0.10);
      link.setAttribute("d", "M" + a.x.toFixed(2) + " " + a.y.toFixed(2) +
        " Q" + ((a.x + b.x) / 2).toFixed(2) + " " +
        ((a.y + b.y) / 2 - bend).toFixed(2) + " " + b.x.toFixed(2) + " " + b.y.toFixed(2));
      link.style.opacity = Math.min(a.weight, b.weight).toFixed(3);
    });
  }
  function tick() {
    raf = null;
    if (document.hidden || mobile) return;
    if (reduced.matches) { render(0.18); return; }
    current += (target - current) * 0.12;
    if (Math.abs(target - current) < 0.0005) current = target;
    render(current);
    if (current !== target) raf = window.requestAnimationFrame(tick);
  }
  function schedule() {
    if (!mobile && !document.hidden && raf === null) raf = window.requestAnimationFrame(tick);
  }
  function onScroll() {
    if (mobile || reduced.matches) return;
    target = progress();
    schedule();
  }
  function syncScrollListener() {
    var needed = !mobile && !reduced.matches;
    if (needed && !scrollAttached) {
      window.addEventListener("scroll", onScroll, { passive: true });
      scrollAttached = true;
    } else if (!needed && scrollAttached) {
      window.removeEventListener("scroll", onScroll);
      scrollAttached = false;
    }
  }

  function syncVisibility() {
    document.documentElement.classList.toggle("math-background-paused", document.hidden);
    if (document.hidden) {
      if (raf !== null) window.cancelAnimationFrame(raf);
      raf = null;
    } else {
      current = target = progress();
      schedule();
    }
  }

  var onResize = function () { measure(); target = progress(); schedule(); };
  window.addEventListener("resize", onResize, { passive: true });
  if (touchDevice.addEventListener) touchDevice.addEventListener("change", onResize);
  else touchDevice.addListener(onResize);
  window.addEventListener("load", function () { measure(); current = target = progress(); schedule(); });
  document.addEventListener("visibilitychange", syncVisibility);
  window.addEventListener("pagehide", function () {
    document.documentElement.classList.add("math-background-paused");
    if (raf !== null) window.cancelAnimationFrame(raf);
    raf = null;
  });
  window.addEventListener("pageshow", syncVisibility);
  var onPreference = function () { syncScrollListener(); current = target = progress(); schedule(); };
  if (reduced.addEventListener) reduced.addEventListener("change", onPreference);
  else reduced.addListener(onPreference);

  measure();
  current = target = progress();
  render(reduced.matches ? 0.18 : current);
  background.classList.add("is-ready");
  syncVisibility();
})();
