(function (root) {
  'use strict';
  const spans = { compact: 4, small: 5, medium: 8, large: 10, full: 16 };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  // Persist only intent. Heights and responsive placement are derived from the DOM.
  function normalize(source, registry) {
    const items = Array.isArray(source) ? source : [];
    return registry.map((definition, index) => {
      const saved = items.find(item => item && item.id === definition.id);
      const configuredDefault = Number(definition.defaultColumns);
      const fallback = Number.isFinite(configuredDefault)
        ? clamp(Math.round(configuredDefault), 4, 16)
        : (spans[definition.defaultSize] || 8);
      const columns = Number(saved?.columns);
      return {
        id: definition.id,
        active: saved ? saved.active !== false : Boolean(definition.defaultActive),
        order: Number.isFinite(saved?.order)
          ? saved.order
          : (Number.isFinite(definition.defaultOrder) ? definition.defaultOrder : index),
        columns: Number.isFinite(columns) && columns > 0 ? clamp(Math.round(columns), 4, 16) : (spans[saved?.size] || fallback)
      };
    }).sort((a, b) => a.order - b.order).map((item, order) => ({ ...item, order }));
  }

  function mount(grid, { editing, onCommit, onIdle }) {
    const cards = Array.from(grid.children);
    let gesture = null, frame = 0, destroyed = false;
    const abort = new AbortController();
    const listen = (node, type, callback) => node.addEventListener(type, callback, { signal: abort.signal });
    const columns = () => Number(getComputedStyle(grid).getPropertyValue('--desktop-columns')) || 16;

    function measure() {
      frame = 0;
      if (destroyed || !grid.getBoundingClientRect().width) return;
      const count = columns();
      const width = grid.getBoundingClientRect().width;
      // A readable minimum, expressed in grid units, not a monitor-specific breakpoint.
      const minimum = Math.min(count, Math.max(4, Math.ceil(260 / ((width + 16) / count))));
      cards.forEach(card => {
        const span = clamp(Number(card.dataset.columns) || 8, minimum, count);
        card.style.gridColumn = `span ${span}`;
      });
      // Height is content-driven. CSS Grid reserves the tallest card in each visual
      // row, while every card keeps its own intrinsic height through align-self:start.
      cards.forEach(card => card.style.removeProperty('grid-row-end'));
    }
    function schedule() { if (!frame && !destroyed) frame = requestAnimationFrame(measure); }
    const observer = new ResizeObserver(schedule);
    observer.observe(grid);
    cards.forEach(card => observer.observe(card.querySelector('.desktop-widget-body')));
    grid.classList.toggle('is-editing', editing);

    function finish(cancelled) {
      if (!gesture) return;
      const current = gesture;
      gesture = null;
      current.ghost?.remove();
      current.card.classList.remove('is-dragging', 'is-resizing');
      grid.classList.remove('is-manipulating');
      if (current.handle.hasPointerCapture(current.pointerId)) current.handle.releasePointerCapture(current.pointerId);
      if (cancelled) {
        current.original.forEach(card => grid.append(card));
        current.card.dataset.columns = current.startColumns;
      }
      measure();
      if (!cancelled && current.moved) onCommit(Array.from(grid.children).map((card, order) => ({ id: card.dataset.widgetId, columns: Number(card.dataset.columns), order })));
      onIdle?.();
    }
    function move(event) {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      const g = gesture;
      const dx = event.clientX - g.x, dy = event.clientY - g.y;
      if (!g.moved && Math.hypot(dx, dy) < 4) return;
      g.moved = true;
      grid.classList.add('is-manipulating');
      if (g.resize) {
        const rect = grid.getBoundingClientRect();
        const count = columns();
        const unit = (rect.width + 16) / count;
        const minimum = Math.min(count, Math.max(4, Math.ceil(260 / unit)));
        // clientX and DOMRect share viewport CSS pixels (including sidebar/scroll).
        g.card.dataset.columns = clamp(Math.round((g.width + dx + 16) / unit), minimum, count);
        g.card.classList.add('is-resizing');
        measure();
        return;
      }
      if (!g.ghost) {
        g.ghost = g.card.cloneNode(true);
        g.ghost.className = 'dashboard-widget desktop-drag-preview';
        g.ghost.setAttribute('aria-hidden', 'true');
        g.ghost.style.cssText = `position:fixed;width:${g.width}px;left:0;top:0;`;
        document.body.append(g.ghost);
        g.card.classList.add('is-dragging');
      }
      g.ghost.style.transform = `translate(${event.clientX - g.offsetX}px,${event.clientY - g.offsetY}px)`;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.dashboard-widget');
      if (target && target !== g.card && target.parentElement === grid) {
        const r = target.getBoundingClientRect();
        const sameRow = Math.abs(g.card.getBoundingClientRect().top - r.top) < 20;
        const after = sameRow ? event.clientX > r.left + r.width / 2 : event.clientY > r.top + r.height / 2;
        grid.insertBefore(g.card, after ? target.nextSibling : target);
        // Reparenting can release pointer capture; keep ownership of this gesture.
        g.handle.setPointerCapture(g.pointerId);
        measure();
      } else if (!target) {
        const r = grid.getBoundingClientRect();
        if (event.clientY >= r.bottom - 20 && event.clientX >= r.left && event.clientX <= r.right) grid.append(g.card);
      }
      // Allow moving between rows beyond the currently visible viewport.
      if (event.clientY > window.innerHeight - 50) window.scrollBy(0, 18);
      else if (event.clientY < 90) window.scrollBy(0, -18);
    }
    if (editing) cards.forEach(card => {
      const header = card.querySelector('.dashboard-widget-header');
      const edge = card.querySelector('.dashboard-widget-resize-handle');
      [header, edge].forEach(handle => listen(handle, 'pointerdown', event => {
        if (gesture || event.button !== 0 || event.target.closest('button,input,textarea,a')) return;
        event.preventDefault();
        const r = card.getBoundingClientRect();
        gesture = { card, handle, pointerId: event.pointerId, resize: handle === edge, x: event.clientX, y: event.clientY, offsetX: event.clientX - r.left, offsetY: event.clientY - r.top, width: r.width, startColumns: card.dataset.columns, original: Array.from(grid.children), moved: false };
        handle.setPointerCapture(event.pointerId);
      }));
    });
    listen(window, 'pointermove', move);
    listen(window, 'pointerup', event => { if (gesture?.pointerId === event.pointerId) finish(false); });
    listen(window, 'pointercancel', () => finish(true));
    listen(window, 'blur', () => finish(true));
    listen(window, 'keydown', event => { if (event.key === 'Escape') finish(true); });
    measure();
    return {
      get busy() { return Boolean(gesture); },
      destroy() { destroyed = true; abort.abort(); observer.disconnect(); cancelAnimationFrame(frame); gesture?.ghost?.remove(); }
    };
  }
  const api = { normalize, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DesktopLayout = api;
}(typeof window !== 'undefined' ? window : globalThis));
