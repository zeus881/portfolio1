# Sanjay Kumar — Interactive 3D Portfolio ("mission control")

Single-page portfolio for engineering managers and recruiters hiring for full stack and UAV/drone software roles.
In 10 s a visitor knows who Sanjay is; in 60 s they have seen the three strongest projects; resume and contact are always one step away.

## Workflow
- One build phase at a time: run checks → review against the Quality bar → fix → commit → report in under 12 lines → wait for "continue".
- Ask before guessing. Never invent content, metrics, links or testimonials.
- After every JS edit: `node --check <file>.js`. Content checks: `node tests/smoke.mjs`.
- Serve: `node local-server.js` → http://localhost:5173
- Verify in a real (headless) browser and look at screenshots at 1440 and 390 px. Never claim to have seen the page otherwise.

## Stack
- HTML5 single page; Tailwind via CDN; custom CSS in `styles.css`
- Three.js r128 via CDN as a classic script; GLSL inline in JS
- Plain ES2020 classic scripts (works from file://). No frameworks, bundlers or npm dependencies.
- Fonts: Orbitron (headings), Inter (body), JetBrains Mono (labels). Devicon via CDN.
- FormSubmit AJAX (`https://formsubmit.co/ajax/sanjaykumarr99009@gmail.com`), mailto fallback
- Node built-ins only for `local-server.js` and `tests/smoke.mjs`

## Files
`index.html`, `styles.css`, `data.js` (all content), `main.js` (renders data + UI), `bg-3d.js` (morphing particle field),
`hero-3d.js` (drone), `diagrams.js` (SVG architecture diagrams), `palette.js` (command palette), `local-server.js`,
`tests/smoke.mjs`, `.github/workflows/pages.yml`, `robots.txt`, `sitemap.xml`, `README.md`, `.gitignore`

## Design system
- Colours: bg `#050816`, surface `rgba(255,255,255,0.04)`, border `rgba(255,255,255,0.10)`, text `#E6EDF7`, muted `#8A96AD`,
  cyan `#00D4FF`, purple `#8B5CF6`, teal `#06B6D4`, success `#34D399`, danger `#F87171`
- Type scale 12/14/16/18/24/32/48/72 px. Headings Orbitron 600; body Inter 400/500; labels JetBrains Mono 500 uppercase, 0.08em tracking.
- 4 px grid; section padding 96 px desktop / 64 px mobile; max content width 1200 px.
- Radius 16 px cards, 999 px chips and buttons.
- Motion: 200 ms hover, 500 ms reveals, `cubic-bezier(0.22, 1, 0.36, 1)`; animate transform and opacity only.
- Section label like `// 03 PROJECTS` above each heading; HUD corner brackets on featured cards and the hero.
- Accents: cyan Home + Projects, purple Skills + Experience, teal Contact.
- No stock photos, no emoji in the UI, no gradients on body text.

## Quality bar
- All content in `data.js`; `main.js` renders it; nothing hard-coded twice.
- Small named functions, a short comment above each major block, no dead code, no console output in production paths.
- No API keys, secrets, trackers or analytics. Never show a phone number.
- 60 FPS desktop / 30+ mid-range phone; no layout shift; hero scene runs only while visible.
- Semantic landmarks, one h1, ordered headings, alt text, aria labels on icon buttons, aria-live on form status,
  contrast ≥ 4.5:1, full keyboard use, reduced motion respected everywhere.
- SEO: title "Sanjay Kumar | Full Stack Developer & UAV Systems", description, canonical, OG/Twitter, inline SVG favicon,
  JSON-LD Person, robots.txt, sitemap.xml.
- Responsive at 360/390/768/1024/1440/1920/2560 px; no horizontal scroll; touch targets ≥ 44 px.
- Never: lorem ipsum, fake testimonials, invented numbers, placeholder links, extra libraries, TODO comments.
- Accepted exception: the Tailwind Play CDN's own "should not be used in production" console warning.
