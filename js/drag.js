// One drag helper for mouse/touch AND hand gestures (pinch to grab, open hand to drop).
// makeDraggable(el, { onDrop(x, y, player), onMove?(x, y), grabRadius? })
export function makeDraggable(el, { onDrop, onMove, grabRadius = 40 } = {}) {
  let active = null; // { kind: 'pointer'|'gesture', id, dx, dy }

  // el must be absolutely positioned; we move it within its offsetParent.
  const place = (x, y) => {
    const pr = el.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    el.style.left = `${x - active.dx - pr.left}px`;
    el.style.top = `${y - active.dy - pr.top}px`;
    onMove?.(x, y);
  };
  const begin = (kind, id, x, y) => {
    const r = el.getBoundingClientRect();
    el.style.margin = '0';
    active = { kind, id, dx: x - r.left, dy: y - r.top };
    el.classList.add('is-dragging');
    place(x, y);
  };
  const end = (x, y, player) => {
    el.classList.remove('is-dragging');
    active = null;
    onDrop?.(x, y, player);
  };

  // Mouse / touch
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    begin('pointer', e.pointerId, e.clientX, e.clientY);
  });
  el.addEventListener('pointermove', e => {
    if (active?.kind === 'pointer' && active.id === e.pointerId) place(e.clientX, e.clientY);
  });
  el.addEventListener('pointerup', e => {
    if (active?.kind === 'pointer' && active.id === e.pointerId) end(e.clientX, e.clientY, 0);
  });

  // Gestures
  const onGrab = e => {
    if (active || !el.isConnected) return;
    const { x, y, player } = e.detail;
    const r = el.getBoundingClientRect();
    const inside = x >= r.left - grabRadius && x <= r.right + grabRadius &&
                   y >= r.top - grabRadius && y <= r.bottom + grabRadius;
    if (inside) begin('gesture', player, x, y);
  };
  const onGMove = e => {
    if (active?.kind === 'gesture' && active.id === e.detail.player) place(e.detail.x, e.detail.y);
  };
  const onGRelease = e => {
    if (active?.kind === 'gesture' && active.id === e.detail.player) end(e.detail.x, e.detail.y, e.detail.player);
  };
  document.addEventListener('gesture-grab', onGrab);
  document.addEventListener('gesture-move', onGMove);
  document.addEventListener('gesture-release', onGRelease);

  return () => {
    document.removeEventListener('gesture-grab', onGrab);
    document.removeEventListener('gesture-move', onGMove);
    document.removeEventListener('gesture-release', onGRelease);
  };
}
