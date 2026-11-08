// Every ride in the garage, plus the boat you turn into on water.
// r/off: two collision circles (front and back) so the hitbox matches the body.
import * as THREE from './vendor/three.module.min.js';
import { put, rbox, beam, dan, guateFlag, canvasTex, decal, LAVA, INK, SKIN, DISP } from './kit.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function wheel(parent, x, y, z, r, w, front, out) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const m = put(pivot, new THREE.CylinderGeometry(r, r, w, 12).rotateZ(Math.PI / 2), '#22242c');
  put(m, new THREE.CylinderGeometry(r * 0.48, r * 0.48, w + 0.02, 6).rotateZ(Math.PI / 2), '#c9ccd3');
  parent.add(pivot);
  out.push({ pivot, w: m, front, r });
}

function buggy() {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const wheels = [];
  rbox(body, 1.3, 0.38, 2.05, LAVA, 0, 0.5, 0, 0.17);
  rbox(body, 1.05, 0.3, 0.8, '#e04a1d', 0, 0.76, 0.55, 0.12);
  rbox(body, 1.18, 0.16, 0.22, INK, 0, 0.42, 1.08, 0.06);
  rbox(body, 1.18, 0.16, 0.22, INK, 0, 0.42, -1.08, 0.06);
  rbox(body, 1.45, 0.07, 0.42, INK, 0, 1.18, -0.86, 0.03);
  for (const s of [-1, 1]) rbox(body, 0.07, 0.42, 0.07, INK, s * 0.45, 0.95, -0.86, 0.02);
  const glow = new THREE.MeshBasicMaterial({ color: '#fff4d6', toneMapped: false });
  for (const s of [-1, 1]) put(body, new THREE.BoxGeometry(0.22, 0.1, 0.05), glow, s * 0.36, 0.56, 1.04);
  // me, hands on an actual steering wheel
  dan(body, { y: 0.69, z: -0.22, arms: false });
  put(body, new THREE.TorusGeometry(0.17, 0.035, 5, 12), INK, 0, 1.0, 0.22).rotation.x = -1.0;
  for (const s of [-1, 1]) {
    beam(body, V3(s * 0.27, 1.02, -0.2), V3(s * 0.15, 0.99, 0.17), 0.11, '#24314f');
    rbox(body, 0.1, 0.1, 0.1, SKIN, s * 0.14, 0.99, 0.2, 0.03);
  }
  put(body, new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4), INK, 0.5, 1.2, -0.7);
  put(body, new THREE.BoxGeometry(0.02, 0.16, 0.26), LAVA, 0.5, 1.72, -0.82);
  for (const [x, z] of [[0.7, 0.68], [-0.7, 0.68], [0.7, -0.68], [-0.7, -0.68]]) wheel(group, x, 0.36, z, 0.36, 0.32, z > 0, wheels);
  return { group, body, wheels };
}

function moto() {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const wheels = [];
  rbox(body, 0.3, 0.32, 1.2, INK, 0, 0.62, 0, 0.08);
  rbox(body, 0.42, 0.3, 0.55, LAVA, 0, 0.86, 0.18, 0.12);
  rbox(body, 0.36, 0.14, 0.6, '#16171c', 0, 0.86, -0.38, 0.06);
  beam(body, V3(0, 0.95, 0.5), V3(0, 0.4, 0.78), 0.08, '#c9ccd3');
  rbox(body, 0.8, 0.06, 0.06, '#c9ccd3', 0, 1.02, 0.5, 0.02);
  put(body, new THREE.BoxGeometry(0.18, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: '#fff4d6', toneMapped: false }), 0, 0.9, 0.62);
  const me = dan(body, { y: 1.0, z: -0.25, arms: false });
  me.rotation.x = 0.35;
  for (const s of [-1, 1]) beam(body, V3(s * 0.26, 1.28, -0.12), V3(s * 0.36, 1.03, 0.48), 0.11, '#24314f');
  wheel(group, 0, 0.38, 0.78, 0.38, 0.16, true, wheels);
  wheel(group, 0, 0.38, -0.72, 0.38, 0.2, false, wheels);
  return { group, body, wheels, lean: true };
}

let busSign;
function bus() {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const wheels = [];
  // a retired school bus with a second life, painted loud, the way they do it in Guatemala
  rbox(body, 2.2, 0.7, 5.6, '#e8452c', 0, 1.0, -0.4, 0.12);
  rbox(body, 2.22, 0.25, 5.62, '#ffd23f', 0, 1.45, -0.4, 0.05);
  rbox(body, 2.2, 0.9, 5.6, '#2b6fd6', 0, 2.0, -0.4, 0.12);
  rbox(body, 2.24, 0.42, 5.3, '#1a1d26', 0, 2.05, -0.5, 0.06);
  rbox(body, 2.1, 0.18, 5.5, '#f4efe6', 0, 2.52, -0.4, 0.08);
  rbox(body, 1.9, 0.9, 1.1, '#ffd23f', 0, 1.0, 2.75, 0.18);
  rbox(body, 1.4, 0.5, 0.1, '#c9ccd3', 0, 0.95, 3.32, 0.04);
  rbox(body, 1.9, 0.7, 0.1, '#1a1d26', 0, 1.95, 2.36, 0.04);
  busSign ||= canvasTex(512, 96, (g) => { g.fillStyle = '#16171c'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#ffd23f'; g.font = `800 58px ${DISP}`; g.textAlign = 'center'; g.fillText('EXPRESS DAN', 256, 68); });
  decal(body, 1.8, 0.32, busSign, 0, 2.5, 2.37, 0, 0, true);
  for (const s of [-1, 1]) put(body, new THREE.BoxGeometry(0.3, 0.2, 0.05), new THREE.MeshBasicMaterial({ color: '#fff4d6', toneMapped: false }), s * 0.65, 1.15, 3.32);
  // roof rack with luggage (and a bike, obviously)
  rbox(body, 2.0, 0.08, 4.4, '#9aa0ab', 0, 2.72, -0.6, 0.02);
  [['#3a7d44', -0.5, -1.8], ['#c4392f', 0.4, -1.2], ['#ffd23f', -0.3, 0.1], ['#7a4fa0', 0.45, 0.9]].forEach(([c, x, z]) => rbox(body, 0.7, 0.45, 0.8, c, x, 2.98, z, 0.1));
  for (const [x, z] of [[1.0, 2.2], [-1.0, 2.2], [1.0, -2.2], [-1.0, -2.2]]) wheel(group, x, 0.55, z, 0.55, 0.38, z > 0, wheels);
  return { group, body, wheels };
}

function tank() {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  rbox(body, 2.3, 0.85, 3.4, '#5b6b3a', 0, 0.85, 0, 0.18);
  for (const s of [-1, 1]) {
    rbox(body, 0.55, 0.8, 3.8, '#2a2d26', s * 1.32, 0.45, 0, 0.25);
    for (let i = 0; i < 4; i++) put(body, new THREE.CylinderGeometry(0.28, 0.28, 0.6, 8).rotateZ(Math.PI / 2), '#4a4f44', s * 1.33, 0.4, -1.2 + i * 0.8);
  }
  const turret = new THREE.Group(); turret.position.y = 1.5; body.add(turret);
  rbox(turret, 1.6, 0.65, 1.8, '#66783f', 0, 0, -0.1, 0.2);
  put(turret, new THREE.CylinderGeometry(0.14, 0.17, 2.6, 8).rotateX(Math.PI / 2), '#4a5530', 0, 0.05, 1.9);
  dan(turret, { y: 0.0, z: -0.45, arms: false });
  rbox(turret, 0.6, 0.08, 0.6, '#4a5530', 0, 0.56, -0.95, 0.03).rotation.x = -0.9;
  return { group, body, wheels: [], muzzle: V3(0, 1.55, 3.3) };
}

function hiker() {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.13, 0.78, 0); body.add(hip);
    rbox(hip, 0.18, 0.62, 0.2, '#3a3f52', 0, -0.33, 0, 0.05);
    rbox(hip, 0.2, 0.14, 0.3, '#5a3a26', 0, -0.72, 0.04, 0.04);
    legs.push(hip);
  }
  const me = dan(body, { y: 0.78, arms: false, shirt: '#2b8a5a' });
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.32, 1.15, 0); body.add(sh);
    rbox(sh, 0.12, 0.42, 0.12, '#2b8a5a', 0, -0.2, 0, 0.04);
    rbox(sh, 0.11, 0.11, 0.11, SKIN, 0, -0.44, 0, 0.03);
    arms.push(sh);
  }
  rbox(body, 0.5, 0.62, 0.3, LAVA, 0, 1.08, -0.32, 0.1);
  put(body, new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8).rotateZ(Math.PI / 2), '#2bb3a3', 0, 1.45, -0.32);
  me.userData.head.rotation.x = 0.05;
  return { group, body, wheels: [], legs, arms };
}

function duck() {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  put(body, new THREE.SphereGeometry(0.85, 8, 6), '#ffd23f', 0, 0.85, 0).scale.set(1, 0.8, 1.25);
  put(body, new THREE.SphereGeometry(0.5, 8, 6), '#ffd23f', 0, 1.6, 0.55);
  put(body, new THREE.ConeGeometry(0.2, 0.45, 6).rotateX(Math.PI / 2), '#ff8a1f', 0, 1.55, 1.1);
  for (const s of [-0.22, 0.22]) put(body, new THREE.BoxGeometry(0.08, 0.1, 0.04), '#16161a', s, 1.72, 0.98);
  return { group, body, wheels: [] };
}

function boat() {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  rbox(body, 1.7, 0.7, 3.6, '#f7f3ea', 0, 0.05, 0, 0.3);
  rbox(body, 1.74, 0.16, 3.64, '#2bb3a3', 0, 0.18, 0, 0.05);
  rbox(body, 1.3, 0.1, 2.6, '#a57a4f', 0, 0.38, -0.1, 0.03);
  put(body, new THREE.CylinderGeometry(0.07, 0.07, 4.6, 5), '#6b4a32', 0, 2.6, 0.5);
  const sail = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0.6, -1.3, 0, 4.7, 0.45, 0, 0.6, 0.45], 3));
  sail.computeVertexNormals();
  put(body, sail, new THREE.MeshStandardMaterial({ color: '#fff8ea', side: THREE.DoubleSide, flatShading: true }), 0.04, 0, 0);
  guateFlag(body, 0, 4.7, 0.5, 0.5, 0.4);
  dan(body, { y: 0.45, z: -0.9, arms: false });
  return { group, body, wheels: [] };
}

export const VEHICLES = {
  buggy: { build: buggy, r: 0.78, off: 0.55, max: 14, boost: 21, accel: 26, turn: 2.9, mass: 1.5 },
  moto: { build: moto, r: 0.5, off: 0.5, max: 17, boost: 25, accel: 30, turn: 3.2, mass: 1 },
  bus: { build: bus, r: 1.2, off: 1.9, max: 11, boost: 15, accel: 14, turn: 1.9, mass: 6, cam: 1.25 },
  tank: { build: tank, r: 1.35, off: 0.8, max: 9, boost: 12, accel: 16, turn: 2.2, mass: 10, cam: 1.8, cannon: true },
  hiker: { build: hiker, r: 0.45, off: 0, max: 6.5, boost: 10, accel: 32, turn: 4.5, mass: 0.8, cam: 0.85 },
  duck: { build: duck, r: 0.85, off: 0.3, max: 12, boost: 18, accel: 22, turn: 3, mass: 1.2 },
  boat: { build: boat, r: 0.85, off: 1, max: 11, boost: 15, accel: 13, turn: 2.1, mass: 2, cam: 1.15 },
};
export const GARAGE = ['buggy', 'moto', 'bus', 'tank', 'hiker', 'duck'];
