/*
 * diagrams.js
 * Architecture block diagrams as inline SVG markup, from the `diagram` objects in data.js.
 * Rounded boxes on a col/row grid, group frames, arrows (one- or two-way) clipped to box edges,
 * and dashes that flow along each arrow (animated in CSS only when motion is allowed).
 *
 * Works in the browser (window.Diagrams) and in Node (module.exports), so scripts/build.mjs can
 * pre-render the card previews into index.html and main.js can draw the full diagram in the modal.
 *
 * API: render(diagram, { compact, title, idPrefix }) → SVG markup string
 *  - compact: smaller boxes, no second line; decorative (aria-hidden) card preview
 *  - title:   accessible name for the full diagram (role="img" + <title> + <desc> listing every connection)
 */
(function (root) {
  'use strict';

  /* ===== Layout ===== */
  var LAYOUT = {
    full: { colW: 200, rowH: 96, boxW: 176, boxH: 62, pad: 20, padTop: 40, groupPad: 12, lineH: 17 },
    compact: { colW: 200, rowH: 76, boxW: 176, boxH: 48, pad: 16, padTop: 34, groupPad: 10, lineH: 17 },
  };

  function esc(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function attrs(map) {
    return Object.keys(map)
      .map(function (k) {
        return k + '="' + esc(map[k]) + '"';
      })
      .join(' ');
  }

  /** Split a long label into two lines at the space nearest its middle. */
  function wrapLabel(label, maxChars) {
    if (label.length <= maxChars || label.indexOf(' ') < 0) return [label];
    var mid = label.length / 2;
    var best = -1;
    for (var i = 0; i < label.length; i++) {
      if (label[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    }
    return [label.slice(0, best), label.slice(best + 1)];
  }

  /** Point where the ray from a box centre toward (tx, ty) leaves the box, plus a small gap. */
  function edgePoint(box, tx, ty, gap) {
    var dx = tx - box.cx;
    var dy = ty - box.cy;
    var scale = 1 / Math.max(Math.abs(dx) / box.hw, Math.abs(dy) / box.hh);
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: box.cx + dx * scale + (dx / len) * gap, y: box.cy + dy * scale + (dy / len) * gap };
  }

  function computeBoxes(diagram, L) {
    var boxes = {};
    diagram.nodes.forEach(function (n) {
      boxes[n.id] = {
        cx: L.pad + n.col * L.colW + L.colW / 2,
        cy: L.padTop + n.row * L.rowH + L.rowH / 2,
        hw: L.boxW / 2,
        hh: L.boxH / 2,
      };
    });
    diagram.groups.forEach(function (g) {
      var members = g.members.map(function (m) {
        return boxes[m];
      });
      var x1 = Math.min.apply(null, members.map(function (b) { return b.cx - b.hw; })) - L.groupPad;
      var x2 = Math.max.apply(null, members.map(function (b) { return b.cx + b.hw; })) + L.groupPad;
      var y1 = Math.min.apply(null, members.map(function (b) { return b.cy - b.hh; })) - L.groupPad - 14;
      var y2 = Math.max.apply(null, members.map(function (b) { return b.cy + b.hh; })) + L.groupPad;
      boxes[g.id] = { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, hw: (x2 - x1) / 2, hh: (y2 - y1) / 2 };
    });
    return boxes;
  }

  /* ===== Render ===== */
  function render(diagram, options) {
    var opts = options || {};
    var compact = !!opts.compact;
    var L = compact ? LAYOUT.compact : LAYOUT.full;
    var id = (opts.idPrefix || 'dg') + (compact ? '-c' : '-f');
    var width = L.pad * 2 + diagram.cols * L.colW;
    var height = L.padTop + diagram.rows * L.rowH + L.pad;
    var boxes = computeBoxes(diagram, L);
    var names = {};
    diagram.nodes.forEach(function (n) { names[n.id] = n.label; });
    diagram.groups.forEach(function (g) { names[g.id] = g.label; });

    var out = [];
    var svgAttrs = {
      viewBox: '0 0 ' + width + ' ' + height,
      class: 'diagram' + (compact ? ' diagram--compact' : ''),
      preserveAspectRatio: 'xMidYMid meet',
      xmlns: 'http://www.w3.org/2000/svg',
    };
    if (compact) {
      svgAttrs['aria-hidden'] = 'true';
      svgAttrs.focusable = 'false';
    } else {
      svgAttrs.role = 'img';
      svgAttrs['aria-labelledby'] = id + '-title ' + id + '-desc';
    }
    out.push('<svg ' + attrs(svgAttrs) + '>');
    if (!compact) {
      out.push('<title id="' + id + '-title">' + esc(opts.title || '') + '</title>');
      out.push(
        '<desc id="' + id + '-desc">' +
          esc(
            diagram.edges
              .map(function (e) {
                return names[e.from] + (e.both ? ' to and from ' : ' to ') + names[e.to];
              })
              .join('; ')
          ) +
          '</desc>'
      );
    }

    // Arrow marker
    out.push(
      '<defs><marker id="' + id + '-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
        '<path d="M0 0 L10 5 L0 10 z" class="dg-arrowhead"/></marker></defs>'
    );

    // Group frames
    diagram.groups.forEach(function (g) {
      var b = boxes[g.id];
      out.push(
        '<rect class="dg-group" rx="14" ' +
          attrs({ x: b.cx - b.hw, y: b.cy - b.hh, width: b.hw * 2, height: b.hh * 2 }) +
          '/><text class="dg-group-label" x="' + (b.cx - b.hw + 12) + '" y="' + (b.cy - b.hh + 15) + '">' + esc(g.label.toUpperCase()) + '</text>'
      );
    });

    // Edges: a static line plus a dashed "flow" line on top
    diagram.edges.forEach(function (e) {
      var a = boxes[e.from];
      var b = boxes[e.to];
      var p1 = edgePoint(a, b.cx, b.cy, e.both ? 6 : 3);
      var p2 = edgePoint(b, a.cx, a.cy, 6);
      var c = 'x1="' + p1.x.toFixed(1) + '" y1="' + p1.y.toFixed(1) + '" x2="' + p2.x.toFixed(1) + '" y2="' + p2.y.toFixed(1) + '"';
      var markers = ' marker-end="url(#' + id + '-arrow)"' + (e.both ? ' marker-start="url(#' + id + '-arrow)"' : '');
      out.push('<line class="dg-edge" ' + c + markers + '/><line class="dg-flow" ' + c + '/>');
    });

    // Nodes
    diagram.nodes.forEach(function (n) {
      var b = boxes[n.id];
      var lines = wrapLabel(n.label, 17);
      var subLines = !compact && n.sub ? wrapLabel(n.sub, 22) : [];
      var y = b.cy - ((lines.length + subLines.length - 1) * L.lineH) / 2 + 5;
      var label = lines
        .map(function (line) {
          var t = '<tspan x="' + b.cx + '" y="' + y + '">' + esc(line) + '</tspan>';
          y += L.lineH;
          return t;
        })
        .join('');
      var sub = subLines
        .map(function (line) {
          var t = '<tspan x="' + b.cx + '" y="' + (y - 1) + '">' + esc(line) + '</tspan>';
          y += L.lineH - 2;
          return t;
        })
        .join('');
      out.push(
        '<g class="dg-node dg-node--' + n.kind + '"><rect rx="10" ' +
          attrs({ x: b.cx - b.hw, y: b.cy - b.hh, width: b.hw * 2, height: b.hh * 2 }) +
          '/><text class="dg-label">' + label + '</text>' +
          (sub ? '<text class="dg-sub">' + sub + '</text>' : '') +
          '</g>'
      );
    });

    out.push('</svg>');
    return out.join('');
  }

  var api = { render: render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.Diagrams = api;
})(typeof window !== 'undefined' ? window : null);
