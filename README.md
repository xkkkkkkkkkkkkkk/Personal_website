# Xike Yang — Personal Website

https://xkkkkkkkkkkkkkk.github.io/Personal_website/

A small, dependency-free personal academic homepage (HTML + CSS + vanilla JS).
No frameworks, no build step, no dependencies to install.

Current release: **V4.1** (2026-10-05). It updates the personal content, adds
subtle math and token backgrounds with simpler mobile animations, and connects
the AI twin to DeepSeek through a Supabase Edge Function. See [`docs/V4.1.md`](docs/V4.1.md).

Since V3 the Contact panel has a feedback form. There is no server of our own: the
browser posts straight to a hosted Supabase table over its REST API with plain
`fetch`, and the site itself is published on GitHub Pages. See
[the feedback form](#the-feedback-form-v3) and [`docs/V3.md`](docs/V3.md).

V4 fixes the gallery on phones (one full-width photo per page instead of a filmstrip, with
720/1200 renditions behind `srcset` so a phone stops pulling 1600px originals), replaces the
flat mat around a portrait photo with a blurred copy of that same photo, adds the bottom-right
AI twin, and stops the gallery from auto-advancing for visitors who ask for reduced motion.
See [the photography block](#photography-block-about-panel) and [`docs/V4.md`](docs/V4.md).

## Structure

```
personal-website/
├── index.html        # single page: a 7-panel scroll deck (hero + 6 sections)
├── css/
│   ├── style.css     # design system + components + responsive (V1)
│   ├── cube.css      # top-left docked 3D cube (V2)
│   ├── deck.css      # sticky pin + cross-fading panels (V2)
│   └── ai-twin.css   # bottom-right chat widget (V4)
├── js/
│   ├── main.js       # mobile menu, gallery (carousel + collage), lightbox
│   ├── animation.js  # scroll progress -> cube rotation + panel cross-fade (V2)
│   ├── feedback.js   # Contact feedback form -> Supabase REST (V3)
│   ├── confetti.js   # celebration burst when a message is saved (V3)
│   └── ai-twin.js    # bottom-right chat widget, local knowledge base (V4)
├── assets/
│   ├── favicon.svg   # isometric cube icon (matches the V2 cube)
│   └── gallery/      # 21 photos, each as photo-NN.jpg + 720/1200 renditions (V4)
├── docs/
│   ├── V1.md         # V1 iteration log
│   ├── V3.md         # V3 iteration log + GitHub Pages / Supabase setup
│   ├── V4.md         # V4 iteration log (gallery, blurred backdrops, AI twin)
│   └── supabase-feedback.sql   # feedback table + RLS policy
├── tools/
│   └── make-image-variants.ps1 # regenerate the 720/1200 renditions (V4)
├── .nojekyll         # ship files as-is on GitHub Pages (V3)
└── README.md
```

## Run locally

Open `index.html` directly, or serve the folder:

```bash
# any static server works, e.g.
npx serve .
# or
python -m http.server 8000
```

## The scroll deck (V2)

The whole page is one tall scroll region. A sticky pin holds the cube docked to the
**top-left of the content column** while the `.panel` sections cross-fade one after
another, and the cube rotates so that each section lands on its own face:

| Panel | Nav link     | Cube face          |
| ----- | ------------ | ------------------ |
| 0     | — (hero)     | *hidden*           |
| 1     | About        | FRONT `01`         |
| 2     | Research     | RIGHT `02`         |
| 3     | Experience   | BACK `03`          |
| 4     | Projects     | LEFT `04`         |
| 5     | Learning     | TOP `05`           |
| 6     | Contact      | BOTTOM `06`        |

- Panel 0 is the hero: **Xike Yang** and the intro appear immediately at the top of the
  page (no scrolling required) and **no cube is shown**.
- As you scroll into "01 About" the cube fades in and grows slightly, then stays docked
  in the corner for the rest of the page. The section heading sits to its right and the
  panel content flows below it, so one panel ≈ one screen.
- The deck starts on the first panel and ends on the last one; the two edge panels stay
  fully visible past their centre (see the `opacityOf` bounds in `js/animation.js`).
- The corner slot scales with the viewport (it is sized in `vmin`/`vh`), so the cube
  grows and shrinks with page zoom and window resizing.

### How it works

- `css/cube.css` builds the 3D scene and holds the shared V2 geometry tokens
  (`--cube-size`, `--corner-top`, `--page-pad`, `--cube-gap`). `.cube-stage` provides
  `perspective`, `.cube` uses `transform-style: preserve-3d`, and six `.cube-face`
  elements are placed on the cube's sides with `rotateX/rotateY + translateZ`.
- `css/deck.css` makes `.deck` `N × 120vh` tall and pins `.deck-pin` with
  `position: sticky`, and positions `.panel-head` / `.panel-body` around the docked cube.
- `js/animation.js` reads overall scroll progress `0 → 1` and interpolates between
  face-on rotation "stops", easing the rendered transform with `requestAnimationFrame`.
  The same progress cross-fades the panels, reveals the cube (`cubeReveal`) and
  highlights the matching nav link.
- The cube is decorative: it is `pointer-events: none` and `aria-hidden`, so it never
  blocks navigation or the Contact links.

### Change the face content

Each face shows only its index. Edit the six `.cube-face` blocks in `index.html`
(`.face-front` … `.face-bottom`); the section title lives in each panel's heading.

### Change the rotation / cross-fade

Edit the `STOPS` array in `js/animation.js` (one `[rotateX, rotateY]` pair per panel,
in panel order):

```js
var STOPS = [
  [0, 0],       // 0 hero       -> front (cube hidden)
  [0, 0],       // 1 about      -> front (01)
  [0, -90],     // 2 research   -> right (02)
  [0, -180],    // 3 experience -> back (03)
  [0, -270],    // 4 projects   -> left (04)
  [-90, -360],  // 5 learning   -> top (05)
  [90, -360]    // 6 contact    -> bottom (06)
];
```

- `EASE` (0–1) controls smoothness; lower = smoother/slower to catch up.
- `FADE_HOLD` controls how long a panel stays fully opaque before it fades.
- `CUBE_MIN` (0–1) is the cube's scale at the start of its reveal (hero → About);
  `1` means it fades in at full size.
- The panel count is driven by `--panel-count` on `<main class="deck">` (currently `7`).

### Photography block (About panel)

The 21 photos in `assets/gallery/` are arranged by the `CAROUSEL` / `COLLAGE` /
`COLLAGE_TALL` arrays in `js/main.js` (a collage page is a list of rows, each row a list of
photo numbers). The layout follows the viewport:

- **≥ 1024px** — `COLLAGE`: two rows per page, so the photos read as a large square-ish
  grid (4 pages); `COLLAGE_TALL` (three rows) takes over once the window is at least 850px
  high. The About panel splits into text (left) and photography (right).
- **< 1024px** — `CAROUSEL` (V4): **one full-width photo per page, 21 pages**. The old
  filmstrip left each photo 42–111px wide on a phone; the smallest long edge is 225px now.

`matchMedia` swaps the two live, without a reload. Rows always fill the full width and each
photo keeps its own aspect ratio (never cropped or stretched); the frame is sized to the
tallest page.

**Blurred backdrops (V4).** A 3:2 frame cannot be filled by a portrait photo, and the flat
accent-coloured mat that used to sit in that gap read as a blue border around every photo.
The carousel now lays a blurred, slightly scaled copy of *that same photo* behind it
(`.gal-slide-glow`, `blur(22px) saturate(1.2)`), reusing the 720px file the slide already
downloads — so it costs no extra request. Measured on a portrait photo, the sharp centre band
carries 6.89 of per-column high-frequency detail against 0.96 in the bands beside it, and
hiding the backdrop turns those bands into the flat track colour (`#14171d`). Photos that
already fill the frame (16:9, or the near-3:2 ones) show no bands at all.

**Renditions (V4).** Each photo ships as `photo-NN.jpg` (1600px), `photo-NN-720.jpg` and
`photo-NN-1200.jpg`. `js/main.js` picks between them with `srcset` and
`sizes = "(max-width: 1023px) 92vw, 28vw"`, so a phone downloads 993KB of 720px files
instead of 4.27MB of originals. `tools/make-image-variants.ps1` regenerates both tiers.

### Hero portrait slot

The hero reserves a circular placeholder (`.hero-avatar`, labelled `Photo`). To use a real
portrait, replace the `<span>Photo</span>` in `index.html` with an `<img>` — it is cropped
to the circle automatically (`object-fit: cover`). The slot is sized in `vmin`, so it scales
with the viewport.

### Disable the animation

- Remove (or comment out) `<script src="js/animation.js" defer></script>` in `index.html`,
  or remove the `<link rel="stylesheet" href="css/deck.css" />` and
  `css/cube.css` lines to drop the deck entirely.
- Users who set the OS "reduce motion" preference automatically get a static cube and
  instant (non-animated) panel switching via `@media (prefers-reduced-motion: reduce)`.
- Without JavaScript, `css/deck.css` unpins the deck into a normal document flow so all
  content stays readable.

## The feedback form (V3)

The Contact panel ends with a small form (Name / Email optional, Message required).
There is no backend of our own — `js/feedback.js` POSTs the values as JSON straight to a
hosted **Supabase** table using `fetch`, so there is no SDK to install and no build step.

```
browser  --POST /rest/v1/feedback-->  Supabase (Postgres)
```

### Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run `docs/supabase-feedback.sql` in its SQL editor (creates the table + RLS policy).
3. Project Settings → API, then paste the **Project URL** and the **`anon` public** key
   into `SUPABASE_URL` / `SUPABASE_ANON_KEY` at the top of `js/feedback.js`.

Both values are meant to be public. The table grants `INSERT` only to the `anon` role and
has no `SELECT` policy, so the public key cannot read anyone's feedback. **Never put the
`service_role` key in the front end.** To read submissions, use the Supabase Table Editor
or:

```sql
select created_at, name, email, message from public.feedback order by created_at desc;
```

### Behaviour

- **Not configured yet** — the form does not break: it opens the visitor's mail client
  with the message pre-addressed to the fallback email in `js/feedback.js`.
- **Validation** — message required, message ≤ `MAX_MESSAGE` (2000) characters, and email
  must look like an email if one was given. All checked client-side before any request.
- **Spam** — a visually hidden `#fb-website` honeypot input: if a bot fills it in, the form
  shows success but sends nothing.
- **Celebration** — a genuinely saved message fires a short confetti burst
  (`js/confetti.js`) from the submit button. It is drawn on a throwaway `<canvas>` that
  removes itself once the last piece lands, and it is skipped entirely for visitors who set
  the OS "reduce motion" preference. It is only ever a bonus: if the file is missing, the
  success message still appears, and it runs inside a `try`/`catch` so that an exception
  thrown by the animation cannot turn an already-saved message back into an error.
- **Failure** — a network error is retried (`ATTEMPTS` = 3) with a short backoff, because a
  flaky mobile connection is the norm rather than the exception. A 4xx is deliberately *not*
  retried: that answer will not change, so repeating it only wastes the visitor's time. If
  every try fails, the form shows a "could not send" message together with an **Email it
  instead** link carrying the visitor's text in a pre-filled `mailto:` — so a failure never
  costs them what they just typed — and re-enables the button.
- **Slow links** — a merely slow request is left to finish. There is no client-side timeout
  that could abandon a message the server may already have stored.
- `docs/supabase-feedback.sql` also adds a `created_at desc` index for reading the table.

### Publish on GitHub Pages

The site is plain static files, so Pages can serve the repo root directly:

1. Repo **Settings → Pages**.
2. Source: *Deploy from a branch*; branch `main`, folder `/ (root)`.
3. The URL appears as `https://<user>.github.io/<repo>/`.

The `.nojekyll` file in the root stops GitHub from running Jekyll over the files.
Full step-by-step notes (in Chinese) are in [`docs/V3.md`](docs/V3.md).

## The AI twin (V4)

A launcher in the bottom-right corner opens a small chat panel (`js/ai-twin.js`,
`css/ai-twin.css`).

- **DeepSeek integration is prepared locally.** `js/ai-twin-config.js` selects a
  Supabase Edge Function proxy. The proxy passed a live reply and CORS preflight
  check on 2026-10-05; the endpoint setting is enabled in V4.1.
  Setting the endpoint to empty restores the
  existing local knowledge base.
- **Live mode supports general questions and multiple turns.** The server supplies
  confirmed personal facts; the model is instructed not to invent personal achievements.
  Replies can still be wrong. No live web search is provided.
- **Secrets stay on the server.** Persistent request quotas cap public usage;
  requests fail closed if quota storage is unavailable. Conversations stay in page
  memory; messages and relevant history are sent to DeepSeek when live mode is used.
- **Failure is explicit.** Duplicate sends are blocked while waiting, requests have
  timeouts, and failed questions are restored for retry. The status becomes connected
  only after a successful reply.
- Deployment and limits: [`docs/ai-twin-deepseek.md`](docs/ai-twin-deepseek.md).
  Run mocked client/server tests with `node --test tests/ai-twin.test.mjs`.
- **Safe by construction** — every reply is written with `textContent` (returning HTML would
  just show up as tags), and every outbound link carries `target="_blank" rel="noopener"`.
- It is a **non-modal** dialog (`aria-modal="false"`), so the rest of the page stays usable;
  `Esc` closes it, except while the lightbox is open.

## Auto-play and reduced motion (V4)

The gallery advances one page every 2s. Visitors who set the OS "reduce motion" preference now
get **no auto-advance at all**: the check sits in `start()`, the single entry point that the
first load, the dots, the arrows, the hover/focus resume, the 3s resume after a touch and the
lightbox close all pass through. The dots, arrows, swipe and lightbox still work by hand —
they just move instantly instead of gliding, which is what the preference asks for. Toggling
the preference while the page is open is honoured through a `change` listener. (Before V4 the
preference only made the scroll instant; the slideshow still advanced every 2s.)

Auto-play also pauses while a finger is on the strip, resumes 3s after the last touch, and
never flips onto a photo that has not decoded yet (`whenReady`), so a slow connection cannot
strand the visitor on an empty frame.

## Background math sketches

`css/math-background.css` styles five decorative SVG diagrams in `index.html`:
gradient descent, a neural network forward pass, the backpropagation chain rule,
CNN convolution, and a simplified Transformer attention / feed-forward path.
Pale gray and blue sketches slowly orbit as the deck scrolls, with curved
conceptual connections following their centers. These connections are decoration,
not a diagram of a specific model architecture. A background-colored fade
protects the central reading column. Local signals move on 24–32 second cycles;
the CNN window scans a six-by-six input to illustrate convolution.

On narrow screens and touch devices, gradient descent and CNN remain as two static sketches.
Only the token stream keeps moving: diagram signals, convolution scanning, and
connections are disabled. The background's scroll listener and frame loop are
not active on phones. Reduced-motion preferences freeze
the scroll layout and local animations. Printing hides the background, and
`js/math-background.js` pauses animation while the page is hidden and schedules
frames only while scroll movement is settling. Mobile URL-bar height changes
do not re-map the trajectories.
The layer is `aria-hidden`, `inert`, and ignores pointer events.

A separate token stream drifts continuously behind the sketches. The fragments
are illustrative, not output from a particular tokenizer. Ten tokens on desktop
(five on smaller screens) follow staggered 72–104 second CSS transform loops;
they are paler than the diagrams and share the central reading fade. No token
timers, scroll listeners, or per-frame JavaScript are added. The existing hidden
page pause also pauses tokens, and reduced-motion preferences hide the stream.

The local snapshot before this addition is in
`../archives/2026-10-04-before-background/`, alongside a ZIP and SHA-256 manifest.
It includes the current content edits and excludes Git metadata.

## Credits / Inspiration

- Scroll-driven 3D cube: inspired by **"Six Faces / Walking The Cow"** by x-k-k-k-k-k
  (CodePen: https://codepen.io/x-k-k-k-k-k/pen/KwWMXbJ). Reimplemented from the
  underlying technique (scroll progress + CSS 3D transforms); no original assets copied.
