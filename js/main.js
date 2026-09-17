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
   Gallery — collage pages. Each page is a grid of "rows" that fill the
   full width; every photo keeps its own aspect ratio (never cropped or
   stretched). The frame is sized to the tallest page, so all pages stay
   the exact same size while any leftover space (and the gaps between
   photos) is filled by the accent colour rgb(102,136,158) — never black.
   Edit ASPECTS / COLLAGE / COLLAGE_TALL / FILMSTRIP to change the arrangement.
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
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  // Page layout: each page = list of rows, each row = list of photo numbers.
  // Three arrangements, chosen by viewport (see pickPages below):
  //   COLLAGE      — wide but short (e.g. 1366x768). The V1 two-row collage;
  //                  the About panel still has to fit one screen, so this stays
  //                  short and simply leaves some room below the photos.
  //   COLLAGE_TALL — wide and tall (e.g. 1920x1080). A three-row collage that
  //                  uses the vertical room the two-row version leaves empty,
  //                  so the photos fill the panel instead of floating above it.
  //   FILMSTRIP    — narrow screens. The collage is too tall there and would
  //                  push the About panel past one screen, so a single-row
  //                  filmstrip keeps the photos large while the panel still fits.
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
  var FILMSTRIP = [
    [[1, 4, 8, 11]],
    [[19, 3, 5, 12]],
    [[6, 7, 9, 17]],
    [[10, 13, 14, 18]],
    [[15, 16, 20, 21, 2]]
  ];
  var WIDE = window.matchMedia("(min-width: 1024px)");
  // Is there vertical room for the three-row collage? It needs roughly 525px
  // and the About photography column only offers that from ~850px of viewport
  // height upward, so shorter windows keep the two-row collage.
  var TALL = window.matchMedia("(min-width: 1024px) and (min-height: 850px)");
  function pickPages() {
    if (!WIDE.matches) return FILMSTRIP;
    return TALL.matches ? COLLAGE_TALL : COLLAGE;
  }

  var track = document.getElementById("gallery-track");
  var dotsWrap = document.getElementById("gallery-dots");
  var prev = document.getElementById("gallery-prev");
  var next = document.getElementById("gallery-next");
  var frame = document.querySelector(".gallery-frame");

  if (!track) return;

  var pageCount = 0;
  var photos = [];   // every photo, in slide order (also drives the lightbox)
  var index = 0;
  var timer = null;
  var INTERVAL = 3000;
  var lbIndex = 0;

  // Size the frame to the tallest page (keeps every page identical &
  // unclipped).
  function sizeFrame() {
    var maxH = 0;
    var pages = track.children;
    for (var i = 0; i < pages.length; i++) {
      var h = pages[i].offsetHeight;
      if (h > maxH) maxH = h;
    }
    if (maxH > 0) frame.style.height = maxH + "px";
  }

  function goTo(i) {
    if (!pageCount) return;
    index = (i + pageCount) % pageCount;
    track.style.transform = "translateX(-" + index * 100 + "%)";
    var dots = dotsWrap.children;
    for (var d = 0; d < dots.length; d++) {
      dots[d].classList.toggle("active", d === index);
    }
  }

  function nextPage() { goTo(index + 1); }
  function prevPage() { goTo(index - 1); }

  function start() {
    stop();
    timer = setInterval(nextPage, INTERVAL);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
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

  // Build (or rebuild) every page, the dots and the lightbox order.
  function buildPages(groups) {
    track.innerHTML = "";
    dotsWrap.innerHTML = "";
    frame.style.height = "";
    track.style.transform = "translateX(0%)";
    photos = [];
    index = 0;
    lbIndex = 0;

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
          var img = document.createElement("img");
          img.src = PHOTO(n);
          img.alt = "Photo " + n;
          img.loading = "lazy";
          // Reserve the photo's box so the page height is stable even before load.
          img.style.aspectRatio = aspect;
          cell.appendChild(img);
          row.appendChild(cell);
        });

        // Store row aspect sum so we can size the frame precisely.
        row.dataset.aspectSum = rowAspect.toFixed(4);
        page.appendChild(row);
      });

      track.appendChild(page);
    });

    pageCount = track.children.length;

    // Build one dot per page
    for (var i = 0; i < pageCount; i++) {
      (function (idx) {
        var dot = document.createElement("button");
        dot.className = "gallery-dot";
        dot.type = "button";
        dot.setAttribute("aria-label", "Go to page " + (idx + 1));
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
  function onBreakpoint() { buildPages(pickPages()); }
  if (WIDE.addEventListener) WIDE.addEventListener("change", onBreakpoint);
  else if (WIDE.addListener) WIDE.addListener(onBreakpoint);
  if (TALL.addEventListener) TALL.addEventListener("change", onBreakpoint);
  else if (TALL.addListener) TALL.addListener(onBreakpoint);

  buildPages(pickPages());

  next.addEventListener("click", function () { nextPage(); start(); });
  prev.addEventListener("click", function () { prevPage(); start(); });

  // Pause on hover / focus, resume after
  frame.addEventListener("mouseenter", stop);
  frame.addEventListener("mouseleave", start);
  frame.addEventListener("focusin", stop);
  frame.addEventListener("focusout", start);

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

  function showLb(n) {
    lbIndex = Math.max(0, Math.min(photos.length - 1, n));
    lbImg.src = PHOTO(photos[lbIndex]);
    lbImg.alt = "Photo " + photos[lbIndex];
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
    lbImg.src = PHOTO(photos[lbIndex]);
    lbImg.alt = "Photo " + photos[lbIndex];
  }

  lb.querySelector(".lightbox-close").addEventListener("click", hideLb);
  lb.querySelector(".lightbox-prev").addEventListener("click", function () { stepLb(-1); });
  lb.querySelector(".lightbox-next").addEventListener("click", function () { stepLb(1); });

  // Click on a thumbnail to open it.
  track.addEventListener("click", function (e) {
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
