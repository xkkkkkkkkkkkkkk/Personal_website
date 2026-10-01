/* ============================================================
   Xike Yang — Personal Academic Homepage (V1)
   Lightweight vanilla JS: navbar state, mobile menu,
   scroll reveal, and scrollspy. No libraries.
   ============================================================ */

(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var navToggle = document.querySelector(".nav-toggle");
  var navLinksList = document.getElementById("nav-links");

  /* ----- 1. Navbar background on scroll ----- */
  function onScrollHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ----- 2. Mobile menu toggle ----- */
  if (navToggle) {
    navToggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    // Close menu when a link is tapped (mobile)
    if (navLinksList) {
      navLinksList.addEventListener("click", function (e) {
        if (e.target.tagName === "A") {
          header.classList.remove("nav-open");
          navToggle.setAttribute("aria-expanded", "false");
          navToggle.setAttribute("aria-label", "Open menu");
        }
      });
    }
  }

  /* ----- 3 & 4. Reveal + scrollspy -----
     When the V2 deck is present, panel cross-fades and the scrollspy are
     driven by js/animation.js instead (absolute panels share one space, so
     an IntersectionObserver would mark every panel visible at once). */
  var hasDeck = !!document.querySelector(".deck");

  if (!hasDeck) {
    /* ----- 3. Scroll reveal (section-to-section connections) ----- */
    var revealEls = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      revealEls.forEach(function (el) { revealObserver.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    }

    /* ----- 4. Scrollspy: highlight active nav link ----- */
    var sections = document.querySelectorAll("main section[id]");
    var links = document.querySelectorAll('.nav-links a[href^="#"]');
    if ("IntersectionObserver" in window && sections.length) {
      var spyObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              links.forEach(function (link) {
                link.classList.toggle(
                  "active",
                  link.getAttribute("href") === "#" + entry.target.id
                );
              });
            }
          });
        },
        { rootMargin: "-45% 0px -50% 0px" }
      );
      sections.forEach(function (section) { spyObserver.observe(section); });
    }
  }
})();

/* ============================================================
   Gallery — two presentations of the same 21 photos:
     >= 1024px  a "collage" of pages, each page a grid of "rows" that fill
                the full width; every photo keeps its own aspect ratio (never
                cropped or stretched). The frame is sized to the tallest page,
                so all pages stay the exact same size while any leftover space
                (and the gaps between photos) is filled by the accent colour
                rgb(102,136,158) — never black.
     <  1024px  one full-width photo per slide. The collage had crushed a phone
                photo down to a 42-111px sliver, so narrow screens get a single
                large photo on an accent mat instead, swipeable with no JS.
   Every photo also ships in 720px / 1200px renditions (see srcset below) so a
   phone downloads a ~50KB file instead of the full 1600px original.
   Edit ASPECTS / COLLAGE / COLLAGE_TALL / CAROUSEL to change the arrangement.
   ============================================================ */
(function () {
  "use strict";

  // True width/height ratio of each processed photo (index = n-1).
  var ASPECTS = [
    1.7778, // 01
    0.6244, // 02
    1.4995, // 03
    1.7778, // 04
    1.4995, // 05
    1.4995, // 06
    1.4995, // 07
    1.1696, // 08
    1.4995, // 09
    1.4995, // 10
    0.6669, // 11
    0.6669, // 12
    1.4995, // 13
    1.4995, // 14
    1.4995, // 15
    1.4995, // 16
    0.6669, // 17
    0.6669, // 18
    2.0000, // 19
    0.7738, // 20
    0.6856  // 21
  ];

  var PHOTO = function (n) { return "assets/gallery/photo-" + pad2(n) + ".jpg"; };
  // Smaller renditions of the same photos, written next to the originals by
  // tools/make-image-variants.ps1. `sizes` describes how wide the slot actually
  // is, so the browser picks the smallest candidate that still covers the
  // screen's pixel density instead of always taking the 1600px original.
  var VARIANT = function (n, w) {
    return "assets/gallery/photo-" + pad2(n) + "-" + w + ".jpg";
  };
  var SRCSET = function (n) {
    return VARIANT(n, 720) + " 720w, " + VARIANT(n, 1200) + " 1200w, " + PHOTO(n) + " 1600w";
  };
  var SIZES = "(max-width: 1023px) 92vw, 28vw";
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  // Page layout: each page = list of rows, each row = list of photo numbers.
  // Two desktop arrangements, chosen by viewport (see pickMode below):
  //   COLLAGE      — wide but short (e.g. 1366x768). The V1 two-row collage;
  //                  the About panel still has to fit one screen, so this stays
  //                  short and simply leaves some room below the photos.
  //   COLLAGE_TALL — wide and tall (e.g. 1920x1080). A three-row collage that
  //                  uses the vertical room the two-row version leaves empty,
  //                  so the photos fill the panel instead of floating above it.
  // Pages are balanced by row aspect-sum so each ends up (about) the same
  // height — the frame is sized to the tallest page, so one unbalanced page
  // would leave dead space on all the others.
  var COLLAGE = [
    [[1, 2, 3], [4, 5]],
    [[6, 7], [8, 9, 10]],
    [[11, 12, 13], [14, 15]],
    [[16, 17, 18], [19, 20, 21]]
  ];
  // 21 photos over 3 pages = 7 each, rows of 3-2-2. Portrait photos (aspect
  // below 1) are either paired in a two-photo row against a wide shot or spread
  // two-to-a-row in the 3-photo row — never two portraits alone in one row,
  // which would make that row twice as tall as the rest and overflow the panel.
  var COLLAGE_TALL = [
    [[2, 11, 3], [1, 5], [8, 7]],
    [[12, 17, 9], [4, 6], [10, 13]],
    [[18, 20, 15], [21, 19], [14, 16]]
  ];
  // CAROUSEL — phones, one photo per slide. Just the old filmstrip order
  // flattened, so the mix of landscape and portrait shots is unchanged.
  var CAROUSEL = [
    1, 4, 8, 11, 19, 3, 5, 12, 6, 7, 9, 17, 10, 13, 14, 18, 15, 16, 20, 21, 2
  ];
  var WIDE = window.matchMedia("(min-width: 1024px)");
  // Is there vertical room for the three-row collage? It needs roughly 525px
  // and the About photography column only offers that from ~850px of viewport
  // height upward, so shorter windows keep the two-row collage.
  var TALL = window.matchMedia("(min-width: 1024px) and (min-height: 850px)");
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

  // "carousel" | "collage" | "collageTall"
  function pickMode() {
    if (!WIDE.matches) return "carousel";
    return TALL.matches ? "collageTall" : "collage";
  }

  var track = document.getElementById("gallery-track");
  var dotsWrap = document.getElementById("gallery-dots");
  var prev = document.getElementById("gallery-prev");
  var next = document.getElementById("gallery-next");
  var frame = document.querySelector(".gallery-frame");

  if (!track) return;

  var pageCount = 0;
  var photos = [];   // every photo, in slide order (also drives the lightbox)
  var images = [];   // the <img> for each entry of `photos`, same order
  var index = 0;
  var timer = null;
  var resumeTimer = null;
  // Auto-play: one photo every 2s. The carousel only advances once the next
  // photo has decoded (see whenReady), so on a slow connection this is a floor
  // rather than a promise — it speeds up again as soon as the files are cached.
  var INTERVAL = 2000;
  var lbIndex = 0;
  var isCarousel = false;
  var downScrollLeft = 0;
  var pressActive = false;   // a finger is on the strip right now
  var pressScrolled = false; // ...and the strip moved while it was there

  // Size the frame to the tallest page (keeps every page identical &
  // unclipped). The carousel needs no help: its slides share one CSS
  // aspect-ratio, so the frame height falls out of the layout.
  function sizeFrame() {
    if (isCarousel) { frame.style.height = ""; return; }
    var maxH = 0;
    var pages = track.children;
    for (var i = 0; i < pages.length; i++) {
      var h = pages[i].offsetHeight;
      if (h > maxH) maxH = h;
    }
    if (maxH > 0) frame.style.height = maxH + "px";
  }

  // One <img>: a small rendition on phones, the original on the wide collage,
  // and the full 1600px original again in the lightbox.
  function makeImg(n, order) {
    var img = document.createElement("img");
    img.src = PHOTO(n);
    img.srcset = SRCSET(n);
    img.sizes = SIZES;
    img.alt = "Photo " + n;
    img.loading = order === 0 ? "eager" : "lazy";
    // The very first photo decides how fast the gallery looks, so hint it.
    if (order === 0) img.setAttribute("fetchpriority", "high");
    return img;
  }

  function paintDots() {
    var dots = dotsWrap.children;
    for (var d = 0; d < dots.length; d++) {
      dots[d].classList.toggle("active", d === index);
    }
  }

  // Clicking a far-away dot glides the strip across every slide in between.
  // The dots stay on the destination for that journey instead of flickering
  // through it, and start following the strip again the moment the glide ends,
  // is interrupted by a finger, or is abandoned (a rotation mid-glide).
  var glideTo = -1;
  var glideTimer = null;
  function releaseGlide() {
    glideTo = -1;
    if (glideTimer) { clearTimeout(glideTimer); glideTimer = null; }
  }

  function goTo(i) {
    if (!pageCount) return;
    index = (i + pageCount) % pageCount;
    if (isCarousel) {
      // A native scroll container slides itself; scroll-snap does the rest.
      glideTo = index;
      if (glideTimer) clearTimeout(glideTimer);
      glideTimer = setTimeout(releaseGlide, 1400);
      track.scrollTo({
        left: index * track.clientWidth,
        behavior: REDUCED.matches ? "auto" : "smooth"
      });
    } else {
      track.style.transform = "translateX(-" + index * 100 + "%)";
    }
    paintDots();
    warmNext();
  }

  // Keep one photo ahead of the timer. At 2s per slide the browser's own lazy
  // loading margin is not always enough to have the next file ready, and a
  // slide that is still fetching would hold up the advance (see whenReady).
  function warmNext() {
    if (!isCarousel) return;
    var img = images[(index + 1) % pageCount];
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) return;
    if (img.loading !== "eager") img.loading = "eager";
  }

  // Only step forward once the next slide's photo has actually decoded, so the
  // carousel can never advance onto a blank frame. (The old timer advanced
  // every 3s regardless of whether the image had arrived, which on a phone
  // meant staring at empty boxes.)
  function whenReady(i, cb) {
    var img = images[i];
    if (!img || (img.complete && img.naturalWidth > 0)) { cb(); return; }
    var done = function () {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
      cb();
    };
    img.addEventListener("load", done);
    img.addEventListener("error", done); // a broken photo must not wedge it
  }

  function nextPage() {
    if (isCarousel) {
      var n = (index + 1) % pageCount;
      whenReady(n, function () { goTo(n); });
      return;
    }
    goTo(index + 1);
  }
  function prevPage() { goTo(index - 1); }

  function start() {
    stop();
    timer = setInterval(nextPage, INTERVAL);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  /* The carousel pauses while a finger is on it and picks itself up once the
     user has been still for a moment — an auto-advance that fights a swipe
     reads as a bug. */
  function pauseForTouch() {
    stop();
    if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; }
  }
  function resumeAfterTouch() {
    if (resumeTimer) clearTimeout(resumeTimer);
    // A touch buys about one slide of quiet before auto-play takes over again.
    resumeTimer = setTimeout(function () { resumeTimer = null; start(); }, 3000);
  }

  // Swiping is native, so the slide index follows the scroll position instead
  // of the other way round. rAF-coalesced because `scroll` fires per frame.
  var scrollQueued = false;
  var lastScrollAt = 0;
  function onTrackScroll() {
    if (!isCarousel) return;
    // A strip that just moved was being swiped, not tapped. Both facts are
    // recorded because the strip can snap back to where it started before the
    // click arrives, which would leave the two scroll positions identical.
    lastScrollAt = Date.now();
    if (pressActive) pressScrolled = true;
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(function () {
      scrollQueued = false;
      if (!isCarousel || !track.clientWidth) return;
      var i;
      if (glideTo >= 0) {
        // Still travelling to a dot: hold the dots on the destination.
        if (Math.abs(track.scrollLeft - glideTo * track.clientWidth) > 2) return;
        i = glideTo;
        releaseGlide();
      } else {
        i = Math.round(track.scrollLeft / track.clientWidth);
        i = Math.max(0, Math.min(pageCount - 1, i));
      }
      if (i === index) return;
      index = i;
      paintDots();
    });
  }

  // Re-size once images (and thus row heights) are known.
  function waitForImages() {
    var imgs = track.querySelectorAll("img");
    var pending = imgs.length;
    if (!pending) return;
    Array.prototype.forEach.call(imgs, function (im) {
      function done() { pending--; if (pending === 0) sizeFrame(); }
      if (im.complete) { done(); return; }
      im.addEventListener("load", done);
      im.addEventListener("error", done);
    });
  }

  // Build (or rebuild) every slide, the dots and the lightbox order.
  function buildPages(mode) {
    isCarousel = mode === "carousel";

    track.innerHTML = "";
    dotsWrap.innerHTML = "";
    frame.style.height = "";
    track.style.transform = "";
    // Swap the presentation hooks; the base classes stay on both.
    track.className = "gallery-track" + (isCarousel ? " is-carousel" : "");
    frame.className = "gallery-frame" + (isCarousel ? " is-carousel" : "");
    photos = [];
    images = [];
    index = 0;
    lbIndex = 0;
    releaseGlide();

    if (isCarousel) {
      CAROUSEL.forEach(function (n, order) {
        photos.push(n);
        var slide = document.createElement("div");
        slide.className = "gal-slide";
        // A portrait photo cannot fill a 3:2 frame, so the leftover space is
        // filled with that same photo, blown up and blurred, instead of the
        // flat accent colour that used to read as a blue border.
        var glow = document.createElement("div");
        glow.className = "gal-slide-glow";
        glow.setAttribute("aria-hidden", "true");
        // This is the 720px file the slide is showing anyway, so it is a cache
        // hit on a phone rather than a second download.
        glow.style.backgroundImage = "url(" + VARIANT(n, 720) + ")";
        slide.appendChild(glow);
        var img = makeImg(n, order);
        images.push(img);
        slide.appendChild(img);
        track.appendChild(slide);
      });
    } else {
      var groups = mode === "collageTall" ? COLLAGE_TALL : COLLAGE;
      var order = 0;
      groups.forEach(function (rows) {
        var page = document.createElement("div");
        page.className = "gal-page";

        rows.forEach(function (rowPhotos) {
          var row = document.createElement("div");
          row.className = "gal-row";

          var rowAspect = 0;
          rowPhotos.forEach(function (n) {
            var aspect = ASPECTS[n - 1];
            rowAspect += aspect;
            photos.push(n);
            var cell = document.createElement("div");
            cell.className = "gal-cell";
            // Width proportional to aspect ratio -> row fills full width.
            cell.style.flex = aspect + " 1 0%";
            var img = makeImg(n, order++);
            // Reserve the photo's box so the page height is stable even before load.
            img.style.aspectRatio = aspect;
            images.push(img);
            cell.appendChild(img);
            row.appendChild(cell);
          });

          // Store row aspect sum so we can size the frame precisely.
          row.dataset.aspectSum = rowAspect.toFixed(4);
          page.appendChild(row);
        });

        track.appendChild(page);
      });
    }

    pageCount = track.children.length;

    // Build one dot per page
    for (var i = 0; i < pageCount; i++) {
      (function (idx) {
        var dot = document.createElement("button");
        dot.className = "gallery-dot";
        dot.type = "button";
        dot.setAttribute("aria-label", "Go to photo " + (idx + 1));
        dot.addEventListener("click", function () { goTo(idx); start(); });
        dotsWrap.appendChild(dot);
      })(i);
    }

    goTo(0);
    sizeFrame();
    waitForImages();
  }

  // Center any content left over on shorter pages via justify-content:center.
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sizeFrame, 120);
  });

  // Rebuild when the viewport crosses either breakpoint (width or height).
  function onBreakpoint() { buildPages(pickMode()); }
  if (WIDE.addEventListener) WIDE.addEventListener("change", onBreakpoint);
  else if (WIDE.addListener) WIDE.addListener(onBreakpoint);
  if (TALL.addEventListener) TALL.addEventListener("change", onBreakpoint);
  else if (TALL.addListener) TALL.addListener(onBreakpoint);

  buildPages(pickMode());

  next.addEventListener("click", function () { nextPage(); start(); });
  prev.addEventListener("click", function () { prevPage(); start(); });
  track.addEventListener("scroll", onTrackScroll, { passive: true });

  // Carousel only: a finger down pauses the slideshow and remembers where the
  // strip was, so the tap that ends a swipe can be told apart from a real tap.
  track.addEventListener("pointerdown", function () {
    if (!isCarousel) return;
    releaseGlide(); // the finger takes over from here
    downScrollLeft = track.scrollLeft;
    pressActive = true;
    pressScrolled = false;
    pauseForTouch();
  });
  track.addEventListener("pointerup", function () {
    if (!isCarousel) return;
    pressActive = false;
    resumeAfterTouch();
  });
  track.addEventListener("pointercancel", function () {
    if (!isCarousel) return;
    pressActive = false;
    resumeAfterTouch();
  });

  // Pause on hover / focus, resume after (pointer devices only — on a touch
  // screen a synthesized mouseenter after a tap would stop the slideshow for
  // good, because the matching mouseleave never comes).
  frame.addEventListener("mouseenter", function () { if (!isCarousel) stop(); });
  frame.addEventListener("mouseleave", function () { if (!isCarousel) start(); });
  frame.addEventListener("focusin", function () { if (!isCarousel) stop(); });
  frame.addEventListener("focusout", function () { if (!isCarousel) start(); });

  start();

  /* ---------- Lightbox: open any single photo full-screen ---------- */
  var lb = document.createElement("div");
  lb.className = "lightbox";
  lb.setAttribute("role", "dialog");
  lb.setAttribute("aria-modal", "true");
  lb.innerHTML =
    '<button class="lightbox-close" type="button" aria-label="Close">&#10005;</button>' +
    '<button class="lightbox-prev" type="button" aria-label="Previous photo">&#8249;</button>' +
    '<img alt="Enlarged photo" />' +
    '<button class="lightbox-next" type="button" aria-label="Next photo">&#8250;</button>';
  document.body.appendChild(lb);

  var lbImg = lb.querySelector("img");

  // The lightbox shows the photo as large as the screen allows: 96vw keeps the
  // full 1600px original on a desktop, and lets a phone settle for the 720px
  // rendition instead of pulling half a megabyte to fill a 360px-wide view.
  function setLbImage(n) {
    lbImg.src = PHOTO(n);
    lbImg.srcset = SRCSET(n);
    lbImg.sizes = "96vw";
    lbImg.alt = "Photo " + n;
  }

  function showLb(n) {
    lbIndex = Math.max(0, Math.min(photos.length - 1, n));
    setLbImage(photos[lbIndex]);
    lb.classList.add("open");
    lb.querySelector(".lightbox-close").focus();
    stop(); // keep slideshow paused while viewing
  }

  function hideLb() {
    lb.classList.remove("open");
    start();
  }

  function stepLb(delta) {
    lbIndex = (lbIndex + delta + photos.length) % photos.length;
    setLbImage(photos[lbIndex]);
  }

  lb.querySelector(".lightbox-close").addEventListener("click", hideLb);
  lb.querySelector(".lightbox-prev").addEventListener("click", function () { stepLb(-1); });
  lb.querySelector(".lightbox-next").addEventListener("click", function () { stepLb(1); });

  // Click on a thumbnail to open it. A swipe also ends in a click on some
  // browsers, so ignore it when the strip just moved under the finger: that
  // was a swipe, not a tap.
  track.addEventListener("click", function (e) {
    if (isCarousel && (pressScrolled || Date.now() - lastScrollAt < 300 ||
        Math.abs(track.scrollLeft - downScrollLeft) > 4)) return;
    var t = e.target;
    if (t && t.tagName === "IMG") {
      var n = Number(t.alt.replace(/\D+/g, "")) || 1;
      showLb(photos.indexOf(n));
    }
  });

  // Close on backdrop click / Escape.
  lb.addEventListener("click", function (e) {
    if (e.target === lb) hideLb();
  });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") hideLb();
    else if (e.key === "ArrowLeft") stepLb(-1);
    else if (e.key === "ArrowRight") stepLb(1);
  });
})();
