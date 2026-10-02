/*
 * main.js
 * Renders content from data.js into index.html and wires up UI behaviour.
 * Phase 1: navigation, section headings, footer and the mobile menu toggle.
 */
'use strict';

(() => {
  const DATA = window.PORTFOLIO_DATA;
  if (!DATA) return;

  /* ===== Helpers ===== */
  const $ = (sel, root = document) => root.querySelector(sel);

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
      if (child) node.append(child);
    }
    return node;
  }

  /* ===== Navigation ===== */
  function renderNav() {
    const { owner, ui } = DATA;

    $('#skip-link').textContent = ui.skipLink;

    const brand = $('#nav-brand');
    brand.textContent = owner.initials;
    brand.setAttribute('aria-label', `${owner.name}, back to top`);

    const resume = $('#nav-resume');
    resume.textContent = ui.resumeButton;
    resume.href = owner.resume;

    const toggle = $('#nav-toggle');
    toggle.setAttribute('aria-label', ui.menuOpen);

    const desktop = $('#nav-links');
    const mobile = $('#mobile-links');
    for (const s of ui.sections) {
      desktop.append(el('li', {}, el('a', { class: 'nav-link', href: `#${s.id}`, text: s.nav })));
      mobile.append(el('li', {}, el('a', { class: 'nav-link', href: `#${s.id}`, text: s.nav })));
    }
    // Resume link inside the mobile menu (the header button is hidden on small screens)
    mobile.append(
      el('li', { class: 'pt-2' }, el('a', { class: 'btn btn-outline w-full', href: owner.resume, download: true, text: ui.resumeButton }))
    );
  }

  /* ===== Mobile menu toggle ===== */
  function initMobileMenu() {
    const { ui } = DATA;
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

  /* ===== Header height → CSS variable (keeps anchor jumps clear of the fixed header) ===== */
  function syncHeaderHeight() {
    const header = $('#site-header');
    const nav = header.querySelector('nav');
    const update = () => {
      document.documentElement.style.setProperty('--header-h', `${Math.ceil(nav.getBoundingClientRect().height + 1)}px`);
    };
    update();
    // Observe the nav bar only, so opening the mobile menu does not shift the offset
    new ResizeObserver(update).observe(nav);
  }

  /* ===== Section headings ===== */
  function renderSectionHeadings() {
    for (const s of DATA.ui.sections) {
      if (!s.title) continue; // Home has its own hero layout
      const section = document.getElementById(s.id);
      if (!section) continue;
      const header = el('header', { class: 'mb-12' }, [
        el('p', { class: 'section-eyebrow', text: s.eyebrow, 'aria-hidden': 'true' }),
        el('h2', { id: `${s.id}-title`, class: 'section-title', text: s.title }),
      ]);
      section.append(el('div', { class: 'container-x', 'data-slot': 'content' }, header));
    }
  }

  /* ===== Footer ===== */
  function renderFooter() {
    const year = new Date().getFullYear();
    $('#footer-text').textContent = `© ${year} ${DATA.owner.name}. ${DATA.ui.footer}`;
  }

  /* ===== Boot ===== */
  renderNav();
  syncHeaderHeight();
  initMobileMenu();
  renderSectionHeadings();
  renderFooter();
})();
