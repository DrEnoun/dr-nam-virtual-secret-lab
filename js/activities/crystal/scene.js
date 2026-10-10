// 3D scene for the Crystal Lattice Builder (Three.js, bundled for offline use).
// Site markers are real HTML buttons placed over the canvas each frame, so a mouse, a finger or a hand "shot" can hit them.
import * as THREE from '../../../vendor/three/three.module.js';
import { allSites, tile, coordination } from './rules.js';

const S = 3; // side of the unit cell in scene units
const COLOUR = { p: '#2dd4bf', na: '#d4ff3a', cl: '#2fb3a8', metal: '#fc7a7a', c: '#9db4ff', e: '#d4ff3a', dim: '#4a6b80', hit: '#fc7a7a' };
const RADIUS = { p: 0.34, na: 0.26, cl: 0.4, metal: 0.3, c: 0.2 };
const toScene = p => new THREE.Vector3((p[0] - 0.5) * S, (p[1] - 0.5) * S, (p[2] - 0.5) * S);

/** Returns the scene API, or null when this device has no WebGL. */
export function createScene(host, { reducedMotion = false, onSite = null } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return null; }
  if (!renderer.getContext()) return null;
  host.innerHTML = '';
  host.classList.add('cr-scene');
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  host.appendChild(renderer.domElement);
  renderer.domElement.className = 'cr-scene__canvas';
  const markersEl = document.createElement('div');
  markersEl.className = 'cr-markers';
  host.appendChild(markersEl);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const sun = new THREE.DirectionalLight(0xffffff, 1.3);
  sun.position.set(4, 6, 8);
  scene.add(sun);
  const group = new THREE.Group();
  scene.add(group);
  group.rotation.set(0.45, -0.6, 0);

  const mat = (c, o = 1, em = 0) => new THREE.MeshStandardMaterial({ color: c, transparent: o < 1, opacity: o, roughness: 0.4, emissive: new THREE.Color(c), emissiveIntensity: em });
  const geo = new THREE.SphereGeometry(1, 20, 14);
  const sphere = (type, pos, scale = 1, opacity = 1) => {
    const m = new THREE.Mesh(geo, mat(COLOUR[type] ?? COLOUR.p, opacity, type === 'na' ? 0.15 : 0));
    m.scale.setScalar((RADIUS[type] ?? 0.3) * scale);
    m.position.copy(pos);
    return m;
  };
  const boxEdges = (size, at, color = '#9fb7c9', opacity = 0.7) => {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size)), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
    l.position.copy(at);
    return l;
  };

  let interacted = false; // true once the student has rotated the view (or is aiming at rings): stops the slow auto-spin
  // --- the unit cell being built
  const cellGroup = new THREE.Group();
  group.add(cellGroup);
  cellGroup.add(boxEdges(S, new THREE.Vector3(0, 0, 0), '#d4ff3a', 0.9));
  const particles = new Map(); // site id → mesh
  const markers = new Map();   // site id → { el, pos }
  let particleScale = 1;

  function setSites(sites) {
    if (sites.length) interacted = true; // hold still while the student is aiming at rings
    markers.forEach(m => m.el.remove()); markers.clear();
    markersEl.innerHTML = '';
    for (const s of sites) {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'cr-site'; el.dataset.target = ''; el.dataset.kind = s.kind;
      el.setAttribute('aria-label', `${s.kind} site`);
      el.addEventListener('click', () => onSite?.(s.id));
      markersEl.appendChild(el);
      markers.set(s.id, { el, pos: toScene(s.pos), site: s });
    }
  }
  /** Show exactly these particles (Map id → type). Existing ones stay, others are added or removed. */
  function setParticles(map) {
    for (const [id, m] of particles) if (!map.has(id) || m.userData.type !== map.get(id)) { cellGroup.remove(m); particles.delete(id); }
    for (const [id, type] of map) {
      if (particles.has(id)) continue;
      const s = allSites().find(x => x.id === id);
      const m = sphere(type, toScene(s.pos), particleScale);
      m.userData.type = type;
      cellGroup.add(m); particles.set(id, m);
    }
    markers.forEach((m, id) => {
      const t = map.get(id);
      m.el.dataset.type = t || '';
      m.el.textContent = t === 'na' ? '+' : t === 'cl' ? '−' : t ? '●' : '';
    });
  }

  // --- the repeated lattice and the neighbour highlight
  let lattice = null, latticeTimer = 0;
  function clearLattice() {
    clearTimeout(latticeTimer);
    if (lattice) { group.remove(lattice); lattice = null; }
    cellGroup.visible = true; markersEl.style.display = '';
    setView(S);
  }
  function setView(extent) { camera.position.set(0, 0, Math.max(9, extent * 3.4)); }
  /** Repeat the unit cell n×n×n; shared particles are drawn once. Particles pop in layer by layer. */
  function repeat(occ, n) {
    clearLattice();
    cellGroup.visible = false; markersEl.style.display = 'none';
    lattice = new THREE.Group();
    const off = (n * S) / 2;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) for (let c = 0; c < n; c++) lattice.add(boxEdges(S, new THREE.Vector3(a * S + S / 2 - off, b * S + S / 2 - off, c * S + S / 2 - off), '#d4ff3a', 0.55));
    const pts = tile(occ, n).sort((p, q) => p.pos[2] + p.pos[1] * 0.01 - (q.pos[2] + q.pos[1] * 0.01));
    const meshes = pts.map(p => {
      const m = sphere(p.type, new THREE.Vector3(p.pos[0] * S - off, p.pos[1] * S - off, p.pos[2] * S - off), 0.8);
      m.visible = reducedMotion; lattice.add(m); return m;
    });
    group.add(lattice);
    setView(n * S);
    if (!reducedMotion) meshes.forEach((m, i) => { latticeTimer = setTimeout(() => { m.visible = true; }, 15 * i); });
    return pts.length;
  }
  /** One particle (red) with its nearest neighbours (lime) inside a 3×3×3 block; the rest are faded. */
  function showNeighbours(occ, of = null) {
    clearLattice();
    cellGroup.visible = false; markersEl.style.display = 'none';
    lattice = new THREE.Group();
    const pts = tile(occ, 3).map(p => ({ ...p, pos: p.pos.map(v => v - 1) }));
    const centre = pts.find(p => p.pos.every(v => v === 0) && (!of || p.type === of)) || pts.find(p => p.pos.every(v => v === 0));
    const d = p => Math.hypot(...p.pos.map((v, i) => v - centre.pos[i]));
    const min = Math.min(...pts.filter(p => p !== centre).map(d));
    for (const p of pts) {
      const near = p !== centre && Math.abs(d(p) - min) < 1e-6;
      const m = sphere(p === centre ? 'metal' : near ? 'na' : 'c', new THREE.Vector3(p.pos[0] * S, p.pos[1] * S, p.pos[2] * S), p === centre ? 1.05 : near ? 0.95 : 0.45, p === centre || near ? 1 : 0.35);
      lattice.add(m);
    }
    lattice.add(boxEdges(S, new THREE.Vector3(S / 2, S / 2, S / 2), '#d4ff3a', 0.9));
    lattice.position.set(-S / 2, -S / 2, -S / 2);
    group.add(lattice);
    setView(S * 2.2);
    return pts.filter(p => p !== centre && Math.abs(d(p) - min) < 1e-6).length;
  }

  // --- structures for the "make a material" step
  let electrons = null;
  function showStructure(id) {
    clearLattice();
    cellGroup.visible = false; markersEl.style.display = 'none';
    lattice = new THREE.Group();
    electrons = null;
    const bond = (a, b, color = '#c9d6e2', r = 0.045, dashed = false) => {
      const d = b.clone().sub(a), len = d.length();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat(color, dashed ? 0.35 : 1));
      m.position.copy(a.clone().add(b).multiplyScalar(0.5));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      lattice.add(m);
    };
    if (id === 'nacl') {
      const occ = new Map(); for (const s of allSites()) occ.set(s.id, ((s.ijk[0] + s.ijk[1] + s.ijk[2]) % 2 === 0) ? 'cl' : 'na');
      tile(occ, 1).forEach(p => lattice.add(sphere(p.type, new THREE.Vector3(...p.pos).multiplyScalar(S).sub(new THREE.Vector3(S / 2, S / 2, S / 2)), 1)));
      lattice.add(boxEdges(S, new THREE.Vector3(0, 0, 0), '#d4ff3a', 0.9));
    } else if (id === 'metal') {
      const occ = new Map(); for (const s of allSites()) if (s.kind === 'corner' || s.kind === 'face') occ.set(s.id, 'metal');
      tile(occ, 1).forEach(p => lattice.add(sphere('metal', new THREE.Vector3(...p.pos).multiplyScalar(S).sub(new THREE.Vector3(S / 2, S / 2, S / 2)), 1.1)));
      lattice.add(boxEdges(S, new THREE.Vector3(0, 0, 0), '#d4ff3a', 0.9));
      const pts = []; for (let i = 0; i < 50; i++) pts.push(new THREE.Vector3((Math.random() - 0.5) * S, (Math.random() - 0.5) * S, (Math.random() - 0.5) * S));
      electrons = new THREE.Group();
      pts.forEach(p => { const e = new THREE.Mesh(geo, mat(COLOUR.e, 1, 0.8)); e.scale.setScalar(0.07); e.position.copy(p); e.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02); electrons.add(e); });
      electrons.userData.lim = S / 2;
      lattice.add(electrons);
    } else if (id === 'diamond') {
      const a = 3.4, base = [], fcc = [[0, 0, 0], [0, .5, .5], [.5, 0, .5], [.5, .5, 0]];
      for (const f of fcc) { base.push(f); base.push([f[0] + .25, f[1] + .25, f[2] + .25]); }
      const pos = [];
      for (const b of base) for (const dx of [0, 1]) for (const dy of [0, 1]) for (const dz of [0, 1]) {
        const p = [b[0] + dx, b[1] + dy, b[2] + dz];
        if (p.every(v => v <= 1.0001) && !pos.some(q => q.every((v, i) => Math.abs(v - p[i]) < 1e-6))) pos.push(p);
      }
      const v = pos.map(p => new THREE.Vector3(...p).multiplyScalar(a).sub(new THREE.Vector3(a / 2, a / 2, a / 2)));
      v.forEach(p => lattice.add(sphere('c', p, 1.2)));
      const bl = Math.sqrt(3) / 4 * a;
      for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (Math.abs(v[i].distanceTo(v[j]) - bl) < 0.05) bond(v[i], v[j]);
    } else if (id === 'graphite') {
      const L = 0.95;
      // a honeycomb sheet: a hexagonal lattice with a 2-atom basis
      const sheet = (z, shift) => {
        const a1 = new THREE.Vector3(L * 1.5, L * Math.sqrt(3) / 2, 0), a2 = new THREE.Vector3(L * 1.5, -L * Math.sqrt(3) / 2, 0), out = [];
        for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
          const o = a1.clone().multiplyScalar(i).add(a2.clone().multiplyScalar(j)).add(new THREE.Vector3(shift, 0, z));
          if (Math.hypot(o.x, o.y) < 3.6) { out.push(o); out.push(o.clone().add(new THREE.Vector3(L, 0, 0))); }
        }
        return out;
      };
      const layers = [sheet(-0.9, 0), sheet(0.9, L * 0.5)];
      layers.forEach((pts, li) => {
        pts.forEach(p => lattice.add(sphere('c', p, 1.15)));
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.abs(pts[i].distanceTo(pts[j]) - L) < 0.02) bond(pts[i], pts[j]);
      });
      for (let k = 0; k < 6; k++) { const p = layers[0][k * 3 % layers[0].length]; bond(p, p.clone().add(new THREE.Vector3(0, 0, 1.8)), '#9db4ff', 0.02, true); }
      electrons = new THREE.Group();
      for (let i = 0; i < 40; i++) { const e = new THREE.Mesh(geo, mat(COLOUR.e, 1, 0.8)); e.scale.setScalar(0.07); e.position.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() < 0.5 ? -0.9 : 0.9) + (Math.random() - 0.5) * 0.5); e.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.03, 0); electrons.add(e); }
      lattice.add(electrons);
    }
    group.add(lattice);
    setView(3.5);
  }

  // --- rotation: pointer drag, or a hand grab (gesture events from the engine)
  let drag = null;
  const rot = (dx, dy) => { group.rotation.y += dx * 0.012; group.rotation.x += dy * 0.012; interacted = true; };
  const el = renderer.domElement;
  const startDrag = e => { if (e.target.closest?.('.cr-site')) return; el.setPointerCapture?.(e.pointerId); drag = { x: e.clientX, y: e.clientY }; };
  el.addEventListener('pointerdown', startDrag);
  el.addEventListener('pointermove', e => { if (drag) { rot(e.clientX - drag.x, e.clientY - drag.y); drag = { x: e.clientX, y: e.clientY }; } });
  el.addEventListener('pointerup', () => { drag = null; });
  let hand = null;
  const inside = d => { const r = el.getBoundingClientRect(); return d.x >= r.left && d.x <= r.right && d.y >= r.top && d.y <= r.bottom; };
  const onGrab = e => { if (inside(e.detail) && !document.elementFromPoint(e.detail.x, e.detail.y)?.closest('.cr-site, button')) hand = { id: e.detail.player, x: e.detail.x, y: e.detail.y }; };
  const onMove = e => { if (hand && hand.id === e.detail.player) { rot(e.detail.x - hand.x, e.detail.y - hand.y); hand.x = e.detail.x; hand.y = e.detail.y; } };
  const onRelease = e => { if (hand && hand.id === e.detail.player) hand = null; };
  document.addEventListener('gesture-grab', onGrab);
  document.addEventListener('gesture-move', onMove);
  document.addEventListener('gesture-release', onRelease);

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  setView(S);

  let raf = 0, alive = true;
  const tmp = new THREE.Vector3();
  const frame = () => {
    if (!alive) return;
    if (!interacted && !reducedMotion) group.rotation.y += 0.003;
    if (electrons && !reducedMotion) electrons.children.forEach(e => { e.position.add(e.userData.v); for (const k of ['x', 'y']) if (Math.abs(e.position[k]) > (electrons.userData.lim ?? 3.2)) e.userData.v[k] *= -1; if (Math.abs(e.position.z) > (electrons.userData.lim ?? 3.2)) e.userData.v.z *= -1; });
    group.updateMatrixWorld(true);
    renderer.render(scene, camera);
    if (markersEl.style.display !== 'none') {
      const w = host.clientWidth, h = host.clientHeight;
      markers.forEach(m => {
        tmp.copy(m.pos).applyMatrix4(group.matrixWorld).project(camera);
        m.el.style.left = `${(tmp.x * 0.5 + 0.5) * w}px`;
        m.el.style.top = `${(-tmp.y * 0.5 + 0.5) * h}px`;
        m.el.style.opacity = String(0.5 + 0.5 * (1 - (tmp.z + 1) / 2) ** 0.4);
        m.el.style.zIndex = String(Math.round((1 - tmp.z) * 1000));
      });
    }
    raf = requestAnimationFrame(frame);
  };
  frame();

  /** Id of the marker nearest to a screen point (within maxPx), or null. Used when a particle is dropped. */
  function nearestMarker(x, y, maxPx = 44) {
    let best = null, bd = maxPx;
    markers.forEach((m, id) => { const r = m.el.getBoundingClientRect(); const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y); if (d < bd) { bd = d; best = id; } });
    return best;
  }

  return {
    nearestMarker, setSites, setParticles, repeat, showNeighbours, showStructure, clearLattice,
    setParticleScale(k) { particleScale = k; },
    destroy() {
      alive = false; cancelAnimationFrame(raf); clearTimeout(latticeTimer); ro.disconnect();
      document.removeEventListener('gesture-grab', onGrab); document.removeEventListener('gesture-move', onMove); document.removeEventListener('gesture-release', onRelease);
      renderer.dispose(); host.innerHTML = ''; host.classList.remove('cr-scene');
    },
  };
}
