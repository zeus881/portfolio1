/*
 * main.js
 * Renders content from data.js into index.html and wires up UI behaviour.
 *
 * Blocks:
 *  1. Helpers and icons
 *  2. Boot screen, navigation and header
 *  3. Section rendering (headers, home, about, skills, projects, experience, education, contact, footer)
 *  4. Boot
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
    return el('div', { class: `project-item reveal${p.featured ? ' is-featured' : ''}`, 'data-category': p.category, 'data-slug': p.slug }, [
      el('article', { class: `project-card glass${p.featured ? ' hud' : ''}` }, [
        el('div', { class: 'card-badges' }, [
          el('span', { class: 'badge', text: p.category }),
          p.featured ? el('span', { class: 'badge badge-featured', text: P.featured }) : null,
        ]),
        el('h3', { class: 'card-title project-title' },
          el('button', { type: 'button', class: 'card-open', 'data-project': p.slug, 'aria-haspopup': 'dialog', text: p.title })
        ),
        el('p', { class: 'card-text', text: p.description }),
        p.diagram ? el('div', { class: 'diagram-preview', 'data-diagram': p.slug, 'aria-hidden': 'true' }) : null,
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
   * 4. Boot
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
})();
