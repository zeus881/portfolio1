/*
 * main.js
 * Renders content from data.js into index.html and wires up UI behaviour.
 *
 * Blocks:
 *  1. Helpers and icons
 *  2. Boot screen, navigation and header
 *  3. Section rendering (headers, home, about, skills, projects, experience, education, contact, footer)
 *  4. Motion and interactions (3D toggle, local time, typed line, reveals, counters, scroll UI, cursor, card tilt)
 *  5. Projects: filters, modal, deep links
 *  6. Contact: copy email, toast, form; section navigation
 *  7. Boot (also exposes window.Portfolio for palette.js)
 */
'use strict';

(() => {
  const DATA = window.PORTFOLIO_DATA;
  if (!DATA) return;
  const { owner, ui } = DATA;

  /* =====================================================================
   * 1. Helpers and icons
   * ===================================================================== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /** Create an element with attributes and children. Text is always set via textContent. */
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of [].concat(children)) {
      if (child != null && child !== false && child !== '') node.append(child);
    }
    return node;
  }

  /** Static decorative SVG icon paths (markup only, no content). */
  const ICONS = {
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    cap: '<path d="M2 9 12 4l10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    web: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M10 9l-2 2 2 2M14 9l2 2-2 2"/>',
    api: '<path d="M8 6l-5 6 5 6M16 6l5 6-5 6M13.5 4l-3 16"/>',
    drone:
      '<circle cx="5" cy="5" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3"/><rect x="10" y="10" width="4" height="4" rx="1"/>',
  };
  function icon(name, size = 20) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const attrs = {
      viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false',
    };
    for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
    svg.innerHTML = ICONS[name];
    return svg;
  }

  /** Two-digit section number from its position in ui.sections ("03"). */
  const sectionNumber = (id) => String(ui.sections.findIndex((s) => s.id === id)).padStart(2, '0');

  /** Fill "{key}" placeholders in a UI string. */
  const fmt = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));

  /** Link that opens in a new tab, with a screen-reader hint. */
  function externalLink(attrs, children) {
    return el('a', { ...attrs, target: '_blank', rel: 'noopener noreferrer' }, [
      ...[].concat(children),
      el('span', { class: 'sr-only', text: ` ${ui.newTab}` }),
    ]);
  }

  const devicon = (cls) => el('i', { class: cls, 'aria-hidden': 'true' });

  const tagList = (tags) =>
    el('ul', { class: 'tag-list', 'aria-label': ui.projects.stack }, tags.map((t) => el('li', { class: 'tag', text: t })));

  /** The content container created under each section header. */
  const slot = (id) => $(`#${id} [data-slot="content"]`);

  /** Current time in the owner's time zone, e.g. "14:05 IST". */
  const localTime = () =>
    `${new Intl.DateTimeFormat('en-GB', { timeZone: owner.timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())} ${owner.timeZoneLabel}`;

  /* =====================================================================
   * 2. Boot screen, navigation and header
   * ===================================================================== */

  /** Boot screen: CSS fades it out by 600 ms; remove the node once it is gone. */
  function initBootScreen() {
    const boot = $('#boot');
    $('#boot-initials').textContent = owner.initials;
    const remove = () => boot.remove();
    boot.addEventListener('animationend', (e) => {
      if (e.animationName === 'boot-out') remove();
    });
    setTimeout(remove, 700); // safety net (reduced motion hides it via CSS)
  }

  function renderNav() {
    $('#skip-link').textContent = ui.skipLink;

    const brand = $('#nav-brand');
    brand.textContent = owner.initials;
    brand.setAttribute('aria-label', `${owner.name}, back to top`);

    const resume = $('#nav-resume');
    resume.textContent = ui.resumeButton;
    resume.href = owner.resume;

    $('#palette-open').setAttribute('aria-label', ui.paletteHint);
    const toggle3d = $('#toggle-3d');
    toggle3d.textContent = ui.toggle3dOn;
    toggle3d.setAttribute('aria-label', ui.toggle3dLabel);

    $('#nav-toggle').setAttribute('aria-label', ui.menuOpen);

    const desktop = $('#nav-links');
    const mobile = $('#mobile-links');
    for (const s of ui.sections) {
      desktop.append(el('li', {}, el('a', { class: 'nav-link', href: `#${s.id}`, text: s.nav })));
      mobile.append(el('li', {}, el('a', { class: 'nav-link', href: `#${s.id}`, text: s.nav })));
    }
    mobile.append(
      el('li', { class: 'pt-2' }, el('a', { class: 'btn btn-outline w-full', href: owner.resume, download: true, text: ui.resumeButton }))
    );
  }

  /** Header height → CSS variable, so anchor jumps land clear of the fixed header. */
  function syncHeaderHeight() {
    const bar = $('#site-header .nav-bar');
    const update = () => {
      document.documentElement.style.setProperty('--header-h', `${Math.ceil(bar.getBoundingClientRect().height + 1)}px`);
    };
    update();
    new ResizeObserver(update).observe(bar);
  }

  /** Mobile sheet: toggle button, close on link choice, Esc and when growing to desktop. */
  function initMobileSheet() {
    const toggle = $('#nav-toggle');
    const sheet = $('#mobile-sheet');

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? ui.menuClose : ui.menuOpen);
      sheet.hidden = !open;
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    sheet.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !sheet.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false);
    });
  }

  /* =====================================================================
   * 3. Section rendering
   * ===================================================================== */

  /** Every section except Home gets "// 03 PROJECTS" + h2, and a content slot below. */
  function renderSectionHeaders() {
    for (const s of ui.sections) {
      if (!s.title) continue;
      const section = document.getElementById(s.id);
      const header = el('header', { class: 'section-header reveal' }, [
        el('p', { class: 'mono-label', 'aria-hidden': 'true', text: `// ${sectionNumber(s.id)} ${s.label}` }),
        el('h2', { id: `${s.id}-title`, class: 'section-title', text: s.title }),
      ]);
      section.append(el('div', { class: 'container-x', 'data-slot': 'content' }, header));
    }
  }

  /* ----- Home ----- */
  function renderHero() {
    const H = ui.hero;
    const roleText = owner.roles.join(' | ');
    $('#home').append(
      el('div', { class: 'container-x hero-grid' }, [
        el('div', { class: 'hero-copy' }, [
          el('p', { class: 'status-strip reveal' }, [
            el('span', { class: 'status-dot', 'aria-hidden': 'true' }),
            el('span', { text: owner.status }),
            el('span', { class: 'status-sep', 'aria-hidden': 'true', text: '/' }),
            el('span', { class: 'sr-only', text: `${H.localTime}: ` }),
            el('time', { id: 'local-time', class: 'status-time', text: localTime() }),
          ]),
          el('p', { class: 'hero-greeting mono-label reveal', text: H.greeting }),
          el('h1', { class: 'hero-name reveal', text: owner.name }),
          el('p', { class: 'hero-roles reveal' }, [
            el('span', { class: 'sr-only', text: roleText }),
            el('span', { id: 'typed-role', 'aria-hidden': 'true', text: owner.roles[0] }),
            el('span', { class: 'typed-caret', 'aria-hidden': 'true' }),
          ]),
          el('p', { class: 'hero-location reveal' }, [icon('pin', 16), owner.location]),
          el('div', { class: 'hero-actions reveal' }, [
            el('a', { class: 'btn btn-primary', href: '#projects', text: H.ctaProjects }),
            el('a', { class: 'btn btn-outline', href: owner.resume, download: true }, [icon('download', 16), ui.resumeButton]),
            el('a', { class: 'btn btn-ghost', href: '#contact', text: H.ctaContact }),
          ]),
        ]),
        el('div', { id: 'hero-3d', class: 'hero-visual hud reveal', 'aria-hidden': 'true' }),
      ]),
      el('a', { class: 'scroll-hint', href: '#about' }, [el('span', { class: 'mono-label', text: H.scrollHint }), icon('down', 16)])
    );
  }

  /* ----- About: bio, counters, what I do ----- */
  function renderAbout() {
    const counter = (c, i) => {
      const prefix = c.prefix || '';
      const suffix = c.suffix || '';
      return el('li', { class: 'glass counter-card reveal', style: `--i:${i}` }, [
        el('span', { class: 'counter-value', 'aria-hidden': 'true' }, [
          prefix,
          el('span', { class: 'counter', 'data-target': String(c.value), text: String(c.value) }),
          suffix,
        ]),
        el('span', { class: 'sr-only', text: `${prefix}${c.value}${suffix}` }),
        el('span', { class: 'counter-label', text: c.label }),
      ]);
    };
    const card = (w, i) =>
      el('li', { class: 'glass glass-hover what-card reveal', style: `--i:${i}` }, [
        el('span', { class: 'what-icon' }, icon(w.icon, 22)),
        el('h4', { class: 'card-title', text: w.title }),
        el('p', { class: 'card-text', text: w.text }),
      ]);

    slot('about').append(
      el('div', { class: 'about-grid' }, [
        el('div', { class: 'glass about-bio reveal' }, el('p', { text: owner.bio })),
        el('ul', { class: 'counter-grid' }, DATA.counters.map(counter)),
      ]),
      el('h3', { class: 'sub-heading mono-label reveal', text: ui.about.whatIDoHeading }),
      el('ul', { class: 'what-grid' }, DATA.whatIDo.map(card))
    );
  }

  /* ----- Skills: grouped chips ----- */
  function renderSkills() {
    const group = (g) =>
      el('article', { class: 'glass skill-group reveal' }, [
        el('h3', { class: 'card-title', text: g.group }),
        el(
          'ul',
          { class: 'chip-list' },
          g.items.map((s, i) => el('li', { class: 'chip', style: `--i:${i}` }, [s.icon ? devicon(s.icon) : null, s.name]))
        ),
      ]);
    slot('skills').append(el('div', { class: 'skills-grid' }, DATA.skills.map(group)));
  }

  /* ----- Projects: filters + cards ----- */
  function projectCard(p) {
    const P = ui.projects;
    const preview =
      p.diagram && window.Diagrams
        ? el('div', { class: 'diagram-preview', 'aria-hidden': 'true' }, window.Diagrams.render(p.diagram, { compact: true }))
        : null;
    return el('div', { id: `project-${p.slug}`, class: `project-item reveal${p.featured ? ' is-featured' : ''}`, 'data-category': p.category, 'data-slug': p.slug }, [
      el('article', { class: `project-card glass${p.featured ? ' hud' : ''}` }, [
        el('span', { class: 'card-light', 'aria-hidden': 'true' }),
        el('div', { class: 'card-badges' }, [
          el('span', { class: 'badge', text: p.category }),
          p.featured ? el('span', { class: 'badge badge-featured', text: P.featured }) : null,
        ]),
        el('h3', { class: 'card-title project-title' },
          el('button', { type: 'button', class: 'card-open', 'data-project': p.slug, 'aria-haspopup': 'dialog', text: p.title })
        ),
        el('p', { class: 'card-text', text: p.description }),
        preview,
        tagList(p.tags),
        el('span', { class: 'card-more', 'aria-hidden': 'true', text: `${P.details} →` }),
      ]),
    ]);
  }

  function renderProjects() {
    const count = (f) => (f === 'All' ? DATA.projects.length : DATA.projects.filter((p) => p.category === f).length);
    slot('projects').append(
      el(
        'div',
        { class: 'filter-bar reveal', role: 'group', 'aria-label': ui.projects.filterLabel },
        DATA.projectFilters.map((f) =>
          el('button', { type: 'button', class: 'filter-btn', 'data-filter': f, 'aria-pressed': String(f === 'All') }, [
            f,
            el('span', { class: 'filter-count', text: String(count(f)) }),
          ])
        )
      ),
      el('p', { id: 'project-status', class: 'sr-only', role: 'status', 'aria-live': 'polite' }),
      el('div', { id: 'project-grid', class: 'project-grid', 'data-filter': 'All' }, DATA.projects.map(projectCard))
    );
  }

  /* ----- Experience: timeline ----- */
  function renderExperience() {
    const item = (x) =>
      el('li', { class: `timeline-item reveal${x.current ? ' is-current' : ''}` }, [
        el('span', { class: 'timeline-dot', 'aria-hidden': 'true' }),
        el('article', { class: 'glass glass-hover timeline-card' }, [
          el('div', { class: 'timeline-head' }, [
            el('h3', { class: 'card-title', text: x.role }),
            el('p', { class: 'timeline-date mono-label' }, [
              x.current ? el('span', { class: 'now-badge', text: ui.experience.now }) : null,
              `${x.start} – ${x.end}`,
            ]),
          ]),
          el('p', { class: 'timeline-company', text: `${x.company} · ${x.location}` }),
          el('ul', { class: 'timeline-points' }, x.points.map((t) => el('li', { text: t }))),
          tagList(x.tags),
        ]),
      ]);
    slot('experience').append(
      el('div', { class: 'timeline' }, [
        el('div', { class: 'timeline-track', 'aria-hidden': 'true' }, el('div', { class: 'timeline-progress' })),
        el('ol', { class: 'timeline-list' }, DATA.experience.map(item)),
      ])
    );
  }

  /* ----- Education: one degree card + certificate chips ----- */
  function renderEducation() {
    const { degrees, certifications } = DATA.education;
    slot('education').append(
      el('div', { class: 'edu-grid' }, [
        el('div', { class: 'reveal' }, [
          el('h3', { class: 'sub-heading mono-label', text: ui.education.degrees }),
          ...degrees.map((d) =>
            el('article', { class: 'glass glass-hover degree-card' }, [
              el('span', { class: 'what-icon' }, icon('cap', 22)),
              el('div', {}, [
                el('h4', { class: 'card-title', text: d.degree }),
                el('p', { class: 'card-text', text: d.institute }),
                el('p', { class: 'mono-label mt-2', text: d.years }),
              ]),
            ])
          ),
        ]),
        el('div', { class: 'reveal' }, [
          el('h3', { class: 'sub-heading mono-label', text: ui.education.certifications }),
          el(
            'ul',
            { class: 'cert-list' },
            certifications.map((c) =>
              el('li', { class: 'cert-chip' }, [
                icon('award', 18),
                el('span', {}, [el('span', { class: 'cert-title', text: c.title }), el('span', { class: 'cert-issuer', text: c.issuer })]),
              ])
            )
          ),
        ]),
      ])
    );
  }

  /* ----- Contact: direct links + form ----- */
  function renderContact() {
    const C = ui.contact;
    const field = (name, type) => {
      const id = `cf-${name}`;
      const common = { id, name, class: 'field-input', required: true, 'aria-describedby': `${id}-err` };
      const input =
        type === 'textarea'
          ? el('textarea', { ...common, rows: '6' })
          : el('input', { ...common, type, autocomplete: name === 'name' ? 'name' : name === 'email' ? 'email' : 'off' });
      return el('div', { class: 'field' }, [
        el('label', { class: 'field-label', for: id, text: C.fields[name] }),
        input,
        el('p', { id: `${id}-err`, class: 'field-error' }),
      ]);
    };

    slot('contact').append(
      el('div', { class: 'contact-grid' }, [
        el('div', { class: 'reveal' }, [
          el('h3', { class: 'sub-heading mono-label', text: C.directHeading }),
          el('div', { class: 'glass contact-card' }, [
            el('span', { class: 'what-icon' }, icon('mail', 20)),
            // <wbr> lets narrow screens break the address at "@" instead of mid-word
            el('a', { class: 'contact-email', href: `mailto:${owner.email}` }, [
              owner.email.split('@')[0],
              el('wbr'),
              `@${owner.email.split('@')[1]}`,
            ]),
            el('button', { type: 'button', id: 'copy-email', class: 'pill-btn copy-btn' }, [
              icon('copy', 16),
              el('span', { class: 'copy-label', text: C.copyEmail }),
            ]),
          ]),
          el('div', { class: 'contact-links' }, [
            externalLink({ class: 'btn btn-ghost', href: owner.github }, [devicon('devicon-github-original'), C.github]),
            externalLink({ class: 'btn btn-ghost', href: owner.linkedin }, [devicon('devicon-linkedin-plain'), C.linkedin]),
          ]),
          el('p', { class: 'hero-location' }, [icon('pin', 16), owner.location]),
        ]),
        el('div', { class: 'reveal' }, [
          el('h3', { class: 'sub-heading mono-label', text: C.formHeading }),
          el('form', { id: 'contact-form', class: 'glass contact-form', novalidate: true }, [
            el('div', { class: 'field-row' }, [field('name', 'text'), field('email', 'email')]),
            field('subject', 'text'),
            field('message', 'textarea'),
            // Honeypot: real visitors never see or fill this field
            el('div', { class: 'hp-field', 'aria-hidden': 'true' }, el('input', { type: 'text', name: '_honey', tabindex: '-1', autocomplete: 'off' })),
            el('div', { class: 'form-actions' }, [
              el('button', { type: 'submit', id: 'cf-submit', class: 'btn btn-primary' }, [
                el('span', { class: 'spinner', hidden: true, 'aria-hidden': 'true' }),
                el('span', { class: 'btn-label', text: C.submit }),
              ]),
            ]),
            el('p', { id: 'form-status', class: 'form-status', role: 'status', 'aria-live': 'polite' }),
          ]),
        ]),
      ])
    );
  }

  function renderFooter() {
    const year = new Date().getFullYear();
    const toTop = el('a', { href: '#home', class: 'icon-btn', 'aria-label': ui.backToTop }, icon('up', 18));
    $('#footer-inner').append(
      el('p', { text: `© ${year} ${owner.name}` }),
      el('p', { class: 'mono-label', text: ui.footerBuilt }),
      toTop
    );
  }

  /* =====================================================================
   * 4. Motion and interactions
   * ===================================================================== */
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionAllowed = () => !reduceMotion.matches;

  /* ----- 3D on/off: remembered in localStorage; bg-3d.js and hero-3d.js listen for fx3d:change ----- */
  const FX_KEY = 'sk-portfolio-3d';
  function readFxPreference() {
    try {
      return localStorage.getItem(FX_KEY) !== 'off';
    } catch {
      return true;
    }
  }
  function setFx(enabled, save = true) {
    root.dataset.fx = enabled ? 'on' : 'off';
    const button = $('#toggle-3d');
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? ui.toggle3dOn : ui.toggle3dOff;
    if (save) {
      try {
        localStorage.setItem(FX_KEY, enabled ? 'on' : 'off');
      } catch {
        /* storage unavailable (private mode): the choice lasts for this visit */
      }
    }
    window.dispatchEvent(new CustomEvent('fx3d:change', { detail: { enabled } }));
  }
  const toggleFx = () => setFx(root.dataset.fx === 'off');
  function initFxToggle() {
    setFx(readFxPreference(), false); // runs before the 3D scripts read data-fx
    $('#toggle-3d').addEventListener('click', toggleFx);
  }

  /* ----- Live local time in the status strip ----- */
  function initLocalTime() {
    const node = $('#local-time');
    const tick = () => {
      node.textContent = localTime();
      setTimeout(tick, 60000 - (Date.now() % 60000) + 50); // next minute boundary
    };
    tick();
  }

  /* ----- Typed role line; pauses off-screen and in hidden tabs ----- */
  function initTypedRoles() {
    const node = $('#typed-role');
    const roles = owner.roles;
    if (!motionAllowed()) {
      node.textContent = roles.join(' | ');
      return;
    }
    let roleIndex = 0;
    let charIndex = roles[0].length;
    let deleting = true;
    let timer = 0;
    let running = false;
    let onScreen = true;

    const step = () => {
      let delay;
      if (deleting) {
        charIndex--;
        delay = 35;
        if (charIndex === 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
          delay = 350;
        }
      } else {
        charIndex++;
        delay = 70;
        if (charIndex === roles[roleIndex].length) {
          deleting = true;
          delay = 1800;
        }
      }
      node.textContent = roles[roleIndex].slice(0, charIndex);
      timer = setTimeout(step, delay);
    };
    const update = () => {
      const shouldRun = onScreen && !document.hidden;
      if (shouldRun && !running) {
        running = true;
        timer = setTimeout(step, 1800);
      } else if (!shouldRun && running) {
        running = false;
        clearTimeout(timer);
      }
    };
    new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      update();
    }).observe(node);
    document.addEventListener('visibilitychange', update);
  }

  /* ----- Section reveals ----- */
  function initReveals() {
    const items = $$('.reveal');
    if (!motionAllowed()) {
      items.forEach((n) => n.classList.add('is-visible'));
      return;
    }
    root.classList.add('motion');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
    );
    items.forEach((n) => io.observe(n));
  }

  /* ----- Counters count up once ----- */
  function initCounters() {
    if (!motionAllowed()) return; // final values are already rendered
    const counters = $$('.counter');
    counters.forEach((n) => (n.textContent = '0'));
    const animate = (node) => {
      const target = Number(node.dataset.target);
      const start = performance.now();
      const frame = (now) => {
        const p = Math.min(1, (now - start) / 1400);
        node.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          animate(entry.target);
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.6 }
    );
    counters.forEach((n) => io.observe(n));
  }

  /* ----- Scroll-driven UI: progress bar, active nav link, timeline line ----- */
  function initScrollUI() {
    const bar = $('#scroll-progress');
    const ids = ui.sections.map((s) => s.id);
    const sections = ids.map((id) => document.getElementById(id));
    const links = $$('.nav-link');
    const timeline = $('.timeline');
    const timelineLine = $('.timeline-progress');
    let activeId = '';
    let ticking = false;

    const update = () => {
      ticking = false;
      const max = root.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;

      // Timeline draws itself up to the middle of the viewport
      if (motionAllowed()) {
        const r = timeline.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - r.top) / r.height));
        timelineLine.style.transform = `scaleY(${p})`;
      }

      // Active section: last one whose top has passed 35% of the viewport; the last one wins at the bottom
      let current = ids[0];
      sections.forEach((s, i) => {
        if (s.getBoundingClientRect().top <= window.innerHeight * 0.35) current = ids[i];
      });
      if (y >= max - 2) current = ids[ids.length - 1];
      if (current !== activeId) {
        activeId = current;
        for (const link of links) {
          const on = link.getAttribute('href') === `#${current}`;
          link.classList.toggle('is-active', on);
          if (on) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        }
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ----- Custom cursor: dot + trailing ring, fine pointers only ----- */
  function initCursor() {
    if (!finePointer.matches || !motionAllowed()) return;
    const dot = el('div', { class: 'cursor-dot', 'aria-hidden': 'true' });
    const ring = el('div', { class: 'cursor-ring', 'aria-hidden': 'true' });
    document.body.append(dot, ring);
    root.classList.add('has-cursor');

    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;
    let frame = 0;
    let shown = false;
    const follow = () => {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(var(--ring-scale))`;
      frame = Math.abs(mx - rx) + Math.abs(my - ry) > 0.2 ? requestAnimationFrame(follow) : 0; // stop when caught up
    };
    window.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        mx = e.clientX;
        my = e.clientY;
        dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
        if (!shown) {
          shown = true;
          rx = mx;
          ry = my;
          root.classList.add('cursor-visible');
        }
        if (!frame) frame = requestAnimationFrame(follow);
      },
      { passive: true }
    );
    const interactive = 'a, button, input, textarea, label, .project-card, .hero-visual';
    document.addEventListener('pointerover', (e) => ring.classList.toggle('is-hover', !!e.target.closest(interactive)));
    document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    document.addEventListener('pointerup', () => ring.classList.remove('is-down'));
    root.addEventListener('mouseleave', () => root.classList.remove('cursor-visible'));
    root.addEventListener('mouseenter', () => shown && root.classList.add('cursor-visible'));
  }

  /* ----- Project cards tilt toward the cursor with a moving light ----- */
  function initCardTilt() {
    if (!finePointer.matches || !motionAllowed()) return;
    const MAX = 6; // degrees
    for (const card of $$('.project-card')) {
      let frame = 0;
      card.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          card.style.transform = `perspective(1000px) rotateX(${(-y * MAX).toFixed(2)}deg) rotateY(${(x * MAX).toFixed(2)}deg)`;
          card.style.setProperty('--light-x', `${((x + 0.5) * 100).toFixed(1)}%`);
          card.style.setProperty('--light-y', `${((y + 0.5) * 100).toFixed(1)}%`);
          card.classList.add('is-tilting');
        });
      });
      card.addEventListener('pointerleave', () => {
        cancelAnimationFrame(frame);
        card.style.transform = '';
        card.classList.remove('is-tilting');
      });
    }
  }

  /* =====================================================================
   * 5. Projects: filters, modal, deep links
   * ===================================================================== */

  /* ----- Filters with a FLIP layout transition (transform and opacity only) ----- */
  function initProjectFilters() {
    const grid = $('#project-grid');
    const items = $$('.project-item', grid);
    const buttons = $$('.filter-btn');
    const status = $('#project-status');
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

    const apply = (filter) => {
      const before = new Map(items.filter((i) => !i.hidden).map((i) => [i, i.getBoundingClientRect()]));
      grid.dataset.filter = filter;
      let shown = 0;
      for (const item of items) {
        const match = filter === 'All' || item.dataset.category === filter;
        item.hidden = !match;
        if (match) {
          shown++;
          item.classList.add('is-visible'); // filtered-in cards skip the scroll reveal
        }
      }
      for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.filter === filter));
      status.textContent = fmt(ui.projects.status, { n: shown, total: items.length });

      if (!motionAllowed()) return;
      for (const item of items) {
        if (item.hidden) continue;
        const after = item.getBoundingClientRect();
        const first = before.get(item);
        if (first) {
          const dx = first.left - after.left;
          const dy = first.top - after.top;
          if (dx || dy) item.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 500, easing: ease });
        } else {
          item.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: ease });
        }
      }
    };

    for (const b of buttons) b.addEventListener('click', () => apply(b.dataset.filter));
  }

  /* ----- Project modal: native <dialog>; Esc, close button, outside click; focus trap; #project-<slug> ----- */
  const projectModal = { open: () => {} };

  function initProjectModal() {
    const dialog = $('#project-modal');
    const panel = $('#modal-panel');
    const P = ui.projects;
    const HASH_PREFIX = '#project-';
    let trigger = null;
    let previousHash = '';

    const fill = (p) => {
      const closeBtn = el('button', { type: 'button', class: 'icon-btn modal-close', 'aria-label': P.close }, icon('close', 20));
      closeBtn.addEventListener('click', () => dialog.close());
      const diagram =
        p.diagram && window.Diagrams
          ? el('div', { class: 'modal-section' }, [
              el('h3', { class: 'mono-label', text: P.architecture }),
              el('div', { class: 'diagram-full' }, window.Diagrams.render(p.diagram, { title: fmt(P.diagramLabel, { title: p.title }) })),
            ])
          : null;
      panel.replaceChildren(
        closeBtn,
        el('div', { class: 'card-badges' }, [
          el('span', { class: 'badge', text: p.category }),
          p.featured ? el('span', { class: 'badge badge-featured', text: P.featured }) : null,
        ]),
        el('h2', { id: 'modal-title', class: 'modal-title', text: p.title }),
        el('p', { class: 'modal-text', text: p.description }),
        p.features.length
          ? el('div', { class: 'modal-section' }, [
              el('h3', { class: 'mono-label', text: P.features }),
              el('ul', { class: 'modal-features' }, p.features.map((f) => el('li', { text: f }))),
            ])
          : null,
        diagram,
        el('div', { class: 'modal-section' }, [el('h3', { class: 'mono-label', text: P.stack }), tagList(p.tags)]),
        p.link
          ? el('div', { class: 'modal-actions' },
              externalLink({ class: 'btn btn-primary', href: p.link }, [devicon('devicon-github-original'), P.github])
            )
          : null
      );
      return closeBtn;
    };

    const open = (slug, from) => {
      const project = DATA.projects.find((p) => p.slug === slug);
      if (!project) return;
      if (dialog.open) dialog.close();
      trigger = from || $(`.card-open[data-project="${slug}"]`);
      if (!location.hash.startsWith(HASH_PREFIX)) previousHash = location.hash;
      history.replaceState(null, '', `${HASH_PREFIX}${slug}`);
      const closeBtn = fill(project);
      dialog.showModal();
      root.classList.add('modal-open');
      closeBtn.focus();
    };
    projectModal.open = open;

    dialog.addEventListener('close', () => {
      root.classList.remove('modal-open');
      history.replaceState(null, '', previousHash || location.pathname + location.search);
      if (trigger) trigger.focus();
      trigger = null;
    });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close(); // click on the backdrop area
    });
    dialog.addEventListener('keydown', (e) => trapFocus(e, panel));

    // Any click on a card opens it; the title button is the keyboard control
    $('#project-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.project-card');
      if (!card) return;
      const button = $('.card-open', card);
      open(button.dataset.project, button);
    });

    // Deep links: on load and whenever the hash changes
    const fromHash = () => {
      if (location.hash.startsWith(HASH_PREFIX)) open(decodeURIComponent(location.hash.slice(HASH_PREFIX.length)));
    };
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  /** Keep Tab and Shift+Tab inside `container`. */
  function trapFocus(e, container) {
    if (e.key !== 'Tab') return;
    const focusables = $$('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]', container).filter((n) => n.offsetParent);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* =====================================================================
   * 6. Contact: copy email, toast, form; public API for palette.js
   * ===================================================================== */

  /* ----- Toast: short confirmation, announced politely ----- */
  let toastTimer = 0;
  function toast(text) {
    let node = $('#toast');
    if (!node) {
      node = el('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
      document.body.append(node);
    }
    node.textContent = text;
    node.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('is-visible'), 2200);
  }

  /** Copy text to the clipboard; falls back to a hidden textarea where the API is unavailable. */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = el('textarea', { class: 'sr-only', readonly: true, 'aria-hidden': 'true' });
      area.value = text;
      document.body.append(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      area.remove();
      return ok;
    }
  }

  async function copyEmail() {
    const ok = await copyText(owner.email);
    const button = $('#copy-email');
    const label = $('.copy-label', button);
    button.classList.toggle('is-copied', ok);
    label.textContent = ok ? ui.contact.copied : ui.contact.copyEmail;
    toast(ok ? `${ui.contact.copied}: ${owner.email}` : ui.contact.copyFailed);
    setTimeout(() => {
      button.classList.remove('is-copied');
      label.textContent = ui.contact.copyEmail;
    }, 2000);
    return ok;
  }

  function initCopyEmail() {
    $('#copy-email').addEventListener('click', copyEmail);
  }

  /** Trigger a file download through a temporary link (works from file:// too). */
  function downloadResume() {
    const a = el('a', { href: owner.resume, download: true, class: 'hidden' });
    document.body.append(a);
    a.click();
    a.remove();
  }

  /* ----- Contact form: validation, honeypot, FormSubmit AJAX, mailto fallback ----- */
  function initContactForm() {
    const form = $('#contact-form');
    const submit = $('#cf-submit');
    const spinner = $('.spinner', submit);
    const label = $('.btn-label', submit);
    const status = $('#form-status');
    const C = ui.contact;
    const ENDPOINT = `https://formsubmit.co/ajax/${owner.email}`;
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const names = ['name', 'email', 'subject', 'message'];
    let attempted = false;

    const input = (name) => form.elements[name];
    const errorFor = (name) => {
      const value = input(name).value.trim();
      if (!value) return fmt(C.errors.required, { field: C.fields[name] });
      if (name === 'email' && !EMAIL_RE.test(value)) return C.errors.email;
      return '';
    };
    const showError = (name, message) => {
      $(`#cf-${name}-err`).textContent = message;
      if (message) input(name).setAttribute('aria-invalid', 'true');
      else input(name).removeAttribute('aria-invalid');
    };
    const validate = () => {
      let firstInvalid = null;
      for (const name of names) {
        const message = errorFor(name);
        showError(name, message);
        if (message && !firstInvalid) firstInvalid = input(name);
      }
      return firstInvalid;
    };
    const setStatus = (kind, text, link) => {
      status.className = `form-status${kind ? ` is-${kind}` : ''}`;
      status.replaceChildren(text);
      if (link) status.append(' ', link);
    };
    const setSending = (sending) => {
      submit.disabled = sending;
      spinner.hidden = !sending;
      label.textContent = sending ? C.sending : C.submit;
    };
    const mailtoUrl = (d) =>
      `mailto:${owner.email}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(`${d.message}\n\n${d.name} <${d.email}>`)}`;
    const openMailto = (url) => {
      const a = el('a', { href: url, class: 'hidden' });
      document.body.append(a);
      a.click();
      a.remove();
    };

    form.addEventListener('input', (e) => {
      if (attempted && names.includes(e.target.name)) showError(e.target.name, errorFor(e.target.name));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      attempted = true;
      setStatus('', '');
      const firstInvalid = validate();
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      if (form.elements._honey.value) return; // a bot filled the honeypot: ignore silently

      const data = Object.fromEntries(names.map((n) => [n, input(n).value.trim()]));
      setSending(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            _replyto: data.email,
            _subject: data.subject,
            message: data.message,
            _template: 'table',
            _captcha: 'false',
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || `HTTP ${res.status}`);
        setStatus('success', C.success);
        form.reset();
        attempted = false;
      } catch {
        const url = mailtoUrl(data);
        setStatus('error', C.failure, el('a', { href: url, text: C.failureLink }));
        openMailto(url);
      } finally {
        setSending(false);
      }
    });
  }

  /** Scroll to a section and move keyboard focus to its heading. */
  function goToSection(id) {
    const section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({ behavior: motionAllowed() ? 'smooth' : 'auto' });
    const heading = $('h1, h2', section);
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  /* =====================================================================
   * 7. Boot
   * ===================================================================== */
  initBootScreen();
  renderNav();
  syncHeaderHeight();
  initMobileSheet();
  renderSectionHeaders();
  renderHero();
  renderAbout();
  renderSkills();
  renderProjects();
  renderExperience();
  renderEducation();
  renderContact();
  renderFooter();

  initFxToggle();
  initLocalTime();
  initReveals();
  initTypedRoles();
  initCounters();
  initScrollUI();
  initCursor();
  initCardTilt();
  initProjectFilters();
  initProjectModal();
  initCopyEmail();
  initContactForm();

  // Public API used by palette.js
  window.Portfolio = {
    goToSection,
    openProject: (slug) => projectModal.open(slug),
    downloadResume,
    copyEmail,
    toggleFx,
    openGitHub: () => window.open(owner.github, '_blank', 'noopener'),
    trapFocus,
  };
})();
