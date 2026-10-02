/*
 * palette.js
 * Command palette: Ctrl+K / Cmd+K, the "/" key, or the "/" button in the nav.
 * Fuzzy search across sections, projects and actions (from data.js), run with Enter.
 * Accessible combobox: the input owns a listbox; arrows move the active option (aria-activedescendant);
 * Esc closes; focus stays inside and returns to where it was on close.
 *
 * Blocks: 1. Items · 2. Fuzzy matching · 3. Dialog and rendering · 4. Keyboard and boot
 */
'use strict';

(() => {
  const DATA = window.PORTFOLIO_DATA;
  const API = window.Portfolio;
  if (!DATA || !API) return;
  const L = DATA.ui.palette;

  /* =====================================================================
   * 1. Items
   * ===================================================================== */
  const ACTIONS = {
    resume: () => API.downloadResume(),
    'copy-email': () => API.copyEmail(),
    'toggle-3d': () => API.toggleFx(),
    github: () => API.openGitHub(),
  };

  const items = [
    ...DATA.ui.sections.map((s) => ({
      group: 'sections',
      label: s.nav,
      hint: `#${s.id}`,
      run: () => API.goToSection(s.id),
    })),
    ...DATA.projects.map((p) => ({
      group: 'projects',
      label: p.title,
      hint: p.category,
      keywords: p.tags.join(' '),
      run: () => API.openProject(p.slug),
    })),
    ...DATA.palette.actions.map((a) => ({
      group: 'actions',
      label: a.label,
      hint: '',
      run: ACTIONS[a.id],
    })),
  ].filter((item) => typeof item.run === 'function');

  /* =====================================================================
   * 2. Fuzzy matching: characters in order; bonuses for word starts and runs
   * ===================================================================== */
  function score(query, text) {
    if (!query) return 1;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    if (t.includes(q)) return 100 - t.indexOf(q); // direct substring wins
    let ti = 0;
    let total = 0;
    let run = 0;
    for (const ch of q) {
      const found = t.indexOf(ch, ti);
      if (found < 0) return -1;
      const wordStart = found === 0 || /[\s\-_/(.]/.test(t[found - 1]);
      run = found === ti ? run + 1 : 0;
      total += 1 + (wordStart ? 3 : 0) + run * 2;
      ti = found + 1;
    }
    return total;
  }

  function search(query) {
    const q = query.trim();
    const scored = items
      .map((item) => ({ item, s: Math.max(score(q, item.label), item.keywords ? score(q, item.keywords) - 5 : -1) }))
      .filter((r) => r.s >= 0);
    // Keep group order; best matches first within a group
    const order = ['sections', 'projects', 'actions'];
    return scored.sort((a, b) => order.indexOf(a.item.group) - order.indexOf(b.item.group) || b.s - a.s).map((r) => r.item);
  }

  /* =====================================================================
   * 3. Dialog and rendering
   * ===================================================================== */
  const el = (tag, attrs = {}, text) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text != null) node.textContent = text;
    return node;
  };

  const dialog = el('dialog', { id: 'palette', class: 'palette', 'aria-label': L.title });
  const panel = el('div', { class: 'palette-panel glass' });
  const input = el('input', {
    type: 'text',
    class: 'palette-input',
    role: 'combobox',
    'aria-expanded': 'true',
    'aria-controls': 'palette-list',
    'aria-autocomplete': 'list',
    'aria-label': L.placeholder,
    placeholder: L.placeholder,
    autocomplete: 'off',
    spellcheck: 'false',
  });
  const list = el('ul', { id: 'palette-list', class: 'palette-list', role: 'listbox', 'aria-label': L.title });
  const hint = el('p', { class: 'palette-hint mono-label' }, L.hint);
  panel.append(input, list, hint);
  dialog.append(panel);
  document.body.append(dialog);

  let results = [];
  let activeIndex = 0;
  let returnFocus = null;

  function render() {
    results = search(input.value);
    activeIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));
    list.replaceChildren();
    if (!results.length) {
      list.append(el('li', { class: 'palette-empty', role: 'presentation' }, L.empty));
      input.removeAttribute('aria-activedescendant');
      return;
    }
    let lastGroup = '';
    results.forEach((item, i) => {
      if (item.group !== lastGroup) {
        lastGroup = item.group;
        list.append(el('li', { class: 'palette-group mono-label', role: 'presentation' }, L.groups[item.group]));
      }
      const option = el('li', { id: `palette-opt-${i}`, class: 'palette-option', role: 'option', 'aria-selected': String(i === activeIndex) });
      option.append(el('span', { class: 'palette-label' }, item.label));
      if (item.hint) option.append(el('span', { class: 'palette-meta' }, item.hint));
      option.addEventListener('mousemove', () => setActive(i));
      option.addEventListener('click', () => runItem(i));
      list.append(option);
    });
    setActive(activeIndex);
  }

  function setActive(i) {
    if (!results.length) return;
    activeIndex = (i + results.length) % results.length;
    for (const option of list.querySelectorAll('[role="option"]')) {
      option.setAttribute('aria-selected', String(option.id === `palette-opt-${activeIndex}`));
    }
    const active = document.getElementById(`palette-opt-${activeIndex}`);
    input.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  }

  function open() {
    if (dialog.open) return;
    const modal = document.getElementById('project-modal');
    if (modal && modal.open) modal.close();
    returnFocus = document.activeElement;
    input.value = '';
    activeIndex = 0;
    render();
    dialog.showModal();
    document.documentElement.classList.add('modal-open');
    input.focus();
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  function runItem(i) {
    const item = results[i];
    if (!item) return;
    close();
    item.run();
  }

  dialog.addEventListener('close', () => {
    const projectOpen = !!document.getElementById('project-modal')?.open;
    if (!projectOpen) document.documentElement.classList.remove('modal-open');
    // Restore focus unless the chosen item moved it on purpose (section heading, project modal)
    if (returnFocus && document.contains(returnFocus) && !projectOpen && (document.activeElement === document.body || !document.activeElement)) {
      returnFocus.focus();
    }
    returnFocus = null;
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  /* =====================================================================
   * 4. Keyboard and boot
   * ===================================================================== */
  input.addEventListener('input', () => {
    activeIndex = 0;
    render();
  });

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(activeIndex - 1);
    } else if (e.key === 'Home' && e.ctrlKey) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runItem(activeIndex);
    } else if (e.key === 'Tab') {
      e.preventDefault(); // the input is the only stop: focus stays in the palette
    }
  });

  const isTyping = (node) => node && (node.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName));

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (dialog.open) close();
      else open();
    } else if (e.key === '/' && !dialog.open && !isTyping(document.activeElement) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      open();
    }
  });

  document.getElementById('palette-open').addEventListener('click', open);

  window.Palette = { open, close };
})();
