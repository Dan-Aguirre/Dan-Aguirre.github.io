// The 3D part: the desk at 3am, and an island outside the window.
// Physics is hand-rolled arcade stuff: circles and boxes on a height function. No engine needed.
import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { LAVA, INK, CREAM, MONO, HAND, DISP, clamp, lerp, smooth, gauss, rng, mat, put, rbox, canvasTex, decal, label, beam, sticky, guateFlag, person } from './kit.js';
import { VEHICLES } from './vehicles.js';
import { sfx, engine, salsa, beat } from './audio.js';

const WATER = -0.7;
const MAPN = 96;

function buildFlag() {
  const g = new THREE.Group();
  put(g, new THREE.CylinderGeometry(0.05, 0.05, 1.8, 5), INK, 0, 0.9, 0);
  const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.95, -0.3), new THREE.Vector2(0, -0.6)]);
  put(g, new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: LAVA, emissive: LAVA, emissiveIntensity: 0.5, side: THREE.DoubleSide, flatShading: true }), 0.05, 1.75, 0);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.95, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: LAVA, transparent: true, opacity: 0.5, toneMapped: false }));
  ring.position.y = 0.04;
  g.add(ring);
  g.userData.ring = ring;
  return g;
}

// flag stickers for the laptop
function stickerTex(kind) {
  return canvasTex(96, 64, (g) => {
    if (kind === 'gt') { g.fillStyle = '#4997d0'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#fff'; g.fillRect(32, 0, 32, 64); }
    if (kind === 'co') { g.fillStyle = '#fcd116'; g.fillRect(0, 0, 96, 32); g.fillStyle = '#003893'; g.fillRect(0, 32, 96, 16); g.fillStyle = '#ce1126'; g.fillRect(0, 48, 96, 16); }
    if (kind === 'cu') {
      for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#fff' : '#002a8f'; g.fillRect(0, i * 12.8, 96, 12.8); }
      g.fillStyle = '#cf142b'; g.beginPath(); g.moveTo(0, 0); g.lineTo(48, 32); g.lineTo(0, 64); g.fill();
      g.fillStyle = '#fff'; g.font = '20px sans-serif'; g.fillText('★', 6, 39);
    }
  });
}

function bird(parent, quetzal) {
  const g = new THREE.Group(); parent.add(g);
  const body = quetzal ? '#1f9a5a' : '#3a3f52';
  put(g, new THREE.IcosahedronGeometry(0.32, 0), body).scale.set(0.9, 0.9, 1.3);
  put(g, new THREE.IcosahedronGeometry(0.22, 0), body, 0, 0.18, 0.32);
  put(g, new THREE.ConeGeometry(0.07, 0.18, 4).rotateX(Math.PI / 2), '#ffd23f', 0, 0.16, 0.55);
  if (quetzal) {
    put(g, new THREE.IcosahedronGeometry(0.2, 0), '#d6262f', 0, -0.12, 0.08);
    for (const s of [-1, 1]) rbox(g, 0.07, 0.03, 1.6, '#1f9a5a', s * 0.05, -0.05, -1.1, 0.01).rotation.x = -0.25;
  }
  const wings = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.22, 0.05, 0); g.add(pv);
    rbox(pv, 0.6, 0.05, 0.4, body, s * 0.3, 0, 0, 0.02);
    wings.push(pv);
  }
  return { g, wings };
}

// a plain 2D canvas (for the minimap), not a texture
function canvas2d(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }

// ======================================================================
export function createWorld(canvas, opts) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.6 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 900);
  const sun = new THREE.DirectionalLight('#fff', 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 180 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  const hemi = new THREE.HemisphereLight();
  scene.add(sun, sun.target, hemi);

  // shared particle pool (confetti, dust, sparks, explosions)
  const PN = 420;
  const parts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({ toneMapped: false }), PN);
  parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  parts.frustumCulled = false;
  const P = Array.from({ length: PN }, () => ({ life: 0 }));
  const dummy = new THREE.Object3D(), tmpC = new THREE.Color();
  for (let i = 0; i < PN; i++) { dummy.scale.setScalar(0); dummy.updateMatrix(); parts.setMatrixAt(i, dummy.matrix); parts.setColorAt(i, tmpC.set('#fff')); }
  scene.add(parts);
  let pi = 0;
  function burst(x, y, z, n, colors, speed = 8, life = 1.6, up = 8, size = 1) {
    for (let k = 0; k < n; k++) {
      const p = P[pi = (pi + 1) % PN];
      Object.assign(p, { x, y, z, vx: (Math.random() - 0.5) * speed, vy: Math.random() * up + (up > 2 ? 2 : 0), vz: (Math.random() - 0.5) * speed, life, max: life, rx: Math.random() * 6, s: (0.6 + Math.random() * 0.8) * size });
      parts.setColorAt(pi, tmpC.set(colors[k % colors.length]));
    }
    parts.instanceColor.needsUpdate = true;
  }
  function stepParts(dt) {
    for (let i = 0; i < PN; i++) {
      const p = P[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= 18 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.rx += dt * 8;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.rx * 0.7, 0);
      dummy.scale.setScalar(p.life > 0 ? p.s * Math.min(1, p.life / (p.max * 0.4)) : 0);
      dummy.updateMatrix();
      parts.setMatrixAt(i, dummy.matrix);
    }
    parts.instanceMatrix.needsUpdate = true;
  }

  // guide arrow: points at the next suggested stop
  const guide = new THREE.Group();
  const chev = new THREE.Shape([new THREE.Vector2(-0.7, -0.5), new THREE.Vector2(0, 0.6), new THREE.Vector2(0.7, -0.5), new THREE.Vector2(0, -0.15)]);
  const guideM = new THREE.MeshBasicMaterial({ color: LAVA, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false });
  for (let i = 0; i < 2; i++) guide.add(new THREE.Mesh(new THREE.ShapeGeometry(chev).rotateX(-Math.PI / 2), guideM));
  scene.add(guide);
  let guideId = null;

  // shared state the builders use
  const houses = [], shells = [], falling = [];
  let felled = 0;

  const W = { desk: buildDesk(), out: buildOutside() };
  for (const k in W) scene.add(W[k].group);

  // ---------- the vehicle ----------
  const carG = new THREE.Group();
  scene.add(carG);
  let chosen = 'buggy';
  try { const s = localStorage.getItem('dan.ride'); if (VEHICLES[s] && s !== 'boat') chosen = s; } catch {}
  let kind = null, veh = null;
  const V = () => VEHICLES[kind];
  function useKind(k) {
    if (k === kind) return;
    kind = k;
    if (veh) carG.remove(veh.group);
    veh = VEHICLES[k].build();
    carG.add(veh.group);
    veh.dist = 0;
  }

  const car = { x: 0, z: 0, y: 0, a: Math.PI, speed: 0, vx: 0, vz: 0, vy: 0, grounded: true, steer: 0, squash: 0 };
  let cur = 'desk', controls = false, intro = true, busy = false, activeZone = null, zoom = 1, time = 0, shake = 0;
  let destroying = null, fishing = 0, dustT = 0, cool = 0;
  const camPos = new THREE.Vector3(0, 30, 40), camLook = new THREE.Vector3();

  // explored map (fog of war), saved per world
  const explored = {};
  for (const k in W) {
    explored[k] = new Uint8Array(MAPN * MAPN);
    try { const s = localStorage.getItem('dan.map.' + k); if (s && s.length === MAPN * MAPN) for (let i = 0; i < s.length; i++) explored[k][i] = s.charCodeAt(i) === 49 ? 1 : 0; } catch {}
  }
  let mapDirty = false;
  function markExplored() {
    const [x0, z0, x1, z1] = W[cur].bounds, e = explored[cur];
    const cx = Math.floor((car.x - x0) / (x1 - x0) * MAPN), cz = Math.floor((car.z - z0) / (z1 - z0) * MAPN), R = cur === 'desk' ? 5 : 4;
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
      if (i * i + j * j > R * R) continue;
      const x = cx + i, z = cz + j;
      if (x < 0 || z < 0 || x >= MAPN || z >= MAPN) continue;
      if (!e[z * MAPN + x]) { e[z * MAPN + x] = 1; mapDirty = true; }
    }
  }
  setInterval(() => {
    if (!mapDirty) return;
    mapDirty = false;
    try { for (const k in W) localStorage.setItem('dan.map.' + k, Array.from(explored[k]).join('')); } catch {}
  }, 4000);

  // HTML labels above things
  const labelEls = [];
  for (const k in W) for (const z of W[k].zones) {
    if (!z.ly) continue;
    const el = document.createElement('div');
    el.className = 'tag' + (z.r ? '' : ' far');
    opts.labelsEl.appendChild(el);
    labelEls.push({ el, z, world: k, v: new THREE.Vector3(z.lx ?? z.x, z.ly, z.lz ?? z.z) });
  }
  function refreshLabels() { for (const l of labelEls) l.el.textContent = opts.labelFor(l.z.id); }
  refreshLabels();

  function setWorld(name) {
    cur = name;
    const w = W[name];
    for (const k in W) W[k].group.visible = k === name;
    scene.fog = new THREE.Fog(w.env.fog, w.env.fogNear, w.env.fogFar);
    hemi.color.set(w.env.hemi[0]); hemi.groundColor.set(w.env.hemi[1]); hemi.intensity = w.env.hemi[2];
    sun.color.set(w.env.sun[0]); sun.intensity = w.env.sun[1];
    renderer.toneMappingExposure = w.env.exposure;
    document.body.dataset.world = name;
    if (name !== 'out') salsa(false);
    if (kind === 'boat') { useKind(chosen); opts.onBoat?.(false); }
    opts.onWorld?.(name);
  }
  function place(x, z, a, world = cur, drop = 0) {
    if (world !== cur) setWorld(world);
    const g = W[world].ground(x, z) ?? 0;
    Object.assign(car, { x, z, a, y: g + drop, speed: 0, vx: 0, vz: 0, vy: 0, grounded: !drop, steer: 0 });
    carG.position.set(x, car.y, z);
    if (!drop) { camPos.set(x, g + 30, z + 34); camLook.set(x, g, z); }
  }
  function transition(to, x, z, a) {
    if (busy) return;
    busy = true;
    sfx('whoosh');
    opts.onTransition(to, () => {
      const s = W[to].spawn;
      place(x ?? s.x, z ?? s.z, a ?? s.a, to);
      renderer.compile(scene, camera);
    }, () => { busy = false; });
  }
  function fell() {
    opts.onToast('fell');
    const s = W[cur].spawn;
    place(s.x, s.z, s.a);
  }

  // ---------- physics ----------
  function push(px, pz, r, c) {
    if (c.r !== undefined) {
      const dx = px - c.x, dz = pz - c.z, m = r + c.r;
      if (dx > m || dx < -m || dz > m || dz < -m) return null;
      const d = Math.hypot(dx, dz);
      if (d >= m || d < 1e-6) return null;
      return [dx / d * (m - d), dz / d * (m - d)];
    }
    const qx = clamp(px, c.x - c.hw, c.x + c.hw), qz = clamp(pz, c.z - c.hd, c.z + c.hd);
    const dx = px - qx, dz = pz - qz, d = Math.hypot(dx, dz);
    if (d >= r) return null;
    if (d > 1e-6) return [dx / d * (r - d), dz / d * (r - d)];
    const ox = c.hw + r - Math.abs(px - c.x), oz = c.hd + r - Math.abs(pz - c.z);
    return ox < oz ? [Math.sign(px - c.x || 1) * ox, 0] : [0, Math.sign(pz - c.z || 1) * oz];
  }
  // the hitbox: a circle at the front, middle and back, so the nose doesn't clip into things
  const circles = () => { const v = V(), fx = Math.sin(car.a) * v.off, fz = Math.cos(car.a) * v.off; return v.off ? [[fx, fz], [0, 0], [-fx, -fz]] : [[0, 0]]; };

  function fellTree(t, dx, dz) {
    if (!t || t.fall >= 0) return;
    const l = Math.hypot(dx, dz) || 1;
    t.fall = 0; t.angV = 0.5; t.ax = dz / l; t.az = -dx / l;
    t.col.dead = true;
    falling.push(t);
    sfx('crash');
    burst(t.x, t.y + 2.5 * t.s, t.z, 14, ['#3b7a4c', '#6b4a32', '#7cb85a'], 5, 1, 5);
    if (++felled === 10) opts.onAchieve?.('lumber');
  }
  function collapse(h) {
    if (!h.alive) return;
    h.alive = false; h.t = 0;
    h.cols.forEach(c => { c.dead = true; });
    burst(h.x, 3, h.z, 50, [h.color, '#b4553a', '#f7efe0', '#7a7a7a'], 14, 1.6, 10, 1.6);
    sfx('boom');
  }

  function stepCar(dt, inp) {
    const w = W[cur], v = V();
    let thr = (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
    let st = (inp.left ? 1 : 0) - (inp.right ? 1 : 0);
    if (inp.joy.active) {
      // touch/drag: steer toward the drag direction on screen (camera never rotates, so screen = world)
      const mag = Math.min(1, Math.hypot(inp.joy.x, inp.joy.y));
      if (mag > 0.15) {
        const want = Math.atan2(inp.joy.x, inp.joy.y);
        const diff = Math.atan2(Math.sin(want - car.a), Math.cos(want - car.a));
        st = clamp(diff * 2.2, -1, 1);
        thr = mag * (Math.abs(diff) > 2.6 && car.speed < 1 ? -0.6 : 1);
      } else thr = st = 0;
    }
    if (!controls || busy) thr = st = 0;
    const water = kind === 'boat';
    const max = inp.boost ? v.boost : v.max;
    const fx = Math.sin(car.a), fz = Math.cos(car.a);
    if (car.grounded) {
      if (thr > 0) car.speed += (car.speed < 0 ? 42 : v.accel) * thr * dt;
      else if (thr < 0) car.speed -= (car.speed > 0 ? 42 : v.accel * 0.7) * -thr * dt;
      else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), (water ? 4 : 9) * dt);
      if (inp.brake && controls) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 50 * dt);
      if (car.speed > max) car.speed = Math.max(max, car.speed - 24 * dt);
      car.speed = Math.max(car.speed, -v.max * 0.5);
      if (!water) {
        const g0 = w.ground(car.x, car.z), g1 = w.ground(car.x + fx * 0.6, car.z + fz * 0.6);
        if (g0 !== null && g1 !== null) car.speed -= clamp((g1 - g0) / 0.6, -1.5, 1.5) * 14 * dt;
      }
    }
    car.steer += (st - car.steer) * Math.min(1, dt * 12);
    car.a += v.turn * car.steer * dt * clamp(car.speed / 2.5, -1, 1) * (car.grounded ? 1 : 0.35);
    const grip = water ? 1.8 : car.grounded ? (inp.brake ? 3.5 : 12) : 0.4;
    const k = 1 - Math.exp(-grip * dt);
    car.vx += (Math.sin(car.a) * car.speed - car.vx) * k;
    car.vz += (Math.cos(car.a) * car.speed - car.vz) * k;
    car.x += car.vx * dt; car.z += car.vz * dt;

    // the island wraps around: sail off one edge, come back on the other
    if (cur === 'out') {
      const [x0, z0, x1, z1] = w.bounds;
      let sx = 0, sz = 0;
      if (car.x > x1) sx = x0 - x1; else if (car.x < x0) sx = x1 - x0;
      if (car.z > z1) sz = z0 - z1; else if (car.z < z0) sz = z1 - z0;
      if (sx || sz) { car.x += sx; car.z += sz; camPos.x += sx; camPos.z += sz; camLook.x += sx; camLook.z += sz; opts.onAchieve?.('wrap'); }
    }

    const cs = circles();
    for (const c of w.colliders) {
      if (c.dead || (c.h !== undefined && car.y > c.h)) continue;
      for (const [ox, oz] of cs) {
        const p = push(car.x + ox, car.z + oz, v.r, c);
        if (!p) continue;
        if (c.tree && Math.abs(car.speed) > (v.cannon ? 2 : 7)) { fellTree(c.tree, car.vx, car.vz); car.speed *= v.cannon ? 0.95 : 0.6; break; }
        car.x += p[0]; car.z += p[1];
        const l = Math.hypot(p[0], p[1]), ux = p[0] / l, uz = p[1] / l;
        const vn = car.vx * ux + car.vz * uz;
        if (vn < 0) {
          car.vx -= 1.3 * vn * ux; car.vz -= 1.3 * vn * uz;
          car.speed *= 1 - Math.abs(fx * ux + fz * uz) * 0.85;
          if (-vn > 3) { sfx('bump', -vn / 14); car.squash = Math.min(0.25, -vn / 50); }
        }
      }
    }

    const g = w.ground(car.x, car.z);
    if (cur === 'out') {
      if (!water && g < WATER - 0.3) {
        useKind('boat'); opts.onBoat?.(true);
        burst(car.x, WATER + 0.3, car.z, 30, ['#ffffff', '#bfe9f0', '#2fa8b0'], 7, 1.1, 7);
        sfx('splash');
      } else if (water && g > WATER - 0.1) { useKind(chosen); opts.onBoat?.(false); }
    }
    if (kind === 'boat') {
      car.grounded = true; car.vy = 0;
      car.y += (WATER + 0.05 + Math.sin(time * 2) * 0.06 - car.y) * Math.min(1, dt * 6);
      return;
    }
    if (g === null) car.grounded = false;
    else if (car.grounded) {
      if (g < car.y - 0.35) { car.grounded = false; if (car.vy > 1) car.vy *= 1.6; } // ramps launch you a bit extra
      else { car.vy = clamp((g - car.y) / dt, -12, 12); car.y = g; }
    }
    if (!car.grounded) {
      car.vy -= 32 * dt;
      car.y += car.vy * dt;
      if (g !== null && car.y <= g) {
        if (car.vy < -6) { sfx('land', Math.min(1, -car.vy / 20)); car.squash = Math.min(0.3, -car.vy / 60); burst(car.x, g + 0.2, car.z, 8, cur === 'out' ? ['#c9a26b', '#a8865a'] : ['#e8d8c0'], 4, 0.6, 2); }
        car.y = g; car.vy = 0; car.grounded = true;
      }
      if (car.y < -28) fell();
    }
  }

  function stepBodies(dt) {
    const w = W[cur], v = V(), cs = circles();
    for (const b of w.bodies) {
      if (b.wander && Math.random() < dt * 0.6) { const a = Math.random() * 6.28; b.vx += Math.cos(a) * 1.5; b.vz += Math.sin(a) * 1.5; }
      for (const [ox, oz] of cs) {
        const px = car.x + ox, pz = car.z + oz;
        const dx = b.x - px, dz = b.z - pz, m = b.r + v.r;
        if (dx > m || dx < -m || dz > m || dz < -m) continue;
        const d = Math.hypot(dx, dz);
        if (d >= m || d < 1e-6 || Math.abs(b.y - car.y) > 1.6) continue;
        const ux = dx / d, uz = dz / d, pen = m - d, share = b.mass / (b.mass + v.mass);
        b.x += ux * pen * (1 - share); b.z += uz * pen * (1 - share);
        car.x -= ux * pen * share; car.z -= uz * pen * share;
        const cv = car.vx * ux + car.vz * uz, bv = b.vx * ux + b.vz * uz;
        if (cv > bv) {
          const j = (cv - bv) * (1 + b.bounce) * v.mass / (v.mass + b.mass) * 1.5;
          b.vx += ux * j; b.vz += uz * j;
          car.speed *= 1 - 0.6 * share;
          b.spinV = (Math.random() - 0.5) * j * 2;
          if (b.hop && j > 2) { b.vy = j * b.hop; b.grounded = false; }
          if (j > 1.5) sfx(b.sound || 'bump', Math.min(1, j / 20));
        }
      }
      const f = Math.exp(-b.drag * dt);
      b.vx *= f; b.vz *= f;
      b.x += b.vx * dt; b.z += b.vz * dt;
      const moving = Math.abs(b.vx) + Math.abs(b.vz) > 0.01 || !b.grounded;
      if (moving) for (const c of w.colliders) {
        if (c.dead || (c.h !== undefined && b.y > c.h)) continue;
        const p = push(b.x, b.z, b.r, c);
        if (!p) continue;
        b.x += p[0]; b.z += p[1];
        const l = Math.hypot(p[0], p[1]), ux = p[0] / l, uz = p[1] / l, vn = b.vx * ux + b.vz * uz;
        if (vn < 0) { b.vx -= (1 + b.bounce) * vn * ux; b.vz -= (1 + b.bounce) * vn * uz; }
      }
      for (const o of w.bodies) {
        if (o === b) continue;
        const ex = b.x - o.x, ez = b.z - o.z, mm = b.r + o.r;
        if (ex > mm || ex < -mm || ez > mm || ez < -mm) continue;
        const e = Math.hypot(ex, ez);
        if (e >= mm || e < 1e-6) continue;
        const ux = ex / e, uz = ez / e, sb = o.mass / (b.mass + o.mass);
        b.x += ux * (mm - e) * sb; b.z += uz * (mm - e) * sb; o.x -= ux * (mm - e) * (1 - sb); o.z -= uz * (mm - e) * (1 - sb);
        const rel = (b.vx - o.vx) * ux + (b.vz - o.vz) * uz;
        if (rel < 0) { b.vx -= rel * ux * 2 * sb; b.vz -= rel * uz * 2 * sb; o.vx += rel * ux * 2 * (1 - sb); o.vz += rel * uz * 2 * (1 - sb); }
      }
      let g = w.ground(b.x, b.z);
      if (g !== null && b.floats && g < WATER) g = WATER - 0.2;
      if (g !== null && b.grounded) {
        if (g < b.y - 0.3) b.grounded = false; else { b.y = g; b.vy = 0; }
      }
      if (g === null) b.grounded = false;
      if (!b.grounded) {
        b.vy -= 30 * dt;
        b.y += b.vy * dt;
        if (g !== null && b.y <= g) {
          b.y = g;
          if (b.vy < -5 && b.bounce > 0.3) b.vy = -b.vy * 0.4; else { b.vy = 0; b.grounded = true; }
        }
      }
      if (b.y < -28) Object.assign(b, { x: b.home[0], z: b.home[1], y: w.ground(...b.home) ?? 0, vx: 0, vz: 0, vy: 0, grounded: true });
      b.mesh.position.set(b.x, b.y + b.yOff, b.z);
      const sp = Math.hypot(b.vx, b.vz);
      if (b.roll && sp > 0.01) {
        b.mesh.rotateOnWorldAxis(new THREE.Vector3(b.vz / sp, 0, -b.vx / sp), sp * dt / b.r);
      } else if (b.wander && sp > 0.3) {
        b.mesh.rotation.y = Math.atan2(b.vx, b.vz);
      } else {
        b.mesh.rotation.y += (b.spinV || 0) * dt;
        b.spinV = (b.spinV || 0) * Math.exp(-3 * dt);
      }
    }
  }

  // ---------- trees falling, houses collapsing ----------
  const tM = new THREE.Matrix4(), tR = new THREE.Matrix4(), tA = new THREE.Vector3();
  function stepTrees(dt) {
    for (let i = falling.length - 1; i >= 0; i--) {
      const t = falling[i];
      t.angV += 6 * dt;
      t.fall = Math.min(Math.PI / 2 - 0.12, t.fall + t.angV * dt);
      tA.set(t.ax, 0, t.az);
      tR.makeRotationAxis(tA, t.fall);
      for (const [im, idx, local] of t.parts) {
        tM.makeTranslation(t.x, t.y, t.z).multiply(tR).multiply(local);
        im.setMatrixAt(idx, tM);
        im.instanceMatrix.needsUpdate = true;
      }
      if (t.fall >= Math.PI / 2 - 0.12) { falling.splice(i, 1); burst(t.x - t.az * 3 * t.s, t.y + 0.4, t.z + t.ax * 3 * t.s, 10, ['#c9a26b', '#7cb85a'], 5, 0.8, 3); }
    }
    for (const h of houses) {
      if (h.t < 0 || h.t > 1) continue;
      h.t += dt;
      h.group.scale.y = Math.max(0.06, 1 - h.t * 2.4);
      h.group.rotation.z = h.t * 0.12;
    }
  }

  // ---------- the tank cannon ----------
  const shellGeo = new THREE.SphereGeometry(0.28, 8, 6), shellMat = new THREE.MeshBasicMaterial({ color: '#2a2d26' });
  function fire() {
    if (!V().cannon || cool > 0 || destroying) return;
    cool = 0.55;
    carG.updateMatrixWorld();
    const m = veh.group.localToWorld(veh.muzzle.clone());
    const s = new THREE.Mesh(shellGeo, shellMat);
    s.position.copy(m);
    scene.add(s);
    const fx = Math.sin(car.a), fz = Math.cos(car.a);
    shells.push({ s, vx: fx * 44 + car.vx, vy: 6, vz: fz * 44 + car.vz, life: 4 });
    burst(m.x, m.y, m.z, 12, ['#ffe9a8', '#ffc65a', '#9a9a9a'], 4, 0.4, 3);
    sfx('cannon');
    shake = Math.max(shake, 0.35);
    car.speed -= 3;
  }
  function explode(x, y, z) {
    const w = W[cur];
    burst(x, y + 0.6, z, 60, ['#ff5a2a', '#ffc65a', '#ffe9a8', '#5a5a5a', '#2e2e2e'], 18, 1.4, 14, 1.4);
    sfx('boom');
    shake = Math.min(1.3, shake + 0.9);
    for (const b of w.bodies) {
      const dx = b.x - x, dz = b.z - z, d = Math.hypot(dx, dz);
      if (d > 9) continue;
      const k = (1 - d / 9) * 24 / Math.sqrt(b.mass), l = d || 1;
      b.vx += dx / l * k; b.vz += dz / l * k; b.vy = 5 + k * 0.4; b.grounded = false; b.spinV = (Math.random() - 0.5) * 20;
    }
    for (const c of w.colliders) if (c.tree && !c.dead && Math.hypot(c.x - x, c.z - z) < 7) fellTree(c.tree, c.x - x, c.z - z);
    if (cur === 'out') for (const h of houses) if (h.alive && Math.hypot(h.x - x, h.z - z) < h.R + 4) collapse(h);
    if (Math.hypot(car.x - x, car.z - z) < 5) { car.vy = 9; car.grounded = false; }
  }
  function stepShells(dt) {
    const w = W[cur];
    for (let i = shells.length - 1; i >= 0; i--) {
      const sh = shells[i];
      sh.vy -= 22 * dt; sh.life -= dt;
      const p = sh.s.position;
      p.x += sh.vx * dt; p.y += sh.vy * dt; p.z += sh.vz * dt;
      const g = w.ground(p.x, p.z);
      let hit = sh.life < 0 || (g !== null && p.y <= g) || p.y < -20;
      if (!hit) for (const c of w.colliders) { if (!c.dead && (c.h === undefined || p.y < c.h) && push(p.x, p.z, 0.3, c)) { hit = true; break; } }
      if (!hit) for (const b of w.bodies) { if (Math.hypot(b.x - p.x, b.z - p.z) < b.r + 0.3 && p.y < b.y + 2.5) { hit = true; break; } }
      if (hit) { explode(p.x, Math.max(p.y, g ?? p.y), p.z); scene.remove(sh.s); shells.splice(i, 1); }
    }
  }

  // ---------- rm -rf / ----------
  function destroy() {
    if (destroying) return;
    controls = false;
    const list = [...W[cur].group.children.filter(o => !o.isLight), carG];
    destroying = { t: 0, done: false, parts: list.map(o => ({ o, vx: (o.position.x - car.x) * 0.12 + (Math.random() - 0.5) * 8, vy: 4 + Math.random() * 12, vz: (o.position.z - car.z) * 0.12 + (Math.random() - 0.5) * 8, rx: (Math.random() - 0.5) * 3, rz: (Math.random() - 0.5) * 3 })) };
    sfx('boom'); setTimeout(() => sfx('boom'), 250);
    shake = 1.5;
  }

  // ---------- frame loop ----------
  const tmpUp = new THREE.Vector3(), tmpF = new THREE.Vector3(), tmpR = new THREE.Vector3(), tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), target = new THREE.Vector3(), want = new THREE.Vector3(), proj = new THREE.Vector3();
  const clock = new THREE.Clock();
  function frame() {
    // substeps keep physics in real time on slow devices instead of slow-motion
    const dt = Math.min(clock.getDelta(), 0.1);
    time += dt;
    const w = W[cur];
    let best = null, bd = Infinity;
    if (destroying) {
      const d = destroying;
      d.t += dt;
      for (const p of d.parts) { p.vy -= 18 * dt; p.o.position.x += p.vx * dt; p.o.position.y += p.vy * dt; p.o.position.z += p.vz * dt; p.o.rotation.x += p.rx * dt; p.o.rotation.z += p.rz * dt; }
      if (d.t > 3.4 && !d.done) { d.done = true; opts.onDestroyed?.(); }
    } else {
      const n = Math.ceil(dt / 0.02);
      for (let i = 0; i < n; i++) { stepCar(dt / n, opts.input); stepBodies(dt / n); }
      stepTrees(dt);
      stepShells(dt);
      w.update(time, dt, car);
      markExplored();

      // flags: spin, and fly up when you grab one
      for (const f of w.flags) {
        if (!f.mesh.userData.ring) continue;
        if (f.anim >= 0) {
          f.anim += dt;
          const k = Math.min(1, f.anim / 0.9);
          f.mesh.position.y = f.y - 0.9 + k * 4;
          f.mesh.rotation.y += dt * (6 + k * 20);
          f.mesh.scale.setScalar(Math.max(0.01, 1 + Math.sin(k * Math.PI) * 0.6 - k * 0.9));
          f.mesh.userData.ring.scale.setScalar(1 + k * 4);
          f.mesh.userData.ring.material.opacity = 0.6 * (1 - k);
          if (k >= 1) { f.anim = -1; f.mesh.visible = false; }
          continue;
        }
        if (f.got) continue;
        f.mesh.rotation.y = time * 1.6;
        f.mesh.position.y = f.y - 0.9 + Math.sin(time * 2.4 + f.x) * 0.15;
        f.mesh.userData.ring.material.opacity = 0.35 + Math.sin(time * 4) * 0.15;
        if (Math.hypot(car.x - f.x, car.z - f.z) < 1.9 && Math.abs(car.y + 0.6 - f.y) < (f.tol ?? 1.8)) collect(f);
      }

      // zones
      if (!intro) for (const z of w.zones) {
        if (!z.r) continue;
        const d = Math.hypot(car.x - z.x, car.z - z.z);
        if (d < z.r && d < bd) { best = z; bd = d; }
      }
      if (best?.go && !busy && bd < best.go) transition(best.to);
    }
    if ((best?.id ?? null) !== activeZone) { activeZone = best?.id ?? null; opts.onZone(activeZone); }
    stepParts(dt);
    cool -= dt;

    // guide
    const gzone = guideId && w.zones.find(z => z.id === guideId);
    const gdist = gzone ? Math.hypot(gzone.x - car.x, gzone.z - car.z) : 0;
    guideM.opacity += ((gzone && gdist > gzone.r + 1 && !intro && !destroying ? 0.85 : 0) - guideM.opacity) * Math.min(1, dt * 5);
    if (gzone) {
      const ga = Math.atan2(gzone.x - car.x, gzone.z - car.z);
      guide.position.set(car.x + Math.sin(ga) * 3.4, car.y + 0.15 + Math.sin(time * 5) * 0.06, car.z + Math.cos(ga) * 3.4);
      guide.rotation.y = ga + Math.PI;
      guide.children.forEach((m, i) => { m.position.z = -((time * 1.5 + i * 0.5) % 1) * 0.8; });
    }
    guide.visible = guideM.opacity > 0.02;

    // vehicle visuals
    if (!destroying) {
      carG.position.set(car.x, car.y, car.z);
      const e = 0.75;
      if (car.grounded && kind !== 'boat') {
        const gx = (w.ground(car.x + e, car.z) ?? car.y) - (w.ground(car.x - e, car.z) ?? car.y);
        const gz = (w.ground(car.x, car.z + e) ?? car.y) - (w.ground(car.x, car.z - e) ?? car.y);
        tmpUp.set(-gx / (2 * e), 1, -gz / (2 * e)).normalize();
      } else tmpUp.set(kind === 'boat' ? Math.sin(time * 1.3) * 0.05 : 0, 1, 0).normalize();
      tmpF.set(Math.sin(car.a), 0, Math.cos(car.a));
      if (!car.grounded) tmpF.y = clamp(car.vy * 0.03, -0.5, 0.4);
      tmpF.addScaledVector(tmpUp, -tmpF.dot(tmpUp)).normalize();
      tmpR.crossVectors(tmpUp, tmpF);
      tmpM.makeBasis(tmpR, tmpUp, tmpF);
      tmpQ.setFromRotationMatrix(tmpM);
      carG.quaternion.slerp(tmpQ, 1 - Math.exp(-14 * dt));
      car.squash *= Math.exp(-8 * dt);
      const sp = clamp(car.speed / 14, -1, 1);
      veh.body.scale.set(1 + car.squash * 0.6, 1 - car.squash, 1 + car.squash * 0.3);
      veh.body.rotation.x = -sp * 0.04;
      veh.body.rotation.z = -car.steer * sp * (veh.lean ? 0.4 : 0.1);
      if (w.dance?.(car)) {
        const b = beat(time);
        veh.body.rotation.y = Math.sin(b * Math.PI) * 0.3;
        veh.body.position.y = Math.abs(Math.sin(b * Math.PI)) * 0.18;
      } else { veh.body.rotation.y *= 0.8; veh.body.position.y *= 0.8; }
      for (const wh of veh.wheels) {
        wh.w.rotation.x += car.speed * dt / wh.r;
        if (wh.front) wh.pivot.rotation.y = car.steer * 0.45;
      }
      veh.dist += Math.abs(car.speed) * dt;
      if (veh.legs) {
        const k = Math.min(1, Math.abs(car.speed) / 2), s = Math.sin(veh.dist * 2.4) * 0.7 * k;
        veh.legs[0].rotation.x = s; veh.legs[1].rotation.x = -s;
        veh.arms[0].rotation.x = -s * 0.8; veh.arms[1].rotation.x = s * 0.8;
        veh.body.position.y = Math.abs(Math.sin(veh.dist * 2.4)) * 0.06 * k;
      }
      // dust behind the wheels, spray behind the boat
      dustT -= dt;
      if (dustT < 0 && Math.abs(car.speed) > 7 && car.grounded) {
        dustT = 0.05;
        const bx = car.x - Math.sin(car.a) * 1.1, bz = car.z - Math.cos(car.a) * 1.1;
        if (kind === 'boat') burst(bx, WATER + 0.2, bz, 2, ['#ffffff', '#cfeff2'], 2, 0.6, 2.5, 0.8);
        else if (cur === 'out') burst(bx, car.y + 0.2, bz, 1, ['#d8c09a', '#c9a26b'], 1.5, 0.7, 1.5, 1.3);
      }
      if (w.bobber) {
        if (fishing > 0) {
          fishing -= dt;
          w.bobber.visible = true;
          w.bobber.position.set(car.x + Math.sin(car.a) * 4, WATER + 0.1 + Math.sin(time * 6) * 0.05, car.z + Math.cos(car.a) * 4);
          if (fishing <= 0) { w.bobber.visible = false; burst(w.bobber.position.x, WATER + 0.3, w.bobber.position.z, 20, ['#ffffff', '#ff9a3c', '#2fa8b0'], 6, 1, 6); sfx('splash'); opts.onCatch?.(); }
        } else w.bobber.visible = false;
      }
    }
    engine(controls ? Math.min(1, Math.abs(car.speed) / 20) : 0);

    // camera
    const off = w.env.cam, vz = (V().cam || 1) * zoom;
    if (destroying) {
      camPos.lerp(want.set(car.x, car.y + 45, car.z + 45), 1 - Math.exp(-0.8 * dt));
      camLook.lerp(target.set(car.x, car.y, car.z), 1 - Math.exp(-2 * dt));
    } else if (intro) {
      const t = time * 0.12;
      camPos.lerp(want.set(car.x + Math.sin(t) * 26, car.y + 15, car.z + Math.cos(t) * 26), 1 - Math.exp(-1.5 * dt));
      camLook.lerp(target.set(car.x, car.y + 1, car.z), 1 - Math.exp(-2 * dt));
    } else if (best?.shot) {
      const [px, py, pz, lx, ly, lz] = best.shot(car);
      camLook.lerp(target.set(lx, ly, lz), 1 - Math.exp(-2.2 * dt));
      camPos.lerp(want.set(px, py, pz), 1 - Math.exp(-2 * dt));
    } else {
      target.set(car.x + car.vx * 0.22, car.y * 0.7, car.z + car.vz * 0.22);
      camLook.lerp(target, 1 - Math.exp(-5 * dt));
      camPos.lerp(want.set(camLook.x + off[0] * vz, camLook.y + off[1] * vz, camLook.z + off[2] * vz), 1 - Math.exp(-3 * dt));
    }
    camera.position.copy(camPos);
    if (shake > 0.01) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; shake *= Math.exp(-5 * dt); }
    camera.lookAt(camLook);
    const so = w.env.sunOff;
    sun.position.set(car.x + so[0], car.y + so[1], car.z + so[2]);
    sun.target.position.set(car.x, car.y, car.z);

    renderer.render(scene, camera);

    // labels
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    for (const l of labelEls) {
      const show = l.world === cur && !intro && !destroying;
      const d = show ? Math.hypot(car.x - l.v.x, car.z - l.v.z) : 999;
      const maxD = l.z.r ? 48 : 140;
      if (!show || d > maxD) { if (l.el.style.opacity !== '0') l.el.style.opacity = 0; continue; }
      proj.copy(l.v).project(camera);
      if (proj.z > 1) { l.el.style.opacity = 0; continue; }
      l.el.style.opacity = clamp((maxD - d) / 14, 0, 1) * (activeZone === l.z.id ? 1 : 0.85);
      l.el.classList.toggle('on', activeZone === l.z.id);
      l.el.style.transform = `translate(${(proj.x * 0.5 + 0.5) * cw}px, ${(-proj.y * 0.5 + 0.5) * ch}px) translate(-50%, -100%)`;
    }
  }

  function collect(f) {
    f.got = true;
    f.anim = 0;
    burst(f.x, f.y, f.z, 50, [LAVA, '#ffc65a', CREAM, '#2bb3a3'], 10, 1.8, 10);
    sfx('flag');
    opts.onFlag(f.id, f.text);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 58 : 40; // portrait phones need a wider lens
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();
  canvas.addEventListener('wheel', (e) => { zoom = clamp(zoom + Math.sign(e.deltaY) * 0.08, 0.6, 1.8); }, { passive: true });

  useKind(chosen);
  setWorld('desk');
  place(W.desk.spawn.x, W.desk.spawn.z, W.desk.spawn.a, 'desk');
  renderer.setAnimationLoop(frame);

  const where = (id) => (W.desk.places[id] ? ['desk', W.desk.places[id]] : W.out.places[id] ? ['out', W.out.places[id]] : null);
  const api = {
    start() { intro = false; controls = true; },
    get world() { return cur; },
    get vehicle() { return chosen; },
    get inBoat() { return kind === 'boat'; },
    teleport(id) {
      const p = where(id);
      if (!p || busy || destroying) return;
      const [wn, [x, z, a]] = p;
      if (wn !== cur) { transition(wn, x, z, a); return; }
      // same world: the camera flies over, you drop in from the sky
      sfx('whoosh');
      place(x, z, a, wn, 16);
    },
    setVehicle(k) {
      if (!VEHICLES[k] || k === 'boat') return;
      chosen = k;
      try { localStorage.setItem('dan.ride', k); } catch {}
      opts.onVehicle?.(k);
      if (kind !== 'boat') { useKind(k); burst(car.x, car.y + 1, car.z, 30, [LAVA, '#ffc65a', CREAM], 6, 1, 6); car.squash = 0.3; }
    },
    setControls(b) { controls = b; },
    setGuide(id) { guideId = id; },
    reset() { const s = W[cur].spawn; place(s.x, s.z, s.a); },
    refreshLabels,
    setLaptop: (lines) => W.desk.setScreen(lines),
    honk() { sfx('horn'); },
    fire,
    destroy,
    fish() { if (kind === 'boat' && fishing <= 0) { fishing = 1.2 + Math.random() * 1.8; sfx('splash'); } },
    markFlags(ids) { for (const k in W) for (const f of W[k].flags) if (ids.has(f.id)) { f.got = true; f.mesh.visible = false; } },
    car: () => ({ x: car.x, z: car.z, a: car.a, world: cur }),
    mapData(k) { const w = W[k]; return { img: w.mapImg ||= w.drawMap(), bounds: w.bounds, explored: explored[k], n: MAPN, places: Object.entries(w.places).map(([id, p]) => ({ id, x: p[0], z: p[1] })) }; },
  };
  if (location.hash === '#perf') window.__perf = { renderer, scene, camera, api, car };
  return api;

  // ====================================================================
  //  THE DESK
  // ====================================================================
  function buildDesk() {
    const G = new THREE.Group();
    const colliders = [], bodies = [], zones = [], flags = [];
    const box = (x, z, hw, hd, h) => colliders.push({ x, z, hw, hd, h });
    const circ = (x, z, r, h) => colliders.push({ x, z, r, h });
    const body = (mesh, x, z, r, mass, o = {}) => { mesh.position.set(x, 0, z); bodies.push({ mesh, x, z, y: 0, vx: 0, vz: 0, vy: 0, r, mass, bounce: 0.3, drag: 3, yOff: 0, home: [x, z], grounded: true, ...o }); };

    // desk slab with a painted wood grain
    const wood = canvasTex(1024, 640, (g, w, h) => {
      g.fillStyle = '#a06c44'; g.fillRect(0, 0, w, h);
      const r = rng(3);
      for (let i = 0; i < 140; i++) {
        g.strokeStyle = `rgba(${60 + r() * 30},${30 + r() * 20},${10},${0.08 + r() * 0.12})`;
        g.lineWidth = 1 + r() * 4;
        const y = r() * h;
        g.beginPath(); g.moveTo(0, y);
        for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.004 + i) * 10 + (r() - 0.5) * 3);
        g.stroke();
      }
    });
    const top = put(G, new RoundedBoxGeometry(62, 2, 38, 2, 0.5), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.7 }), 0, -1, 0);
    top.castShadow = false;
    for (const [x, z] of [[-29, -17], [29, -17], [-29, 17], [29, 17]]) rbox(G, 2.4, 40, 2.4, '#5e3d26', x, -22, z, 0.3);

    // back wall with the window
    const wallC = '#232845';
    rbox(G, 34, 40, 2, wallC, -14, 0, -20.2, 0.05);
    rbox(G, 18, 40, 2, wallC, 22, 0, -20.2, 0.05);
    rbox(G, 10, 26, 2, wallC, 8, 23, -20.2, 0.05);
    rbox(G, 10, 20, 2, wallC, 8, -10.6, -20.2, 0.05);
    // window frame sits in front of the wall so nothing z-fights
    for (const [w, h, x, y] of [[11.4, 0.6, 8, 10.25], [0.6, 10.5, 2.75, 4.95], [0.6, 10.5, 13.25, 4.95]]) rbox(G, w, h, 0.7, '#e9e2d4', x, y, -18.9, 0.1);
    box(-14.6, -20.2, 17.6, 1.4);
    box(21.8, -20.2, 8.5, 1.4);
    // the view outside: dawn, volcanoes, an island
    const view = canvasTex(1024, 768, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#1b2350'); sky.addColorStop(0.45, '#6b5a8e'); sky.addColorStop(0.72, '#f39a6b'); sky.addColorStop(1, '#ffd29a');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      const r = rng(9);
      g.fillStyle = '#fff';
      for (let i = 0; i < 70; i++) { g.globalAlpha = r() * 0.8; g.fillRect(r() * w, r() * h * 0.4, 2, 2); }
      g.globalAlpha = 1;
      const cone = (cx, base, hw, ht, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(cx - hw, base); g.lineTo(cx - hw * 0.12, base - ht); g.lineTo(cx + hw * 0.12, base - ht); g.lineTo(cx + hw, base); g.fill(); };
      cone(260, 640, 330, 300, '#5a4a78'); cone(700, 640, 300, 250, '#4c3f69'); cone(860, 640, 220, 200, '#3f355a');
      g.fillStyle = 'rgba(200,190,230,.6)'; g.beginPath(); g.arc(700, 380, 30, 0, 7); g.arc(730, 350, 22, 0, 7); g.fill();
      g.fillStyle = '#ff7a3a'; g.fillRect(686, 388, 28, 6);
      g.fillStyle = '#e9a37c'; g.fillRect(0, 640, w, 128);
      g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 8; i++) g.fillRect(r() * w, 650 + r() * 100, 60 + r() * 120, 3);
    });
    decal(G, 30, 22, view, 8, 6, -24, 0, 0, true);
    // caution tape in an X across the window; it drops the first time you drive through
    const tapeTex = canvasTex(1024, 64, (g, w, h) => {
      g.fillStyle = '#ffd23f'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#16161a'; g.font = `700 36px ${MONO}`; g.textBaseline = 'middle';
      for (let x = 10; x < w; x += 340) g.fillText('OUT OF SCOPE', x, h / 2 + 2);
    });
    const tapes = [];
    for (const s of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(13, 0.5), new THREE.MeshStandardMaterial({ map: tapeTex, side: THREE.DoubleSide, roughness: 0.6 }));
      strip.position.set(8, 4.8, -18.45 + s * 0.04);
      strip.rotation.z = s * 0.68;
      strip.castShadow = true;
      G.add(strip);
      tapes.push({ strip, s, k: 0 });
    }
    // EXIT sign above the window, so it's obvious where outside is
    rbox(G, 4.6, 1.5, 0.5, '#0f3d24', 8, 12.3, -18.85, 0.12);
    decal(G, 4.2, 1.2, label('', { w: 512, h: 144, bg: '#19c26b', fg: '#ffffff', font: `800 84px ${DISP}`, lines: ['EXIT →'] }), 8, 12.3, -18.58, 0, 0, true);
    const exitLight = new THREE.PointLight('#3cff8a', 50, 18, 1.6); exitLight.position.set(8, 11, -17); G.add(exitLight);

    // fairy lights along the wall (they also light up the sticky notes)
    const fairy = [];
    for (let i = 0; i <= 40; i++) {
      const x = -30 + i * 1.5, t = (i % 10) / 10, y = 16.2 - Math.sin(t * Math.PI) * 1.4;
      fairy.push(put(G, new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshBasicMaterial({ color: ['#ffd27a', '#ff9a6a', '#ffe9a8'][i % 3], toneMapped: false }), x, y, -19));
    }
    const wallLight = new THREE.PointLight('#ffd7a0', 170, 46, 1.6); wallLight.position.set(-4, 13, -15); G.add(wallLight);

    // sticky notes and a pennant on the wall
    sticky(G, 'TODO\n- CPTS mod 9\n- finish report\n- sleep??', '#ffe36e', -12.5, 12.2, -19.15, 0.04, 4);
    sticky(G, 'call mom ♡', '#ffb3c7', -6.8, 13.1, -19.15, -0.06, 3.2);
    sticky(G, '← touch\n   grass', '#b9f0a8', 16.8, 6.5, -19.15, 0.05, 3.4);
    sticky(G, 'rockyou.txt\nis not a\npw policy', '#a9d8ff', -1.6, 11.4, -19.15, 0.03, 3.6);
    sticky(G, 'salsa > sleep', '#ffc89a', 21.5, 12.6, -19.15, -0.04, 3.4);
    const pen = canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#0021a5'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h / 2); g.lineTo(0, h); g.fill();
      g.fillStyle = '#fa4616'; g.fillRect(0, 0, 36, h);
      g.fillStyle = '#fff'; g.font = `800 92px ${DISP}`; g.textBaseline = 'middle'; g.fillText('GATORS', 60, h / 2 + 4);
    });
    decal(G, 8, 4, pen, 24.5, 8, -19.15).rotation.z = -0.12;

    // laptop with a live terminal on it
    const lap = new THREE.Group(); lap.position.set(-8, 0, -11); G.add(lap);
    rbox(lap, 15, 0.6, 10, '#c3c7cf', 0, 0.3, 0, 0.25);
    rbox(lap, 13.4, 0.08, 4.6, '#2a2d36', 0, 0.62, -1.6, 0.03);
    const keyGeo = new RoundedBoxGeometry(0.88, 0.22, 0.75, 1, 0.08);
    const keys = new THREE.InstancedMesh(keyGeo, mat('#3a3e4a'), 14 * 5);
    let ki = 0;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) { dummy.position.set(-6.15 + c * 0.95, 0.7, -3.4 + r * 0.9); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); keys.setMatrixAt(ki++, dummy.matrix); }
    keys.castShadow = true; lap.add(keys);
    rbox(lap, 4.4, 0.05, 2.6, '#b4b8c1', 0, 0.62, 3, 0.05);
    ['gt', 'co', 'cu'].forEach((k, i) => decal(lap, 0.9, 0.6, stickerTex(k), 4.3 + i * 1.1, 0.63, 3.3 + (i % 2) * 0.3, -Math.PI / 2, 0.1 - i * 0.12));
    const hinge = new THREE.Group(); hinge.position.set(0, 0.6, -5); hinge.rotation.x = -0.22; lap.add(hinge);
    rbox(hinge, 15, 10, 0.45, '#c3c7cf', 0, 5, 0, 0.25);
    const scr = document.createElement('canvas'); scr.width = 1024; scr.height = 640;
    const scrTex = new THREE.CanvasTexture(scr); scrTex.colorSpace = THREE.SRGBColorSpace;
    decal(hinge, 14, 9, scrTex, 0, 5.1, 0.24, 0, 0, true);
    let screenLines = ['Last login: Sat 03:12 from 10.0.0.7', 'dan@desk:~$ ./ideas.sh --all-of-them', '[+] 14 ideas found, 2 good, 1 legal', 'dan@desk:~$ cat todo.txt', '  1. finish the report', '  2. go outside', 'dan@desk:~$ _'];
    function drawScreen(blink) {
      const g = scr.getContext('2d');
      g.fillStyle = '#0c0f17'; g.fillRect(0, 0, 1024, 640);
      g.fillStyle = '#161a26'; g.fillRect(0, 0, 1024, 50);
      g.fillStyle = '#ff8a5c'; g.font = `600 26px ${MONO}`; g.fillText('dan@desk  ·  press E to type here', 24, 34);
      g.font = `500 30px ${MONO}`;
      screenLines.slice(-14).forEach((l, i) => {
        g.fillStyle = l.startsWith('dan@') ? '#ff8a5c' : l.startsWith('[+]') ? '#4fd1c1' : '#d5dae6';
        g.fillText(blink ? l : l.replace(/_$/, ' '), 24, 92 + i * 38);
      });
      scrTex.needsUpdate = true;
    }
    drawScreen(true);
    box(-8, -11, 7.6, 5.1);
    const rimL = new THREE.PointLight('#ff3d6e', 260, 70, 1.6); rimL.position.set(-38, 10, 6); G.add(rimL);
    const rimR = new THREE.PointLight('#5a6dff', 260, 70, 1.6); rimR.position.set(38, 10, 6); G.add(rimR);

    // UF mug with coffee and steam (pushable, it's heavy)
    const mug = new THREE.Group(); G.add(mug);
    put(mug, new THREE.CylinderGeometry(2.2, 2.0, 4.6, 20), '#0021a5', 0, 2.3, 0);
    put(mug, new THREE.CylinderGeometry(2.23, 2.23, 0.7, 20), '#fa4616', 0, 3.2, 0);
    put(mug, new THREE.CylinderGeometry(1.95, 1.95, 0.1, 20), '#3b2416', 0, 4.35, 0);
    put(mug, new THREE.TorusGeometry(1.1, 0.32, 6, 12, Math.PI), '#0021a5', 2.1, 2.3, 0).rotation.z = -Math.PI / 2;
    const steam = [];
    for (let i = 0; i < 6; i++) {
      const s = put(mug, new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: '#fff', transparent: true, opacity: 0.2, flatShading: true }), 0, 5, 0);
      s.castShadow = false; steam.push(s);
    }
    body(mug, 19, -12, 2.3, 5);
    // a bag of Colombian coffee next to it
    const bag = new THREE.Group(); G.add(bag);
    rbox(bag, 2.4, 3.2, 1.5, '#b98a55', 0, 1.6, 0, 0.2);
    rbox(bag, 2.42, 0.5, 1.2, '#8c6239', 0, 3.25, 0, 0.1);
    decal(bag, 1.9, 1.2, canvasTex(256, 160, (g) => { g.fillStyle = '#f4efe6'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#3b2416'; g.font = `800 40px ${DISP}`; g.textAlign = 'center'; g.fillText('CAFÉ', 128, 62); g.font = `500 22px ${MONO}`; g.fillText('de Colombia', 128, 100); g.fillStyle = '#5c8a3e'; g.beginPath(); g.moveTo(90, 145); g.lineTo(128, 112); g.lineTo(166, 145); g.fill(); }), 0, 1.6, 0.76);
    body(bag, 14.5, -15.5, 1.4, 1.2);

    // desk lamp: the main light in the room
    const lampBase = new THREE.Vector3(26.5, 0, -15), elbow = new THREE.Vector3(27.5, 15, -10), head = new THREE.Vector3(18.5, 13.5, -5);
    put(G, new THREE.CylinderGeometry(2.6, 3, 0.7, 14), INK, lampBase.x, 0.35, lampBase.z);
    beam(G, lampBase.clone().setY(0.6), elbow, 0.45, '#2b2f40');
    beam(G, elbow, head, 0.45, '#2b2f40');
    put(G, new THREE.SphereGeometry(0.55, 8, 6), LAVA, elbow.x, elbow.y, elbow.z);
    const shade = put(G, new THREE.ConeGeometry(2.4, 3, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#2b2f40', side: THREE.DoubleSide, flatShading: true }), head.x, head.y - 0.6, head.z);
    shade.castShadow = false;
    put(G, new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff1c8', toneMapped: false }), head.x, head.y - 1.6, head.z);
    const lampLight = new THREE.PointLight('#ffc27a', 420, 70, 1.7); lampLight.position.set(head.x, head.y - 2, head.z); G.add(lampLight);
    circ(26.5, -15, 3);

    // cert books, one heavy stack you can shove
    const stack = new THREE.Group(); G.add(stack);
    [['SECURITY+', '#c4392f', 0.04], ['NETWORK+', '#2f5f9e', -0.06], ['A+', '#3c8a5a', 0.08], ['CCST · CYBER', '#1b6e8f', -0.03], ['CPTS', '#2a2d36', 0.1]].forEach(([t, col, rot], i) => {
      const b = new THREE.Group(); b.position.set(0, 0.58 + i * 1.12, 0); b.rotation.y = rot; stack.add(b);
      rbox(b, 8.4, 1.06, 5.8, col, 0, 0, 0, 0.1);
      rbox(b, 8.1, 0.9, 5.82, '#efe8da', 0.12, 0, 0, 0.02).scale.set(1, 1, 0.98);
      decal(b, 7.4, 0.8, label(t, { w: 1024, h: 110, fg: '#fff', font: `800 64px ${DISP}` }), 0, 0, 2.92);
      if (t === 'CPTS') { rbox(b, 0.5, 0.04, 2.6, LAVA, 2.2, 0.55, 3.6, 0.01).rotation.x = 0.5; }
    });
    body(stack, 22, 1.5, 3.6, 9);

    // CPTC trophy (pushable) + CCDC badge
    const tro = new THREE.Group(); G.add(tro);
    rbox(tro, 4.2, 1.4, 4.2, '#2a2420', 0, 0.7, 0, 0.12);
    decal(tro, 3.6, 0.9, label('', { w: 512, h: 128, bg: '#c9a24a', fg: '#2a2420', font: `800 44px ${DISP}`, lines: ['CPTC · 2ND GLOBAL'] }), 0, 0.75, 2.12);
    const gold = new THREE.MeshStandardMaterial({ color: '#e7b448', metalness: 0.6, roughness: 0.3, flatShading: true });
    put(tro, new THREE.CylinderGeometry(0.35, 0.6, 1.4, 8), gold, 0, 2.1, 0);
    put(tro, new THREE.LatheGeometry([0.1, 0.9, 1.4, 1.6, 1.6].map((r, i) => new THREE.Vector2(r, i * 0.7)), 10), gold, 0, 2.7, 0);
    for (const s of [-1, 1]) put(tro, new THREE.TorusGeometry(0.6, 0.12, 5, 10), gold, s * 1.7, 4.4, 0).rotation.y = Math.PI / 2;
    body(tro, -24.5, -2.5, 2.4, 3);
    const badge = new THREE.Group(); badge.position.set(-20.6, 0.1, 1); badge.rotation.set(-Math.PI / 2, 0, 0.4); G.add(badge);
    decal(badge, 2.4, 3.4, canvasTex(256, 360, (g) => { g.fillStyle = '#d93a32'; g.fillRect(0, 0, 256, 360); g.fillStyle = '#fff'; g.font = `800 52px ${DISP}`; g.fillText('CCDC', 40, 120); g.font = `600 30px ${MONO}`; g.fillText('RED TEAM', 50, 180); g.fillStyle = '#1b1b1b'; g.fillRect(40, 220, 176, 100); }), 0, 0, 0);

    // the stack of reports (experience)
    const rep = new THREE.Group(); G.add(rep);
    for (let i = 0; i < 9; i++) rbox(rep, 7, 0.14, 9, i % 2 ? '#f3efe7' : '#e8e2d6', (Math.random() - 0.5) * 0.3, 0.08 + i * 0.15, (Math.random() - 0.5) * 0.3, 0.02).rotation.y = (Math.random() - 0.5) * 0.06;
    decal(rep, 6.6, 8.6, canvasTex(512, 660, (g) => {
      g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, 512, 660);
      g.fillStyle = INK; g.font = `800 40px ${DISP}`; g.fillText('PENETRATION', 40, 90); g.fillText('TEST REPORT', 40, 136);
      g.font = `500 22px ${MONO}`; g.fillStyle = '#555';
      ['Client: ██████████', 'Scope: external + web', 'Prepared by: D. Aguirre', '', 'Critical   ■■■', 'High       ■■■■■■■', 'Medium     ■■■■■■■■■■', '', '1. Executive summary', '2. Attack narrative', '3. Remediation roadmap'].forEach((l, i) => g.fillText(l, 40, 200 + i * 34));
      g.save(); g.translate(330, 560); g.rotate(-0.25); g.strokeStyle = '#d93a32'; g.lineWidth = 6; g.strokeRect(-130, -40, 260, 74); g.fillStyle = '#d93a32'; g.font = `800 36px ${DISP}`; g.fillText('CONFIDENTIAL', -118, 10); g.restore();
    }), 0, 1.45, 0, -Math.PI / 2);
    rbox(rep, 1.6, 0.6, 0.5, INK, 0, 1.5, -4.4, 0.1);
    rep.rotation.y = 0.12;
    body(rep, -22, 11, 4.4, 4);

    // business notebook, propped on an eraser: it's a ramp now
    const nb = new THREE.Group(); nb.position.set(-12, 0.82, 5); nb.rotation.x = 0.163; G.add(nb);
    rbox(nb, 6, 0.35, 8, '#23344f', 0, 0, 0, 0.1);
    rbox(nb, 0.3, 0.38, 8.02, '#141c2b', 2.4, 0, 0, 0.05);
    decal(nb, 4.4, 1.2, label('BUS. ADMIN', { w: 512, h: 128, fg: '#e9e2d4', font: `700 54px ${MONO}` }), -0.4, 0.18, -1.8, -Math.PI / 2);
    const chart = canvasTex(256, 256, (g) => { g.fillStyle = '#ffe36e'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#2a2622'; g.lineWidth = 6; g.beginPath(); g.moveTo(30, 210); g.lineTo(90, 170); g.lineTo(130, 185); g.lineTo(220, 60); g.stroke(); g.font = `600 40px ${HAND}`; g.fillStyle = '#2a2622'; g.fillText('risk ↓  value ↑', 22, 48); });
    decal(nb, 3, 3, chart, -0.8, 0.19, 1.8, -Math.PI / 2).rotation.z = 0.2;
    rbox(G, 6.4, 1.3, 0.9, '#f08aa8', -12, 0.65, 0.55, 0.2);
    colliders.push({ x: -12, z: 0.55, hw: 3.2, hd: 0.45, h: 1.25 });
    // calculator (pushable)
    const calc = new THREE.Group(); G.add(calc);
    rbox(calc, 3, 0.7, 4.6, '#3a3e4a', 0, 0.35, 0, 0.18);
    rbox(calc, 2.4, 0.06, 1, '#9fb59a', 0, 0.72, -1.5, 0.03);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) rbox(calc, 0.48, 0.14, 0.48, c === 3 ? LAVA : '#d5d0c4', -0.9 + c * 0.6, 0.75, -0.4 + r * 0.6, 0.06);
    calc.rotation.y = -0.2;
    body(calc, -5, 7, 1.9, 1.5, { hop: 0.15 });

    // ramp: a ruler balanced on an eraser (taller now, more air)
    const ruler = rbox(G, 4.2, 0.22, 6.6, '#e8c86a', 0, 1.0, 6, 0.06);
    ruler.rotation.x = Math.atan2(2, 6);
    decal(ruler, 0.2, 6.2, canvasTex(32, 512, (g) => { g.fillStyle = '#2a2622'; for (let i = 0; i < 512; i += 16) g.fillRect(0, i, i % 64 ? 10 : 24, 2); }), 1.7, 0.12, 0, -Math.PI / 2);
    rbox(G, 4.4, 2, 1, '#f08aa8', 0, 1, 2.5, 0.2);
    colliders.push({ x: 0, z: 2.5, hw: 2.2, hd: 0.5, h: 1.9 });

    // the lab: arduino, servo arm, router
    const pcb = new THREE.Group(); pcb.position.set(7, 0, 13); G.add(pcb);
    rbox(pcb, 7, 0.3, 5, '#0f6f8c', 0, 0.15, 0, 0.08);
    rbox(pcb, 2.2, 0.3, 1.2, '#16171c', 0.6, 0.42, 0.2, 0.05);
    rbox(pcb, 1.4, 0.6, 1.2, '#c9ccd3', -3.1, 0.5, -1.6, 0.06);
    rbox(pcb, 5.6, 0.4, 0.4, '#16171c', 0.2, 0.5, -2.1, 0.04);
    rbox(pcb, 4.6, 0.4, 0.4, '#16171c', 0.6, 0.5, 2.1, 0.04);
    const led = put(pcb, new THREE.BoxGeometry(0.3, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: '#3cff8a', toneMapped: false }), 2.6, 0.4, 1.2);
    const arm = new THREE.Group(); arm.position.set(13, 0, 10.5); G.add(arm);
    put(arm, new THREE.CylinderGeometry(1.4, 1.6, 0.8, 10), INK, 0, 0.4, 0);
    const a1 = new THREE.Group(); a1.position.y = 0.8; arm.add(a1);
    rbox(a1, 0.9, 0.9, 0.9, LAVA, 0, 0.45, 0, 0.15);
    const a2 = new THREE.Group(); a2.position.y = 0.9; a1.add(a2);
    rbox(a2, 0.5, 3.6, 0.5, '#d5d0c4', 0, 1.8, 0, 0.1);
    const a3 = new THREE.Group(); a3.position.y = 3.6; a2.add(a3);
    put(a3, new THREE.SphereGeometry(0.42, 8, 6), LAVA);
    rbox(a3, 0.4, 2.6, 0.4, '#d5d0c4', 0, 1.3, 0, 0.1);
    rbox(a3, 0.9, 0.3, 0.3, INK, 0, 2.7, 0, 0.05);
    circ(13, 10.5, 1.6);
    for (const [c, pts] of [['#d93a32', [[3.6, 0.5, 14], [8, 2, 12], [12.3, 0.9, 10.8]]], ['#ffd23f', [[3.6, 0.5, 12.6], [7, 1.6, 10.6], [12.5, 0.8, 9.8]]]]) {
      put(G, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 16, 0.1, 4), c);
    }
    const router = new THREE.Group(); G.add(router);
    rbox(router, 5, 1, 3, '#16171c', 0, 0.5, 0, 0.3);
    const rleds = [];
    for (let i = 0; i < 5; i++) rleds.push(put(router, new THREE.BoxGeometry(0.22, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: i < 4 ? '#3cff8a' : '#ffb13c', toneMapped: false }), -1.6 + i * 0.8, 0.6, 1.52));
    for (const s of [-1.8, 1.8]) put(router, new THREE.CylinderGeometry(0.12, 0.14, 3.2, 5), '#16171c', s, 2.4, -1).rotation.z = s * -0.12;
    body(router, -3.5, 15.2, 2.2, 2);

    // business cards (contact)
    const cards = new THREE.Group(); G.add(cards);
    rbox(cards, 3.8, 1.2, 1.8, '#2a2d36', 0, 0.6, 0, 0.12);
    const card = canvasTex(512, 300, (g) => { g.fillStyle = CREAM; g.fillRect(0, 0, 512, 300); g.fillStyle = LAVA; g.fillRect(0, 0, 14, 300); g.fillStyle = INK; g.font = `800 46px ${DISP}`; g.fillText('DANIEL AGUIRRE', 44, 110); g.font = `500 24px ${MONO}`; g.fillStyle = '#555'; g.fillText('offensive security · consulting', 44, 160); g.fillText('hire@ this guy', 44, 250); });
    for (let i = 0; i < 3; i++) { const c = rbox(cards, 3.4, 2, 0.05, CREAM, 0, 1.6, -0.3 + i * 0.25, 0.02); c.rotation.x = -0.15; if (i === 2) decal(c, 3.4, 2, card, 0, 0, 0.03); }
    cards.rotation.y = -0.15;
    body(cards, 19, 13.5, 1.6, 1, { hop: 0.2 });
    const loose = new THREE.Group(); loose.position.set(15.5, 0.03, 15.6); loose.rotation.set(-Math.PI / 2, 0, 0.5); G.add(loose);
    decal(loose, 3.4, 2, card, 0, 0, 0);

    // whiteboard on an easel: the OSI model, the way I actually teach it
    const wb = new THREE.Group(); wb.position.set(-24, 0, -16.6); wb.rotation.x = -0.14; G.add(wb);
    rbox(wb, 13, 9, 0.4, '#d7d9de', 0, 5.2, 0, 0.15);
    decal(wb, 12.2, 8.2, canvasTex(1024, 690, (g) => {
      g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, 1024, 690);
      g.fillStyle = '#1f3b8a'; g.font = `700 72px ${HAND}`; g.fillText('OSI, 7 layers', 50, 90);
      const L = [['7', 'Application', 'Please'], ['6', 'Presentation', 'Do'], ['5', 'Session', 'Not'], ['4', 'Transport', 'Throw'], ['3', 'Network', 'Sausage'], ['2', 'Data link', 'Pizza'], ['1', 'Physical', 'Away']];
      g.font = `600 50px ${HAND}`;
      L.forEach(([n, a, m], i) => { g.fillStyle = '#2a2622'; g.fillText(`${n}. ${a}`, 70, 170 + i * 66); g.fillStyle = '#d93a32'; g.fillText(m, 560, 170 + i * 66); });
      g.strokeStyle = '#d93a32'; g.lineWidth = 4; g.beginPath(); g.moveTo(520, 140); g.lineTo(520, 600); g.stroke();
      g.fillStyle = '#2b8a5a'; g.font = `700 40px ${HAND}`; g.fillText('↑ mnemonic, works every time', 560, 650);
    }), 0, 5.2, 0.22);
    rbox(wb, 12, 0.3, 0.8, '#9aa0ab', 0, 0.75, 0.5, 0.08);
    for (let i = 0; i < 3; i++) rbox(wb, 1.4, 0.25, 0.25, ['#1f3b8a', '#d93a32', '#2b8a5a'][i], -2 + i * 1.8, 1.0, 0.55, 0.1).rotation.y = Math.PI / 2 * 0.98;
    box(-24, -16.6, 6.8, 1.6);

    // pushable toys: keycaps that spell my name, and a rubber duck for debugging
    const capTex = (t) => label(t, { w: 128, h: 128, bg: '#efeae0', fg: INK, font: `700 ${t.length > 2 ? 40 : 64}px ${MONO}` });
    [['D', 2, -1.5], ['A', 4, -3], ['N', 6, -1.2], ['ESC', -2.5, -3.5], ['TAB', 13.5, 1]].forEach(([t, x, z], i) => {
      const g = new THREE.Group();
      rbox(g, 1.3, 0.85, 1.3, i === 3 ? LAVA : '#efeae0', 0, 0.42, 0, 0.18);
      decal(g, 0.9, 0.9, capTex(t), 0, 0.86, 0, -Math.PI / 2);
      G.add(g);
      body(g, x, z, 0.75, 0.4, { bounce: 0.4, drag: 2.8, hop: 0.25, sound: 'key' });
    });
    const duck = new THREE.Group();
    put(duck, new THREE.SphereGeometry(1, 8, 6), '#ffd23f', 0, 0.9, 0).scale.set(1, 0.8, 1.2);
    put(duck, new THREE.SphereGeometry(0.62, 8, 6), '#ffd23f', 0, 1.8, 0.55);
    put(duck, new THREE.ConeGeometry(0.25, 0.55, 6).rotateX(Math.PI / 2), '#ff8a1f', 0, 1.75, 1.2);
    for (const s of [-0.28, 0.28]) put(duck, new THREE.BoxGeometry(0.1, 0.14, 0.05), '#16161a', s, 2, 1.08);
    duck.rotation.y = -0.6; G.add(duck);
    body(duck, 11, 3, 1.05, 1, { bounce: 0.5, drag: 2.2 });

    // flags hidden on the desk
    const flag = (id, text, x, z, y = 1, tol) => { const m = buildFlag(); m.position.set(x, y, z); G.add(m); flags.push({ id, text, x, z, y: y + 0.9, tol, mesh: m, anim: -1 }); };
    flag('w1', 'DAN{always_check_behind_the_laptop}', -8, -17.6);
    flag('w2', 'DAN{airtime}', 0, -1.4, 2.3, 1.1);
    flag('w3', 'DAN{3am_and_still_going}', 29, -6.5);

    zones.push(
      { id: 'about', x: 19, z: -9, r: 6.5, ly: 6.4, lz: -12 },
      { id: 'work', x: -21, z: 9, r: 7, ly: 3.4, lz: 11 },
      { id: 'comps', x: -23, z: -1, r: 5.8, ly: 7, lz: -2.5, lx: -24.5 },
      { id: 'certs', x: 21, z: 4, r: 6.5, ly: 7.6, lz: 1.5, lx: 22 },
      { id: 'lab', x: 9, z: 11, r: 6, ly: 7.2, lx: 13, lz: 10.5 },
      { id: 'teach', x: -23, z: -12, r: 6.5, ly: 11.2, lz: -16.6, lx: -24 },
      { id: 'biz', x: -10, z: 9, r: 5, ly: 3.2, lz: 6 },
      { id: 'contact', x: 18, z: 12, r: 4.8, ly: 3.8, lz: 13.5, lx: 19 },
      { id: 'terminal', x: -8, z: -3.2, r: 4.2, ly: 11.5, lz: -15.5, lx: -8, shot: () => [-8, 8.5, 4.5, -8, 5.4, -14] },
      { id: 'window', x: 8, z: -15.5, r: 4.5, ly: 14, lz: -19, lx: 8, go: 2.6, to: 'out', shot: (c) => [8, 7.5, c.z + 11, 8, 4, -22] },
    );

    let blinkT = 0;
    return {
      group: G, colliders, bodies, zones, flags,
      bounds: [-31, -19, 31, 19],
      spawn: { x: 6, z: 2, a: Math.PI },
      places: {
        spawn: [6, 2, Math.PI], terminal: [-8, -2, Math.PI], about: [16, -6, Math.PI * 0.8], work: [-16, 9, -Math.PI / 2],
        comps: [-20, 2, -Math.PI * 0.8], certs: [15, 5, Math.PI / 2], lab: [8, 8, 0], teach: [-21, -9, Math.PI],
        biz: [-10, 12, Math.PI], contact: [15, 10, Math.PI * 0.3],
      },
      env: { fog: '#0b0e1a', fogNear: 45, fogFar: 120, hemi: ['#5866a8', '#1a1208', 0.7], sun: ['#ffd9a8', 1.3], sunOff: [-10, 40, 14], cam: [0, 22, 21], exposure: 1.1 },
      ground(x, z) {
        if (z < -19 && x > 3 && x < 13 && z > -23) return 0;
        if (x < -31 || x > 31 || z < -19 || z > 19) return null;
        if (x > -2.1 && x < 2.1 && z > 3 && z < 9) return 2 * (9 - z) / 6;
        if (x > -15 && x < -9 && z > 1 && z < 9) return 0.35 + 1.3 * (9 - z) / 8;
        if (x > 3.5 && x < 10.5 && z > 10.5 && z < 15.5) return 0.3;
        return 0;
      },
      drawMap() {
        return canvas2d(200, 122, (g, w, h) => {
          const X = (x) => (x + 31) / 62 * w, Z = (z) => (z + 19) / 38 * h;
          g.fillStyle = '#a06c44'; g.fillRect(0, 0, w, h);
          g.fillStyle = '#232845'; g.fillRect(0, 0, w, Z(-18.6));
          g.fillStyle = '#ffd29a'; g.fillRect(X(3), 0, X(13) - X(3), Z(-18.6));
          const rect = (x, z, hw, hd, c) => { g.fillStyle = c; g.fillRect(X(x - hw), Z(z - hd), X(x + hw) - X(x - hw), Z(z + hd) - Z(z - hd)); };
          const dot = (x, z, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(X(x), Z(z), r / 62 * w, 0, 7); g.fill(); };
          rect(-8, -11, 7.5, 5, '#c3c7cf'); rect(-24, -16.6, 6.5, 0.8, '#fbfbf8'); rect(22, 1.5, 4.2, 2.9, '#c4392f'); rect(-22, 11, 3.5, 4.5, '#f3efe7');
          rect(-12, 5, 3, 4, '#23344f'); rect(0, 6, 2.1, 3, '#e8c86a'); rect(7, 13, 3.5, 2.5, '#0f6f8c'); rect(-3.5, 15.2, 2.5, 1.5, '#16171c');
          dot(19, -12, 2.2, '#0021a5'); dot(26.5, -15, 2.8, '#2b2f40'); dot(-24.5, -2.5, 2.1, '#e7b448'); dot(13, 10.5, 1.4, LAVA);
        });
      },
      setScreen(lines) { screenLines = lines.slice(-14); drawScreen(true); },
      update(t, dt, car) {
        steam.forEach((s, i) => { const k = (t * 0.35 + i / steam.length) % 1; s.position.set(Math.sin(k * 6 + i) * 0.5, 4.6 + k * 5, Math.cos(k * 5 + i) * 0.4); s.scale.setScalar(0.5 + k * 1.4); s.material.opacity = 0.22 * Math.sin(k * Math.PI); });
        a1.rotation.y = Math.sin(t * 0.7) * 1.2;
        a2.rotation.z = Math.sin(t * 0.9) * 0.35 - 0.2;
        a3.rotation.z = Math.sin(t * 1.3 + 1) * 0.8 + 0.6;
        led.visible = (t * 2) % 1 < 0.5;
        rleds.forEach((l, i) => { l.visible = Math.sin(t * (7 + i * 3) + i * 9) > -0.6; });
        fairy.forEach((f, i) => f.scale.setScalar(0.8 + 0.4 * Math.max(0, Math.sin(t * 2 + i * 0.7))));
        lampLight.intensity = 420 + Math.sin(t * 40) * 3;
        exitLight.intensity = 45 + Math.sin(t * 3) * 10;
        blinkT += dt;
        if (blinkT > 0.53) { blinkT = 0; drawScreen((t * 1.9) % 2 < 1); }
        // the tape drops the first time someone drives through the window
        const near = car.z < -16.5 && car.x > 2.5 && car.x < 13.5;
        for (const tp of tapes) {
          if (near && !tp.broken) { tp.broken = true; sfx('bump', 0.4); }
          if (!tp.broken || tp.k >= 1) continue;
          tp.k = Math.min(1, tp.k + dt * 1.6);
          const e = tp.k * tp.k;
          tp.strip.position.y = lerp(4.8, 0.08, e);
          tp.strip.position.z = lerp(-18.45, -17.6 + tp.s * 0.3, e);
          tp.strip.rotation.x = -e * Math.PI / 2;
          tp.strip.rotation.z = tp.s * 0.68 * (1 - e * 0.7);
        }
      },
    };
  }

  // ====================================================================
  //  OUTSIDE: an island made of my favorite places in Guatemala
  // ====================================================================
  function buildOutside() {
    const G = new THREE.Group();
    const colliders = [], bodies = [], zones = [], flags = [];
    const R = rng(42);
    const CZ = -20;
    const LAKE = { x: -30, z: -85, rx: 40, rz: 26 };
    const lakeD = (x, z) => Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
    const PITCH = { x0: 10, x1: 40, z0: -26, z1: -4 };
    const PLAZA = { x: -30, z: -18, r: 16 };
    const CAMP = { x: 50, z: 30, r: 13 };
    const HILL = { x: 62, z: -70 }, FUEGO = { x: 86, z: -88 };
    const TRACK = { x: -30, z: 58, a: -42, b: -18, r: 12 };
    const DOCK = { x0: -31.6, x1: -28.4, z0: -70, z1: -50 };
    const FINCA = { x0: 44, x1: 60, z0: -42, z1: -30 };
    const paths = [
      [[0, 2], [-8, -5], [-15, -10], [-24, -16]],
      [[-24, -16], [-27, -34], [-30, -50]],
      [[0, 2], [8, -3], [12, -8]],
      [[30, -26], [40, -45], [52, -58], [62, -70]],
      [[0, 2], [20, 12], [46, 26]],
      [[30, -4], [31, 0]],
      [[0, 2], [-6, 25], [-6, 44]],
      [[0, 2], [6, 50], [16, 92]],
    ];
    function pathD(x, z) {
      let best = 1e9;
      for (const p of paths) for (let i = 0; i < p.length - 1; i++) {
        const [ax, az] = p[i], [bx, bz] = p[i + 1];
        const vx = bx - ax, vz = bz - az, t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
        best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
      }
      return best;
    }
    const trackR = (x, z) => Math.hypot(x - clamp(x, TRACK.a, TRACK.b), z - TRACK.z);
    const trackD = (x, z) => Math.abs(trackR(x, z) - TRACK.r);
    const inTrackField = (x, z) => trackR(x, z) < TRACK.r + 6;
    const rectMask = (x, z, r, f = 3) => smooth(-f, 0, Math.min(x - r.x0, r.x1 - x, z - r.z0, r.z1 - z));
    const circMask = (x, z, c, r, f = 5) => smooth(r, r - f, Math.hypot(x - c.x, z - c.z));
    const coastR = (x, z) => { const a = Math.atan2(z - CZ, x); return 128 + 8 * Math.sin(3 * a + 1) + 5 * Math.sin(5 * a + 2) + 3 * Math.sin(9 * a); };
    const inFinca = (x, z) => x > FINCA.x0 && x < FINCA.x1 && z > FINCA.z0 && z < FINCA.z1;
    const CLEAR = [[-6, -26, 7], [-5, -13, 6], [-52, -28, 4], [-40, -12, 3], [-48, -48, 10], [5.5, -3.5, 3]]; // keep trees off the props

    function h(x, z) {
      let y = 0.6 + 0.55 * Math.sin(x * 0.07 + 1.3) * Math.cos(z * 0.06) + 0.35 * Math.sin(x * 0.19 - z * 0.11) + 0.2 * Math.cos(z * 0.23 + x * 0.05);
      y += 26 * gauss(x - HILL.x, z - HILL.z, 17);
      y += 23 * gauss(x - FUEGO.x, z - FUEGO.z, 8) - 3.5 * gauss(x - FUEGO.x, z - FUEGO.z, 1.8);
      y += 17 * gauss(x + 68, z + 118, 8) + 20 * gauss(x + 30, z + 127, 9) + 21 * gauss(x - 8, z + 121, 9);
      y += 4 * gauss(x + 75, z - 25, 14) + 3 * gauss(x - 6, z - 40, 12) + 5 * gauss(x - 92, z - 5, 14) + 4 * gauss(x - 40, z - 75, 12);
      const ld = lakeD(x, z);
      if (ld < 1.4) y = lerp(y, -3.4, smooth(1.4, 0.85, ld));
      y = lerp(y, 0, rectMask(x, z, PITCH, 4));
      y = lerp(y, 0.1, circMask(x, z, PLAZA, PLAZA.r));
      y = lerp(y, 0, circMask(x, z, { x: 0, z: 3 }, 9));
      y = lerp(y, 0.2, circMask(x, z, CAMP, CAMP.r));
      y = lerp(y, 0.15, smooth(TRACK.r + 8, TRACK.r + 4, trackR(x, z)));
      const r = Math.hypot(x, z - CZ), Rc = coastR(x, z);
      return lerp(-7, y, smooth(Rc + 8, Rc - 6, r));
    }
    const inDock = (x, z) => x > DOCK.x0 && x < DOCK.x1 && z > DOCK.z0 && z < DOCK.z1;
    const ground = (x, z) => (inDock(x, z) ? 0.25 : h(x, z));

    const GRASS = ['#7cb85a', '#6fae50', '#86c062', '#79b356'];
    function colorAt(x, z, y, rnd) {
      const r = Math.hypot(x, z - CZ), Rc = coastR(x, z), ld = lakeD(x, z);
      if (y < -2.4) return r > Rc ? '#2f7f8c' : '#3f8f8e';
      if (y < WATER - 0.15) return '#b9a478';
      const a = Math.atan2(z - CZ, x), black = a > 0.85 && a < 2.3;
      if (r > Rc - 14 && y < 1.4) return black ? '#3d3a38' : '#e6d19d';
      if (ld < 1.12 && y < 0.5) return '#e6d19d';
      if (x > PITCH.x0 && x < PITCH.x1 && z > PITCH.z0 && z < PITCH.z1) return Math.floor((x - PITCH.x0) / 3) % 2 ? '#5aa84a' : '#67b555';
      const td = trackD(x, z);
      if (td < 3.6) return td > 2.8 ? (Math.floor(Math.atan2(z - TRACK.z, x - TRACK.x) * 14) & 1 ? '#f4efe6' : '#d93a32') : '#57545e';
      if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < 12) return ((Math.floor(x / 2) + Math.floor(z / 2)) & 1) ? '#d9c3a1' : '#cfb592';
      if (pathD(x, z) < 2.1) return '#d2a56c';
      const fd = Math.hypot(x - FUEGO.x, z - FUEGO.z);
      if (fd < 13 && y > 9) return y > 18 ? '#3b3633' : '#5b524c';
      if (y > 17) return '#8f8473';
      if (y > 11) return '#6f8a52';
      if (inFinca(x, z)) return '#6b5a3a';
      return GRASS[Math.floor(rnd * 4)];
    }

    // terrain: flat-shaded, colored per triangle, with jittered vertices so it feels hand-made
    const SIZE = 420, SEG = 200;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG).rotateX(-Math.PI / 2).toNonIndexed();
    geo.translate(0, 0, CZ);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), c = new THREE.Color();
    const jit = new Map();
    for (let i = 0; i < pos.count; i++) {
      const k = Math.round(pos.getX(i) * 10) + ',' + Math.round(pos.getZ(i) * 10);
      if (!jit.has(k)) jit.set(k, [(R() - 0.5) * 1.1, (R() - 0.5) * 1.1]);
      const [jx, jz] = jit.get(k);
      pos.setX(i, pos.getX(i) + jx); pos.setZ(i, pos.getZ(i) + jz);
      pos.setY(i, h(pos.getX(i), pos.getZ(i)));
    }
    for (let i = 0; i < pos.count; i += 3) {
      const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      c.set(colorAt(x, z, y, R())).offsetHSL(0, 0, (R() - 0.5) * 0.03);
      for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (i + k) * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    terrain.receiveShadow = true;
    G.add(terrain);

    const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2fa8b0', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 }));
    water.position.set(0, WATER, CZ);
    water.receiveShadow = true;
    G.add(water);
    const glints = [];
    for (let i = 0; i < 40; i++) {
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, toneMapped: false }));
      let x, z;
      if (i < 16) { const a = R() * 6.28, rr = Math.sqrt(R()) * 0.8; x = LAKE.x + Math.cos(a) * LAKE.rx * rr; z = LAKE.z + Math.sin(a) * LAKE.rz * rr; }
      else { const a = R() * 6.28, rr = 140 + R() * 40; x = Math.cos(a) * rr; z = CZ + Math.sin(a) * rr; }
      gl.position.set(x, WATER + 0.04, z);
      gl.userData.p = R() * 6;
      G.add(gl); glints.push(gl);
    }

    // Fuego: lava glow and puffs of ash every couple of seconds
    const crater = new THREE.Vector3(FUEGO.x, h(FUEGO.x, FUEGO.z) + 0.6, FUEGO.z);
    put(G, new THREE.CylinderGeometry(1.4, 2.2, 1, 8), new THREE.MeshBasicMaterial({ color: '#ff6a2a', toneMapped: false }), crater.x, crater.y - 0.5, crater.z);
    const lavaLight = new THREE.PointLight('#ff6a2a', 220, 40, 1.6); lavaLight.position.copy(crater).add(new THREE.Vector3(0, 3, 0)); G.add(lavaLight);
    const puffs = [];
    for (let i = 0; i < 16; i++) {
      const p = put(G, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#8d8580', transparent: true, opacity: 0, flatShading: true, roughness: 1 }));
      p.castShadow = false; p.userData.life = 0; puffs.push(p);
    }
    let puffT = 0, puffI = 0;

    // ---- trees: instanced (cheap), but each one can still be knocked over ----
    const spots = [];
    for (let i = 0; i < 3400; i++) {
      const x = (R() - 0.5) * 300, z = (R() - 0.5) * 300 + CZ;
      const y = h(x, z), r = Math.hypot(x, z - CZ), Rc = coastR(x, z);
      if (r > Rc - 10 || y < 0.3 || lakeD(x, z) < 1.25) continue;
      if (pathD(x, z) < 6 || rectMask(x, z, PITCH, 8) > 0 || Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 5
        || Math.hypot(x, z - 4) < 15 || Math.hypot(x - CAMP.x, z - CAMP.z) < 12 || Math.hypot(x - HILL.x, z - HILL.z) < 9 || Math.hypot(x - 31, z - 4) < 8
        || inTrackField(x, z) || inFinca(x, z) || Math.hypot(x - FUEGO.x, z - FUEGO.z) < 12 || (z > -52 && z < -36 && x > -44 && x < -16) || y > 19) continue;
      if (R() > 0.42 || CLEAR.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr)) continue;
      const nearPlaza = Math.hypot(x - PLAZA.x, z - PLAZA.z) < 40;
      spots.push({ x, y, z, s: 0.8 + R() * 0.9, leaf: R() < (nearPlaza ? 0.6 : 0.28), jac: nearPlaza && R() < 0.6 });
    }
    const hamA = [41, 37], hamB = [47.5, 40];
    for (const [x, z] of [hamA, hamB]) spots.push({ x, y: h(x, z), z, s: 1.1, leaf: true });
    // palms on the black sand beach in the south
    for (let i = 0; i < 260; i++) {
      const a = 0.9 + R() * 1.35, rr = coastR(Math.cos(a), CZ + Math.sin(a)) - 9 - R() * 6;
      const x = Math.cos(a) * rr, z = CZ + Math.sin(a) * rr, y = h(x, z);
      if (y < 0.2 || pathD(x, z) < 4 || R() > 0.35) continue;
      spots.push({ x, y, z, s: 0.9 + R() * 0.5, palm: true });
    }
    const greens = ['#2f6b45', '#3b7a4c', '#2a5e3e', '#447f50'];
    const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z), S = (s) => new THREE.Matrix4().makeScale(s, s, s), RY = (a) => new THREE.Matrix4().makeRotationY(a);
    const kinds = {
      pine: [
        [new THREE.CylinderGeometry(0.22, 0.32, 1.8, 5), () => '#6b4a32', (t) => T(0, 0.9 * t.s, 0).multiply(S(t.s))],
        [new THREE.ConeGeometry(1.7, 3.2, 7), (t, i) => greens[i % 4], (t) => T(0, 2.7 * t.s, 0).multiply(RY(t.x)).multiply(S(t.s))],
        [new THREE.ConeGeometry(1.25, 2.6, 7), (t, i) => greens[(i + 1) % 4], (t) => T(0, 4.3 * t.s, 0).multiply(RY(t.z)).multiply(S(t.s))],
      ],
      leaf: [
        [new THREE.CylinderGeometry(0.22, 0.3, 2.2, 5), () => '#6b4a32', (t) => T(0, 1.1 * t.s, 0).multiply(S(t.s))],
        [new THREE.IcosahedronGeometry(1.9, 0), (t, i) => (t.jac ? ['#9b7fd1', '#8a6cc4'][i % 2] : ['#5c9a3e', '#6aa84f', '#7fb24a'][i % 3]), (t) => T(0, 3.4 * t.s, 0).multiply(RY(t.x)).multiply(new THREE.Matrix4().makeScale(t.s, t.s * 0.85, t.s))],
      ],
      palm: [
        [new THREE.CylinderGeometry(0.16, 0.26, 4.4, 5).translate(0, 2.2, 0).rotateZ(0.18), () => '#8a6a48', (t) => RY(t.x).multiply(S(t.s))],
        [new THREE.OctahedronGeometry(1, 0), (t, i) => ['#3f8f45', '#4f9e4a'][i % 2], (t) => RY(t.x).multiply(T(0.8 * t.s, 4.4 * t.s, 0)).multiply(new THREE.Matrix4().makeScale(2.6 * t.s, 0.55 * t.s, 2.6 * t.s))],
      ],
    };
    for (const [k, partsDef] of Object.entries(kinds)) {
      const list = spots.filter(t => (k === 'palm' ? t.palm : k === 'leaf' ? t.leaf && !t.palm : !t.leaf && !t.palm));
      const meshes = partsDef.map(([g]) => { const m = new THREE.InstancedMesh(g, mat('#ffffff'), list.length); m.castShadow = m.receiveShadow = true; G.add(m); return m; });
      list.forEach((t, i) => {
        const rec = { x: t.x, y: t.y, z: t.z, s: t.s, parts: [], fall: -1 };
        partsDef.forEach(([, color, local], p) => {
          const L = local(t);
          meshes[p].setMatrixAt(i, T(t.x, t.y, t.z).multiply(L));
          meshes[p].setColorAt(i, tmpC.set(color(t, i)).offsetHSL(0, 0, (R() - 0.5) * 0.05));
          rec.parts.push([meshes[p], i, L]);
        });
        rec.col = { x: t.x, z: t.z, r: (k === 'palm' ? 0.35 : 0.55) * t.s, tree: rec };
        colliders.push(rec.col);
      });
    }

    // coffee finca on Acatenango's slope: neat rows of bushes
    const bushes = [];
    for (let x = FINCA.x0 + 1; x < FINCA.x1; x += 2.2) for (let z = FINCA.z0 + 1; z < FINCA.z1; z += 1.4) bushes.push([x + (R() - 0.5) * 0.3, z]);
    const bushM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.7, 0), mat('#ffffff'), bushes.length);
    bushes.forEach(([x, z], i) => { dummy.position.set(x, h(x, z) + 0.5, z); dummy.rotation.set(x, z, 0); dummy.scale.set(1, 0.9, 1); dummy.updateMatrix(); bushM.setMatrixAt(i, dummy.matrix); bushM.setColorAt(i, tmpC.set(i % 7 ? '#2f6b3a' : '#3d7a40')); });
    bushM.castShadow = bushM.receiveShadow = true;
    G.add(bushM);

    // rocks: small ones you drive over, big ones you bounce off
    const rocks = [];
    for (let i = 0; i < 110; i++) {
      const x = (R() - 0.5) * 260, z = (R() - 0.5) * 260 + CZ;
      const Rc = coastR(x, z);
      if (Math.hypot(x, z - CZ) > Rc - 8 || lakeD(x, z) < 1.15 || pathD(x, z) < 3 || rectMask(x, z, PITCH, 6) > 0 || Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r || Math.hypot(x, z - 4) < 12 || Math.hypot(x - CAMP.x, z - CAMP.z) < 10 || inTrackField(x, z)) continue;
      const s = 0.4 + R() * 1.4;
      rocks.push([x, h(x, z), z, s]);
      if (s > 1.1) colliders.push({ x, z, r: s * 0.9, h: s * 0.8 });
    }
    const rockM = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mat('#ffffff'), rocks.length);
    rocks.forEach(([x, y, z, s], i) => { dummy.position.set(x, y + s * 0.2, z); dummy.scale.set(s, s * 0.7, s); dummy.rotation.set(x, z, 0); dummy.updateMatrix(); rockM.setMatrixAt(i, dummy.matrix); rockM.setColorAt(i, tmpC.set('#9a958c').offsetHSL(0, 0, (R() - 0.5) * 0.08)); });
    rockM.castShadow = rockM.receiveShadow = true;
    G.add(rockM);

    // flowers around the plaza
    const flowers = [];
    for (let i = 0; i < 160; i++) {
      const a = R() * 6.28, rr = PLAZA.r + 1 + R() * 10;
      const x = PLAZA.x + Math.cos(a) * rr, z = PLAZA.z + Math.sin(a) * rr;
      if (pathD(x, z) < 2.5) continue;
      flowers.push([x, h(x, z), z, R()]);
    }
    const flM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 0), mat('#ffffff'), flowers.length);
    flowers.forEach(([x, y, z, k], i) => { dummy.position.set(x, y + 0.25, z); dummy.scale.setScalar(1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); flM.setMatrixAt(i, dummy.matrix); flM.setColorAt(i, tmpC.set(['#ff5a7a', '#ffd23f', '#ffffff', '#ff8a3c'][Math.floor(k * 4)])); });
    G.add(flM);

    // clouds that drift and actually cast shadows
    const clouds = [];
    for (let i = 0; i < 12; i++) {
      const cg = new THREE.Group();
      for (let k = 0; k < 4; k++) { const s = 2.5 + R() * 3; const m = put(cg, new THREE.IcosahedronGeometry(s, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1 }), k * 3.2 - 5, (R() - 0.5) * 1.5, (R() - 0.5) * 3); m.scale.y = 0.6; m.receiveShadow = false; }
      cg.position.set((R() - 0.5) * 300, 38 + R() * 14, (R() - 0.5) * 260 + CZ);
      cg.userData.v = 1 + R() * 1.5;
      G.add(cg); clouds.push(cg);
    }

    // ---- Antigua: arch, houses, La Merced, flags, a chicken bus, a giant kite ----
    const waving = [];
    const archPos = { x: -15, z: -10 }, th = Math.atan2(-16, -11);
    const arch = new THREE.Group(); arch.position.set(archPos.x, 0, archPos.z); arch.rotation.y = th; arch.scale.setScalar(0.8); G.add(arch);
    const Y = '#f0b73a', WHT = '#f7efe0';
    for (const s of [-1, 1]) { rbox(arch, 2.6, 8, 3, Y, s * 4.3, 4, 0, 0.1); rbox(arch, 2.9, 0.5, 3.3, WHT, s * 4.3, 0.25, 0, 0.05); }
    rbox(arch, 11.4, 3.2, 3, Y, 0, 9.4, 0, 0.1);
    rbox(arch, 11.8, 0.4, 3.3, WHT, 0, 7.9, 0, 0.05);
    rbox(arch, 11.8, 0.4, 3.3, WHT, 0, 11.1, 0, 0.05);
    rbox(arch, 4, 3, 2.6, Y, 0, 12.8, 0, 0.1);
    put(arch, new THREE.ConeGeometry(2.5, 1.6, 4).rotateY(Math.PI / 4), '#b4553a', 0, 15, 0).scale.set(1, 1, 0.75);
    const clock = canvasTex(256, 256, (g) => { g.fillStyle = WHT; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 10; g.stroke(); g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 50); g.moveTo(128, 128); g.lineTo(180, 150); g.stroke(); });
    for (const s of [1, -1]) decal(arch, 2, 2, clock, 0, 12.9, s * 1.32, 0, s > 0 ? 0 : Math.PI);
    for (const s of [-1, 1]) colliders.push({ x: archPos.x + s * 3.44 * Math.cos(th), z: archPos.z - s * 3.44 * Math.sin(th), r: 1.4 });
    for (const s of [-1, 1]) waving.push(guateFlag(G, archPos.x + s * 6 * Math.cos(th), 0, archPos.z - s * 6 * Math.sin(th), 6, 1.2));
    // a sawdust alfombra, like the ones for Semana Santa
    const alf = canvasTex(256, 512, (g, w, hh) => {
      g.fillStyle = '#8a4fb0'; g.fillRect(0, 0, w, hh);
      const cs = ['#ffd23f', '#ff5a2a', '#2bb3a3', '#ffffff', '#e85d9a'];
      for (let y = 0; y < hh; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = cs[((x + y) / 64) % 5]; g.beginPath(); g.arc(x + 32, y + 32, 22, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + 32, y + 32, 7, 0, 7); g.fill(); }
      g.strokeStyle = '#ffd23f'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, hh - 10);
    });
    const alfM = decal(G, 4, 9, alf, -21.5, 0.13, -14, -Math.PI / 2, 0);
    alfM.rotation.z = -th;
    const houseCols = [[-47, -10, '#e8a33d'], [-47, -20, '#3d7ea6'], [-46, -30, '#e07a9a'], [-29, -2, '#f2d16b'], [-38, -2, '#7bb38a'], [-18, -30, '#c8553d'], [-14, -40, '#9fc8e8'], [-58, -22, '#f2a65a'], [-20, -2, '#e8a33d']];
    for (const [x, z, col] of houseCols) {
      const hs = new THREE.Group(); hs.position.set(x, h(x, z), z); G.add(hs);
      const w = 7, d = 6.4, ht = 4.6;
      rbox(hs, w, ht, d, col, 0, ht / 2, 0, 0.08);
      rbox(hs, w + 0.3, 0.35, d + 0.3, WHT, 0, 0.18, 0, 0.04);
      const roof = put(hs, new THREE.CylinderGeometry(0.01, 4.5, 2.2, 4, 1).rotateY(Math.PI / 4), '#b4553a', 0, ht + 1.1, 0);
      roof.scale.set(1.2, 1, 1.05);
      for (const sx of [-1.8, 1.8]) rbox(hs, 1.3, 1.6, 0.2, '#3a2a22', sx, 2.6, d / 2 + 0.02, 0.05);
      rbox(hs, 1.5, 2.6, 0.2, '#5a3a26', 0, 1.3, d / 2 + 0.02, 0.05);
      for (const sx of [-1.8, 1.8]) rbox(hs, 1.6, 0.25, 0.4, WHT, sx, 1.7, d / 2 + 0.1, 0.04);
      const side = x < -44;
      hs.rotation.y = side ? Math.PI / 2 : z > -10 ? Math.PI : 0;
      const col1 = { x, z, hw: side ? d / 2 : w / 2, hd: side ? w / 2 : d / 2 };
      colliders.push(col1);
      houses.push({ group: hs, cols: [col1], x, z, R: 4.5, alive: true, t: -1, color: col });
    }
    // La Merced: the yellow church with the white wedding-cake trim
    const chY = h(-48, -48);
    const ch = new THREE.Group(); ch.position.set(-48, chY, -48); ch.rotation.y = 0.5; G.add(ch);
    rbox(ch, 14, 9, 6, '#f2c14e', 0, 4.5, 0, 0.1);
    for (const y of [3, 6, 8.8]) rbox(ch, 14.3, 0.35, 6.3, WHT, 0, y, 0.05, 0.05);
    for (const x of [-5, -2.5, 2.5, 5]) rbox(ch, 0.6, 9, 0.4, WHT, x, 4.5, 3.05, 0.05);
    rbox(ch, 2.6, 4, 0.3, '#3a2a22', 0, 2, 3.05, 0.1);
    for (const s of [-1, 1]) { rbox(ch, 3, 4, 3, '#f2c14e', s * 5.5, 11, 0, 0.1); put(ch, new THREE.SphereGeometry(1.4, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), WHT, s * 5.5, 13, 0); }
    rbox(ch, 5, 2.4, 0.6, '#f2c14e', 0, 10.2, 2.7, 0.1);
    rbox(ch, 0.25, 1.4, 0.25, WHT, 0, 12, 2.7, 0.05); rbox(ch, 0.9, 0.25, 0.25, WHT, 0, 12.2, 2.7, 0.05);
    const chCol = { x: -48, z: -48, r: 6.5 };
    colliders.push(chCol);
    houses.push({ group: ch, cols: [chCol], x: -48, z: -48, R: 7, alive: true, t: -1, color: '#f2c14e' });
    // welcome sign
    const sign = new THREE.Group(); sign.position.set(-5, 0, -13); sign.rotation.y = 0.35; G.add(sign);
    for (const s of [-1, 1]) rbox(sign, 0.3, 3.6, 0.3, '#6b4a32', s * 3.2, 1.8, 0, 0.05);
    const sb0 = rbox(sign, 7.2, 2.2, 0.25, '#f7efe0', 0, 3.4, 0, 0.08);
    decal(sb0, 7, 2, label('', { w: 768, h: 220, fg: '#2a2622', font: `800 72px ${DISP}`, lines: ['ANTIGUA', 'GUATEMALA'] }), 0, 0, 0.14);
    colliders.push({ x: -5 - 3.2 * Math.cos(0.35), z: -13 + 3.2 * Math.sin(0.35), r: 0.3 }, { x: -5 + 3.2 * Math.cos(0.35), z: -13 - 3.2 * Math.sin(0.35), r: 0.3 });
    waving.push(guateFlag(G, -9.5, 0, -11.5, 5, 1.1));
    // a camioneta parked by the plaza
    const busV = VEHICLES.bus.build();
    busV.group.position.set(-6, h(-6, -26), -26); busV.group.rotation.y = 0.5; G.add(busV.group);
    for (const o of [-1.9, 0, 1.9]) colliders.push({ x: -6 + Math.sin(0.5) * o, z: -26 + Math.cos(0.5) * o, r: 1.3 });
    // barrilete: a giant Guatemalan kite
    const kite = new THREE.Group(); kite.position.set(-52, h(-52, -28), -28); kite.rotation.y = Math.PI / 2; G.add(kite);
    put(kite, new THREE.CylinderGeometry(0.15, 0.15, 6, 5), '#6b4a32', 0, 3, 0);
    const kd = new THREE.Mesh(new THREE.CircleGeometry(3.2, 12), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, map: canvasTex(256, 256, (g) => { const cs = ['#ff5a2a', '#ffd23f', '#2bb3a3', '#e85d9a', '#3d7ea6', '#7bb38a']; for (let i = 0; i < 12; i++) { g.fillStyle = cs[i % 6]; g.beginPath(); g.moveTo(128, 128); g.arc(128, 128, 128, i / 12 * 6.283, (i + 1) / 12 * 6.283); g.fill(); } for (let r = 100; r > 10; r -= 30) { g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, r, 0, 7); g.stroke(); } }), roughness: 0.8 }));
    kd.position.y = 7.5; kd.castShadow = true; kite.add(kd);
    colliders.push({ x: -52, z: -28, r: 0.4 });
    // dominoes in the plaza (Cuban afternoons)
    const dom = new THREE.Group(); dom.position.set(-40, 0.1, -12); G.add(dom);
    rbox(dom, 2.6, 0.15, 2.6, '#2b6b45', 0, 1.1, 0, 0.04);
    rbox(dom, 0.25, 1.05, 0.25, '#6b4a32', 0, 0.52, 0, 0.04);
    for (let i = 0; i < 7; i++) rbox(dom, 0.22, 0.08, 0.44, '#f7efe0', -0.9 + i * 0.3, 1.22, (i % 2) * 0.2 - 0.1, 0.02).rotation.y = i % 3 ? 0 : Math.PI / 2;
    for (const s of [-1, 1]) rbox(dom, 0.8, 0.7, 0.8, '#8c6239', s * 1.9, 0.35, 0, 0.1);
    colliders.push({ x: -40, z: -12, r: 1.4 });
    // the dance floor with string lights, and a couple who are better at this than you
    const DF = { x: -31, z: -24 };
    const tiles = [];
    const tileCols = ['#ff5a2a', '#ffc65a', '#2bb3a3', '#e85d9a'];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const m = new THREE.MeshStandardMaterial({ color: '#2a2433', emissive: '#000', roughness: 0.4, flatShading: true });
      const t = rbox(G, 1.72, 0.2, 1.72, '#000', DF.x - 3.6 + i * 1.8, 0.2, DF.z - 3.6 + j * 1.8, 0.05);
      t.material = m; tiles.push({ m, i, j });
    }
    const poles = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3(DF.x + a * 5.3, 0, DF.z + b * 5.3));
    poles.forEach(p => { rbox(G, 0.3, 5, 0.3, '#3a2a22', p.x, 2.5, p.z, 0.05); colliders.push({ x: p.x, z: p.z, r: 0.35 }); });
    const bulbs = [];
    const bulbCols = ['#ffd27a', '#ff8a5c', '#9be3d8', '#ffb3c7'];
    for (let k = 0; k < 4; k++) {
      const a = poles[k], b = poles[(k + 1) % 4];
      for (let i = 1; i < 10; i++) {
        const t = i / 10, sag = Math.sin(t * Math.PI) * 1.1;
        bulbs.push(put(G, new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshBasicMaterial({ color: bulbCols[i % 4], toneMapped: false }), lerp(a.x, b.x, t), 4.9 - sag, lerp(a.z, b.z, t)));
      }
    }
    const speaker = new THREE.Group(); speaker.position.set(DF.x + 6.4, 0.1, DF.z + 3.5); speaker.rotation.y = -Math.PI / 2; G.add(speaker);
    rbox(speaker, 1.6, 2.6, 1.3, '#1c1c22', 0, 1.3, 0, 0.12);
    const cones = [put(speaker, new THREE.CylinderGeometry(0.5, 0.5, 0.1, 12).rotateX(Math.PI / 2), '#444', 0, 1.8, 0.66), put(speaker, new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12).rotateX(Math.PI / 2), '#444', 0, 0.8, 0.66)];
    colliders.push({ x: speaker.position.x, z: speaker.position.z, r: 1 });
    const couple = new THREE.Group(); couple.position.set(DF.x - 2.4, 0.3, DF.z - 2.4); G.add(couple);
    const d1 = person(couple, { x: -0.45, shirt: '#e85d9a', pants: '#2a2d36', skin: '#a8714a' });
    const d2 = person(couple, { x: 0.45, shirt: '#f7efe0', pants: '#3a3f52', skin: '#c08a5e' });
    d1.rotation.y = Math.PI / 2; d2.rotation.y = -Math.PI / 2;
    const onFloor = (car) => Math.abs(car.x - DF.x) < 4.6 && Math.abs(car.z - DF.z) < 4.6;
    let danceTime = 0;

    // ---- the lake: dock and a sailboat waiting at the end ----
    for (let z = DOCK.z1; z > DOCK.z0; z -= 1.05) rbox(G, 3.4, 0.22, 0.95, '#a57a4f', -30, 0.14, z, 0.04);
    for (const z of [-54, -60, -66]) for (const x of [-31.7, -28.3]) put(G, new THREE.CylinderGeometry(0.2, 0.2, 3, 6), '#6b4a32', x, -0.8, z);
    const moored = VEHICLES.boat.build();
    moored.group.position.set(-26.8, WATER + 0.05, -66); G.add(moored.group);
    const bobber = put(G, new THREE.SphereGeometry(0.22, 8, 6), '#ff3d3d');
    bobber.visible = false;
    const fish = put(G, new THREE.ConeGeometry(0.3, 1, 5).rotateX(Math.PI / 2), '#ff9a3c');
    fish.visible = false;
    let fishT = 3, fishA = 0, fishP = [0, 0];

    // ---- soccer pitch, with a goalkeeper ----
    const lineM = new THREE.MeshBasicMaterial({ color: '#f4f7ee' });
    const line = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), lineM); m.position.set(x, 0.04, z); G.add(m); };
    const pcx = (PITCH.x0 + PITCH.x1) / 2, pcz = (PITCH.z0 + PITCH.z1) / 2;
    line(30, 0.25, pcx, PITCH.z0); line(30, 0.25, pcx, PITCH.z1); line(0.25, 22, PITCH.x0, pcz); line(0.25, 22, PITCH.x1, pcz); line(0.25, 22, pcx, pcz);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.55, 32).rotateX(-Math.PI / 2), lineM); ring.position.set(pcx, 0.04, pcz); G.add(ring);
    for (const s of [-1, 1]) { const x = s < 0 ? PITCH.x0 : PITCH.x1; line(0.25, 10, x - s * 5, pcz); line(5, 0.25, x - s * 2.5, pcz - 5); line(5, 0.25, x - s * 2.5, pcz + 5); }
    const netTex = canvasTex(64, 64, (g) => { g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(0, 0, 64, 64); });
    netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping; netTex.repeat.set(8, 4);
    const netM = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    const GW = 3.6;
    for (const s of [-1, 1]) {
      const gx = s < 0 ? PITCH.x0 : PITCH.x1, bx = gx + s * 2.6;
      for (const pz of [pcz - GW, pcz + GW]) { rbox(G, 0.35, 3.2, 0.35, '#fbfbf8', gx, 1.6, pz, 0.1); colliders.push({ x: gx, z: pz, r: 0.4 }); }
      rbox(G, 0.35, 0.35, GW * 2 + 0.35, '#fbfbf8', gx, 3.2, pcz, 0.1);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(GW * 2, 3.2), netM); back.position.set(bx, 1.6, pcz); back.rotation.y = Math.PI / 2; G.add(back);
      for (const pz of [pcz - GW, pcz + GW]) { const sd = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), netM); sd.position.set(gx + s * 1.3, 1.6, pz); G.add(sd); colliders.push({ x: gx + s * 1.3, z: pz, hw: 1.3, hd: 0.15 }); }
      const tp = new THREE.Mesh(new THREE.PlaneGeometry(2.6, GW * 2), netM); tp.rotation.x = -Math.PI / 2; tp.position.set(gx + s * 1.3, 3.2, pcz); G.add(tp);
      colliders.push({ x: bx, z: pcz, hw: 0.2, hd: GW });
    }
    const keeper = person(G, { x: PITCH.x0 + 1, z: pcz, shirt: '#ffd23f', pants: '#16171c', skin: '#c08a5e' });
    keeper.rotation.y = Math.PI / 2;
    for (const s of [-1, 1]) rbox(keeper, 0.18, 0.18, 0.18, '#ff5a2a', s * 0.42, 1.1, 0.1, 0.05);
    const keeperCol = { x: PITCH.x0 + 1, z: pcz, r: 0.6 };
    colliders.push(keeperCol);
    const ballG = new THREE.IcosahedronGeometry(1.1, 1);
    const bc = new Float32Array(ballG.attributes.position.count * 3);
    for (let i = 0; i < bc.length; i += 9) { const dark = (i / 9) % 5 === 0; for (let k = 0; k < 9; k++) bc[i + k] = dark ? 0.08 : 0.95; }
    ballG.setAttribute('color', new THREE.BufferAttribute(bc, 3));
    const ballM = new THREE.Mesh(ballG, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.5 }));
    ballM.castShadow = true; G.add(ballM);
    const ball = { mesh: ballM, x: pcx, z: pcz, y: 0, vx: 0, vz: 0, vy: 0, r: 1.1, mass: 0.6, bounce: 0.75, drag: 0.55, yOff: 1.1, roll: true, floats: true, home: [pcx, pcz], grounded: true };
    bodies.push(ball);
    let goalCool = 0;
    const addBody = (mesh, x, z, o) => { G.add(mesh); mesh.position.set(x, 0, z); bodies.push({ mesh, x, z, y: h(x, z), vx: 0, vz: 0, vy: 0, yOff: 0, home: [x, z], grounded: true, bounce: 0.3, drag: 3, ...o }); };
    for (let i = 0; i < 5; i++) {
      const cg = new THREE.Group();
      put(cg, new THREE.ConeGeometry(0.45, 1, 8), '#ff7a2a', 0, 0.5, 0);
      put(cg, new THREE.CylinderGeometry(0.6, 0.6, 0.1, 8), '#ff7a2a', 0, 0.05, 0);
      addBody(cg, 14 + i * 2.6, -1.5, { r: 0.55, mass: 0.2, hop: 0.3 });
    }

    // ---- gym corner ----
    const gym = new THREE.Group(); gym.position.set(31, 0, 4); G.add(gym);
    for (const s of [-1, 1]) rbox(gym, 0.35, 5, 0.35, '#2b2f40', s * 2.6, 2.5, -1.4, 0.05);
    rbox(gym, 5.6, 0.25, 0.25, '#9aa0ab', 0, 4.9, -1.4, 0.05);
    rbox(gym, 6, 0.2, 0.2, '#9aa0ab', 0, 0.85, 0.9, 0.05);
    for (const s of [-1, 1]) for (const o of [0, 0.35]) put(gym, new THREE.CylinderGeometry(0.85, 0.85, 0.25, 12).rotateZ(Math.PI / 2), '#1c1c22', s * (2.3 + o), 0.85, 0.9);
    colliders.push({ x: 31, z: 2.6, hw: 2.8, hd: 0.3 }, { x: 31, z: 4.9, hw: 3.2, hd: 0.9, h: 1.7 });
    for (let i = 0; i < 2; i++) {
      const kb = new THREE.Group();
      put(kb, new THREE.SphereGeometry(0.6, 8, 6), '#1c1c22', 0, 0.6, 0);
      put(kb, new THREE.TorusGeometry(0.35, 0.1, 5, 10), '#1c1c22', 0, 1.25, 0);
      addBody(kb, 35 + i * 1.6, 7, { r: 0.65, mass: 3, bounce: 0.2, drag: 4 });
    }

    // ---- camp: fire, empanadas, tent, hammock, coffee, a sombrero vueltiao ----
    const fy = h(50, 28);
    const fire = new THREE.Group(); fire.position.set(50, fy, 28); G.add(fire);
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; put(fire, new THREE.DodecahedronGeometry(0.45, 0), '#8f8a82', Math.cos(a) * 1.5, 0.25, Math.sin(a) * 1.5); }
    for (let i = 0; i < 3; i++) { const l = rbox(fire, 0.4, 0.4, 2.4, '#6b4a32', 0, 0.35, 0, 0.1); l.rotation.y = i * 1.05; l.rotation.x = 0.15; }
    const flames = [['#ff5a2a', 0.9, 1.9], ['#ffa23a', 0.6, 1.4], ['#ffe07a', 0.35, 0.9]].map(([col, r, ht]) => {
      const f = put(fire, new THREE.ConeGeometry(r, ht, 6), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }), 0, 0.5 + ht / 2, 0);
      f.castShadow = false; return f;
    });
    put(fire, new THREE.CylinderGeometry(0.75, 0.6, 1, 10), '#2a2d36', 2.4, 0.5, -0.6);
    put(fire, new THREE.CylinderGeometry(0.66, 0.66, 0.06, 10), '#d9a441', 2.4, 1.02, -0.6);
    put(fire, new THREE.CylinderGeometry(1.1, 1.1, 0.12, 12), '#2a2d36', -2.3, 0.55, 0.8);
    for (let i = 0; i < 4; i++) put(fire, new THREE.SphereGeometry(0.28, 6, 4, 0, Math.PI), '#e0a24a', -2.6 + (i % 2) * 0.55, 0.62, 0.5 + Math.floor(i / 2) * 0.55).rotation.x = -Math.PI / 2;
    const fireLight = new THREE.PointLight('#ff8a3a', 60, 20, 1.6); fireLight.position.set(50, fy + 2.5, 28); G.add(fireLight);
    colliders.push({ x: 50, z: 28, r: 2 });
    let emberT = 0;
    const stump = new THREE.Group(); stump.position.set(53.5, h(53.5, 25.5), 25.5); G.add(stump);
    put(stump, new THREE.CylinderGeometry(0.7, 0.8, 0.9, 8), '#7a5638', 0, 0.45, 0);
    const hat = new THREE.Group(); hat.position.y = 0.92; hat.rotation.z = 0.15; stump.add(hat);
    const vueltiao = canvasTex(256, 32, (g) => { for (let x = 0; x < 256; x += 32) { g.fillStyle = '#f2e6c8'; g.fillRect(x, 0, 16, 32); g.fillStyle = '#1b1b1b'; g.fillRect(x + 16, 0, 16, 32); } });
    vueltiao.wrapS = THREE.RepeatWrapping;
    put(hat, new THREE.CylinderGeometry(1.0, 1.0, 0.06, 16), new THREE.MeshStandardMaterial({ map: vueltiao, roughness: 0.9 }));
    put(hat, new THREE.CylinderGeometry(0.34, 0.44, 0.5, 12), new THREE.MeshStandardMaterial({ map: vueltiao, roughness: 0.9 }), 0, 0.28, 0);
    colliders.push({ x: 53.5, z: 25.5, r: 0.8 });
    const sack = new THREE.Group(); sack.position.set(55.5, h(55.5, 30), 30); sack.rotation.y = -0.5; G.add(sack);
    rbox(sack, 1.6, 1.4, 1.1, '#c9a46c', 0, 0.7, 0, 0.35);
    decal(sack, 1.2, 0.6, label('', { w: 256, h: 128, fg: '#3b2416', font: `800 40px ${DISP}`, lines: ['CAFÉ', 'COLOMBIA'] }), 0, 0.8, 0.57);
    colliders.push({ x: 55.5, z: 30, r: 0.9 });
    const tent = new THREE.Group(); tent.position.set(58.5, h(58.5, 34), 34); tent.rotation.y = -0.6; G.add(tent);
    const prism = put(tent, new THREE.CylinderGeometry(2.4, 2.4, 5, 3), '#ff7a2a', 0, 1.2, 0);
    prism.rotation.set(Math.PI / 2, Math.PI / 2, Math.PI / 2);
    rbox(tent, 0.08, 2.5, 0.08, '#6b4a32', 0, 1.25, 2.6, 0.02);
    colliders.push({ x: 58.5, z: 34, r: 2.6 });
    const ham = new THREE.CatmullRomCurve3([new THREE.Vector3(hamA[0], h(...hamA) + 2.2, hamA[1]), new THREE.Vector3((hamA[0] + hamB[0]) / 2, h(...hamA) + 1.0, (hamA[1] + hamB[1]) / 2), new THREE.Vector3(hamB[0], h(...hamB) + 2.2, hamB[1])]);
    put(G, new THREE.TubeGeometry(ham, 16, 0.45, 5), '#2bb3a3');
    const book = new THREE.Group(); book.position.copy(ham.getPoint(0.5)).add(new THREE.Vector3(0, 0.45, 0)); book.rotation.set(0, 0.6, 0); G.add(book);
    rbox(book, 0.9, 0.12, 1.3, '#c4392f', -0.47, 0.06, 0, 0.03).rotation.z = 0.25;
    rbox(book, 0.9, 0.12, 1.3, '#c4392f', 0.47, 0.06, 0, 0.03).rotation.z = -0.25;
    for (let i = 0; i < 2; i++) {
      const cr = new THREE.Group(); rbox(cr, 1.6, 1.6, 1.6, '#b98a55', 0, 0.8, 0, 0.12); rbox(cr, 1.64, 0.25, 1.64, '#8c6239', 0, 1.2, 0, 0.04); rbox(cr, 1.64, 0.25, 1.64, '#8c6239', 0, 0.4, 0, 0.04);
      addBody(cr, 43 + i * 2.2, 23, { r: 0.95, mass: 1.6, bounce: 0.2, drag: 3.5 });
    }

    // chickens near the bus. they wander. you will chase them.
    for (let i = 0; i < 6; i++) {
      const ck = new THREE.Group();
      const col = i % 2 ? '#f4efe6' : '#a0522d';
      put(ck, new THREE.IcosahedronGeometry(0.4, 0), col, 0, 0.45, 0).scale.set(0.9, 0.9, 1.2);
      put(ck, new THREE.IcosahedronGeometry(0.22, 0), col, 0, 0.8, 0.32);
      put(ck, new THREE.BoxGeometry(0.06, 0.14, 0.12), '#d6262f', 0, 1.0, 0.32);
      put(ck, new THREE.ConeGeometry(0.06, 0.14, 4).rotateX(Math.PI / 2), '#ffb13c', 0, 0.78, 0.55);
      addBody(ck, -10 + (i % 3) * 2, -20 + Math.floor(i / 3) * 2, { r: 0.45, mass: 0.15, hop: 0.5, drag: 2, wander: true, bounce: 0.5 });
    }

    // birds: dark ones circling Fuego, quetzals perched around the island that take off when you get close
    const flock = [];
    for (let i = 0; i < 6; i++) { const b = bird(G, false); flock.push({ ...b, a: i, r: 14 + i * 2, y: 34 + i }); }
    rbox(G, 0.2, 1.4, 0.2, '#6b4a32', 65, h(65, -70) + 0.7, -70, 0.04);
    const quetzals = [[5.5, -3.5, 6.6], [-15, -10, 13.9], [41, 37, h(41, 37) + 5.2], [-6, 58, 6.3], [65, -70, h(65, -70) + 1.5]].map(([x, z, y], i) => {
      const b = bird(G, true);
      const home = new THREE.Vector3(x, y, z);
      b.g.position.copy(home);
      return { ...b, home, state: 0, t: 0, seen: false, phase: i * 1.7 };
    });

    // ---- race track ----
    const startX = TRACK.b + TRACK.r;
    decal(G, 7.2, 1.4, canvasTex(256, 64, (g) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#16171c' : '#ffffff'; g.fillRect(x * 16, y * 16, 16, 16); } }), startX, 0.2, TRACK.z, -Math.PI / 2, 0);
    const gate = new THREE.Group(); gate.position.set(startX, 0.15, TRACK.z); G.add(gate);
    for (const s of [-1, 1]) { rbox(gate, 0.4, 5.5, 0.4, '#16171c', s * 4.4, 2.75, 0, 0.08); colliders.push({ x: startX + s * 4.4, z: TRACK.z, r: 0.45 }); }
    const ban = rbox(gate, 9.2, 1.3, 0.3, '#ffffff', 0, 5.3, 0, 0.08);
    decal(ban, 9, 1.2, canvasTex(512, 72, (g) => { for (let x = 0; x < 32; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#16171c' : '#ffffff'; g.fillRect(x * 16, y * 36, 16, 36); } g.fillStyle = LAVA; g.fillRect(150, 8, 212, 56); g.fillStyle = '#fff'; g.font = `800 44px ${DISP}`; g.textAlign = 'center'; g.fillText('LA PISTA', 256, 52); }), 0, 0, 0.16);
    waving.push(guateFlag(G, startX + 5.5, 0.15, TRACK.z + 1, 5, 1));
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const cx = clamp(TRACK.x + Math.cos(a) * 30, TRACK.a, TRACK.b), x = cx + Math.cos(a) * (TRACK.r - 5.2), z = TRACK.z + Math.sin(a) * (TRACK.r - 5.2);
      const tg = new THREE.Group();
      for (let k = 0; k < 3; k++) put(tg, new THREE.TorusGeometry(0.55, 0.25, 6, 10).rotateX(Math.PI / 2), i % 2 ? '#16171c' : '#d93a32', 0, 0.25 + k * 0.45, 0);
      addBody(tg, x, z, { r: 0.85, mass: 0.8, bounce: 0.6, drag: 2.5, hop: 0.2 });
    }
    let bestLap = 0;
    try { bestLap = Number(localStorage.getItem('dan.lap')) || 0; } catch {}
    const race = { on: false, t0: 0, seen: new Set(), lastQ: null, best: bestLap };

    // ---- summit ----
    const sy = h(HILL.x, HILL.z);
    const cairn = new THREE.Group(); cairn.position.set(HILL.x + 2.5, sy, HILL.z - 1.5); G.add(cairn);
    [[1.2, 0.5], [0.95, 1.2], [0.7, 1.8], [0.45, 2.3]].forEach(([s, y]) => { put(cairn, new THREE.DodecahedronGeometry(s, 0), '#9a958c', 0, y, 0).scale.y = 0.7; });
    colliders.push({ x: HILL.x + 2.5, z: HILL.z - 1.5, r: 1.3 });
    const sumSign = new THREE.Group(); sumSign.position.set(HILL.x - 3, sy, HILL.z + 2); sumSign.rotation.y = 0.3; G.add(sumSign);
    rbox(sumSign, 0.25, 3, 0.25, '#6b4a32', 0, 1.5, 0, 0.05);
    const sb = rbox(sumSign, 4, 1.3, 0.2, '#e9d3a8', 0, 2.8, 0, 0.05);
    decal(sb, 3.8, 1.2, label('', { w: 512, h: 160, fg: '#3a2a22', font: `800 52px ${DISP}`, lines: ['ACATENANGO', '3,976 m'] }), 0, 0, 0.11);
    colliders.push({ x: HILL.x - 3, z: HILL.z + 2, r: 0.4 });
    waving.push(guateFlag(G, HILL.x + 1, sy, HILL.z + 3, 4, 1));

    // ---- signpost at spawn (in Spanish, it's Guatemala) ----
    const post = new THREE.Group(); post.position.set(5.5, 0, -3.5); G.add(post);
    rbox(post, 0.35, 6.4, 0.35, '#6b4a32', 0, 3.2, 0, 0.05);
    [['ANTIGUA', -15, -10, '#f0b73a'], ['LAGO DE ATITLÁN', -30, -52, '#2bb3a3'], ['LA CANCHA', 18, -12, '#ffffff'], ['ACATENANGO', 62, -70, '#e9d3a8'], ['CAMPAMENTO', 50, 28, '#ff9a5c'], ['LA PISTA', -6, 46, '#d93a32'], ['PLAYA', 16, 92, '#3d3a38']].forEach(([t, tx, tz, col], i) => {
      const arm = new THREE.Group(); arm.position.y = 5.9 - i * 0.82; arm.rotation.y = Math.atan2(tx - 5.5, tz + 3.5) - Math.PI / 2; post.add(arm);
      const b = rbox(arm, 4.4, 0.7, 0.16, col, 2.3, 0, 0, 0.04);
      const fg = col === '#3d3a38' || col === '#d93a32' ? '#ffffff' : '#2a2622';
      decal(b, 4.2, 0.62, label(t, { w: 640, h: 96, fg, font: `800 50px ${DISP}` }), 0, 0, 0.09);
      decal(b, 4.2, 0.62, label(t, { w: 640, h: 96, fg, font: `800 50px ${DISP}` }), 0, 0, -0.09, 0, Math.PI);
    });
    colliders.push({ x: 5.5, z: -3.5, r: 0.4 });

    // ---- the way back: a laptop on a stump ----
    const portal = new THREE.Group(); portal.position.set(0, 0, 9.5); G.add(portal);
    put(portal, new THREE.CylinderGeometry(1.4, 1.6, 1.1, 10), '#7a5638', 0, 0.55, 0);
    put(portal, new THREE.CylinderGeometry(1.3, 1.3, 0.04, 10), '#d8b07a', 0, 1.12, 0);
    rbox(portal, 2.2, 0.12, 1.5, '#c3c7cf', 0, 1.2, 0, 0.05);
    const ph = new THREE.Group(); ph.position.set(0, 1.25, -0.7); ph.rotation.x = -0.25; portal.add(ph);
    rbox(ph, 2.2, 1.5, 0.08, '#c3c7cf', 0, 0.75, 0, 0.04);
    decal(ph, 2, 1.3, label('', { w: 512, h: 320, bg: '#0c0f17', fg: '#ff8a5c', font: `600 52px ${MONO}`, lines: ['$ ssh dan@desk', '_'] }), 0, 0.75, 0.05, 0, 0, true);
    portal.rotation.y = Math.PI;
    const pring = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.3, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: LAVA, transparent: true, opacity: 0.5, toneMapped: false }));
    pring.position.set(0, 0.06, 9.5); G.add(pring);
    colliders.push({ x: 0, z: 9.5, r: 1.6 });

    // flags out here
    const flag = (id, text, x, z, dy = 1) => { const m = buildFlag(); const y = ground(x, z) + dy; m.position.set(x, y, z); G.add(m); flags.push({ id, text, x, z, y: y + 0.9, mesh: m, anim: -1 }); };
    flag('w4', 'DAN{3976_meters}', HILL.x, HILL.z);
    flag('w5', 'DAN{read_the_wind}', -30, -69);
    flag('w6', 'DAN{la_antigua}', archPos.x, archPos.z, 1);
    flag('w7', 'DAN{leave_no_trace}', 55.5, 31.5);
    const danceFlag = { id: 'w8', text: 'DAN{one_two_three_five_six_seven}', x: DF.x, z: DF.z, y: -99, mesh: new THREE.Group(), anim: -1 };
    flags.push(danceFlag);

    zones.push(
      { id: 'familia', x: archPos.x, z: archPos.z, r: 7.5, ly: 13.6 },
      { id: 'dance', x: DF.x, z: DF.z, r: 6.5, ly: 6.4 },
      { id: 'lake', x: -30, z: -56, r: 7, ly: 3, lz: -58 },
      { id: 'pitch', x: pcx, z: pcz, r: 11, ly: 5, lz: PITCH.z0 },
      { id: 'gym', x: 31, z: 6, r: 5.5, ly: 6, lz: 2.6 },
      { id: 'fire', x: 50, z: 27, r: 6, ly: 5.4, lz: 28 },
      { id: 'hammock', x: 44, z: 38, r: 4.5, ly: 5.6, lz: 39 },
      { id: 'summit', x: HILL.x, z: HILL.z, r: 9, ly: sy + 6, lx: HILL.x - 3, lz: HILL.z + 2,
        shot: (c) => { const dx = FUEGO.x - c.x, dz = FUEGO.z - c.z, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l; return [c.x - ux * 14, c.y + 9, c.z - uz * 14, c.x + ux * 24, c.y + 7, c.z + uz * 24]; } },
      { id: 'race', x: startX, z: TRACK.z - 6, r: 6, ly: 7, lz: TRACK.z },
      { id: 'portal', x: 0, z: 9.5, r: 5, ly: 4, go: 2.9, to: 'desk' },
      { id: 'fuego', x: FUEGO.x, z: FUEGO.z, r: 0, ly: crater.y + 6 },
    );

    return {
      group: G, colliders, bodies, zones, flags, ground, bobber,
      bounds: [-180, CZ - 180, 180, CZ + 180],
      spawn: { x: 0, z: 2, a: Math.PI },
      places: {
        outside: [0, 2, Math.PI], familia: [-10, -7, th], dance: [-26, -19, -Math.PI * 0.75], lake: [-30, -48, Math.PI],
        pitch: [20, -10, Math.PI / 2], gym: [27, 10, Math.PI * 0.8], fire: [46, 24, Math.PI * 0.25], hammock: [40, 32, 0.3],
        summit: [59, -64.5, Math.PI * 0.85], race: [startX, TRACK.z - 9, 0],
      },
      env: { fog: '#f1cfa8', fogNear: 80, fogFar: 330, hemi: ['#cfe3ff', '#8a7a55', 1.25], sun: ['#ffe9c8', 2.5], sunOff: [-34, 46, 26], cam: [0, 27, 24], exposure: 1.0 },
      dance: onFloor,
      drawMap() {
        const [x0, z0, x1, z1] = [-180, CZ - 180, 180, CZ + 180], N = 200;
        return canvas2d(N, N, (g) => {
          const img = g.createImageData(N, N), col = new THREE.Color();
          for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
            const x = x0 + (i + 0.5) / N * (x1 - x0), z = z0 + (j + 0.5) / N * (z1 - z0), y = ground(x, z);
            col.set(y < WATER ? (y < -3 ? '#2b8fa5' : '#45b6bd') : colorAt(x, z, y, 0.3));
            const o = (j * N + i) * 4;
            img.data[o] = col.r * 255; img.data[o + 1] = col.g * 255; img.data[o + 2] = col.b * 255; img.data[o + 3] = 255;
          }
          g.putImageData(img, 0, 0);
        });
      },
      update(t, dt, car) {
        puffT -= dt;
        if (puffT <= 0) { puffT = 1.4 + Math.random() * 1.4; const p = puffs[puffI = (puffI + 1) % puffs.length]; p.userData.life = 1; p.position.copy(crater); }
        for (const p of puffs) {
          if (p.userData.life <= 0) continue;
          p.userData.life -= dt / 9;
          const k = 1 - p.userData.life;
          p.position.y += dt * (5 - k * 3); p.position.x -= dt * 2.4;
          p.scale.setScalar(2 + k * 9);
          p.material.opacity = Math.min(1, k * 6) * p.userData.life * 0.9;
        }
        lavaLight.intensity = 200 + Math.sin(t * 7) * 40;
        for (const cl of clouds) { cl.position.x += cl.userData.v * dt; if (cl.position.x > 160) cl.position.x = -160; }
        glints.forEach(g => { g.material.opacity = Math.max(0, Math.sin(t * 1.3 + g.userData.p * 3)) * 0.6; });
        waving.forEach((f, i) => { f.rotation.y = Math.sin(t * 2.2 + i) * 0.35; });
        moored.group.visible = kind !== 'boat';
        moored.group.position.y = WATER + 0.05 + Math.sin(t * 1.6) * 0.06;
        // flames
        flames.forEach((f, i) => { const s = 1 + Math.sin(t * (11 + i * 5)) * 0.12 + Math.sin(t * 23 + i) * 0.06; f.scale.set(s, 1 + Math.sin(t * 9 + i * 2) * 0.18, s); f.rotation.y = t * (1 + i); });
        fireLight.intensity = 55 + Math.sin(t * 13) * 8 + Math.sin(t * 29) * 5;
        emberT -= dt;
        if (emberT <= 0) { emberT = 0.25; burst(50, fy + 1.5, 28, 1, ['#ffb13c', '#ff5a2a'], 1, 1.4, 4); }
        // a fish jumps every few seconds
        fishT -= dt;
        if (fishT <= 0 && fishA <= 0) { fishA = 1; const a = Math.random() * 6.28, rr = Math.random() * 0.7; fishP = [LAKE.x + Math.cos(a) * LAKE.rx * rr, LAKE.z + Math.sin(a) * LAKE.rz * rr]; fishT = 3 + Math.random() * 4; }
        if (fishA > 0) {
          fishA -= dt * 1.4;
          const k = 1 - fishA;
          fish.visible = true;
          fish.position.set(fishP[0] + k * 3, WATER + Math.sin(k * Math.PI) * 2.2, fishP[1]);
          fish.rotation.set(-Math.cos(k * Math.PI) * 1.1, Math.PI / 2, 0);
          if (fishA <= 0) { fish.visible = false; burst(fish.position.x, WATER + 0.2, fish.position.z, 8, ['#ffffff', '#bfe9f0'], 3, 0.6, 3); }
        }
        // birds circle Fuego
        flock.forEach((b, i) => {
          b.a += dt * (0.4 + i * 0.03);
          b.g.position.set(FUEGO.x + Math.cos(b.a) * b.r, b.y + Math.sin(t + i) * 1.5, FUEGO.z + Math.sin(b.a) * b.r);
          b.g.rotation.y = -b.a;
          b.wings.forEach((w, s) => { w.rotation.z = (s ? -1 : 1) * Math.sin(t * 12 + i) * 0.6; });
        });
        // quetzals: perch, get spooked, fly a loop, come back
        for (const q of quetzals) {
          const d = Math.hypot(car.x - q.home.x, car.z - q.home.z);
          if (q.state === 0) {
            q.g.position.y = q.home.y + Math.abs(Math.sin(t * 3 + q.phase)) * 0.05;
            q.g.rotation.y = Math.sin(t * 0.5 + q.phase) * 0.8;
            q.wings.forEach((w, s) => { w.rotation.z = (s ? -1 : 1) * 0.15; });
            if (d < 7) { q.state = 1; q.t = 0; sfx('chirp'); if (!q.seen) { q.seen = true; opts.onQuetzal?.(); } }
          } else {
            q.t += dt;
            const k = q.t / 6, a = q.phase + k * Math.PI * 2, sk = Math.sin(Math.min(1, k) * Math.PI);
            q.g.position.set(q.home.x + Math.sin(a) * 10 * sk, q.home.y + sk * 14, q.home.z + Math.cos(a) * 10 * sk - sk * 4);
            q.g.rotation.y = a + Math.PI / 2;
            q.wings.forEach((w, s) => { w.rotation.z = (s ? -1 : 1) * Math.sin(t * 16) * 0.8; });
            if (k >= 1) { if (d > 9) { q.state = 0; q.g.position.copy(q.home); } else q.t = 0; }
          }
        }
        // goalkeeper tracks the ball
        const kz = clamp(ball.z, pcz - GW + 0.7, pcz + GW - 0.7);
        keeperCol.z += clamp(kz - keeperCol.z, -dt * 4.5, dt * 4.5);
        keeper.position.z = keeperCol.z;
        keeper.position.y = Math.abs(Math.sin(t * 6)) * 0.08;
        // goal?
        goalCool -= dt;
        if (goalCool <= 0 && Math.abs(ball.z - pcz) < GW && (ball.x < PITCH.x0 - 0.4 || ball.x > PITCH.x1 + 0.4)) {
          goalCool = 2.5;
          burst(ball.x, 2, ball.z, 90, ['#ffffff', LAVA, '#ffc65a', '#2bb3a3', '#4a6fd8'], 14, 2.4, 12);
          sfx('goal');
          opts.onGoal?.();
          setTimeout(() => Object.assign(ball, { x: pcx, z: pcz, vx: 0, vz: 0, vy: 6, y: 3, grounded: false }), 1400);
        }
        // the dance floor
        const on = onFloor(car);
        salsa(on);
        const b = beat(t), bi = Math.floor(b);
        tiles.forEach(({ m, i, j }) => {
          const lit = on ? (i + j + bi) % 3 === 0 || (i === 2 && j === 2) : ((i * 7 + j * 3 + Math.floor(t * 1.5)) % 9 === 0);
          m.emissive.set(lit ? tileCols[(i + j * 2 + bi) % 4] : '#000');
          m.emissiveIntensity = lit ? (on ? 1.4 - (b % 1) * 0.8 : 0.4) : 0;
        });
        bulbs.forEach((bb, i) => { bb.scale.setScalar(on ? 1 + 0.4 * Math.max(0, Math.sin((b + i * 0.25) * Math.PI)) : 1); });
        const thump = on ? 1 + Math.max(0, 1 - (b % 1) * 4) * 0.15 : 1;
        cones.forEach(cn => cn.scale.set(thump, thump, 1));
        const cb = on ? b : t * 1.6;
        couple.rotation.y = cb * Math.PI * 0.25;
        couple.position.y = 0.3 + Math.abs(Math.sin(cb * Math.PI)) * 0.12;
        d1.rotation.z = Math.sin(cb * Math.PI) * 0.12; d2.rotation.z = -Math.sin(cb * Math.PI) * 0.12;
        if (on) { danceTime += dt; if (danceTime > 8 && !danceFlag.got) { danceFlag.got = true; sfx('flag'); burst(car.x, car.y + 2, car.z, 50, tileCols, 10); opts.onFlag('w8', danceFlag.text); } }
        else danceTime = 0;
        pring.material.opacity = 0.35 + Math.sin(t * 3) * 0.2;
        // the summit: you made it
        if (Math.hypot(car.x - HILL.x, car.z - HILL.z) < 5) opts.onAchieve?.('summit');
        // race laps: cross the checkered line, go all the way around, cross it again
        const tr = trackR(car.x, car.z);
        if (Math.abs(tr - TRACK.r) < 6) {
          const ang = Math.atan2(car.z - TRACK.z, car.x - TRACK.x), q = Math.floor(((ang + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2));
          if (race.lastQ !== null && q !== race.lastQ) {
            const crossed = (race.lastQ === 3 && q === 0) || (race.lastQ === 0 && q === 3);
            if (crossed && car.x > TRACK.b) {
              if (race.on && race.seen.size === 4) {
                const lap = t - race.t0;
                if (!race.best || lap < race.best) { race.best = lap; try { localStorage.setItem('dan.lap', String(lap)); } catch {} }
                opts.onRace?.({ lap, best: race.best });
                burst(car.x, car.y + 2, car.z, 40, ['#ffffff', '#16171c', LAVA], 10);
              }
              race.on = true; race.t0 = t; race.seen = new Set([q]);
            } else race.seen.add(q);
          }
          race.lastQ = q;
        } else if (tr > TRACK.r + 20 && race.on) { race.on = false; race.lastQ = null; opts.onRace?.(null); }
        if (race.on) opts.onRace?.({ t: t - race.t0, best: race.best });
      },
    };
  }
}
