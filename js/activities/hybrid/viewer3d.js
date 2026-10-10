// 3D ball-and-stick view (Three.js, bundled for offline use). Rotate by dragging, or by grabbing with a hand.
import * as THREE from '../../../vendor/three/three.module.js';
import { atomOf, neighbours, groupsOf, shapeOf } from './rules.js';

const RADIUS = { H: 0.22, C: 0.34, N: 0.32, O: 0.3, B: 0.34, F: 0.28, Cl: 0.42, Be: 0.34 };
const COLOUR = { H: '#e8eef6', C: '#2fb3a8', N: '#9db4ff', O: '#fc7a7a', B: '#ffb938', F: '#c8f53d', Cl: '#7fd957', Be: '#d4a5ff' };
const v3 = a => new THREE.Vector3(...a);

/** Returns a viewer, or null when this device has no WebGL. */
export function createViewer(host, mol, { reducedMotion = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch { return null; }
  if (!renderer.getContext()) return null;
  host.innerHTML = '';
  host.classList.add('hy-viewer');
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  host.appendChild(renderer.domElement);
  renderer.domElement.className = 'hy-viewer__canvas';
  const tag = document.createElement('div');
  tag.className = 'hy-viewer__angle';
  tag.hidden = true;
  host.appendChild(tag);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(3, 4, 5);
  scene.add(sun);
  const group = new THREE.Group();
  scene.add(group);
  group.rotation.set(0.35, -0.5, 0);

  const central = atomOf(mol, mol.central);
  const cpos = v3(central.xyz);
  const pos = id => v3(atomOf(mol, id).xyz);
  const mat = (color, opacity = 1, emissive = 0) => new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: 0.45, emissive: new THREE.Color(color), emissiveIntensity: emissive });

  // atoms and bonds
  for (const a of mol.atoms) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(RADIUS[a.el] ?? 0.3, 32, 20), mat(COLOUR[a.el] ?? '#aaa'));
    m.position.copy(v3(a.xyz));
    group.add(m);
  }
  for (const b of mol.bonds) {
    const A = pos(b.a), B = pos(b.b), dir = B.clone().sub(A), len = dir.length();
    dir.normalize();
    let perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1));
    if (perp.lengthSq() < 1e-4) perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    perp.normalize();
    for (let i = 0; i < b.order; i++) {
      const off = (i - (b.order - 1) / 2) * 0.16;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, len, 12), mat('#c9d6e2'));
      c.position.copy(A.clone().add(B).multiplyScalar(0.5).add(perp.clone().multiplyScalar(off)));
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      group.add(c);
    }
  }

  // hybrid lobes on the central atom: one per electron group (bond directions + lone pairs)
  const dirs = neighbours(mol, mol.central).map(({ other }) => pos(other.id).sub(cpos).normalize());
  const bondDirs = dirs.map(d => d.clone());
  (mol.lp3d || []).forEach(d => dirs.push(v3(d).normalize()));
  const lobes = new THREE.Group();
  dirs.forEach((d, i) => {
    const isLone = i >= bondDirs.length;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), mat(isLone ? '#fc7a7a' : '#d4ff3a', 0.5, 0.25));
    m.scale.set(1.15, 0.55, 0.55);
    m.position.copy(cpos).add(d.clone().multiplyScalar(0.62));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
    lobes.add(m);
  });
  group.add(lobes);

  // leftover p orbitals (π bonds): axes perpendicular to the sigma framework
  const axes = [];
  if (dirs.length === 3) axes.push(new THREE.Vector3().crossVectors(bondDirs[0], bondDirs[1]).normalize());
  if (dirs.length === 2) {
    const a = bondDirs[0].clone();
    const u = Math.abs(a.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const p1 = new THREE.Vector3().crossVectors(a, u).normalize();
    axes.push(p1, new THREE.Vector3().crossVectors(a, p1).normalize());
  }
  const pGroup = new THREE.Group();
  const dumbbell = (at, axis) => {
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), mat('#2dd4bf', 0.5, 0.5));
      m.scale.set(0.5, 1.0, 0.5);
      m.position.copy(at).add(axis.clone().multiplyScalar(0.5 * s));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
      pGroup.add(m);
    }
  };
  let free = [...axes];
  const centralHasPi = neighbours(mol, mol.central).some(x => x.bond.order > 1);
  neighbours(mol, mol.central).forEach(({ bond, other }) => {
    for (let k = 0; k < bond.order - 1 && free.length; k++) { const ax = free.shift(); dumbbell(cpos, ax); dumbbell(pos(other.id), ax); }
  });
  free.forEach(ax => dumbbell(cpos, ax)); // empty p orbitals (BF3, BeCl2) glow on the central atom only
  group.add(pGroup);

  // bond angle arc between the first two bonds
  const angle = new THREE.Group();
  const angleText = shapeOf(mol, mol.central)?.angle ?? '';
  let arcMid = cpos.clone();
  if (bondDirs.length >= 2) {
    const a = bondDirs[0], b = bondDirs[1], pts = [];
    const ang = a.angleTo(b), axis = new THREE.Vector3().crossVectors(a, b).normalize();
    for (let i = 0; i <= 24; i++) pts.push(cpos.clone().add(a.clone().applyAxisAngle(axis, (ang * i) / 24).multiplyScalar(0.9)));
    angle.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#ffffff' })));
    arcMid = pts[12];
  }
  angle.visible = false;
  group.add(angle);

  const radius = Math.max(...mol.atoms.map(a => v3(a.xyz).distanceTo(cpos)), 1) + 1.1;
  camera.position.set(0, 0, radius * 3.1);

  // --- rotation: pointer drag, or a hand grab (gesture events from the engine)
  let drag = null, interacted = false;
  const rot = (dx, dy) => { group.rotation.y += dx * 0.012; group.rotation.x += dy * 0.012; interacted = true; };
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY }; });
  el.addEventListener('pointermove', e => { if (drag) { rot(e.clientX - drag.x, e.clientY - drag.y); drag = { x: e.clientX, y: e.clientY }; } });
  el.addEventListener('pointerup', () => { drag = null; });
  let hand = null;
  const inside = d => { const r = el.getBoundingClientRect(); return d.x >= r.left && d.x <= r.right && d.y >= r.top && d.y <= r.bottom; };
  const onGrab = e => { if (inside(e.detail)) hand = { id: e.detail.player, x: e.detail.x, y: e.detail.y }; };
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

  let raf = 0, alive = true;
  const tmp = new THREE.Vector3();
  const frame = () => {
    if (!alive) return;
    if (!interacted && !reducedMotion) group.rotation.y += 0.004;
    renderer.render(scene, camera);
    if (angle.visible) {
      tmp.copy(arcMid).applyMatrix4(group.matrixWorld).project(camera);
      tag.style.left = `${(tmp.x * 0.5 + 0.5) * host.clientWidth}px`;
      tag.style.top = `${(-tmp.y * 0.5 + 0.5) * host.clientHeight - 28}px`;
    }
    raf = requestAnimationFrame(frame);
  };
  frame();

  return {
    hasPi: centralHasPi || axes.length > 0,
    setLobes: on => { lobes.visible = on; },
    setPi: on => { pGroup.visible = on; },
    setAngle(on) { angle.visible = on; tag.hidden = !on; tag.textContent = angleText; },
    destroy() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      document.removeEventListener('gesture-grab', onGrab); document.removeEventListener('gesture-move', onMove); document.removeEventListener('gesture-release', onRelease);
      renderer.dispose(); host.innerHTML = ''; host.classList.remove('hy-viewer');
    },
  };
}
