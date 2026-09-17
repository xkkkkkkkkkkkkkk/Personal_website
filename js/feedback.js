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

  function openMailFallback(payload) {
    var subject = "Website feedback" + (payload.name ? " from " + payload.name : "");
    var body = payload.message +
      "\n\n---\nName: " + (payload.name || "-") +
      "\nEmail: " + (payload.email || "-");
    window.location.href = "mailto:" + FALLBACK_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
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

    fetch(endpoint(), {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY.trim(),
        "Authorization": "Bearer " + SUPABASE_ANON_KEY.trim(),
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          setStatus("Thanks - your feedback was saved.", "ok");
          celebrate();
          return;
        }
        return res.text().then(function (detail) {
          throw new Error("HTTP " + res.status + " " + detail.slice(0, 200));
        });
      })
      .catch(function (err) {
        setStatus("Could not send right now. Please email " + FALLBACK_EMAIL + ".", "err");
        if (window.console && console.warn) console.warn("[feedback]", err);
      })
      .then(function () {
        submitBtn.disabled = false;
      });
  });
})();
