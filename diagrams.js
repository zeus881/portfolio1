/*
 * diagrams.js
 * Draws architecture block diagrams as inline SVG from the `diagram` objects in data.js.
 * Rounded boxes on a col/row grid, group frames, arrows (one- or two-way) clipped to box edges,
 * and dashes that flow along each arrow (animated in CSS only when motion is allowed).
 *
 * API: window.Diagrams.render(diagram, { compact, title }) → <svg>
 *  - compact: smaller boxes, no second line; used for the card previews (decorative)
 *  - title:   accessible name for the full diagram (role="img" + <title> + <desc> listing the connections)
 */
'use strict';

(() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* ===== Layout ===== */
  const LAYOUT = {
    full: { colW: 200, rowH: 96, boxW: 176, boxH: 62, pad: 20, padTop: 40, groupPad: 12, lineH: 17 },
    compact: { colW: 200, rowH: 76, boxW: 176, boxH: 48, pad: 16, padTop: 34, groupPad: 10, lineH: 17 },
  };

  let uid = 0; // unique marker ids when several diagrams share a page

  /** Create an SVG element with attributes. */
  function svgEl(tag, attrs = {}, text) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text != null) node.textContent = text;
    return node;
  }

  /** Point where the ray from a box centre toward (tx, ty) leaves the box. */
  function edgePoint(box, tx, ty, gap) {
    const dx = tx - box.cx;
    const dy = ty - box.cy;
    const scale = 1 / Math.max(Math.abs(dx) / box.hw, Math.abs(dy) / box.hh);
    const len = Math.hypot(dx, dy) || 1;
    return { x: box.cx + dx * scale + (dx / len) * gap, y: box.cy + dy * scale + (dy / len) * gap };
  }

  /** Split a long label into two lines at the space nearest its middle. */
  function wrapLabel(label, maxChars = 17) {
    if (label.length <= maxChars || !label.includes(' ')) return [label];
    const mid = label.length / 2;
    let best = -1;
    for (let i = 0; i < label.length; i++) {
      if (label[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    }
    return [label.slice(0, best), label.slice(best + 1)];
  }

  /* ===== Render ===== */
  function render(diagram, { compact = false, title = '' } = {}) {
    const L = compact ? LAYOUT.compact : LAYOUT.full;
    const id = `dg${++uid}`;
    const width = L.pad * 2 + diagram.cols * L.colW;
    const height = L.padTop + diagram.rows * L.rowH + L.pad;

    const svg = svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      class: `diagram${compact ? ' diagram--compact' : ''}`,
      preserveAspectRatio: 'xMidYMid meet',
    });

    // Accessible name and a text version of the connections (full diagrams only)
    const byId = Object.fromEntries(diagram.nodes.map((n) => [n.id, n]));
    const groupsById = Object.fromEntries(diagram.groups.map((g) => [g.id, g]));
    const nameOf = (ref) => (byId[ref] ? byId[ref].label : groupsById[ref].label);
    if (compact) {
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
    } else {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-labelledby', `${id}-title ${id}-desc`);
      svg.append(svgEl('title', { id: `${id}-title` }, title));
      svg.append(
        svgEl(
          'desc',
          { id: `${id}-desc` },
          diagram.edges.map((e) => `${nameOf(e.from)} ${e.both ? 'to and from' : 'to'} ${nameOf(e.to)}`).join('; ')
        )
      );
    }

    // Arrow marker
    const defs = svgEl('defs');
    const marker = svgEl('marker', {
      id: `${id}-arrow`,
      viewBox: '0 0 10 10',
      refX: '8',
      refY: '5',
      markerWidth: '7',
      markerHeight: '7',
      orient: 'auto-start-reverse',
    });
    marker.append(svgEl('path', { d: 'M0 0 L10 5 L0 10 z', class: 'dg-arrowhead' }));
    defs.append(marker);
    svg.append(defs);

    // Boxes in SVG coordinates
    const boxes = {};
    for (const n of diagram.nodes) {
      boxes[n.id] = {
        cx: L.pad + n.col * L.colW + L.colW / 2,
        cy: L.padTop + n.row * L.rowH + L.rowH / 2,
        hw: L.boxW / 2,
        hh: L.boxH / 2,
      };
    }
    for (const g of diagram.groups) {
      const members = g.members.map((m) => boxes[m]);
      const x1 = Math.min(...members.map((b) => b.cx - b.hw)) - L.groupPad;
      const x2 = Math.max(...members.map((b) => b.cx + b.hw)) + L.groupPad;
      const y1 = Math.min(...members.map((b) => b.cy - b.hh)) - L.groupPad - 14;
      const y2 = Math.max(...members.map((b) => b.cy + b.hh)) + L.groupPad;
      boxes[g.id] = { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, hw: (x2 - x1) / 2, hh: (y2 - y1) / 2, group: true };
    }

    // Group frames (behind everything)
    const groupLayer = svgEl('g', { class: 'dg-groups' });
    for (const g of diagram.groups) {
      const b = boxes[g.id];
      groupLayer.append(
        svgEl('rect', { x: b.cx - b.hw, y: b.cy - b.hh, width: b.hw * 2, height: b.hh * 2, rx: 14, class: 'dg-group' }),
        svgEl('text', { x: b.cx - b.hw + 12, y: b.cy - b.hh + 15, class: 'dg-group-label' }, g.label.toUpperCase())
      );
    }
    svg.append(groupLayer);

    // Edges: a static line plus a dashed "flow" line on top
    const edgeLayer = svgEl('g', { class: 'dg-edges' });
    for (const e of diagram.edges) {
      const a = boxes[e.from];
      const b = boxes[e.to];
      const p1 = edgePoint(a, b.cx, b.cy, e.both ? 6 : 3);
      const p2 = edgePoint(b, a.cx, a.cy, 6);
      const coords = { x1: p1.x.toFixed(1), y1: p1.y.toFixed(1), x2: p2.x.toFixed(1), y2: p2.y.toFixed(1) };
      const line = svgEl('line', { ...coords, class: 'dg-edge', 'marker-end': `url(#${id}-arrow)` });
      if (e.both) line.setAttribute('marker-start', `url(#${id}-arrow)`);
      edgeLayer.append(line, svgEl('line', { ...coords, class: 'dg-flow' }));
    }
    svg.append(edgeLayer);

    // Nodes
    const nodeLayer = svgEl('g', { class: 'dg-nodes' });
    for (const n of diagram.nodes) {
      const b = boxes[n.id];
      const g = svgEl('g', { class: `dg-node dg-node--${n.kind}` });
      g.append(svgEl('rect', { x: b.cx - b.hw, y: b.cy - b.hh, width: b.hw * 2, height: b.hh * 2, rx: 10 }));
      const lines = wrapLabel(n.label);
      const subLines = !compact && n.sub ? wrapLabel(n.sub, 22) : [];
      const total = lines.length + subLines.length;
      let y = b.cy - ((total - 1) * L.lineH) / 2 + 5; // vertically centre all lines
      const label = svgEl('text', { class: 'dg-label' });
      for (const line of lines) {
        label.append(svgEl('tspan', { x: b.cx, y }, line));
        y += L.lineH;
      }
      g.append(label);
      if (subLines.length) {
        const sub = svgEl('text', { class: 'dg-sub' });
        for (const line of subLines) {
          sub.append(svgEl('tspan', { x: b.cx, y: y - 1 }, line));
          y += L.lineH - 2;
        }
        g.append(sub);
      }
      nodeLayer.append(g);
    }
    svg.append(nodeLayer);

    return svg;
  }

  window.Diagrams = { render };
})();
