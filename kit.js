// Small building blocks shared by the world and the vehicles.
import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

export const LAVA = '#ff5a2a', INK = '#1d2030', CREAM = '#f4efe6';
export const MONO = '"IBM Plex Mono", monospace', HAND = '"Caveat", cursive', DISP = '"Archivo", sans-serif';
export const SKIN = '#c8895a', HAIR = '#141012';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
export const gauss = (dx, dz, s) => Math.exp(-(dx * dx + dz * dz) / (2 * s * s));
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const mats = {};
export function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  return mats[k] ||= new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...o });
}
export function put(parent, geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, typeof material === 'string' ? mat(material) : material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function rbox(parent, w, h, d, color, x, y, z, r = 0.14) {
  r = Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01);
  return put(parent, new RoundedBoxGeometry(w, h, d, 2, Math.max(r, 0.005)), color, x, y, z);
}
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export function decal(parent, w, h, tex, x, y, z, rx = 0, ry = 0, basic = false) {
  const m = basic
    ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
    : new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9 });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  p.position.set(x, y, z);
  p.rotation.set(rx, ry, 0, 'YXZ');
  p.receiveShadow = !basic;
  parent.add(p);
  return p;
}
export function label(text, { w = 512, h = 128, bg = null, fg = INK, font = `700 64px ${DISP}`, lines } = {}) {
  return canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ls = lines || [text];
    ls.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (ls.length - 1) / 2) * h / (ls.length + 0.6)));
  });
}
// a box stretched between two points, oriented in the parent's space
export function beam(parent, a, b, thick, color) {
  const m = rbox(parent, thick, thick, a.distanceTo(b), color, 0, 0, 0, thick * 0.3);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.clone().sub(a).normalize());
  return m;
}
export function sticky(parent, text, color, x, y, z, rot = 0, size = 3.2) {
  const t = canvasTex(256, 256, (g) => {
    g.fillStyle = color; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 0, 256, 34);
    g.fillStyle = '#2a2622'; g.font = `600 44px ${HAND}`; g.textBaseline = 'top';
    text.split('\n').forEach((l, i) => g.fillText(l, 22, 46 + i * 46));
  });
  const p = decal(parent, size, size, t, x, y, z);
  p.rotation.z = rot;
  return p;
}
// Guatemalan flag: sky blue / white / sky blue, with a little green wreath
let gtTex;
export function guateFlag(parent, x, y, z, h = 4, s = 1) {
  gtTex ||= canvasTex(240, 150, (g) => {
    g.fillStyle = '#4997d0'; g.fillRect(0, 0, 240, 150);
    g.fillStyle = '#fff'; g.fillRect(80, 0, 80, 150);
    g.strokeStyle = '#3c8a4a'; g.lineWidth = 8; g.beginPath(); g.arc(120, 78, 22, 0.3, Math.PI * 2 - 0.3 + Math.PI); g.stroke();
  });
  const pole = new THREE.Group(); pole.position.set(x, y, z); parent.add(pole);
  put(pole, new THREE.CylinderGeometry(0.07 * s, 0.07 * s, h, 5), '#d9d4c7', 0, h / 2, 0);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(1.8 * s, 1.1 * s), new THREE.MeshStandardMaterial({ map: gtTex, side: THREE.DoubleSide, roughness: 0.8 }));
  f.geometry.translate(0.9 * s, 0, 0);
  f.position.y = h - 0.6 * s;
  f.castShadow = true;
  pole.add(f);
  return f; // the cloth, so the world can wave it
}
// Blocky me: black hair, caramel skin, brown eyes
export function dan(parent, { x = 0, y = 0, z = 0, shirt = '#24314f', arms = true, skin = SKIN, hair = HAIR } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  rbox(g, 0.5, 0.42, 0.34, shirt, 0, 0.21, 0, 0.08);
  const head = new THREE.Group(); head.position.y = 0.62; g.add(head);
  rbox(head, 0.4, 0.4, 0.38, skin, 0, 0, 0, 0.08);
  rbox(head, 0.44, 0.13, 0.42, hair, 0, 0.23, -0.02, 0.05);
  rbox(head, 0.44, 0.24, 0.12, hair, 0, 0.1, -0.2, 0.04);
  for (const s of [-1, 1]) put(head, new THREE.BoxGeometry(0.06, 0.07, 0.02), '#3a2214', s * 0.09, 0.03, 0.195);
  g.userData.head = head;
  if (arms) for (const s of [-1, 1]) rbox(g, 0.12, 0.34, 0.12, shirt, s * 0.31, 0.22, 0.02, 0.04);
  return g;
}
// a standing person (for the plaza, the goal, etc.)
export function person(parent, { x = 0, z = 0, shirt = '#c4392f', pants = '#2a2d36', skin = '#b07850', hair = HAIR } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  for (const s of [-1, 1]) rbox(g, 0.18, 0.7, 0.2, pants, s * 0.13, 0.35, 0, 0.05);
  dan(g, { y: 0.7, shirt, skin, hair });
  return g;
}
