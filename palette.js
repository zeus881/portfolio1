/*
 * palette.js
 * Search and commands: Ctrl+K / Cmd+K or "/" on desktop; the search button in the nav and the mobile menu on touch.
 * Fuzzy search across sections, projects and actions from data.js; arrow keys and Enter, or tap.
 * Accessible combobox inside the overlay that scripts/build.mjs renders; focus is trapped and restored.
 * ES2017 at most.
 *
 * Blocks: 1. Items · 2. Fuzzy matching · 3. Rendering · 4. Open and close · 5. Keyboard and boot
 */
(function () {
  'use strict';

  var DATA = window.PORTFOLIO_DATA;
  var API = window.Portfolio;
  var overlay = document.getElementById('palette');
  if (!DATA || !API || !overlay) return;
  var L = DATA.ui.palette;
  var input = document.getElementById('palette-input');
  var list = document.getElementById('palette-list');
  var panel = overlay.querySelector('.palette-panel');

  /* =====================================================================
   * 1. Items
   * ===================================================================== */
  var ACTIONS = {
    resume: API.downloadResume,
    'copy-email': API.copyEmail,
    'toggle-3d': API.toggleFx,
    github: API.openGitHub,
  };

  var items = []
    .concat(
      DATA.ui.sections.map(function (s) {
        return { group: 'sections', label: s.nav, hint: '#' + s.id, run: function () { API.goToSection(s.id); } };
      }),
      DATA.projects.map(function (p) {
        return { group: 'projects', label: p.title, hint: p.category, keywords: p.tags.join(' '), run: function () { API.openProject(p.slug); } };
      }),
      DATA.palette.actions.map(function (a) {
        return { group: 'actions', label: a.label, hint: '', run: ACTIONS[a.id] };
      })
    )
    .filter(function (item) {
      return typeof item.run === 'function';
    });

  /* =====================================================================
   * 2. Fuzzy matching: characters in order; bonuses for word starts and runs
   * ===================================================================== */
  function score(query, text) {
    if (!query) return 1;
    var q = query.toLowerCase();
    var t = text.toLowerCase();
    if (t.indexOf(q) >= 0) return 100 - t.indexOf(q); // direct substring wins
    var ti = 0;
    var total = 0;
    var run = 0;
    for (var i = 0; i < q.length; i++) {
      var found = t.indexOf(q[i], ti);
      if (found < 0) return -1;
      var wordStart = found === 0 || /[\s\-_/(.]/.test(t[found - 1]);
      run = found === ti ? run + 1 : 0;
      total += 1 + (wordStart ? 3 : 0) + run * 2;
      ti = found + 1;
    }
    return total;
  }

  var ORDER = ['sections', 'projects', 'actions'];
  function search(query) {
    var q = query.trim();
    return items
      .map(function (item) {
        return { item: item, s: Math.max(score(q, item.label), item.keywords ? score(q, item.keywords) - 5 : -1) };
      })
      .filter(function (r) {
        return r.s >= 0;
      })
      .sort(function (a, b) {
        return ORDER.indexOf(a.item.group) - ORDER.indexOf(b.item.group) || b.s - a.s;
      })
      .map(function (r) {
        return r.item;
      });
  }

  /* =====================================================================
   * 3. Rendering
   * ===================================================================== */
  var results = [];
  var activeIndex = 0;

  function li(cls, role, text) {
    var node = document.createElement('li');
    node.className = cls;
    node.setAttribute('role', role);
    if (text != null) node.textContent = text;
    return node;
  }

  function render() {
    results = search(input.value);
    activeIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));
    list.innerHTML = '';
    if (!results.length) {
      list.appendChild(li('palette-empty', 'presentation', L.empty));
      input.removeAttribute('aria-activedescendant');
      return;
    }
    var lastGroup = '';
    results.forEach(function (item, i) {
      if (item.group !== lastGroup) {
        lastGroup = item.group;
        list.appendChild(li('palette-group mono-label', 'presentation', L.groups[item.group]));
      }
      var option = li('palette-option', 'option');
      option.id = 'palette-opt-' + i;
      var label = document.createElement('span');
      label.className = 'palette-label';
      label.textContent = item.label;
      option.appendChild(label);
      if (item.hint) {
        var meta = document.createElement('span');
        meta.className = 'palette-meta';
        meta.textContent = item.hint;
        option.appendChild(meta);
      }
      option.addEventListener('mousemove', function () {
        setActive(i);
      });
      option.addEventListener('click', function () {
        runItem(i);
      });
      list.appendChild(option);
    });
    setActive(activeIndex);
  }

  function setActive(i) {
    if (!results.length) return;
    activeIndex = (i + results.length) % results.length;
    Array.prototype.forEach.call(list.querySelectorAll('[role="option"]'), function (option) {
      option.setAttribute('aria-selected', String(option.id === 'palette-opt-' + activeIndex));
    });
    var active = document.getElementById('palette-opt-' + activeIndex);
    input.setAttribute('aria-activedescendant', active.id);
    if (active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
  }

  /* =====================================================================
   * 4. Open and close
   * ===================================================================== */
  var returnFocus = null;

  function isOpen() {
    return !overlay.hidden;
  }

  function open() {
    if (isOpen()) return;
    var modal = document.getElementById('project-modal');
    if (modal && !modal.hidden) return; // one overlay at a time
    returnFocus = document.activeElement;
    input.value = '';
    activeIndex = 0;
    render();
    overlay.hidden = false;
    API.setPageHidden(true);
    input.focus();
  }

  /** `moved` = the chosen item moved focus itself (section heading, project modal). */
  function close(moved) {
    if (!isOpen()) return;
    overlay.hidden = true;
    API.setPageHidden(false);
    if (!moved && returnFocus && document.body.contains(returnFocus)) returnFocus.focus();
    returnFocus = null;
  }

  function runItem(i) {
    var item = results[i];
    if (!item) return;
    var movesFocus = item.group !== 'actions';
    close(movesFocus);
    item.run();
  }

  /* =====================================================================
   * 5. Keyboard and boot
   * ===================================================================== */
  input.addEventListener('input', function () {
    activeIndex = 0;
    render();
  });

  overlay.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) close(false);
  });

  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'Down') {
      e.preventDefault();
      setActive(activeIndex + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'Up') {
      e.preventDefault();
      setActive(activeIndex - 1);
    } else if (e.key === 'Enter' && e.target === input) {
      e.preventDefault();
      runItem(activeIndex);
    } else if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      close(false);
    } else {
      API.trapFocus(e, panel);
    }
  });

  var isTyping = function (node) {
    return node && (node.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName));
  };

  document.addEventListener('keydown', function (e) {
    var key = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === 'k') {
      e.preventDefault();
      if (isOpen()) close(false);
      else open();
    } else if (e.key === '/' && !isOpen() && !isTyping(document.activeElement) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      open();
    }
  });

  document.getElementById('palette-open').addEventListener('click', open);
  Array.prototype.forEach.call(document.querySelectorAll('[data-open-palette]'), function (button) {
    button.addEventListener('click', open);
  });

  window.Palette = { open: open, close: close };
})();
