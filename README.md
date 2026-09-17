# Xike Yang — Personal Website

A small, dependency-free personal academic homepage (HTML + CSS + vanilla JS).
No frameworks, no build step, no backend.

## Structure

```
personal-website/
├── index.html        # single page: a 7-panel scroll deck (hero + 6 sections)
├── css/
│   ├── style.css     # design system + components + responsive (V1)
│   ├── cube.css      # top-left docked 3D cube (V2)
│   └── deck.css      # sticky pin + cross-fading panels (V2)
├── js/
│   ├── main.js       # mobile menu, gallery, lightbox
│   └── animation.js  # scroll progress -> cube rotation + panel cross-fade (V2)
├── assets/
│   ├── favicon.svg   # isometric cube icon (matches the V2 cube)
│   └── gallery/      # 21 processed photos (photo-01.jpg … photo-21.jpg)
├── docs/
│   └── V1.md         # V1 iteration log
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

The 21 photos in `assets/gallery/` are arranged by the `COLLAGE` / `FILMSTRIP` arrays in
`js/main.js` (each page is a list of rows, each row a list of photo numbers). The layout
follows the viewport:

- **≥ 1024px** — `COLLAGE`: two rows per page, so the photos read as a large square-ish
  grid (4 pages). The About panel splits into text (left) and photography (right).
- **< 1024px** — `FILMSTRIP`: one row per page (5 pages). The collage would be too tall on
  a phone and would push About past one screen, so the filmstrip keeps the panel fitting.

`matchMedia` swaps the two live, without a reload. Rows always fill the full width and each
photo keeps its own aspect ratio (never cropped or stretched); the frame is sized to the
tallest page, and any leftover space is filled with the accent colour.

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

## Credits / Inspiration

- Scroll-driven 3D cube: inspired by **"Six Faces / Walking The Cow"** by x-k-k-k-k-k
  (CodePen: https://codepen.io/x-k-k-k-k-k/pen/KwWMXbJ). Reimplemented from the
  underlying technique (scroll progress + CSS 3D transforms); no original assets copied.
