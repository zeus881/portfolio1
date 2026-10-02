/*
 * main.js
 * Renders content from data.js into index.html and wires up UI behaviour.
 *
 * Blocks:
 *  1. Helpers and icons
 *  2. Navigation and header
 *  3. Section rendering (hero, about, skills, projects, experience, education, contact)
 *  4. Motion and interactions (typed roles, reveals, counters, scroll UI, cursor, card tilt)
 *  5. Boot
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

  /** Fill "{key}" placeholders in a UI string. */
  const fmt = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));

  /** Static decorative SVG icons (markup only, no content). */
  const ICONS = {
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14 -1.5 7 5-3 5 3-1.5-7"/>',
    cap: '<path d="M2 9 12 4l10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  };
  function icon(name, size = 20) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = ICONS[name];
    return svg;
  }

  /** Link that opens in a new tab, with a screen-reader hint. */
  function externalLink(attrs, children) {
    return el('a', { ...attrs, target: '_blank', rel: 'noopener noreferrer' }, [
      ...[].concat(children),
      el('span', { class: 'sr-only', text: ` ${ui.newTab}` }),
    ]);
  }

  /** The content container created under each section heading. */
  const slot = (id) => $(`#${id} [data-slot="content"]`);

  const tagList = (tags, label) =>
    el('ul', { class: 'tag-list', 'aria-label': label }, tags.map((t) => el('li', { class: 'tag', text: t })));

  /* =====================================================================
   * 2. Navigation and header
   * ===================================================================== */
  function renderNav() {
    $('#skip-link').textContent = ui.skipLink;

    const brand = $('#nav-brand');
    brand.textContent = owner.initials;
    brand.setAttribute('aria-label', `${owner.name}, back to top`);

    const resume = $('#nav-resume');
    resume.textContent = ui.resumeButton;
    resume.href = owner.resume;

    $('#nav-toggle').setAttribute('aria-label', ui.menuOpen);

    const desktop = $('#nav-links');
    const mobile = $('#mobile-links');
    for (const s of ui.sections) {
      desktop.append(el('li', {}, el('a', { class: 'nav-link', href: `#${s.id}`, text: s.nav })));
      mobile.append(el('li', {}, el('a', { class: 'nav-link', href: `#${s.id}`, text: s.nav })));
    }
    // Resume link inside the mobile menu (the header button is hidden on small screens)
    mobile.append(
      el('li', { class: 'pt-2 sm:hidden' }, el('a', { class: 'btn btn-outline w-full', href: owner.resume, download: true, text: ui.resumeButton }))
    );
  }

  /** Header height → CSS variable, so anchor jumps land clear of the fixed header. */
  function syncHeaderHeight() {
    const nav = $('#site-header nav');
    const update = () => {
      document.documentElement.style.setProperty('--header-h', `${Math.ceil(nav.getBoundingClientRect().height + 1)}px`);
    };
    update();
    // Observe the nav bar only, so opening the mobile menu does not shift the offset
    new ResizeObserver(update).observe(nav);
  }

  function initMobileMenu() {
    const toggle = $('#nav-toggle');
    const menu = $('#mobile-menu');

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? ui.menuClose : ui.menuOpen);
      menu.hidden = !open;
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    // Close after choosing a link
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });
    // Close with Escape and return focus to the toggle
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
    // Reset when resizing up to the desktop layout
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false);
    });
  }

  /* =====================================================================
   * 3. Section rendering
   * ===================================================================== */

  /* ----- Section headings (every section except Home) ----- */
  function renderSectionHeadings() {
    for (const s of ui.sections) {
      if (!s.title) continue;
      const section = document.getElementById(s.id);
      if (!section) continue;
      const header = el('header', { class: 'mb-12 reveal' }, [
        el('p', { class: 'section-eyebrow', text: s.eyebrow, 'aria-hidden': 'true' }),
        el('h2', { id: `${s.id}-title`, class: 'section-title', text: s.title }),
      ]);
      section.append(el('div', { class: 'container-x', 'data-slot': 'content' }, header));
    }
  }

  /* ----- Home / hero ----- */
  function renderHero() {
    const roleText = owner.roles.join(' | ');
    $('#home').append(
      el('div', { class: 'container-x grid items-center gap-10 lg:grid-cols-2' }, [
        el('div', { class: 'hero-copy' }, [
          el('p', { class: 'hero-greeting reveal', text: ui.hero.greeting }),
          el('h1', { class: 'hero-name reveal', text: owner.name }),
          el('p', { class: 'hero-roles reveal' }, [
            el('span', { class: 'sr-only', text: roleText }),
            el('span', { id: 'typed-role', 'aria-hidden': 'true', text: owner.roles[0] }),
            el('span', { class: 'typed-caret', 'aria-hidden': 'true' }),
          ]),
          el('p', { class: 'hero-location reveal' }, [icon('pin', 18), owner.location]),
          el('div', { class: 'mt-8 flex flex-wrap gap-4 reveal' }, [
            el('a', { class: 'btn btn-primary', href: '#projects', text: ui.hero.ctaProjects }),
            el('a', { class: 'btn btn-outline', href: '#contact', text: ui.hero.ctaContact }),
          ]),
        ]),
        el('div', { id: 'hero-3d', class: 'hero-visual reveal', 'aria-hidden': 'true' }),
      ])
    );
  }

  /* ----- About: bio + counters ----- */
  function renderAbout() {
    slot('about').append(
      el('div', { class: 'grid gap-6 lg:grid-cols-5' }, [
        el('div', { class: 'glass p-6 sm:p-8 lg:col-span-3 reveal' }, el('p', { class: 'about-bio', text: owner.bio })),
        el(
          'ul',
          { class: 'grid grid-cols-2 gap-4 lg:col-span-2' },
          DATA.counters.map((c, i) =>
            el('li', { class: 'glass counter-card reveal', style: `--i:${i}` }, [
              el('span', { class: 'counter-value', 'aria-hidden': 'true' }, [
                c.prefix,
                el('span', { class: 'counter', 'data-target': String(c.value), text: String(c.value) }),
                c.suffix,
              ]),
              el('span', { class: 'sr-only', text: `${c.prefix}${c.value}${c.suffix}` }),
              el('span', { class: 'counter-label', text: c.label }),
            ])
          )
        ),
      ])
    );
  }

  /* ----- Skills: grouped chips ----- */
  function renderSkills() {
    slot('skills').append(
      el(
        'div',
        { class: 'grid gap-6 md:grid-cols-2 xl:grid-cols-3' },
        DATA.skills.map((g) =>
          el('article', { class: 'glass skill-group p-6 reveal' }, [
            el('h3', { class: 'card-title', text: g.group }),
            el(
              'ul',
              { class: 'mt-4 flex flex-wrap gap-2' },
              g.items.map((s, i) =>
                el('li', { class: 'chip', style: `--i:${i}` }, [s.icon ? el('i', { class: s.icon, 'aria-hidden': 'true' }) : null, s.name])
              )
            ),
          ])
        )
      )
    );
  }

  /* ----- Projects: filters + card grid ----- */
  function projectCard(p) {
    return el('div', { class: `project-item reveal${p.featured ? ' is-featured' : ''}`, 'data-category': p.category }, [
      el('article', { class: 'project-card glass' }, [
        el('div', { class: 'flex flex-wrap items-center gap-2' }, [
          el('span', { class: 'badge', text: p.category }),
          p.featured ? el('span', { class: 'badge badge-featured', text: ui.projects.featured }) : null,
        ]),
        el(
          'h3',
          { class: 'card-title mt-4' },
          el('button', { type: 'button', class: 'card-open', 'data-project': p.id, 'aria-haspopup': 'dialog', text: p.title })
        ),
        el('p', { class: 'card-desc', text: p.description }),
        tagList(p.tags, ui.projects.stack),
        el('span', { class: 'card-more', 'aria-hidden': 'true', text: `${ui.projects.details} →` }),
      ]),
    ]);
  }

  function renderProjects() {
    const root = slot('projects');
    root.append(
      el(
        'div',
        { class: 'filter-bar reveal', role: 'group', 'aria-label': ui.projects.filterLabel },
        DATA.projectFilters.map((f) =>
          el('button', { type: 'button', class: 'filter-btn', 'data-filter': f, 'aria-pressed': String(f === 'All'), text: f })
        )
      ),
      el('p', { id: 'project-status', class: 'sr-only', role: 'status', 'aria-live': 'polite' }),
      el('div', { id: 'project-grid', class: 'project-grid', 'data-filter': 'All' }, DATA.projects.map(projectCard))
    );
  }

  /* ----- Experience: vertical timeline ----- */
  function renderExperience() {
    slot('experience').append(
      el(
        'ol',
        { class: 'timeline' },
        DATA.experience.map((x) =>
          el('li', { class: 'timeline-item reveal' }, [
            el('span', { class: 'timeline-dot', 'aria-hidden': 'true' }),
            el('article', { class: 'glass p-6 sm:p-8' }, [
              el('div', { class: 'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1' }, [
                el('h3', { class: 'card-title', text: x.role }),
                el('p', { class: 'timeline-date', text: `${x.start} – ${x.end}` }),
              ]),
              el('p', { class: 'timeline-company', text: `${x.company} · ${x.location}` }),
              el('ul', { class: 'timeline-points' }, x.points.map((t) => el('li', { text: t }))),
              tagList(x.tags, ui.projects.stack),
            ]),
          ])
        )
      )
    );
  }

  /* ----- Education and certifications ----- */
  function renderEducation() {
    const { degrees, certifications } = DATA.education;
    slot('education').append(
      el('div', { class: 'grid gap-10 lg:grid-cols-2' }, [
        el('div', { class: 'reveal' }, [
          el('h3', { class: 'sub-heading', text: ui.education.degrees }),
          el(
            'ul',
            { class: 'mt-4 grid gap-4' },
            degrees.map((d) =>
              el('li', { class: 'glass flex items-start gap-4 p-6' }, [
                el('span', { class: 'cert-icon' }, icon('cap', 22)),
                el('div', {}, [
                  el('h4', { class: 'card-title', text: d.degree }),
                  el('p', { class: 'mt-2 text-muted', text: d.institute }),
                  el('p', { class: 'mt-2 timeline-date', text: d.years }),
                ]),
              ])
            )
          ),
        ]),
        el('div', { class: 'reveal' }, [
          el('h3', { class: 'sub-heading', text: ui.education.certifications }),
          el(
            'ul',
            { class: 'mt-4 grid gap-4' },
            certifications.map((c) =>
              el('li', { class: 'glass flex items-center gap-4 p-5' }, [
                el('span', { class: 'cert-icon' }, icon('award', 22)),
                el('div', {}, [
                  el('h4', { class: 'font-semibold text-soft', text: c.title }),
                  el('p', { class: 'text-sm text-muted', text: c.issuer }),
                ]),
              ])
            )
          ),
        ]),
      ])
    );
  }

  /* ----- Contact: direct links + form ----- */
  function renderContact() {
    const L = ui.contact.links;
    const F = ui.contact.fields;
    const stripProtocol = (url) => url.replace(/^https?:\/\/(www\.)?/, '');

    const linkCard = (label, value, iconNode, href, external) => {
      const body = [
        el('span', { class: 'cert-icon' }, iconNode),
        el('span', { class: 'min-w-0' }, [
          el('span', { class: 'block text-sm text-muted', text: label }),
          el('span', { class: 'contact-value block', text: value }),
        ]),
      ];
      if (!href) return el('li', {}, el('div', { class: 'glass contact-link' }, body));
      const attrs = { class: 'glass contact-link', href };
      return el('li', {}, external ? externalLink(attrs, body) : el('a', attrs, body));
    };

    const field = (name, type) => {
      const id = `cf-${name}`;
      const common = {
        id,
        name,
        class: 'field-input',
        required: true,
        'aria-describedby': `${id}-err`,
      };
      const input =
        type === 'textarea'
          ? el('textarea', { ...common, rows: '6' })
          : el('input', { ...common, type, autocomplete: name === 'name' ? 'name' : name === 'email' ? 'email' : 'off' });
      return el('div', { class: 'field' }, [
        el('label', { class: 'field-label', for: id, text: F[name] }),
        input,
        el('p', { id: `${id}-err`, class: 'field-error' }),
      ]);
    };

    slot('contact').append(
      el('div', { class: 'grid gap-10 lg:grid-cols-5' }, [
        el('div', { class: 'lg:col-span-2 reveal' }, [
          el('h3', { class: 'sub-heading', text: ui.contact.directHeading }),
          el('ul', { class: 'mt-4 grid gap-4' }, [
            linkCard(L.email, owner.email, icon('mail', 20), `mailto:${owner.email}`, false),
            linkCard(L.github, stripProtocol(owner.github), el('i', { class: 'devicon-github-original', 'aria-hidden': 'true' }), owner.github, true),
            linkCard(L.linkedin, stripProtocol(owner.linkedin), el('i', { class: 'devicon-linkedin-plain', 'aria-hidden': 'true' }), owner.linkedin, true),
            linkCard(L.location, owner.location, icon('pin', 20), null, false),
          ]),
        ]),
        el('div', { class: 'lg:col-span-3 reveal' }, [
          el('h3', { class: 'sub-heading', text: ui.contact.formHeading }),
          el('form', { id: 'contact-form', class: 'glass mt-4 grid gap-4 p-6 sm:p-8', novalidate: true }, [
            el('div', { class: 'grid gap-4 sm:grid-cols-2' }, [field('name', 'text'), field('email', 'email')]),
            field('subject', 'text'),
            field('message', 'textarea'),
            // Honeypot for bots (FormSubmit drops submissions that fill it)
            el('div', { class: 'hp-field', 'aria-hidden': 'true' }, el('input', { type: 'text', name: '_honey', tabindex: '-1', autocomplete: 'off' })),
            el('div', { class: 'flex flex-wrap items-center gap-4' }, [
              el('button', { type: 'submit', class: 'btn btn-primary', id: 'cf-submit' }, [
                el('span', { class: 'spinner', hidden: true, 'aria-hidden': 'true' }),
                el('span', { class: 'btn-label', text: ui.contact.submit }),
              ]),
            ]),
            el('p', { id: 'form-status', class: 'form-status', role: 'status', 'aria-live': 'polite' }),
          ]),
        ]),
      ])
    );
  }

  /* ----- Footer ----- */
  function renderFooter() {
    const year = new Date().getFullYear();
    $('#footer-text').textContent = `© ${year} ${owner.name}. ${ui.footer}`;
  }

  /* =====================================================================
   * 4. Motion and interactions
   * ===================================================================== */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionAllowed = () => !reduceMotion.matches;

  /* ----- Typed role line (pauses while the hero is off-screen or the tab is hidden) ----- */
  function initTypedRoles() {
    const node = $('#typed-role');
    const roles = owner.roles;
    if (!node || roles.length < 2) return;
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
        delay = 75;
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

  /* ----- Scroll reveals ----- */
  function initReveals() {
    const items = $$('.reveal');
    if (!motionAllowed() || !('IntersectionObserver' in window)) {
      items.forEach((n) => n.classList.add('is-visible'));
      return;
    }
    document.documentElement.classList.add('motion');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    items.forEach((n) => io.observe(n));
  }

  /* ----- Counters: count up once when visible ----- */
  function initCounters() {
    const counters = $$('.counter');
    if (!motionAllowed()) return; // final values are already rendered
    counters.forEach((n) => (n.textContent = '0'));

    const animate = (node) => {
      const target = Number(node.dataset.target);
      const duration = 1600;
      const startTime = performance.now();
      const frame = (now) => {
        const p = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        node.textContent = String(Math.round(target * eased));
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

  /* ----- Scroll-driven UI: progress bar, active nav link, back-to-top ----- */
  function initScrollUI() {
    const bar = $('#scroll-progress');
    const sectionIds = ui.sections.map((s) => s.id);
    const sections = sectionIds.map((id) => document.getElementById(id));
    const links = $$('.nav-link');

    const backToTop = el('button', { type: 'button', id: 'back-to-top', class: 'back-to-top', 'aria-label': ui.backToTop }, icon('up', 22));
    document.body.append(backToTop);
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'auto' });
      $('#main').focus({ preventScroll: true });
    });

    let activeId = '';
    let ticking = false;

    const update = () => {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const y = window.scrollY;

      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      backToTop.classList.toggle('is-visible', y > 400);

      // Active section: last one whose top has passed 35% of the viewport; the last section wins at the bottom
      const line = window.innerHeight * 0.35;
      let current = sectionIds[0];
      sections.forEach((s, i) => {
        if (s.getBoundingClientRect().top <= line) current = sectionIds[i];
      });
      if (y >= max - 2) current = sectionIds[sectionIds.length - 1];

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

  /* ----- Custom cursor: dot + trailing ring (desktop pointers only) ----- */
  function initCursor() {
    if (!finePointer.matches || !motionAllowed()) return;
    const root = document.documentElement;
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
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      // Stop the loop once the ring has caught up
      frame = Math.abs(mx - rx) + Math.abs(my - ry) > 0.2 ? requestAnimationFrame(follow) : 0;
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

    const interactive = 'a, button, [role="button"], input, textarea, select, label, .project-card';
    document.addEventListener('pointerover', (e) => ring.classList.toggle('is-hover', !!e.target.closest(interactive)));
    document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    document.addEventListener('pointerup', () => ring.classList.remove('is-down'));
    root.addEventListener('mouseleave', () => root.classList.remove('cursor-visible'));
    root.addEventListener('mouseenter', () => shown && root.classList.add('cursor-visible'));
  }

  /* ----- Project card tilt toward the cursor ----- */
  function initCardTilt() {
    if (!finePointer.matches || !motionAllowed()) return;
    const MAX = 7; // degrees
    for (const card of $$('.project-card')) {
      let frame = 0;
      card.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          card.style.transform = `perspective(900px) rotateX(${(-y * MAX).toFixed(2)}deg) rotateY(${(x * MAX).toFixed(2)}deg)`;
          card.style.setProperty('--glare-x', `${((x + 0.5) * 100).toFixed(1)}%`);
          card.style.setProperty('--glare-y', `${((y + 0.5) * 100).toFixed(1)}%`);
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
   * 5. Boot
   * ===================================================================== */
  renderNav();
  syncHeaderHeight();
  initMobileMenu();
  renderSectionHeadings();
  renderHero();
  renderAbout();
  renderSkills();
  renderProjects();
  renderExperience();
  renderEducation();
  renderContact();
  renderFooter();

  initReveals();
  initTypedRoles();
  initCounters();
  initScrollUI();
  initCursor();
  initCardTilt();
})();
