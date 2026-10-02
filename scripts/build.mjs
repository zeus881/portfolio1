/*
 * scripts/build.mjs
 * Writes the page markup from data.js so all content is in the HTML the server sends.
 * Node built-ins only: `node scripts/build.mjs`
 *
 * Outputs
 *  index.html              head meta (between <!-- build:head --> markers) and body (between <!-- build:body --> markers)
 *  manifest.webmanifest    install metadata
 *  robots.txt, sitemap.xml crawler files
 *  404.html                self-contained "not found" page
 *
 * renderAll(currentIndexHtml) returns { path: content } without writing, so tests/smoke.mjs
 * can confirm the committed files are up to date.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { icon } from './icons.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const DATA = require(join(ROOT, 'data.js'));
const Diagrams = require(join(ROOT, 'diagrams.js'));
const { site, owner, ui } = DATA;

/* ===== Helpers ===== */
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const fmt = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ''));
const sectionNumber = (id) => String(ui.sections.findIndex((s) => s.id === id)).padStart(2, '0');
const ext = (href, cls, inner) =>
  `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${inner}<span class="sr-only"> ${esc(ui.newTab)}</span></a>`;
const tagList = (tags) => `<ul class="tag-list" aria-label="${esc(ui.projects.stack)}">${tags.map((t) => `<li class="tag">${esc(t)}</li>`).join('')}</ul>`;
const indent = (html, pad = '  ') => html.split('\n').map((l) => (l ? pad + l : l)).join('\n');

/** Replace the text between <!-- build:NAME:start --> and <!-- build:NAME:end -->. */
function inject(html, name, content) {
  const re = new RegExp(`(<!-- build:${name}:start -->)[\\s\\S]*?(\\s*<!-- build:${name}:end -->)`);
  if (!re.test(html)) throw new Error(`Marker build:${name} not found in index.html`);
  return html.replace(re, (_, start, end) => `${start}\n${content}${end}`);
}

/* ===== Head ===== */
function renderHead() {
  const image = site.url + site.shareImage;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: owner.name,
    jobTitle: owner.roles[0],
    email: `mailto:${owner.email}`,
    url: site.url,
    address: { '@type': 'PostalAddress', addressLocality: owner.location.split(',')[0].trim(), addressCountry: owner.country },
    sameAs: [owner.github, owner.linkedin],
  };
  const favicon =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23050816'/%3E%3Cpath d='M10 20V10h10M44 10h10v10M54 44v10H44M20 54H10V44' fill='none' stroke='%2300D4FF' stroke-width='3'/%3E%3Ctext x='32' y='41' font-family='Arial,sans-serif' font-size='22' font-weight='700' text-anchor='middle' fill='%23E6EDF7'%3E" +
    encodeURIComponent(owner.initials) +
    '%3C/text%3E%3C/svg%3E';
  return [
    `<title>${esc(site.title)}</title>`,
    `<meta name="description" content="${esc(site.description)}">`,
    `<meta name="author" content="${esc(owner.name)}">`,
    `<meta name="theme-color" content="${esc(site.themeColor)}">`,
    `<meta name="color-scheme" content="dark">`,
    `<meta name="robots" content="index, follow">`,
    `<link rel="canonical" href="${esc(site.url)}">`,
    `<link rel="manifest" href="./manifest.webmanifest">`,
    `<link rel="icon" type="image/svg+xml" href="${favicon}">`,
    `<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${esc(site.url)}">`,
    `<meta property="og:title" content="${esc(site.title)}">`,
    `<meta property="og:description" content="${esc(site.description)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(site.shareImageAlt)}">`,
    `<meta property="og:site_name" content="${esc(owner.name)}">`,
    `<meta property="og:locale" content="${esc(site.locale)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(site.title)}">`,
    `<meta name="twitter:description" content="${esc(site.description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<meta name="twitter:image:alt" content="${esc(site.shareImageAlt)}">`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ]
    .map((l) => '  ' + l)
    .join('\n');
}

/* ===== Body: header ===== */
function renderHeader() {
  const links = ui.sections.map((s) => `<li><a class="nav-link" href="#${s.id}">${esc(s.nav)}</a></li>`).join('');
  return `<header id="site-header" class="site-header">
  <div id="scroll-progress" class="scroll-progress" aria-hidden="true"></div>
  <nav class="nav-bar" aria-label="Primary">
    <a class="nav-brand" href="#home" aria-label="${esc(owner.name)}, back to top">${esc(owner.initials)}</a>
    <ul class="nav-links">${links}</ul>
    <div class="nav-actions">
      <button id="palette-open" type="button" class="icon-btn js-only" aria-label="${esc(ui.searchLabel)}" aria-haspopup="dialog">${icon('search', 18)}</button>
      <button id="toggle-3d" type="button" class="pill-btn toggle-3d js-only" aria-pressed="false" aria-label="${esc(ui.toggle3dLabel)}">${esc(ui.toggle3dOff)}</button>
      <a class="btn btn-outline nav-resume" href="${esc(owner.resume)}" download>${esc(ui.resumeButton)}</a>
      <button id="nav-toggle" type="button" class="icon-btn nav-toggle js-only" aria-expanded="false" aria-controls="mobile-sheet" aria-label="${esc(ui.menuOpen)}"><span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span></button>
    </div>
  </nav>
  <div id="mobile-sheet" class="mobile-sheet" hidden>
    <ul class="mobile-links">${links}<li><button type="button" class="nav-link" data-open-palette>${icon('search', 18)}&nbsp;&nbsp;${esc(ui.search)}</button></li><li><a class="btn btn-outline" href="${esc(owner.resume)}" download>${esc(ui.resumeButton)}</a></li></ul>
  </div>
</header>`;
}

/** "// 03 PROJECTS" label + h2. */
function sectionHeader(id) {
  const s = ui.sections.find((x) => x.id === id);
  return `<header class="section-header reveal">
      <p class="mono-label" aria-hidden="true">// ${sectionNumber(id)} ${esc(s.label)}</p>
      <h2 id="${id}-title" class="section-title">${esc(s.title)}</h2>
    </header>`;
}

/* ===== Body: sections ===== */
function renderHome() {
  const H = ui.hero;
  return `<section id="home" class="section section-hero" data-accent="cyan" aria-label="Introduction">
  <div class="container hero-grid">
    <div class="hero-copy">
      <p class="status-strip reveal"><span class="status-dot" aria-hidden="true"></span><span>${esc(owner.status)}</span><span class="status-time js-only"><span aria-hidden="true">/ </span><span class="sr-only">${esc(H.localTime)}: </span><time id="local-time">${esc(owner.timeZoneLabel)}</time></span></p>
      <p class="hero-greeting mono-label reveal">${esc(H.greeting)}</p>
      <h1 class="hero-name reveal">${esc(owner.name)}</h1>
      <p class="hero-roles reveal"><span id="typed-role">${esc(owner.roles.join(' | '))}</span><span class="typed-caret" aria-hidden="true"></span></p>
      <p class="meta-line reveal">${icon('pin', 16)}<span>${esc(owner.location)}</span></p>
      <div class="hero-actions row reveal">
        <a class="btn btn-primary" href="#projects">${esc(H.ctaProjects)}</a>
        <a class="btn btn-outline" href="${esc(owner.resume)}" download>${icon('download', 16)}${esc(ui.resumeButton)}</a>
        <a class="btn btn-ghost" href="#contact">${esc(H.ctaContact)}</a>
      </div>
    </div>
    <div class="hero-visual hud reveal" aria-hidden="true"><div id="hero-3d" class="hero-canvas"></div></div>
  </div>
  <a class="scroll-hint" href="#about"><span class="mono-label">${esc(H.scrollHint)}</span>${icon('down', 16)}</a>
</section>`;
}

function renderAbout() {
  const counters = DATA.counters
    .map((c, i) => {
      const value = `${c.prefix || ''}${c.value}${c.suffix || ''}`;
      return `<li class="glass counter-card reveal" style="--i:${i}"><span class="counter-value" aria-hidden="true">${esc(c.prefix || '')}<span class="counter" data-target="${c.value}">${c.value}</span>${esc(c.suffix || '')}</span><span class="sr-only">${esc(value)}</span><span class="counter-label">${esc(c.label)}</span></li>`;
    })
    .join('\n        ');
  const cards = DATA.whatIDo
    .map(
      (w, i) =>
        `<li class="glass what-card reveal" style="--i:${i}"><span class="icon-tile">${icon(w.icon, 22)}</span><h4 class="card-title">${esc(w.title)}</h4><p class="card-text">${esc(w.text)}</p></li>`
    )
    .join('\n      ');
  return `<section id="about" class="section" data-accent="cyan" aria-labelledby="about-title">
  <div class="container">
    ${sectionHeader('about')}
    <div class="about-grid">
      <div class="glass about-bio reveal"><p>${esc(owner.bio)}</p></div>
      <ul class="counter-grid">
        ${counters}
      </ul>
    </div>
    <h3 class="sub-heading mono-label reveal">${esc(ui.about.whatIDoHeading)}</h3>
    <ul class="what-grid">
      ${cards}
    </ul>
  </div>
</section>`;
}

function renderSkills() {
  const groups = DATA.skills
    .map(
      (g) =>
        `<article class="glass skill-group reveal"><h3 class="card-title">${esc(g.group)}</h3><ul class="chip-list">${g.items
          .map((s, i) => `<li class="chip" style="--i:${i}"><span class="chip-dot" aria-hidden="true"></span>${esc(s)}</li>`)
          .join('')}</ul></article>`
    )
    .join('\n      ');
  return `<section id="skills" class="section" data-accent="purple" aria-labelledby="skills-title">
  <div class="container">
    ${sectionHeader('skills')}
    <div class="skills-grid">
      ${groups}
    </div>
  </div>
</section>`;
}

function projectCard(p) {
  const P = ui.projects;
  const preview = p.diagram ? `<div class="diagram-preview" aria-hidden="true">${Diagrams.render(p.diagram, { compact: true, idPrefix: p.slug })}</div>` : '';
  const details =
    p.features.length || p.link
      ? `<details class="card-details"><summary>${esc(P.details)}</summary><div class="card-details-body">${
          p.features.length ? `<ul class="modal-features">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''
        }${p.link ? `<p class="modal-actions">${ext(p.link, 'btn btn-ghost', `${icon('github', 16)}${esc(P.github)}`)}</p>` : ''}</div></details>`
      : '';
  return `<div id="project-${p.slug}" class="project-item reveal${p.featured ? ' is-featured' : ''}" data-category="${esc(p.category)}" data-slug="${p.slug}">
        <article class="project-card glass${p.featured ? ' hud' : ''}">
          <span class="card-light" aria-hidden="true"></span>
          <div class="card-badges row-tight row"><span class="badge">${esc(p.category)}</span>${p.featured ? `<span class="badge badge-featured">${esc(P.featured)}</span>` : ''}</div>
          <h3 class="card-title project-title">${esc(p.title)}</h3>
          <p class="card-text">${esc(p.description)}</p>
          ${preview}
          ${tagList(p.tags)}
          <button type="button" class="card-open js-only" data-project="${p.slug}" aria-haspopup="dialog">${esc(P.details)}<span class="sr-only">: ${esc(p.title)}</span>&nbsp;→</button>
          ${details}
        </article>
      </div>`;
}

function renderProjects() {
  const count = (f) => (f === 'All' ? DATA.projects.length : DATA.projects.filter((p) => p.category === f).length);
  const filters = DATA.projectFilters
    .map(
      (f) =>
        `<button type="button" class="filter-btn" data-filter="${esc(f)}" aria-pressed="${f === 'All'}">${esc(f)}<span class="filter-count">${count(f)}</span></button>`
    )
    .join('');
  return `<section id="projects" class="section" data-accent="cyan" aria-labelledby="projects-title">
  <div class="container">
    ${sectionHeader('projects')}
    <div class="filter-bar reveal" role="group" aria-label="${esc(ui.projects.filterLabel)}">${filters}</div>
    <p id="project-status" class="sr-only" role="status" aria-live="polite"></p>
    <div id="project-grid" class="project-grid" data-filter="All">
      ${DATA.projects.map(projectCard).join('\n      ')}
    </div>
  </div>
</section>`;
}

function renderExperience() {
  const items = DATA.experience
    .map(
      (x) => `<li class="timeline-item reveal${x.current ? ' is-current' : ''}">
          <span class="timeline-dot" aria-hidden="true"></span>
          <article class="glass timeline-card">
            <div class="timeline-head"><h3 class="card-title">${esc(x.role)}</h3><p class="timeline-date mono-label">${
              x.current ? `<span class="now-badge">${esc(ui.experience.now)}</span>` : ''
            }${esc(x.start)} – ${esc(x.end)}</p></div>
            <p class="timeline-company">${esc(x.company)} · ${esc(x.location)}</p>
            <ul class="timeline-points">${x.points.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
            ${tagList(x.tags)}
          </article>
        </li>`
    )
    .join('\n        ');
  return `<section id="experience" class="section" data-accent="purple" aria-labelledby="experience-title">
  <div class="container">
    ${sectionHeader('experience')}
    <div class="timeline">
      <div class="timeline-track" aria-hidden="true"><div class="timeline-progress"></div></div>
      <ol class="timeline-list">
        ${items}
      </ol>
    </div>
  </div>
</section>`;
}

function renderEducation() {
  const { degrees, certifications } = DATA.education;
  return `<section id="education" class="section" data-accent="purple" aria-labelledby="education-title">
  <div class="container">
    ${sectionHeader('education')}
    <div class="edu-grid">
      <div class="reveal">
        <h3 class="sub-heading mono-label">${esc(ui.education.degrees)}</h3>
        ${degrees
          .map(
            (d) =>
              `<article class="glass degree-card"><span class="icon-tile">${icon('cap', 22)}</span><div><h4 class="card-title">${esc(d.degree)}</h4><p class="card-text">${esc(d.institute)}</p><p class="mono-label" style="margin-top:8px">${esc(d.years)}</p></div></article>`
          )
          .join('')}
      </div>
      <div class="reveal">
        <h3 class="sub-heading mono-label">${esc(ui.education.certifications)}</h3>
        <ul class="cert-list">${certifications
          .map((c) => `<li class="cert-chip">${icon('award', 18)}<span><span class="cert-title">${esc(c.title)}</span><span class="cert-issuer">${esc(c.issuer)}</span></span></li>`)
          .join('')}</ul>
      </div>
    </div>
  </div>
</section>`;
}

function renderContact() {
  const C = ui.contact;
  const [user, domain] = owner.email.split('@');
  const field = (name, type, autocomplete, extra = '') => {
    const id = `cf-${name}`;
    const control =
      type === 'textarea'
        ? `<textarea id="${id}" name="${name}" class="field-input" rows="6" required aria-describedby="${id}-err"${extra}></textarea>`
        : `<input id="${id}" name="${name}" type="${type}" class="field-input" required autocomplete="${autocomplete}" aria-describedby="${id}-err"${extra}>`;
    return `<div class="field"><label class="field-label" for="${id}">${esc(C.fields[name])}</label>${control}<p id="${id}-err" class="field-error"></p></div>`;
  };
  return `<section id="contact" class="section" data-accent="teal" aria-labelledby="contact-title">
  <div class="container">
    ${sectionHeader('contact')}
    <div class="contact-grid">
      <div class="reveal">
        <h3 class="sub-heading mono-label">${esc(C.directHeading)}</h3>
        <div class="glass contact-card">
          <span class="icon-tile">${icon('mail', 20)}</span>
          <a class="contact-email" href="mailto:${esc(owner.email)}">${esc(user)}<wbr>@${esc(domain)}</a>
          <button type="button" id="copy-email" class="pill-btn copy-btn js-only">${icon('copy', 16)}<span class="copy-label">${esc(C.copyEmail)}</span></button>
        </div>
        <div class="contact-links row">
          ${ext(owner.github, 'btn btn-ghost', `${icon('github', 18)}${esc(C.github)}`)}
          ${ext(owner.linkedin, 'btn btn-ghost', `${icon('linkedin', 18)}${esc(C.linkedin)}`)}
        </div>
        <p class="meta-line">${icon('pin', 16)}<span>${esc(owner.location)}</span></p>
      </div>
      <div class="reveal">
        <h3 class="sub-heading mono-label">${esc(C.formHeading)}</h3>
        <form id="contact-form" class="glass contact-form" action="mailto:${esc(owner.email)}" method="post" enctype="text/plain">
          <div class="field-row">${field('name', 'text', 'name', ' autocapitalize="words"')}${field('email', 'email', 'email', ' inputmode="email" autocapitalize="off" spellcheck="false"')}</div>
          ${field('subject', 'text', 'off')}
          ${field('message', 'textarea')}
          <div class="hp-field" aria-hidden="true"><label>Leave empty<input type="text" name="_honey" tabindex="-1" autocomplete="off"></label></div>
          <div><button type="submit" id="cf-submit" class="btn btn-primary"><span class="spinner" hidden aria-hidden="true"></span><span class="btn-label">${esc(C.submit)}</span></button></div>
          <p id="form-status" class="form-status" role="status" aria-live="polite"></p>
        </form>
      </div>
    </div>
  </div>
</section>`;
}

/* ===== Body: footer, overlays, notices ===== */
function renderFooter() {
  return `<footer class="site-footer">
  <div class="container footer-inner">
    <p>© <span id="footer-year">${new Date().getFullYear()}</span> ${esc(owner.name)}</p>
    <a class="icon-btn" href="#home" aria-label="${esc(ui.backToTop)}">${icon('up', 18)}</a>
  </div>
</footer>`;
}

function renderOverlays() {
  const L = ui.palette;
  return `<div id="project-modal" class="overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title" hidden>
  <div class="overlay-backdrop" data-close></div>
  <div id="modal-panel" class="modal-panel" tabindex="-1"></div>
</div>
<div id="palette" class="overlay" role="dialog" aria-modal="true" aria-label="${esc(L.title)}" hidden>
  <div class="overlay-backdrop" data-close></div>
  <div class="palette-panel">
    <div class="palette-head">
      <input id="palette-input" class="palette-input" type="text" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" aria-label="${esc(L.placeholder)}" placeholder="${esc(L.placeholder)}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go">
      <button type="button" class="icon-btn" data-close aria-label="${esc(L.close)}">${icon('close', 18)}</button>
    </div>
    <ul id="palette-list" class="palette-list" role="listbox" aria-label="${esc(L.title)}"></ul>
    <p class="palette-hint mono-label">${esc(L.hint)}</p>
  </div>
</div>`;
}

function renderBody() {
  const parts = [
    `<div id="boot" class="boot" aria-hidden="true"><div class="boot-mark"><span>${esc(owner.initials)}</span><span class="boot-line"></span></div></div>`,
    `<a class="skip-link" href="#main">${esc(ui.skipLink)}</a>`,
    `<noscript><p class="noscript">${esc(ui.noscript)} <a href="${esc(owner.resume)}" download>${esc(ui.resumeButton)}</a>. ${esc(ui.noscriptEmail)} <a href="mailto:${esc(owner.email)}">${esc(owner.email)}</a></p></noscript>`,
    renderHeader(),
    `<main id="main" tabindex="-1">`,
    indent(renderHome()),
    indent(renderAbout()),
    indent(renderSkills()),
    indent(renderProjects()),
    indent(renderExperience()),
    indent(renderEducation()),
    indent(renderContact()),
    `</main>`,
    renderFooter(),
    renderOverlays(),
  ];
  return indent(parts.join('\n'));
}

/* ===== Other files ===== */
function renderManifest() {
  return (
    JSON.stringify(
      {
        name: site.appName,
        short_name: site.appShortName,
        description: site.description,
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: site.themeColor,
        theme_color: site.themeColor,
        icons: [
          { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: './icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      null,
      2
    ) + '\n'
  );
}

const renderRobots = () => `User-agent: *\nAllow: /\n\nSitemap: ${site.url}sitemap.xml\n`;

const renderSitemap = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${esc(site.url)}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`;

/** 404 page: self-contained styles; the home link works at any depth on GitHub Pages and custom domains. */
function render404() {
  const N = ui.notFound;
  const homePath = new URL(site.url).pathname;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(N.title)} | ${esc(owner.name)}</title>
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="${esc(site.themeColor)}">
  <style>
    html, body { margin: 0; min-height: 100%; background: #050816; color: #e6edf7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; }
    main { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; }
    .code { font-family: ui-monospace, Menlo, Consolas, monospace; color: #00d4ff; letter-spacing: 0.08em; }
    h1 { margin: 12px 0 8px; font-size: 32px; }
    p { margin: 0; color: #8a96ad; }
    a { display: inline-flex; align-items: center; min-height: 44px; margin-top: 24px; padding: 0 20px; border-radius: 999px; background: #00d4ff; color: #050816; font-weight: 600; text-decoration: none; }
    a:focus { outline: 2px solid #e6edf7; outline-offset: 3px; }
  </style>
</head>
<body>
  <main>
    <p class="code">// 404</p>
    <h1>${esc(N.title)}</h1>
    <p>${esc(N.text)}</p>
    <a href="${esc(homePath)}">${esc(N.home)}</a>
  </main>
</body>
</html>
`;
}

/* ===== Entry points ===== */
export function renderAll(indexHtml) {
  let html = inject(indexHtml, 'head', renderHead());
  html = inject(html, 'body', renderBody());
  return {
    'index.html': html,
    'manifest.webmanifest': renderManifest(),
    'robots.txt': renderRobots(),
    'sitemap.xml': renderSitemap(),
    '404.html': render404(),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outputs = renderAll(readFileSync(join(ROOT, 'index.html'), 'utf8'));
  for (const [rel, content] of Object.entries(outputs)) {
    writeFileSync(join(ROOT, rel), content);
    console.log(`wrote ${rel} (${Buffer.byteLength(content)} bytes)`);
  }
}
