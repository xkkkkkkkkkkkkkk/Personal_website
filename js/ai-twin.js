/* ============================================================
   V4 - AI twin.

   A small chat shell docked in the bottom-right corner: ask about Xike,
   or tap one of the quick picks to have an answer extracted for you.

   ---- Where the real model goes ---------------------------------------
   The optional server endpoint is configured in ai-twin-config.js. It takes
   the visitor's text and resolves with { text, links }. The offline mode
   answers from the table beneath, so the shell can be built, demoed and
   styled today without a key.

   ---- Two rules this file keeps ---------------------------------------
   1. Honesty. Offline answers come from this page. The server supplies
      confirmed personal facts and asks the model not to invent them.
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
  var status = document.getElementById("ai-twin-status");
  var endpoint = (window.AI_TWIN_CONFIG || {}).endpoint || "";
  var history = [];
  var busy = false;
  if (status) status.textContent = endpoint ? "DeepSeek · ready to connect" : "Local mode · API not configured";

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
        "Her focus is ML & AI4S (Machine Learning and AI for Sustainability). The site is still being " +
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
      keys: ["learning", "learn", "studying now", "currently", "skills", "stack", "d2l",
        "dive into deep learning", "cs336", "动手学深度学习",
        "正在学", "学什么", "学了什么", "技能"],
      reply: "What she's on right now:\n\n" +
        "· Python\n· Linux\n· Data Structures & Algorithms\n· Machine Learning\n" +
        "· Computer Systems\n· Dive into Deep Learning (D2L)\n· CS336 (self-study)\n\n" +
        "D2L supports her deep learning study, and CS336 is part of her self-study of language models.",
      links: [{ label: "Currently Learning", href: "#learning" }]
    },
    {
      id: "focus",
      keys: ["focus", "重点", "关注什么"],
      reply: "Her focus is ML & AI4S (Machine Learning and AI for Sustainability).",
      links: [{ label: "About section", href: "#about" }]
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
      keys: ["research", "paper", "papers", "publication", "publications", "machine learning",
        "ml", "computer systems", "学术", "研究", "论文", "机器学习", "计算机系统",
        "科研", "研究方向"],
      reply: "Her research interests are Machine Learning and Computer Systems.\n\n" +
        "For machine learning, she's interested in how models learn from data and how " +
        "their performance is evaluated, while building the mathematical and programming foundations.\n\n" +
        "For computer systems, she's curious about how software interacts with operating " +
        "systems and computer architecture, and what makes programs reliable and efficient.\n\n" +
        "These are areas she wants to explore, not a list of publications.",
      links: [{ label: "Research Interests", href: "#research" }]
    },
    {
      id: "projects",
      keys: ["project", "projects", "work", "portfolio", "built", "build", "code", "repo",
        "carbonlens", "carbon lens", "sustainability", "项目", "作品", "做了什么", "做过什么",
        "可持续", "碳"],
      reply: "CarbonLens is an early-stage project exploring how AI can help analyze " +
        "sustainability-related data and support a better understanding of sustainability challenges.",
      links: [{ label: "CarbonLens project", href: "#projects" }]
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
        "· Focus: ML & AI4S\n" +
        "· Exploring Machine Learning and Computer Systems\n" +
        "· Learning Python, Linux, DSA, ML and systems; self-study with D2L and CS336\n" +
        "· CarbonLens: AI for Sustainability\n" +
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
      (endpoint ? "Ask about Xike, programming, ML, or other topics. Messages are sent to DeepSeek to generate replies. AI can make mistakes." :
        "Ask me about her, or tap a suggestion below. General questions will be available after the API is configured."),
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
     Live server proxy, with a local mode when no endpoint is configured.

         askAI(text) -> Promise<{ text: string, links?: [{label, href}] }>

     Resolve with plain text only - the caller renders it with
     textContent, so returning HTML would just show up as tags.
     --------------------------------------------------------------- */
  function askAI(text) {
    if (endpoint) {
      var messages = history.concat([{ role: "user", content: text }]);
      while (messages.length > 11 || messages.reduce(function (sum, m) { return sum + m.content.length; }, 0) > 12000) {
        messages.splice(0, 2);
      }
      var controller = new AbortController();
      var timer = window.setTimeout(function () { controller.abort(); }, 35000);
      return fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages }), signal: controller.signal,
        credentials: "omit", cache: "no-store"
      }).then(function (response) {
        if (!response.ok) {
          var error = new Error("AI request failed");
          error.status = response.status;
          throw error;
        }
        return response.json();
      }).then(function (answer) {
        if (typeof answer.text !== "string" || !answer.text.trim() || answer.text.length > 20000) throw new Error("Invalid AI reply");
        // Only successful turns enter context; errors and offline answers never do.
        history = messages.concat([{ role: "assistant", content: answer.text.slice(0, 2000) }]);
        if (status) status.textContent = "DeepSeek · connected";
        return { text: answer.text };
      }).finally(function () { window.clearTimeout(timer); });
    }
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
    if (!trimmed || busy) return;
    if (trimmed.length > 2000) {
      pushMessage("Please keep your question within 2,000 characters.", "bot");
      return;
    }
    busy = true;
    form.setAttribute("aria-busy", "true");
    form.querySelector("button[type='submit']").disabled = true;
    if (quick) Array.prototype.forEach.call(quick.querySelectorAll("button"), function (button) { button.disabled = true; });

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
        if (status) status.textContent = "DeepSeek · temporarily unavailable";
        pushMessage(err.status === 429 ? "The request limit has been reached. Please try again later." :
          "I couldn't get an AI reply. Please try again shortly. Your question is restored below.", "bot");
        if (!input.value) input.value = trimmed;
      }).finally(function () {
        busy = false;
        form.setAttribute("aria-busy", "false");
        form.querySelector("button[type='submit']").disabled = false;
        if (quick) Array.prototype.forEach.call(quick.querySelectorAll("button"), function (button) { button.disabled = false; });
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
