/*
 * main.js
 * Renders content from data.js into index.html and wires up UI behaviour.
 *
 * Blocks:
 *  1. Helpers and icons
 *  2. Boot screen, navigation and header
 *  3. Section scaffolding and footer
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
   * 3. Section scaffolding and footer
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
  renderFooter();
})();
