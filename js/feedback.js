/* ============================================================
   V3 - Contact feedback form.

   Submissions are written straight to Supabase (hosted Postgres) over its
   REST API using plain fetch: no SDK, no bundler, no dependency to install.

   ---- Setup (two values) ----------------------------------------------
   See docs/V3.md. Short version:

     1. Create a project at https://supabase.com
     2. Run docs/supabase-feedback.sql in that project's SQL editor
     3. Project Settings -> API, then paste the two values below

   Both values are safe to keep in this public repo: the table grants
   INSERT only to the anon role (see the RLS policy in the .sql file), so
   nobody can read other visitors' feedback with the public key.

   Until those two values are filled in, the form falls back to opening the
   visitor's mail client, so feedback is never silently lost.
   ============================================================ */

(function () {
  "use strict";

  var SUPABASE_URL = "https://gvwcfewtubdsqlqxlzbl.supabase.co";       // e.g. "https://abcdefghijklm.supabase.co"
  var SUPABASE_ANON_KEY = "sb_publishable_XXhe11c3qKuIaKSqKq3vgw_MB4ETxDG";  // the "anon public" key from Project Settings -> API
  var TABLE = "feedback";
  var FALLBACK_EMAIL = "xk_yyy@outlook.com";
  var MAX_MESSAGE = 2000;
  var ATTEMPTS = 3;        /* total tries, not retries */
  var RETRY_DELAY = 900;   /* ms before try 2; scaled by the attempt number */

  var form = document.getElementById("feedback-form");
  if (!form) return;

  var statusEl = document.getElementById("fb-status");
  var submitBtn = document.getElementById("fb-submit");
  var messageEl = document.getElementById("fb-message");
  var honeypotEl = document.getElementById("fb-website");

  function configured() {
    return /^https:\/\/[^\s]+\.supabase\.co\/?$/.test(SUPABASE_URL.trim()) &&
      SUPABASE_ANON_KEY.trim().length > 20;
  }

  function endpoint() {
    return SUPABASE_URL.trim().replace(/\/+$/, "") + "/rest/v1/" + TABLE;
  }

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = "feedback-status" + (kind ? " is-" + kind : "");
  }

  function looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function mailtoHref(payload) {
    var subject = "Website feedback" + (payload.name ? " from " + payload.name : "");
    var body = payload.message +
      "\n\n---\nName: " + (payload.name || "-") +
      "\nEmail: " + (payload.email || "-");
    return "mailto:" + FALLBACK_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  }

  function openMailFallback(payload) {
    window.location.href = mailtoHref(payload);
  }

  /* A failed send must never cost the visitor what they just typed. Rather
     than only telling them to email, hand them a real link carrying the whole
     message. A tap is a user gesture, so it works even where a scripted
     navigation would be ignored - iOS and in-app browsers especially. */
  function setStatusWithMailto(message, payload) {
    statusEl.textContent = "";
    statusEl.className = "feedback-status is-err";
    statusEl.appendChild(document.createTextNode(message + " "));
    var link = document.createElement("a");
    link.href = mailtoHref(payload);
    link.textContent = "Email it instead";
    statusEl.appendChild(link);
    statusEl.appendChild(document.createTextNode("."));
  }

  function postOnce(payload) {
    return fetch(endpoint(), {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY.trim(),
        "Authorization": "Bearer " + SUPABASE_ANON_KEY.trim(),
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (res.ok) return true;
      return res.text().then(function (detail) {
        var err = new Error("HTTP " + res.status + " " + detail.slice(0, 200));
        err.status = res.status;
        throw err;
      });
    });
  }

  /* No status at all means fetch itself rejected: offline, DNS failure, a
     dropped connection, CORS. Those deserve another try. 5xx and 429 are the
     server asking us back later. A 4xx is a real answer, so don't repeat it. */
  function worthRetrying(err) {
    if (!err || !err.status) return true;
    return err.status >= 500 || err.status === 429;
  }

  /* Clear a previous error as soon as the visitor starts fixing the input. */
  form.addEventListener("input", function () {
    if (statusEl.classList.contains("is-err")) setStatus("");
  });

  /* Confetti is a bonus, never a requirement: if js/confetti.js failed to
     load, or the visitor prefers reduced motion, the success message below
     is still the real confirmation. */
  function celebrate() {
    if (typeof window.confettiBurst === "function") {
      window.confettiBurst(submitBtn);
    }
  }

  /* Confetti is decoration, never a report on whether the message was saved.
     It runs inside the success branch, so anything it throws would bubble
     into the catch below and rewrite a successful save as a failure message.
     The animation must not be able to veto the save. */
  function safeCelebrate() {
    try {
      celebrate();
    } catch (err) {
      if (window.console && console.warn) console.warn("[feedback] confetti failed", err);
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var payload = {
      name: document.getElementById("fb-name").value.trim(),
      email: document.getElementById("fb-email").value.trim(),
      message: messageEl.value.trim()
    };

    /* Honeypot filled in -> a bot. Look successful, send nothing. */
    if (honeypotEl.value) {
      form.reset();
      setStatus("Thanks!", "ok");
      return;
    }

    if (!payload.message) {
      setStatus("Please write a message first.", "err");
      messageEl.focus();
      return;
    }

    if (payload.message.length > MAX_MESSAGE) {
      setStatus("Message is too long (" + payload.message.length + "/" + MAX_MESSAGE + ").", "err");
      return;
    }

    if (payload.email && !looksLikeEmail(payload.email)) {
      setStatus("That email address looks incomplete.", "err");
      return;
    }

    if (!configured()) {
      openMailFallback(payload);
      setStatus("Opening your email app...", "ok");
      return;
    }

    submitBtn.disabled = true;
    setStatus("Sending...");

    var attempt = 0;

    function finish() {
      submitBtn.disabled = false;
    }

    function send() {
      attempt++;
      postOnce(payload)
        .then(function () {
          form.reset();
          setStatus("Thanks - your feedback was saved.", "ok");
          safeCelebrate();
          finish();
        })
        .catch(function (err) {
          /* A slow, flaky link is the norm on mobile data, so a couple of
             quiet retries is the difference between "works" and "broken".
             A rejected request (4xx) is not retried - that answer won't
             change, and repeating it just wastes the visitor's time. */
          if (attempt < ATTEMPTS && worthRetrying(err)) {
            window.setTimeout(send, RETRY_DELAY * attempt);
            return;
          }
          setStatusWithMailto("Could not send right now.", payload);
          if (window.console && console.warn) console.warn("[feedback]", err);
          finish();
        });
    }

    send();
  });
})();
