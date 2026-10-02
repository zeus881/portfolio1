# Sanjay Kumar — Interactive 3D Portfolio ("mission control")

For engineering managers and recruiters hiring for full stack and UAV/drone roles, often on a phone.
10 s: who Sanjay is. 60 s: the three strongest projects. Resume and contact always one step away.
It must open on any phone, anywhere.

## Workflow
- One phase at a time: checks → review against the quality bar → fix → commit → short report.
- Ask before guessing. Never invent content, metrics, links or testimonials.
- Owner decisions that override the brief: location is **Noida, India** (Rebhu role stays Greater Noida); the footer has **no** "Built with Three.js" line.
- Commands: `node scripts/build.mjs` (writes markup from data.js into index.html), `node tests/smoke.mjs`,
  `node --check <file>.js` after every JS edit, `node local-server.js` → http://localhost:5173
- Verify in a real (headless) browser, look at screenshots; never claim to have seen the page otherwise.

## Stack
- HTML5 single page; hand-written CSS in `styles.css` (no Tailwind, no CSS framework).
- Zero third-party requests at runtime: Three.js r128 in `vendor/`, woff2 fonts in `fonts/`, inline SVG icons.
  The only network call is the contact form POST to FormSubmit.
- Plain JavaScript, **ES2017 at most** (no `?.`, `??`, object spread, optional catch binding), classic scripts with `defer`.
- All paths relative (`./file`), so the site works under a sub-path.
- Node built-ins only for the server, build script, QR generator and tests.

## Design system
- Colours: bg `#050816`, surface `rgba(255,255,255,0.04)`, border `rgba(255,255,255,0.10)`, text `#E6EDF7`,
  muted `#8A96AD`, cyan `#00D4FF`, purple `#8B5CF6`, teal `#06B6D4`, success `#34D399`, danger `#F87171`.
- Type 12/14/16/18/24/32/48/72 px, fluid with `clamp()` (with a plain fallback). Orbitron 600 headings, Inter 400/500 body,
  JetBrains Mono 500 uppercase labels (0.08em).
- 4 px grid; section padding 96 px desktop / 64 px mobile; content max 1200 px; radius 16 px cards, 999 px chips/buttons.
- Motion 200 ms hover, 500 ms reveals, `cubic-bezier(0.22, 1, 0.36, 1)`; animate transform and opacity only.
- `// 03 PROJECTS` labels; HUD brackets on featured cards and hero; status strip with IST time.
- Accents: cyan Home + Projects, purple Skills + Experience, teal Contact. No stock photos, no emoji, no gradient body text.

## Must open on any phone
- 320 px and up, portrait and landscape; Chrome/Firefox Android, Safari iOS 13+, Samsung Internet, 2 GB RAM phones, slow 3G.
- Content is in the HTML the server sends (build script); `<noscript>` notice with resume and email.
- Load order: HTML + CSS → main.js (defer) → 3D files after first paint, only if WebGL exists and saveData is off,
  deviceMemory ≥ 3 and effectiveType is not 2g/slow-2g (missing APIs = allowed).
- Budgets: HTML + CSS + main.js + palette.js + diagrams.js < 180 KB; fonts < 150 KB; everything < 900 KB; images < 100 KB.
- viewport-fit=cover + safe-area insets; 100dvh with 100vh fallback; 44 px targets; 16 px form inputs; nothing hover-only;
  backdrop-filter with a solid fallback; feature-detect IntersectionObserver, WebGL, localStorage, serviceWorker,
  ResizeObserver, WAAPI; no horizontal scroll; no layout jump when the address bar moves.
- iOS 13 CSS limits: no flexbox `gap`, no `inset`, no `aspect-ratio`, no `color-mix()`; `clamp()` needs a fallback line;
  `:focus-visible` needs a `:focus` fallback; no `<dialog>` (custom modal and palette).
- Installable: manifest, 192/512 icons, `sw.js` (bump `CACHE_VERSION` per release), `404.html`.

## Quality bar
- All content in `data.js`; nothing hard-coded twice (build.mjs generates index.html sections, head meta,
  manifest, robots.txt and sitemap.xml from it).
- Small named functions, a comment above each major block, no dead code, no console output in production paths.
- No API keys, secrets, trackers or analytics. Never show a phone number.
- 60 FPS desktop / 30+ mid-range phone; no layout shift; hero scene only while visible.
- Landmarks, one h1, ordered headings, alt text, aria labels on icon buttons, aria-live form status,
  contrast ≥ 4.5:1, full keyboard use, reduced motion everywhere.
- SEO: title "Sanjay Kumar | Full Stack Developer & UAV Systems", description, canonical, OG/Twitter with a local
  1200×630 image < 100 KB, inline SVG favicon, JSON-LD Person, robots.txt, sitemap.xml.
- Never: lorem ipsum, fake testimonials, invented numbers, placeholder links, extra libraries or third-party URLs, TODOs.
