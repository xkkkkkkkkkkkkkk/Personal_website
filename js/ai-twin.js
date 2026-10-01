/* ============================================================
   V4 - AI twin.

   A small chat shell docked in the bottom-right corner: ask about Xike,
   or tap one of the quick picks to have an answer extracted for you.

   ---- Where the real model goes ---------------------------------------
   There is no API call yet. askAI() below is the single seam: it takes
   the visitor's text and resolves with { text, links }. Replace its body
   with a fetch to your endpoint and nothing else has to change. The stub
   answers from the table beneath, so the shell can be built, demoed and
   styled today without a key.

   ---- Two rules this file keeps ---------------------------------------
   1. Honesty. Every answer comes from content that is actually on the
      page. Where the site still holds a placeholder ("……", "Coming
      soon"), the twin says so instead of inventing a plausible fact.
   2. Safety. Visitor text and answer text are both written with
      textContent. Nothing here ever builds HTML from a string.
   ============================================================ */

(function () {
  "use strict";

  var root = document.getElementById("ai-twin");
  if (!root) return;

  var launcher = document.getElementById("ai-twin-launcher");
  var panel = document.getElementById("ai-twin-panel");
  var log = document.getElementById("ai-twin-log");
  var quick = document.getElementById("ai-twin-quick");
  var form = document.getElementById("ai-twin-form");
  var input = document.getElementById("ai-twin-input");
  var closeBtn = document.getElementById("ai-twin-close");

  if (!launcher || !panel || !log || !form || !input) return;

  /* ---------------------------------------------------------------
     The facts. Keep these in step with index.html: if a section is
     still a placeholder, the answer must say so.
     --------------------------------------------------------------- */
  var KB = [
    {
      id: "who",
      keys: ["who", "about", "yourself", "xike", "yang", "introduce", "introduction", "bio",
        "你是谁", "是谁", "介绍", "本人", "关于"],
      reply: "Xike Yang is a Computer Science undergraduate.\n\n" +
        "She's working on the fundamentals first, and the site is still being " +
        "filled in section by section, so a few panels are waiting on content.",
      links: [{ label: "About section", href: "#about" }]
    },
    {
      id: "contact",
      keys: ["contact", "email", "mail", "reach", "github", "link", "touch", "connect",
        "联系", "邮箱", "邮件", "怎么找"],
      reply: "Two ways to reach her:\n",
      links: [
        { label: "xk_yyy@outlook.com", href: "mailto:xk_yyy@outlook.com" },
        { label: "github.com/xkkkkkkkkkkkkkk", href: "https://github.com/xkkkkkkkkkkkkkk" }
      ],
      after: "\nThere's also a feedback form in the Contact section - it goes straight to her."
    },
    {
      id: "education",
      keys: ["education", "university", "school", "study", "studying", "affiliation", "tju",
        "polyu", "degree", "major", "where", "学校", "大学", "专业", "在哪", "学历"],
      reply: "TJU (Tianjin University) and POLYU (The Hong Kong Polytechnic University), " +
        "as a Computer Science undergraduate."
    },
    {
      id: "learning",
      keys: ["learning", "learn", "studying now", "currently", "focus", "skills", "stack",
        "正在学", "学什么", "学了什么", "技能"],
      reply: "What she's on right now:\n\n" +
        "· Python\n· Linux\n· Data Structures & Algorithms\n· Machine Learning\n" +
        "· Computer Systems",
      links: [{ label: "Currently Learning", href: "#learning" }]
    },
    {
      id: "hobbies",
      keys: ["hobby", "hobbies", "interest", "interests", "free time", "fun", "photo",
        "photography", "cat", "cats", "music", "musical", "outdoors", "food", "爱好", "兴趣",
        "摄影", "猫", "喜欢", "娱乐", "业余", "日常"],
      reply: "Photography, the outdoors, food, cats and musicals.\n\n" +
        "The gallery in About is her own photography - tap any photo to open it full screen.",
      links: [{ label: "About section", href: "#about" }]
    },
    {
      id: "research",
      keys: ["research", "paper", "papers", "publication", "publications", "学术", "研究", "论文",
        "科研", "研究方向"],
      reply: "Nothing to cite yet, and the site is honest about that - the Research panel " +
        "says these are areas she wants to grow into, and the cards are still placeholders.\n\n" +
        "Ask her directly for specifics."
    },
    {
      id: "projects",
      keys: ["project", "projects", "work", "portfolio", "built", "build", "code", "repo",
        "项目", "作品", "做了什么", "做过什么"],
      reply: "The Projects panel says \"Coming soon\", so there's nothing published to show yet.\n\n" +
        "The one thing that is finished is this site: hand-written HTML, CSS and vanilla " +
        "JavaScript, no framework and no build step. It's on GitHub.",
      links: [{ label: "github.com/xkkkkkkkkkkkkkk", href: "https://github.com/xkkkkkkkkkkkkkk" }]
    },
    {
      id: "experience",
      keys: ["experience", "timeline", "history", "career", "internship", "job", "经历", "实习", "时间线"],
      reply: "The timeline has one entry so far:\n\n· 2026 - Started Computer Science\n\n" +
        "The panel is marked \"Coming soon\" for the rest."
    },
    {
      id: "site",
      keys: ["site", "website", "this page", "built", "how did", "tech", "stack", "made",
        "网站", "这个页面", "怎么做", "技术"],
      reply: "A hand-written static site: HTML, CSS and vanilla JavaScript. No framework, " +
        "no build step, no dependencies to install.\n\n" +
        "It has the scroll-driven cube deck, a photo lightbox, a feedback form that writes " +
        "straight to Supabase, and this chat box."
    },
    {
      id: "glance",
      keys: ["glance", "summary", "overview", "quick", "brief", "tldr", "at a glance",
        "概括", "总结", "概况", "一句话", "简介", "简单介绍"],
      reply: "At a glance:\n\n" +
        "· Computer Science undergraduate\n" +
        "· TJU and POLYU\n" +
        "· Learning Python, Linux, DSA, ML and systems\n" +
        "· Into photography, the outdoors, food, cats and musicals\n" +
        "· xk_yyy@outlook.com"
    }
  ];

  /* No match: say so plainly instead of guessing. */
  var FALLBACK = {
    reply: "I only know what's on this page, and I'm not connected to a live model yet - " +
      "so I'd rather say I don't know than make something up.\n\n" +
      "Try one of the suggestions below, or use the feedback form in Contact and she'll " +
      "answer you herself.",
    links: [{ label: "Contact", href: "#contact" }]
  };

  /* The buttons under the log. Order is the order on screen. */
  var QUICK = [
    { label: "Who is Xike?", id: "who" },
    { label: "Contact", id: "contact" },
    { label: "Education", id: "education" },
    { label: "What's she learning?", id: "learning" },
    { label: "At a glance", id: "glance" }
  ];

  var GREETING = {
    reply: "Hi - I'm Xike's AI twin.\n\n" +
      "Ask me about her, or tap a suggestion below.",
    links: null
  };

  var isOpen = false;
  var greeted = false;

  /* ---------------------------------------------------------------
     Matching. A short key like "hi" must not match inside "this", so
     ASCII keys are matched on word boundaries. Chinese keys have no
     word breaks, so they are matched as plain substrings.
     --------------------------------------------------------------- */
  function hits(text, key) {
    if (/[\u4e00-\u9fff]/.test(key)) return text.indexOf(key) !== -1;
    var safe = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("(^|[^a-z0-9])" + safe + "([^a-z0-9]|$)").test(text);
  }

  /* Score by how many keys hit, weighted by how long each key is: a specific
     key ("研究什么" / "publications") says far more than a short generic one
     ("方向" / "work"). Without the weighting, two single hits tie and the
     entry that happens to sit earlier in the table wins - which is how
     "研究什么方向" once came back as an answer about coursework. Ties still
     go to the earlier entry, so the table is ordered most-common first. */
  function localAnswer(text) {
    var q = String(text).toLowerCase().replace(/[\s\u3000]+/g, " ").trim();
    var best = null;
    var bestScore = 0;

    for (var i = 0; i < KB.length; i++) {
      var score = 0;
      for (var k = 0; k < KB[i].keys.length; k++) {
        if (hits(q, KB[i].keys[k])) score += KB[i].keys[k].length;
      }
      if (score > bestScore) {
        bestScore = score;
        best = KB[i];
      }
    }

    return best || FALLBACK;
  }

  /* ---------------------------------------------------------------
     TODO: the live model.

     Replace this body with a real request and keep the contract:

         askAI(text) -> Promise<{ text: string, links?: [{label, href}] }>

     Resolve with plain text only - the caller renders it with
     textContent, so returning HTML would just show up as tags. Reject
     to have the caller show its "can't reach the twin" line.
     --------------------------------------------------------------- */
  function askAI(text) {
    return new Promise(function (resolve) {
      window.setTimeout(function () {
        var entry = localAnswer(text);
        resolve({
          text: entry.reply + (entry.after || ""),
          links: entry.links
        });
      }, 280);
    });
  }

  /* ---------------------------------------------------------------
     Rendering
     --------------------------------------------------------------- */
  function scrollToEnd() {
    log.scrollTop = log.scrollHeight;
  }

  function pushMessage(text, who, links) {
    var el = document.createElement("p");
    el.className = "ai-twin-msg is-" + (who === "me" ? "me" : "bot");
    el.appendChild(document.createTextNode(text));

    if (links && links.length) {
      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        el.appendChild(document.createTextNode("\n"));
        var a = document.createElement("a");
        a.href = link.href;
        a.textContent = link.label;
        /* In-page anchors stay here; anything external opens in a new tab. */
        if (/^https?:/i.test(link.href)) {
          a.target = "_blank";
          a.rel = "noopener";
        }
        el.appendChild(a);
      }
    }

    log.appendChild(el);
    scrollToEnd();
    return el;
  }

  function pushTyping() {
    var el = document.createElement("p");
    el.className = "ai-twin-msg is-bot ai-twin-typing";
    el.setAttribute("aria-hidden", "true");   /* decoration, not an announcement */
    for (var i = 0; i < 3; i++) el.appendChild(document.createElement("span"));
    log.appendChild(el);
    scrollToEnd();
    return el;
  }

  function send(text) {
    var trimmed = String(text || "").trim();
    if (!trimmed) return;

    pushMessage(trimmed, "me");
    input.value = "";

    var typing = pushTyping();

    askAI(trimmed)
      .then(function (answer) {
        typing.remove();
        pushMessage(answer.text, "bot", answer.links);
      })
      .catch(function (err) {
        typing.remove();
        pushMessage("I can't reach my brain right now. The feedback form in Contact " +
          "still works, though.", "bot", [{ label: "Contact", href: "#contact" }]);
        if (window.console && console.warn) console.warn("[ai-twin]", err);
      });
  }

  /* ---------------------------------------------------------------
     Open / close
     --------------------------------------------------------------- */
  function open() {
    if (isOpen) return;
    isOpen = true;
    panel.classList.add("is-open");
    launcher.setAttribute("aria-expanded", "true");

    if (!greeted) {
      greeted = true;
      pushMessage(GREETING.reply, "bot", GREETING.links);
    }

    /* Focus the field so the visitor can just type - except on touch, where
       that would throw the on-screen keyboard over the panel immediately. */
    var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (!coarse) input.focus();
    scrollToEnd();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove("is-open");
    launcher.setAttribute("aria-expanded", "false");
    /* Only take focus back if it was inside the panel - never steal it. */
    if (panel.contains(document.activeElement)) launcher.focus();
  }

  launcher.addEventListener("click", function () {
    if (isOpen) close(); else open();
  });

  if (closeBtn) closeBtn.addEventListener("click", close);

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !isOpen) return;
    /* The lightbox owns Escape while it is open. */
    var lightbox = document.querySelector(".lightbox");
    if (lightbox && lightbox.classList.contains("open")) return;
    close();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    send(input.value);
  });

  /* ---------------------------------------------------------------
     Quick picks
     --------------------------------------------------------------- */
  (function buildQuick() {
    if (!quick) return;
    for (var i = 0; i < QUICK.length; i++) {
      (function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "ai-twin-chip";
        button.textContent = item.label;
        button.addEventListener("click", function () { send(item.label); });
        quick.appendChild(button);
      })(QUICK[i]);
    }
  })();
})();
