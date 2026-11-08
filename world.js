// The 3D part: two little worlds (the desk, and outside), one RC car, a lot of blocks.
// Physics is hand-rolled arcade stuff: circles and boxes on a height function. No engine needed.
import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { sfx, engine, salsa, beat } from './audio.js';

const LAVA = '#ff5a2a', INK = '#1d2030', CREAM = '#f4efe6';
const MONO = '"IBM Plex Mono", monospace', HAND = '"Caveat", cursive', DISP = '"Archivo", sans-serif';
const CAR_R = 0.95;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const gauss = (dx, dz, s) => Math.exp(-(dx * dx + dz * dz) / (2 * s * s));
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- tiny builders ----------
const mats = {};
function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  return mats[k] ||= new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...o });
}
function put(parent, geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, typeof material === 'string' ? mat(material) : material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function rbox(parent, w, h, d, color, x, y, z, r = 0.14) {
  r = Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01);
  return put(parent, new RoundedBoxGeometry(w, h, d, 2, Math.max(r, 0.005)), color, x, y, z);
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function decal(parent, w, h, tex, x, y, z, rx = 0, ry = 0, basic = false) {
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
function label(text, { w = 512, h = 128, bg = null, fg = INK, font = `700 64px ${DISP}`, lines } = {}) {
  return canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ls = lines || [text];
    ls.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (ls.length - 1) / 2) * h / (ls.length + 0.6)));
  });
}
function beam(parent, a, b, thick, color) {
  const len = a.distanceTo(b);
  const m = rbox(parent, thick, thick, len, color, 0, 0, 0, thick * 0.3);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.clone().sub(a).normalize());
  return m;
}
function sticky(parent, text, color, x, y, z, rot = 0, size = 3.2) {
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

// ---------- the car (and the guy driving it) ----------
function buildCar() {
  const car = new THREE.Group();
  const body = new THREE.Group();
  car.add(body);
  rbox(body, 1.3, 0.38, 2.05, LAVA, 0, 0.5, 0, 0.17);
  rbox(body, 1.05, 0.3, 0.9, '#e04a1d', 0, 0.78, 0.45, 0.12); // hood
  rbox(body, 1.18, 0.16, 0.22, INK, 0, 0.42, 1.08, 0.06); // bumper
  rbox(body, 1.18, 0.16, 0.22, INK, 0, 0.42, -1.08, 0.06);
  rbox(body, 1.45, 0.07, 0.42, INK, 0, 1.18, -0.86, 0.03); // wing
  rbox(body, 0.07, 0.42, 0.07, INK, 0.45, 0.95, -0.86, 0.02);
  rbox(body, 0.07, 0.42, 0.07, INK, -0.45, 0.95, -0.86, 0.02);
  const glow = new THREE.MeshBasicMaterial({ color: '#fff4d6', toneMapped: false });
  put(body, new THREE.BoxGeometry(0.22, 0.1, 0.05), glow, 0.36, 0.56, 1.03);
  put(body, new THREE.BoxGeometry(0.22, 0.1, 0.05), glow, -0.36, 0.56, 1.03);
  // driver: black hair, caramel skin, brown eyes
  rbox(body, 0.5, 0.42, 0.34, '#24314f', 0, 0.9, -0.22, 0.08);
  rbox(body, 0.4, 0.4, 0.38, '#c8895a', 0, 1.3, -0.2, 0.08);
  rbox(body, 0.44, 0.13, 0.42, '#141012', 0, 1.53, -0.22, 0.05);
  rbox(body, 0.44, 0.22, 0.12, '#141012', 0, 1.4, -0.4, 0.04);
  put(body, new THREE.BoxGeometry(0.06, 0.07, 0.02), '#3a2214', 0.09, 1.33, -0.005);
  put(body, new THREE.BoxGeometry(0.06, 0.07, 0.02), '#3a2214', -0.09, 1.33, -0.005);
  rbox(body, 0.12, 0.12, 0.42, '#c8895a', 0.22, 0.95, 0.1, 0.04); // arms on the wheel
  rbox(body, 0.12, 0.12, 0.42, '#c8895a', -0.22, 0.95, 0.1, 0.04);
  // antenna with a tiny orange flag
  put(body, new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4), INK, 0.5, 1.2, -0.7);
  put(body, new THREE.BoxGeometry(0.02, 0.16, 0.26), LAVA, 0.5, 1.72, -0.82);

  const wheels = [];
  const wGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.32, 12).rotateZ(Math.PI / 2);
  const hGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.34, 6).rotateZ(Math.PI / 2);
  for (const [x, z] of [[0.7, 0.68], [-0.7, 0.68], [0.7, -0.68], [-0.7, -0.68]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.36, z);
    const w = put(pivot, wGeo, '#22242c');
    put(w, hGeo, '#c9ccd3');
    car.add(pivot);
    wheels.push({ pivot, w, front: z > 0 });
  }
  // duck mode (konami). quack.
  const duck = new THREE.Group();
  put(duck, new THREE.SphereGeometry(0.85, 8, 6), '#ffd23f', 0, 0.85, 0).scale.set(1, 0.8, 1.25);
  put(duck, new THREE.SphereGeometry(0.5, 8, 6), '#ffd23f', 0, 1.6, 0.55);
  put(duck, new THREE.ConeGeometry(0.2, 0.45, 6).rotateX(Math.PI / 2), '#ff8a1f', 0, 1.55, 1.1);
  duck.visible = false;
  car.add(duck);
  return { car, body, wheels, duck };
}

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
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 700);
  const sun = new THREE.DirectionalLight('#fff', 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 160 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  const hemi = new THREE.HemisphereLight();
  scene.add(sun, sun.target, hemi);

  // shared particle pool (confetti, sparks, embers)
  const PN = 260;
  const parts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({ toneMapped: false }), PN);
  parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  parts.frustumCulled = false;
  const P = Array.from({ length: PN }, () => ({ life: 0 }));
  const dummy = new THREE.Object3D(), tmpC = new THREE.Color();
  for (let i = 0; i < PN; i++) { dummy.scale.setScalar(0); dummy.updateMatrix(); parts.setMatrixAt(i, dummy.matrix); parts.setColorAt(i, tmpC.set('#fff')); }
  scene.add(parts);
  let pi = 0;
  function burst(x, y, z, n, colors, speed = 8, life = 1.6, up = 8) {
    for (let k = 0; k < n; k++) {
      const p = P[pi = (pi + 1) % PN];
      Object.assign(p, { x, y, z, vx: (Math.random() - 0.5) * speed, vy: Math.random() * up + 2, vz: (Math.random() - 0.5) * speed, life, max: life, rx: Math.random() * 6, s: 0.6 + Math.random() * 0.8 });
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

  // guide arrow: points at the next suggested stop, hides when you're close
  const guide = new THREE.Group();
  const chev = new THREE.Shape([new THREE.Vector2(-0.7, -0.5), new THREE.Vector2(0, 0.6), new THREE.Vector2(0.7, -0.5), new THREE.Vector2(0, -0.15)]);
  const guideM = new THREE.MeshBasicMaterial({ color: LAVA, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false });
  for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.ShapeGeometry(chev).rotateX(-Math.PI / 2), guideM); m.position.z = i * 0.75; guide.add(m); }
  scene.add(guide);
  let guideId = null;

  const C = buildCar();
  const W = { desk: buildDesk(), out: buildOutside() };
  for (const k in W) scene.add(W[k].group);
  scene.add(C.car);

  // ---------- state ----------
  const car = { x: 0, z: 0, y: 0, a: Math.PI, speed: 0, vx: 0, vz: 0, vy: 0, grounded: true, steer: 0, spin: 0, squash: 0 };
  let cur = 'desk', controls = false, intro = true, busy = false, activeZone = null, zoom = 1, time = 0;
  const camPos = new THREE.Vector3(0, 30, 40), camLook = new THREE.Vector3();

  // HTML labels above things
  const labelEls = [];
  for (const k in W) for (const z of W[k].zones) {
    if (!z.ly) continue;
    const el = document.createElement('div');
    el.className = 'tag';
    el.dataset.zone = z.id;
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
    C.car.children[0].children.forEach(m => { if (m.material?.isMeshBasicMaterial) m.visible = name === 'desk'; });
    if (name !== 'out') salsa(false);
    opts.onWorld?.(name);
  }
  function place(x, z, a, world = cur) {
    if (world !== cur) setWorld(world);
    const g = W[world].ground(x, z) ?? 0;
    Object.assign(car, { x, z, a, y: g, speed: 0, vx: 0, vz: 0, vy: 0, grounded: true, steer: 0 });
    C.car.position.set(x, g, z);
    camPos.set(x, g + 30, z + 34);
    camLook.set(x, g, z);
  }
  function transition(to) {
    if (busy) return;
    busy = true;
    sfx('whoosh');
    opts.onTransition(to, () => {
      const s = W[to].spawn;
      place(s.x, s.z, s.a, to);
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
      const dx = px - c.x, dz = pz - c.z, d = Math.hypot(dx, dz), m = r + c.r;
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

  function stepCar(dt, inp) {
    const w = W[cur];
    let thr = (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
    let st = (inp.left ? 1 : 0) - (inp.right ? 1 : 0);
    if (inp.joy.active) {
      // touch: steer toward the drag direction on screen (camera never rotates, so screen = world)
      const mag = Math.min(1, Math.hypot(inp.joy.x, inp.joy.y));
      if (mag > 0.15) {
        const want = Math.atan2(inp.joy.x, inp.joy.y);
        const diff = Math.atan2(Math.sin(want - car.a), Math.cos(want - car.a));
        st = clamp(diff * 2, -1, 1);
        thr = mag * (Math.abs(diff) > 2.6 && car.speed < 1 ? -0.6 : 1);
      } else thr = st = 0;
    }
    if (!controls || busy) thr = st = 0;
    const max = inp.boost ? 21 : 13.5;
    const fx = Math.sin(car.a), fz = Math.cos(car.a);
    if (car.grounded) {
      if (thr > 0) car.speed += (car.speed < 0 ? 42 : 26) * thr * dt;
      else if (thr < 0) car.speed -= (car.speed > 0 ? 42 : 18) * -thr * dt;
      else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 9 * dt);
      if (inp.brake && controls) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 50 * dt);
      if (car.speed > max) car.speed = Math.max(max, car.speed - 24 * dt);
      car.speed = Math.max(car.speed, -7);
      const g0 = w.ground(car.x, car.z), g1 = w.ground(car.x + fx * 0.6, car.z + fz * 0.6);
      if (g0 !== null && g1 !== null) car.speed -= clamp((g1 - g0) / 0.6, -1.5, 1.5) * 15 * dt;
    }
    car.steer += (st - car.steer) * Math.min(1, dt * 9);
    car.a += 2.5 * car.steer * dt * clamp(car.speed / 4, -1, 1) * (car.grounded ? 1 : 0.35);
    const grip = car.grounded ? (inp.brake ? 3.5 : 11) : 0.4;
    const k = 1 - Math.exp(-grip * dt);
    car.vx += (Math.sin(car.a) * car.speed - car.vx) * k;
    car.vz += (Math.cos(car.a) * car.speed - car.vz) * k;
    const nx = car.x + car.vx * dt, nz = car.z + car.vz * dt;
    if (w.blocked?.(nx, nz)) {
      car.speed *= -0.25; car.vx *= -0.3; car.vz *= -0.3;
    } else { car.x = nx; car.z = nz; }

    for (const c of w.colliders) {
      if (c.h !== undefined && car.y > c.h) continue;
      const p = push(car.x, car.z, CAR_R, c);
      if (!p) continue;
      car.x += p[0]; car.z += p[1];
      const l = Math.hypot(p[0], p[1]), ux = p[0] / l, uz = p[1] / l;
      const vn = car.vx * ux + car.vz * uz;
      if (vn < 0) {
        car.vx -= 1.3 * vn * ux; car.vz -= 1.3 * vn * uz;
        const head = Math.abs(fx * ux + fz * uz);
        car.speed *= 1 - head * 0.85;
        if (-vn > 3) { sfx('bump', -vn / 14); car.squash = Math.min(0.25, -vn / 50); }
      }
    }

    const g = w.ground(car.x, car.z);
    if (g === null) car.grounded = false;
    else if (car.grounded) {
      if (g < car.y - 0.35) car.grounded = false;
      else { car.vy = clamp((g - car.y) / dt, -12, 12); car.y = g; }
    }
    if (!car.grounded) {
      car.vy -= 32 * dt;
      car.y += car.vy * dt;
      if (g !== null && car.y <= g) {
        if (car.vy < -6) { sfx('land', Math.min(1, -car.vy / 20)); car.squash = Math.min(0.3, -car.vy / 60); }
        car.y = g; car.vy = 0; car.grounded = true;
      }
      if (car.y < -28) fell();
    }
  }

  function stepBodies(dt) {
    const w = W[cur];
    for (const b of w.bodies) {
      const dx = b.x - car.x, dz = b.z - car.z, d = Math.hypot(dx, dz), m = b.r + CAR_R;
      if (d < m && d > 1e-6 && Math.abs(b.y - car.y) < 1.6) {
        const ux = dx / d, uz = dz / d;
        b.x += ux * (m - d); b.z += uz * (m - d);
        const cv = car.vx * ux + car.vz * uz, bv = b.vx * ux + b.vz * uz;
        if (cv > bv) {
          const j = (cv - bv) * (1 + b.bounce) / (1 + b.mass / 3);
          b.vx += ux * j; b.vz += uz * j;
          car.speed *= 1 - 0.35 * b.mass / (b.mass + 3);
          b.spinV = (Math.random() - 0.5) * j * 2;
          if (b.hop && j > 2) { b.vy = j * b.hop; b.grounded = false; }
          if (j > 1.5) sfx(b.sound || 'bump', Math.min(1, j / 20));
        }
      }
      const f = Math.exp(-b.drag * dt);
      b.vx *= f; b.vz *= f;
      const ox = b.x, oz = b.z;
      b.x += b.vx * dt; b.z += b.vz * dt;
      if (w.blocked?.(b.x, b.z)) { b.x = ox; b.z = oz; b.vx *= -0.5; b.vz *= -0.5; }
      for (const c of w.colliders) {
        if (c.h !== undefined && b.y > c.h) continue;
        const p = push(b.x, b.z, b.r, c);
        if (!p) continue;
        b.x += p[0]; b.z += p[1];
        const l = Math.hypot(p[0], p[1]), ux = p[0] / l, uz = p[1] / l, vn = b.vx * ux + b.vz * uz;
        if (vn < 0) { b.vx -= (1 + b.bounce) * vn * ux; b.vz -= (1 + b.bounce) * vn * uz; }
      }
      for (const o of w.bodies) {
        if (o === b) continue;
        const ex = b.x - o.x, ez = b.z - o.z, e = Math.hypot(ex, ez), mm = b.r + o.r;
        if (e >= mm || e < 1e-6) continue;
        const ux = ex / e, uz = ez / e;
        b.x += ux * (mm - e) / 2; b.z += uz * (mm - e) / 2; o.x -= ux * (mm - e) / 2; o.z -= uz * (mm - e) / 2;
        const rel = (b.vx - o.vx) * ux + (b.vz - o.vz) * uz;
        if (rel < 0) { b.vx -= rel * ux; b.vz -= rel * uz; o.vx += rel * ux; o.vz += rel * uz; }
      }
      const g = w.ground(b.x, b.z);
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
        const axis = new THREE.Vector3(b.vz / sp, 0, -b.vx / sp);
        b.mesh.rotateOnWorldAxis(axis, sp * dt / b.r);
      } else {
        b.mesh.rotation.y += (b.spinV || 0) * dt;
        b.spinV = (b.spinV || 0) * Math.exp(-3 * dt);
      }
    }
  }

  // ---------- frame loop ----------
  const tmpUp = new THREE.Vector3(), tmpF = new THREE.Vector3(), tmpR = new THREE.Vector3(), tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion();
  const clock = new THREE.Clock();
  function frame() {
    // substeps keep physics in real time on slow devices instead of slow-motion
    const dt = Math.min(clock.getDelta(), 0.1);
    time += dt;
    const w = W[cur];
    const n = Math.ceil(dt / 0.02);
    for (let i = 0; i < n; i++) { stepCar(dt / n, opts.input); stepBodies(dt / n); }
    w.update(time, dt, car);
    stepParts(dt);

    // flags
    for (const f of w.flags) {
      if (f.got || !f.mesh.userData.ring) continue;
      f.mesh.rotation.y = time * 1.6;
      f.mesh.position.y = f.y - 0.9 + Math.sin(time * 2.4 + f.x) * 0.15;
      f.mesh.userData.ring.material.opacity = 0.35 + Math.sin(time * 4) * 0.15;
      if (Math.hypot(car.x - f.x, car.z - f.z) < 1.8 && Math.abs(car.y + 0.6 - f.y) < (f.tol ?? 1.8)) collect(f);
    }

    // zones
    let best = null, bd = Infinity;
    for (const z of w.zones) {
      const d = Math.hypot(car.x - z.x, car.z - z.z);
      if (d < z.r && d < bd) { best = z; bd = d; }
    }
    if (intro) best = null;
    if ((best?.id ?? null) !== activeZone) { activeZone = best?.id ?? null; opts.onZone(activeZone); }
    if (best?.go && !busy && bd < best.go) transition(best.to);

    // guide
    const gzone = guideId && w.zones.find(z => z.id === guideId);
    const gdist = gzone ? Math.hypot(gzone.x - car.x, gzone.z - car.z) : 0;
    guideM.opacity += ((gzone && gdist > gzone.r + 1 && !intro ? 0.85 : 0) - guideM.opacity) * Math.min(1, dt * 5);
    if (gzone) {
      const ga = Math.atan2(gzone.x - car.x, gzone.z - car.z);
      guide.position.set(car.x + Math.sin(ga) * 3.2, car.y + 0.12 + Math.sin(time * 5) * 0.06, car.z + Math.cos(ga) * 3.2);
      guide.rotation.y = ga + Math.PI;
      guide.children.forEach((m, i) => { m.position.z = -((time * 1.5 + i * 0.5) % 1) * 0.8; });
    }
    guide.visible = guideM.opacity > 0.02;

    // car visuals
    C.car.position.set(car.x, car.y, car.z);
    const e = 0.75;
    const gx = (w.ground(car.x + e, car.z) ?? car.y) - (w.ground(car.x - e, car.z) ?? car.y);
    const gz = (w.ground(car.x, car.z + e) ?? car.y) - (w.ground(car.x, car.z - e) ?? car.y);
    if (car.grounded) tmpUp.set(-gx / (2 * e), 1, -gz / (2 * e)).normalize();
    else tmpUp.set(0, 1, 0).lerp(new THREE.Vector3(0, 0.9, 0.0), 0);
    tmpF.set(Math.sin(car.a), 0, Math.cos(car.a));
    if (!car.grounded) tmpF.y = clamp(car.vy * 0.03, -0.5, 0.4);
    tmpF.addScaledVector(tmpUp, -tmpF.dot(tmpUp)).normalize();
    tmpR.crossVectors(tmpUp, tmpF);
    tmpM.makeBasis(tmpR, tmpUp, tmpF);
    tmpQ.setFromRotationMatrix(tmpM);
    C.car.quaternion.slerp(tmpQ, 1 - Math.exp(-14 * dt));
    car.squash *= Math.exp(-8 * dt);
    const acc = clamp(car.speed / 14, -1, 1);
    C.body.scale.set(1 + car.squash * 0.6, 1 - car.squash, 1 + car.squash * 0.3);
    C.body.rotation.x = -acc * 0.04;
    C.body.rotation.z = -car.steer * clamp(car.speed / 14, -1, 1) * 0.1;
    if (w.dance?.(car)) {
      const b = beat(time);
      C.body.rotation.y = Math.sin(b * Math.PI) * 0.3;
      C.body.position.y = Math.abs(Math.sin(b * Math.PI)) * 0.18;
    } else { C.body.rotation.y *= 0.8; C.body.position.y *= 0.8; }
    for (const wh of C.wheels) {
      wh.w.rotation.x += car.speed * dt / 0.36;
      if (wh.front) wh.pivot.rotation.y = car.steer * 0.45;
    }
    engine(controls ? Math.min(1, Math.abs(car.speed) / 20) : 0);

    // camera
    const off = w.env.cam;
    if (intro) {
      const t = time * 0.12;
      camPos.lerp(new THREE.Vector3(car.x + Math.sin(t) * 26, car.y + 15, car.z + Math.cos(t) * 26), 1 - Math.exp(-1.5 * dt));
      camLook.lerp(new THREE.Vector3(car.x, car.y + 1, car.z), 1 - Math.exp(-2 * dt));
    } else {
      const ahead = new THREE.Vector3(car.vx * 0.22, 0, car.vz * 0.22);
      const target = new THREE.Vector3(car.x, car.y * 0.7, car.z).add(ahead);
      const v = best?.view;
      if (v) {
        // swing around and look at the view: Fuego from the summit, the volcanoes from the dock
        const dx = v[0] - car.x, dz = v[2] - car.z, l = Math.hypot(dx, dz);
        const ux = dx / l, uz = dz / l;
        // aim a bit right of the view so it sits left of the info card
        target.set(car.x + ux * 45 - uz * 14, car.y + 14, car.z + uz * 45 + ux * 14);
        camLook.lerp(target, 1 - Math.exp(-1.6 * dt));
        const cx = car.x - ux * 15, cz = car.z - uz * 15;
        camPos.lerp(new THREE.Vector3(cx, Math.max(car.y + 9, (w.ground(cx, cz) ?? 0) + 5), cz), 1 - Math.exp(-1.4 * dt));
      } else {
        camLook.lerp(target, 1 - Math.exp(-5 * dt));
        camPos.lerp(new THREE.Vector3(camLook.x + off[0] * zoom, camLook.y + off[1] * zoom, camLook.z + off[2] * zoom), 1 - Math.exp(-3 * dt));
      }
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    const so = w.env.sunOff;
    sun.position.set(car.x + so[0], car.y + so[1], car.z + so[2]);
    sun.target.position.set(car.x, car.y, car.z);

    renderer.render(scene, camera);

    // labels
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    for (const l of labelEls) {
      const show = l.world === cur && !intro;
      const d = show ? Math.hypot(car.x - l.v.x, car.z - l.v.z) : 999;
      const p = l.v.clone().project(camera);
      if (!show || p.z > 1 || d > 48) { l.el.style.opacity = 0; continue; }
      l.el.style.opacity = clamp((48 - d) / 14, 0, 1) * (activeZone === l.z.id ? 1 : 0.85);
      l.el.classList.toggle('on', activeZone === l.z.id);
      l.el.style.transform = `translate(${(p.x * 0.5 + 0.5) * cw}px, ${(-p.y * 0.5 + 0.5) * ch}px) translate(-50%, -100%)`;
    }
  }

  function collect(f) {
    f.got = true;
    f.mesh.visible = false;
    burst(f.x, f.y, f.z, 40, [LAVA, '#ffc65a', CREAM, '#2bb3a3']);
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
  canvas.addEventListener('wheel', (e) => { zoom = clamp(zoom + Math.sign(e.deltaY) * 0.08, 0.6, 1.6); }, { passive: true });

  setWorld('desk');
  place(W.desk.spawn.x, W.desk.spawn.z, W.desk.spawn.a, 'desk');
  renderer.setAnimationLoop(frame);

  return {
    start() { intro = false; controls = true; },
    get world() { return cur; },
    places: () => Object.entries({ ...W.desk.places, ...W.out.places }),
    teleport(id) {
      const p = W.desk.places[id] ? ['desk', W.desk.places[id]] : ['out', W.out.places[id]];
      if (!p[1] || busy) return;
      if (p[0] !== cur) { busy = true; opts.onTransition(p[0], () => place(...p[1], p[0]), () => { busy = false; }); }
      else place(...p[1], p[0]);
    },
    setControls(b) { controls = b; },
    setGuide(id) { guideId = id; },
    reset() { const s = W[cur].spawn; place(s.x, s.z, s.a); },
    refreshLabels,
    setLaptop: (lines) => W.desk.setScreen(lines),
    duck() { C.duck.visible = !C.duck.visible; C.body.visible = !C.duck.visible; },
    honk() { sfx('horn'); },
    markFlags(ids) { for (const k in W) for (const f of W[k].flags) if (ids.has(f.id)) { f.got = true; f.mesh.visible = false; } },
  };

  // ====================================================================
  //  THE DESK
  // ====================================================================
  function buildDesk() {
    const G = new THREE.Group();
    const colliders = [], bodies = [], zones = [], flags = [];
    const box = (x, z, hw, hd, h) => colliders.push({ x, z, hw, hd, h });
    const circ = (x, z, r, h) => colliders.push({ x, z, r, h });

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
    const wallC = '#1f2440';
    rbox(G, 34, 40, 2, wallC, -14, 0, -20.2, 0.05);
    rbox(G, 18, 40, 2, wallC, 22, 0, -20.2, 0.05);
    rbox(G, 10, 26, 2, wallC, 8, 23, -20.2, 0.05);
    rbox(G, 10, 20, 2, wallC, 8, -10.6, -20.2, 0.05);
    for (const [w, h, x, y] of [[11.2, 0.6, 8, 10.2], [0.6, 10.8, 2.7, 4.9], [0.6, 10.8, 13.3, 4.9]]) rbox(G, w, h, 2.4, '#e9e2d4', x, y, -19.4, 0.1);
    rbox(G, 0.3, 10, 0.4, '#e9e2d4', 8, 5, -20, 0.05); // mullion top half only? keep it tall, it's a door now
    G.children[G.children.length - 1].scale.y = 0.42;
    G.children[G.children.length - 1].position.y = 7.8;
    box(-14.6, -20.2, 17.6, 1.4);
    box(21.8, -20.2, 8.5, 1.4);
    // the view outside: dawn, volcanoes, a lake
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
    // caution tape that snaps when you drive through it
    const tapeTex = canvasTex(1024, 64, (g, w, h) => {
      g.fillStyle = '#ffd23f'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#16161a'; g.font = `700 36px ${MONO}`; g.textBaseline = 'middle';
      for (let x = 10; x < w; x += 300) g.fillText('OUT OF SCOPE', x, h / 2 + 2);
    });
    const tapes = [];
    for (const [y, rot] of [[1.4, 0.06], [3.1, -0.05]]) {
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(8 + side * 5, y, -19.1);
        pivot.rotation.z = rot * side;
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.45), new THREE.MeshStandardMaterial({ map: tapeTex, side: THREE.DoubleSide, roughness: 0.6 }));
        strip.position.x = -side * 2.5;
        strip.material.map = tapeTex.clone(); strip.material.map.repeat.set(0.5, 1); strip.material.map.offset.x = side > 0 ? 0.5 : 0; strip.material.map.needsUpdate = true;
        strip.castShadow = true;
        pivot.add(strip);
        G.add(pivot);
        tapes.push({ pivot, side, target: rot * side });
      }
    }

    // sticky notes and a pennant on the wall
    sticky(G, 'TODO\n- CPTS mod 9\n- finish report\n- sleep??', '#ffe36e', -12.5, 12.5, -19.15, 0.04);
    sticky(G, 'call mom ♡', '#ffb3c7', -8, 13.2, -19.15, -0.06, 2.6);
    sticky(G, '← touch\n   grass', '#b9f0a8', 16.5, 6.5, -19.15, 0.05, 2.8);
    sticky(G, 'rockyou.txt\nis not a\npw policy', '#a9d8ff', -3.5, 11.6, -19.15, 0.03, 2.9);
    sticky(G, 'salsa > sleep', '#ffc89a', 21, 13.5, -19.15, -0.04, 2.7);
    const pen = canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#0021a5'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h / 2); g.lineTo(0, h); g.fill();
      g.fillStyle = '#fa4616'; g.fillRect(0, 0, 36, h);
      g.fillStyle = '#fff'; g.font = `800 92px ${DISP}`; g.textBaseline = 'middle'; g.fillText('GATORS', 60, h / 2 + 4);
    });
    decal(G, 8, 4, pen, 24, 10, -19.15).rotation.z = -0.12;

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
    const hinge = new THREE.Group(); hinge.position.set(0, 0.6, -5); hinge.rotation.x = -0.22; lap.add(hinge);
    rbox(hinge, 15, 10, 0.45, '#c3c7cf', 0, 5, 0, 0.25);
    const scr = document.createElement('canvas'); scr.width = 1024; scr.height = 640;
    const scrTex = new THREE.CanvasTexture(scr); scrTex.colorSpace = THREE.SRGBColorSpace;
    decal(hinge, 14, 9, scrTex, 0, 5.1, 0.24, 0, 0, true);
    let screenLines = ['Last login: Sat 03:12 from 10.0.0.7', 'dan@desk:~$ ./ideas.sh --all-of-them', '[+] 14 ideas found, 2 good, 1 legal', 'dan@desk:~$ cat todo.txt', '  1. finish the report', '  2. go outside', 'dan@desk:~$ _'];
    function drawScreen(blink) {
      const g = scr.getContext('2d');
      g.fillStyle = '#0c0f17'; g.fillRect(0, 0, 1024, 640);
      g.fillStyle = '#161a26'; g.fillRect(0, 0, 1024, 44);
      g.fillStyle = '#8b93a8'; g.font = `500 22px ${MONO}`; g.fillText('dan@desk: ~  —  press E', 24, 29);
      g.font = `500 28px ${MONO}`;
      screenLines.slice(-15).forEach((l, i) => {
        g.fillStyle = l.startsWith('dan@') ? '#ff8a5c' : l.startsWith('[+]') ? '#4fd1c1' : '#d5dae6';
        g.fillText(blink ? l : l.replace(/_$/, ' '), 24, 86 + i * 36);
      });
      scrTex.needsUpdate = true;
    }
    drawScreen(true);
    box(-8, -11, 7.6, 5.1);
    const screenGlow = new THREE.PointLight('#8fb8ff', 30, 30, 1.6); screenGlow.position.set(-8, 5, -11); G.add(screenGlow);
    const rimL = new THREE.PointLight('#ff3d6e', 260, 70, 1.6); rimL.position.set(-38, 10, 6); G.add(rimL);
    const rimR = new THREE.PointLight('#5a6dff', 260, 70, 1.6); rimR.position.set(38, 10, 6); G.add(rimR);
    const winL = new THREE.PointLight('#ff9e7a', 120, 30, 1.6); winL.position.set(8, 5, -18); G.add(winL);

    // UF mug with coffee and steam
    const mug = new THREE.Group(); mug.position.set(19, 0, -12); G.add(mug);
    put(mug, new THREE.CylinderGeometry(2.2, 2.0, 4.6, 20), '#0021a5', 0, 2.3, 0);
    put(mug, new THREE.CylinderGeometry(2.23, 2.23, 0.7, 20), '#fa4616', 0, 3.2, 0);
    put(mug, new THREE.CylinderGeometry(1.95, 1.95, 0.1, 20), '#3b2416', 0, 4.35, 0);
    put(mug, new THREE.TorusGeometry(1.1, 0.32, 6, 12, Math.PI), '#0021a5', 2.1, 2.3, 0).rotation.z = -Math.PI / 2;
    const steam = [];
    for (let i = 0; i < 6; i++) {
      const s = put(mug, new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: '#fff', transparent: true, opacity: 0.2, flatShading: true }), 0, 5, 0);
      s.castShadow = false; steam.push(s);
    }
    circ(19, -12, 2.4);

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

    // cert books, spines facing you
    const books = [['SECURITY+', '#c4392f', 0.04], ['NETWORK+', '#2f5f9e', -0.06], ['A+', '#3c8a5a', 0.08], ['CCST · CYBER', '#1b6e8f', -0.03], ['CPTS', '#2a2d36', 0.1]];
    books.forEach(([t, col, rot], i) => {
      const b = new THREE.Group(); b.position.set(22, 0.58 + i * 1.12, 1.5); b.rotation.y = rot; G.add(b);
      rbox(b, 8.4, 1.06, 5.8, col, 0, 0, 0, 0.1);
      rbox(b, 8.1, 0.9, 5.82, '#efe8da', 0.12, 0, 0, 0.02).scale.set(1, 1, 0.98);
      decal(b, 7.4, 0.8, label(t, { w: 1024, h: 110, fg: '#fff', font: `800 64px ${DISP}` }), 0, 0, 2.92);
      if (t === 'CPTS') { rbox(b, 0.5, 0.04, 2.6, LAVA, 2.2, 0.55, 3.6, 0.01).rotation.x = 0.5; }
    });
    box(22, 1.5, 4.5, 3.2);

    // CPTC trophy + CCDC badge
    const tro = new THREE.Group(); tro.position.set(-25.5, 0, -3); G.add(tro);
    rbox(tro, 4.2, 1.4, 4.2, '#2a2420', 0, 0.7, 0, 0.12);
    decal(tro, 3.6, 0.9, label('', { w: 512, h: 128, bg: '#c9a24a', fg: '#2a2420', font: `800 44px ${DISP}`, lines: ['CPTC · 2ND GLOBAL'] }), 0, 0.75, 2.12);
    const gold = new THREE.MeshStandardMaterial({ color: '#e7b448', metalness: 0.6, roughness: 0.3, flatShading: true });
    put(tro, new THREE.CylinderGeometry(0.35, 0.6, 1.4, 8), gold, 0, 2.1, 0);
    put(tro, new THREE.LatheGeometry([0.1, 0.9, 1.4, 1.6, 1.6].map((r, i) => new THREE.Vector2(r, i * 0.7)), 10), gold, 0, 2.7, 0);
    for (const s of [-1, 1]) put(tro, new THREE.TorusGeometry(0.6, 0.12, 5, 10), gold, s * 1.7, 4.4, 0).rotation.y = Math.PI / 2;
    const badge = new THREE.Group(); badge.position.set(-21.6, 0.1, -1); badge.rotation.set(-Math.PI / 2, 0, 0.4); G.add(badge);
    decal(badge, 2.4, 3.4, canvasTex(256, 360, (g) => { g.fillStyle = '#d93a32'; g.fillRect(0, 0, 256, 360); g.fillStyle = '#fff'; g.font = `800 52px ${DISP}`; g.fillText('CCDC', 40, 120); g.font = `600 30px ${MONO}`; g.fillText('RED TEAM', 50, 180); g.fillStyle = '#1b1b1b'; g.fillRect(40, 220, 176, 100); }), 0, 0, 0);
    circ(-25.5, -3, 2.6);

    // the stack of reports (experience)
    const rep = new THREE.Group(); rep.position.set(-22, 0, 11); rep.rotation.y = 0.12; G.add(rep);
    for (let i = 0; i < 9; i++) rbox(rep, 7, 0.14, 9, i % 2 ? '#f3efe7' : '#e8e2d6', (Math.random() - 0.5) * 0.3, 0.08 + i * 0.15, (Math.random() - 0.5) * 0.3, 0.02).rotation.y = (Math.random() - 0.5) * 0.06;
    decal(rep, 6.6, 8.6, canvasTex(512, 660, (g) => {
      g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, 512, 660);
      g.fillStyle = INK; g.font = `800 40px ${DISP}`; g.fillText('PENETRATION', 40, 90); g.fillText('TEST REPORT', 40, 136);
      g.font = `500 22px ${MONO}`; g.fillStyle = '#555';
      ['Client: ██████████', 'Scope: external + web', 'Prepared by: D. Aguirre', '', 'Critical   ■■■', 'High       ■■■■■■■', 'Medium     ■■■■■■■■■■', '', '1. Executive summary', '2. Attack narrative', '3. Remediation roadmap'].forEach((l, i) => g.fillText(l, 40, 200 + i * 34));
      g.save(); g.translate(330, 560); g.rotate(-0.25); g.strokeStyle = '#d93a32'; g.lineWidth = 6; g.strokeRect(-130, -40, 260, 74); g.fillStyle = '#d93a32'; g.font = `800 36px ${DISP}`; g.fillText('CONFIDENTIAL', -118, 10); g.restore();
    }), 0, 1.45, 0, -Math.PI / 2);
    rbox(rep, 1.6, 0.6, 0.5, INK, 0, 1.5, -4.4, 0.1);
    box(-22, 11, 4.2, 5, 1.6);

    // business notebook + calculator + a sticky note with a chart going up
    const nb = new THREE.Group(); nb.position.set(-12, 0, 5); G.add(nb);
    rbox(nb, 6, 0.35, 8, '#23344f', 0, 0.175, 0, 0.1);
    rbox(nb, 0.3, 0.38, 8.02, '#141c2b', 2.4, 0.18, 0, 0.05);
    decal(nb, 4.4, 1.2, label('BUS. ADMIN', { w: 512, h: 128, fg: '#e9e2d4', font: `700 54px ${MONO}` }), -0.4, 0.36, -1.8, -Math.PI / 2);
    const chart = canvasTex(256, 256, (g) => { g.fillStyle = '#ffe36e'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#2a2622'; g.lineWidth = 6; g.beginPath(); g.moveTo(30, 210); g.lineTo(90, 170); g.lineTo(130, 185); g.lineTo(220, 60); g.stroke(); g.font = `600 40px ${HAND}`; g.fillStyle = '#2a2622'; g.fillText('risk ↓  value ↑', 22, 48); });
    decal(nb, 3, 3, chart, -0.8, 0.37, 1.8, -Math.PI / 2).rotation.z = 0.2;
    const calc = new THREE.Group(); calc.position.set(-6.6, 0, 5.5); calc.rotation.y = -0.2; G.add(calc);
    rbox(calc, 3, 0.7, 4.6, '#3a3e4a', 0, 0.35, 0, 0.18);
    rbox(calc, 2.4, 0.06, 1, '#9fb59a', 0, 0.72, -1.5, 0.03);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) rbox(calc, 0.48, 0.14, 0.48, c === 3 ? LAVA : '#d5d0c4', -0.9 + c * 0.6, 0.75, -0.4 + r * 0.6, 0.06);
    box(-6.6, 5.5, 1.8, 2.5);

    // ramp: a ruler balanced on an eraser
    const ruler = rbox(G, 4.2, 0.22, 6.4, '#e8c86a', 0, 0.7, 6, 0.06);
    ruler.rotation.x = Math.atan2(1.5, 6);
    decal(G, 0.2, 6, canvasTex(32, 512, (g) => { g.fillStyle = '#2a2622'; for (let i = 0; i < 512; i += 16) g.fillRect(0, i, i % 64 ? 10 : 24, 2); }), 1.7, 0.84, 6, -Math.PI / 2 + Math.atan2(1.5, 6));
    rbox(G, 4.4, 1.4, 1, '#f08aa8', 0, 0.7, 2.6, 0.2);
    colliders.push({ x: 0, z: 2.6, hw: 2.2, hd: 0.5, h: 1.3 });

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
    const router = new THREE.Group(); router.position.set(-3.5, 0, 15.2); G.add(router);
    rbox(router, 5, 1, 3, '#16171c', 0, 0.5, 0, 0.3);
    const rleds = [];
    for (let i = 0; i < 5; i++) rleds.push(put(router, new THREE.BoxGeometry(0.22, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: i < 4 ? '#3cff8a' : '#ffb13c', toneMapped: false }), -1.6 + i * 0.8, 0.6, 1.52));
    for (const s of [-1.8, 1.8]) put(router, new THREE.CylinderGeometry(0.12, 0.14, 3.2, 5), '#16171c', s, 2.4, -1).rotation.z = s * -0.12;
    box(-3.5, 15.2, 2.6, 1.6);

    // business cards (contact)
    const cards = new THREE.Group(); cards.position.set(19, 0, 13.5); cards.rotation.y = -0.15; G.add(cards);
    rbox(cards, 3.8, 1.2, 1.8, '#2a2d36', 0, 0.6, 0, 0.12);
    const card = canvasTex(512, 300, (g) => { g.fillStyle = CREAM; g.fillRect(0, 0, 512, 300); g.fillStyle = LAVA; g.fillRect(0, 0, 14, 300); g.fillStyle = INK; g.font = `800 46px ${DISP}`; g.fillText('DANIEL AGUIRRE', 44, 110); g.font = `500 24px ${MONO}`; g.fillStyle = '#555'; g.fillText('offensive security · consulting', 44, 160); g.fillText('hire@ this guy', 44, 250); });
    for (let i = 0; i < 3; i++) { const c = rbox(cards, 3.4, 2, 0.05, CREAM, 0, 1.6, -0.3 + i * 0.25, 0.02); c.rotation.x = -0.15; if (i === 2) decal(c, 3.4, 2, card, 0, 0, 0.03); }
    const loose = new THREE.Group(); loose.position.set(15.5, 0.03, 15.6); loose.rotation.set(-Math.PI / 2, 0, 0.5); G.add(loose);
    decal(loose, 3.4, 2, card, 0, 0, 0);
    box(19, 13.5, 2, 1);

    // whiteboard on an easel: OSI model, the way I actually teach it
    const wb = new THREE.Group(); wb.position.set(-24, 0, -16.6); wb.rotation.x = -0.14; G.add(wb);
    rbox(wb, 13, 9, 0.4, '#d7d9de', 0, 5.2, 0, 0.15);
    decal(wb, 12.2, 8.2, canvasTex(1024, 690, (g) => {
      g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, 1024, 690);
      g.fillStyle = '#1f3b8a'; g.font = `700 72px ${HAND}`; g.fillText('OSI, 7 layers', 50, 90);
      const L = [['7', 'Application', 'Please'], ['6', 'Presentation', 'Do'], ['5', 'Session', 'Not'], ['4', 'Transport', 'Throw'], ['3', 'Network', 'Sausage'], ['2', 'Data link', 'Pizza'], ['1', 'Physical', 'Away']];
      g.font = `600 50px ${HAND}`;
      L.forEach(([n, a, m], i) => { g.fillStyle = '#2a2622'; g.fillText(`${n}. ${a}`, 70, 170 + i * 66); g.fillStyle = '#d93a32'; g.fillText(m, 560, 170 + i * 66); });
      g.strokeStyle = '#d93a32'; g.lineWidth = 4; g.beginPath(); g.moveTo(520, 140); g.lineTo(520, 600); g.stroke();
      g.fillStyle = '#2b8a5a'; g.font = `700 46px ${HAND}`; g.fillText('PKI = trust, but signed ✓', 380, 660);
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
      bodies.push({ mesh: g, x, z, y: 0, vx: 0, vz: 0, vy: 0, r: 0.75, mass: 0.4, bounce: 0.4, drag: 2.8, hop: 0.25, yOff: 0, home: [x, z], grounded: true, sound: 'key' });
    });
    const duck = new THREE.Group();
    put(duck, new THREE.SphereGeometry(1, 8, 6), '#ffd23f', 0, 0.9, 0).scale.set(1, 0.8, 1.2);
    put(duck, new THREE.SphereGeometry(0.62, 8, 6), '#ffd23f', 0, 1.8, 0.55);
    put(duck, new THREE.ConeGeometry(0.25, 0.55, 6).rotateX(Math.PI / 2), '#ff8a1f', 0, 1.75, 1.2);
    for (const s of [-0.28, 0.28]) put(duck, new THREE.BoxGeometry(0.1, 0.14, 0.05), '#16161a', s, 2, 1.08);
    duck.rotation.y = -0.6; G.add(duck);
    bodies.push({ mesh: duck, x: 11, z: 3, y: 0, vx: 0, vz: 0, vy: 0, r: 1.05, mass: 1, bounce: 0.5, drag: 2.2, yOff: 0, home: [11, 3], grounded: true });

    // flags hidden on the desk
    const flag = (id, text, x, z, y = 1, tol) => { const m = buildFlag(); m.position.set(x, y, z); G.add(m); flags.push({ id, text, x, z, y: y + 0.9, tol, mesh: m }); };
    flag('w1', 'DAN{always_check_behind_the_laptop}', -8, -17.6);
    flag('w2', 'DAN{airtime}', 0, -1.2, 1.9, 1.1);
    flag('w3', 'DAN{3am_and_still_going}', 29, -6.5);

    zones.push(
      { id: 'about', x: 19, z: -9, r: 6.5, ly: 6.4, lz: -12 },
      { id: 'work', x: -21, z: 9, r: 7, ly: 3.4, lz: 11 },
      { id: 'comps', x: -24, z: -1, r: 5.8, ly: 7, lz: -3, lx: -25.5 },
      { id: 'certs', x: 21, z: 4, r: 6.5, ly: 7.6, lz: 1.5, lx: 22 },
      { id: 'lab', x: 9, z: 11, r: 6, ly: 7.2, lx: 13, lz: 10.5 },
      { id: 'teach', x: -23, z: -12, r: 6.5, ly: 11.2, lz: -16.6, lx: -24 },
      { id: 'biz', x: -10, z: 5, r: 5.5, ly: 2.6, lz: 4 },
      { id: 'contact', x: 18, z: 12, r: 4.8, ly: 3.8, lz: 13.5, lx: 19 },
      { id: 'terminal', x: -8, z: -3.2, r: 4, ly: 11.5, lz: -15.5, lx: -8 },
      { id: 'window', x: 8, z: -16, r: 4, ly: 11.4, lz: -19, lx: 8, go: 2.3, to: 'out' },
    );

    let blinkT = 0;
    return {
      group: G, colliders, bodies, zones, flags,
      spawn: { x: 6, z: 2, a: Math.PI },
      places: {
        spawn: [6, 2, Math.PI], terminal: [-8, -2, Math.PI], about: [16, -6, Math.PI * 0.8], work: [-17, 9, -Math.PI / 2],
        comps: [-21, 1, -Math.PI * 0.8], certs: [16, 5, Math.PI / 2], lab: [8, 8, 0], teach: [-21, -9, Math.PI],
        biz: [-10, 11, Math.PI], contact: [15, 10, Math.PI * 0.3],
      },
      env: { fog: '#0b0e1a', fogNear: 45, fogFar: 120, hemi: ['#5866a8', '#1a1208', 0.7], sun: ['#ffd9a8', 1.3], sunOff: [-10, 40, 14], cam: [0, 22, 21], exposure: 1.1 },
      ground(x, z) {
        if (z < -19 && x > 3 && x < 13 && z > -23) return 0;
        if (x < -31 || x > 31 || z < -19 || z > 19) return null;
        if (x > -2.1 && x < 2.1 && z > 3 && z < 9) return 1.5 * (9 - z) / 6;
        if (x > -15 && x < -9 && z > 1 && z < 9) return 0.35;
        if (x > 3.5 && x < 10.5 && z > 10.5 && z < 15.5) return 0.3;
        return 0;
      },
      setScreen(lines) { screenLines = lines.slice(-15); drawScreen(true); },
      update(t, dt, car) {
        steam.forEach((s, i) => { const k = (t * 0.35 + i / steam.length) % 1; s.position.set(Math.sin(k * 6 + i) * 0.5, 4.6 + k * 5, Math.cos(k * 5 + i) * 0.4); s.scale.setScalar(0.5 + k * 1.4); s.material.opacity = 0.22 * Math.sin(k * Math.PI); });
        a1.rotation.y = Math.sin(t * 0.7) * 1.2;
        a2.rotation.z = Math.sin(t * 0.9) * 0.35 - 0.2;
        a3.rotation.z = Math.sin(t * 1.3 + 1) * 0.8 + 0.6;
        led.visible = (t * 2) % 1 < 0.5;
        rleds.forEach((l, i) => { l.visible = Math.sin(t * (7 + i * 3) + i * 9) > -0.6; });
        lampLight.intensity = 420 + Math.sin(t * 40) * 3;
        blinkT += dt;
        if (blinkT > 0.53) { blinkT = 0; drawScreen((t * 1.9) % 2 < 1); }
        // the tape breaks the first time someone drives through the window
        const near = car.z < -16.5 && car.x > 2.5 && car.x < 13.5;
        for (const tp of tapes) {
          if (near) tp.broken = true;
          const goal = tp.broken ? tp.side * -1.35 : tp.target;
          tp.pivot.rotation.z += (goal - tp.pivot.rotation.z) * (1 - Math.exp(-6 * dt));
        }
      },
    };
  }

  // ====================================================================
  //  OUTSIDE (Guatemala, blocky)
  // ====================================================================
  function buildOutside() {
    const G = new THREE.Group();
    const colliders = [], bodies = [], zones = [], flags = [];
    const R = rng(42);
    const LAKE = { x: -12, z: -70, rx: 26, rz: 18 };
    const lakeD = (x, z) => Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
    const PITCH = { x0: 10, x1: 40, z0: -26, z1: -4 };
    const PLAZA = { x: -28, z: -16, r: 15 };
    const CAMP = { x: 40, z: 24, r: 13 };
    const HILL = { x: 50, z: -64 };
    const DOCK = { x0: -13.6, x1: -10.4, z0: -61, z1: -48.5 };
    const paths = [
      [[0, 2], [-8, -6], [-20, -12], [-17, -30], [-12, -48]],
      [[0, 2], [8, -3], [12, -6]],
      [[28, -26], [34, -38], [42, -50], [50, -64]],
      [[0, 2], [18, 10], [36, 20]],
      [[30, -4], [30, 0]],
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
    const rectMask = (x, z, r, f = 3) => smooth(-f, 0, Math.min(x - r.x0, r.x1 - x, z - r.z0, r.z1 - z));
    const circMask = (x, z, c, r, f = 5) => smooth(r, r - f, Math.hypot(x - c.x, z - c.z));
    const edgeR = (x, z) => Math.hypot(x, (z + 25) * 0.92);
    // low gaps in the ridge so you can see Fuego from the summit and the volcanoes across the lake
    const valley = (x, z) => { const a = Math.atan2(z + 25, x); const d = (c) => Math.atan2(Math.sin(a - c), Math.cos(a - c)); return Math.max(gauss(d(-0.4), 0, 0.22), gauss(d(-1.64), 0, 0.3)); };

    function h(x, z) {
      let y = 0.55 * Math.sin(x * 0.07 + 1.3) * Math.cos(z * 0.06) + 0.35 * Math.sin(x * 0.19 - z * 0.11) + 0.2 * Math.cos(z * 0.23 + x * 0.05);
      y += 14 * gauss(x - HILL.x, z - HILL.z, 16);
      y += 4 * gauss(x + 58, z - 22, 13) + 3 * gauss(x - 6, z - 48, 12) + 5 * gauss(x - 70, z + 10, 14);
      const r = edgeR(x, z);
      if (r > 88) y += Math.pow(r - 88, 1.3) * 0.55 * (1 - 0.85 * valley(x, z));
      const ld = lakeD(x, z);
      if (ld < 1.4) y = lerp(y, -2.8, smooth(1.4, 0.82, ld));
      y = lerp(y, 0, rectMask(x, z, PITCH, 4));
      y = lerp(y, 0.1, circMask(x, z, PLAZA, PLAZA.r));
      y = lerp(y, 0, circMask(x, z, { x: 0, z: 3 }, 9));
      y = lerp(y, 0.2, circMask(x, z, CAMP, CAMP.r));
      return y;
    }
    const inDock = (x, z) => x > DOCK.x0 && x < DOCK.x1 && z > DOCK.z0 && z < DOCK.z1;
    const ground = (x, z) => (inDock(x, z) ? 0.25 : h(x, z));
    const blocked = (x, z) => (!inDock(x, z) && h(x, z) < -0.5) || edgeR(x, z) > 96;

    // terrain: flat-shaded, colored per triangle
    const SIZE = 380, SEG = 190;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG).rotateX(-Math.PI / 2).toNonIndexed();
    geo.translate(0, 0, -25);
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
      const ld = lakeD(x, z), r = edgeR(x, z), inPitch = x > PITCH.x0 && x < PITCH.x1 && z > PITCH.z0 && z < PITCH.z1;
      if (y < -0.9) c.set('#b9a478');
      else if (ld < 1.12 && y < 0.5) c.set('#e6d19d');
      else if (inPitch) c.set(Math.floor((x - PITCH.x0) / 3) % 2 ? '#5aa84a' : '#67b555');
      else if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < 11) c.set(((Math.floor(x / 2) + Math.floor(z / 2)) & 1) ? '#d9c3a1' : '#cfb592');
      else if (pathD(x, z) < 2.1) c.set('#d2a56c');
      else if (y > 10 && r < 90) c.set('#8f8473');
      else if (r > 92) c.set(y > 22 ? '#7d7768' : y > 12 ? '#557a48' : '#4f8a48');
      else c.set(['#7cb85a', '#6fae50', '#86c062', '#79b356'][Math.floor(R() * 4)]);
      c.offsetHSL(0, 0, (R() - 0.5) * 0.03);
      for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (i + k) * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    terrain.receiveShadow = true;
    G.add(terrain);

    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2fa8b0', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.86 }));
    water.scale.set(LAKE.rx * 1.25, 1, LAKE.rz * 1.25);
    water.position.set(LAKE.x, -0.7, LAKE.z);
    water.receiveShadow = true;
    G.add(water);
    const glints = [];
    for (let i = 0; i < 14; i++) {
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, toneMapped: false }));
      const a = R() * 6.28, rr = Math.sqrt(R()) * 0.8;
      gl.position.set(LAKE.x + Math.cos(a) * LAKE.rx * rr, -0.66, LAKE.z + Math.sin(a) * LAKE.rz * rr);
      gl.userData.p = R() * 6;
      G.add(gl); glints.push(gl);
    }

    // background volcanoes: Atitlán's three around the lake, Acatenango + Fuego to the east
    function volcano(x, z, ht, rad, top = '#6d6458', snow = false) {
      const g = new THREE.ConeGeometry(rad, ht, 11, 5, true).toNonIndexed();
      const p = g.attributes.position, cc = new Float32Array(p.count * 3), col = new THREE.Color();
      const vr = rng(Math.floor(x * 7 + z));
      const jm = new Map();
      for (let i = 0; i < p.count; i++) {
        const key = [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v * 100)).join();
        if (!jm.has(key)) jm.set(key, 1 + (vr() - 0.5) * 0.08);
        const k = p.getY(i) < ht / 2 - 0.01 ? jm.get(key) : 0;
        p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
      }
      for (let i = 0; i < p.count; i += 3) {
        const t = ((p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3 + ht / 2) / ht;
        col.set(t > 0.78 ? top : t > 0.45 ? '#5f7a52' : '#4d7e48').offsetHSL(0, 0, (vr() - 0.5) * 0.04);
        for (let k = 0; k < 3; k++) cc.set([col.r, col.g, col.b], (i + k) * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
      m.position.set(x, ht / 2 - 4, z);
      m.scale.y = 1;
      G.add(m);
      return m;
    }
    // a cone geometry with a flat top: crater
    volcano(-48, -128, 52, 34); volcano(-8, -142, 58, 38); volcano(30, -138, 66, 40);
    const fuego = volcano(146, -86, 70, 40, '#3b3633');
    const crater = new THREE.Vector3(146, 66 - 4 + 0.5, -86);
    put(G, new THREE.CylinderGeometry(1.6, 2.6, 1.2, 8), new THREE.MeshBasicMaterial({ color: '#ff6a2a', toneMapped: false }), crater.x, crater.y - 0.6, crater.z);
    const puffs = [];
    for (let i = 0; i < 16; i++) {
      const p = put(G, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#8d8580', transparent: true, opacity: 0, flatShading: true, roughness: 1 }));
      p.castShadow = false; p.userData.life = 0; puffs.push(p);
    }
    let puffT = 0, puffI = 0;

    // trees: pines, broadleaf, and purple jacarandas around Antigua
    const pineT = [], pineF1 = [], pineF2 = [], leafT = [], leafF = [];
    for (let i = 0; i < 2200; i++) {
      const x = (R() - 0.5) * 300, z = (R() - 0.5) * 300 - 25;
      const r = edgeR(x, z), y = h(x, z);
      if (r > 135 || y < -0.2 || lakeD(x, z) < 1.2) continue;
      if (r < 88 && R() < 0.72) continue;
      if (r > 88 && R() < valley(x, z) * 1.3) continue;
      if (pathD(x, z) < 6 || rectMask(x, z, PITCH, 8) > 0 || Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 2
        || Math.hypot(x, z - 4) < 15 || Math.hypot(x - CAMP.x, z - CAMP.z) < 11 || Math.hypot(x - HILL.x, z - HILL.z) < 9 || Math.hypot(x - 30, z - 3) < 8) continue;
      const s = 0.8 + R() * 0.9;
      const nearPlaza = Math.hypot(x - PLAZA.x, z - PLAZA.z) < 34;
      if (R() < (nearPlaza ? 0.6 : 0.25) && r < 95) (leafT.push([x, y, z, s, nearPlaza && R() < 0.6]));
      else pineT.push([x, y, z, s]);
      if (r < 97) colliders.push({ x, z, r: 0.55 * s });
    }
    // hammock trees by the camp
    const hamA = [31, 31], hamB = [37.5, 34];
    for (const [x, z] of [hamA, hamB]) { leafT.push([x, h(x, z), z, 1.1, false]); colliders.push({ x, z, r: 0.6 }); }
    function instanced(geo, color, list, fn) {
      const m = new THREE.InstancedMesh(geo, mat('#ffffff'), list.length);
      list.forEach((t, i) => { fn(t, dummy); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, tmpC.set(typeof color === 'function' ? color(t, i) : color).offsetHSL(0, 0, (R() - 0.5) * 0.05)); });
      m.castShadow = m.receiveShadow = true;
      G.add(m);
    }
    const greens = ['#2f6b45', '#3b7a4c', '#2a5e3e', '#447f50'];
    instanced(new THREE.CylinderGeometry(0.22, 0.32, 1.8, 5), '#6b4a32', pineT, ([x, y, z, s], d) => { d.position.set(x, y + 0.9 * s, z); d.scale.setScalar(s); d.rotation.set(0, 0, 0); });
    instanced(new THREE.ConeGeometry(1.7, 3.2, 7), (t, i) => greens[i % 4], pineT, ([x, y, z, s], d) => { d.position.set(x, y + 2.7 * s, z); d.scale.setScalar(s); d.rotation.set(0, x, 0); });
    instanced(new THREE.ConeGeometry(1.25, 2.6, 7), (t, i) => greens[(i + 1) % 4], pineT, ([x, y, z, s], d) => { d.position.set(x, y + 4.3 * s, z); d.scale.setScalar(s); d.rotation.set(0, z, 0); });
    instanced(new THREE.CylinderGeometry(0.22, 0.3, 2.2, 5), '#6b4a32', leafT, ([x, y, z, s], d) => { d.position.set(x, y + 1.1 * s, z); d.scale.setScalar(s); d.rotation.set(0, 0, 0); });
    instanced(new THREE.IcosahedronGeometry(1.9, 0), ([, , , , jac], i) => (jac ? ['#9b7fd1', '#8a6cc4'][i % 2] : ['#5c9a3e', '#6aa84f', '#7fb24a'][i % 3]), leafT, ([x, y, z, s], d) => { d.position.set(x, y + 3.4 * s, z); d.scale.set(s, s * 0.85, s); d.rotation.set(x, z, 0); });

    // rocks
    const rocks = [];
    for (let i = 0; i < 70; i++) {
      const x = (R() - 0.5) * 190, z = (R() - 0.5) * 190 - 25;
      if (edgeR(x, z) > 90 || lakeD(x, z) < 1.15 || pathD(x, z) < 3 || rectMask(x, z, PITCH, 6) > 0 || Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r || Math.hypot(x, z - 4) < 12 || Math.hypot(x - CAMP.x, z - CAMP.z) < 10) continue;
      const s = 0.5 + R() * 1.3;
      rocks.push([x, h(x, z), z, s]);
      colliders.push({ x, z, r: s * 0.95, h: s * 0.8 });
    }
    instanced(new THREE.DodecahedronGeometry(1, 0), '#9a958c', rocks, ([x, y, z, s], d) => { d.position.set(x, y + s * 0.2, z); d.scale.set(s, s * 0.7, s); d.rotation.set(x, z, 0); });

    // flowers around the plaza for some color
    const flowers = [];
    for (let i = 0; i < 140; i++) {
      const a = R() * 6.28, rr = PLAZA.r + 1 + R() * 9;
      const x = PLAZA.x + Math.cos(a) * rr, z = PLAZA.z + Math.sin(a) * rr;
      if (pathD(x, z) < 2.5) continue;
      flowers.push([x, h(x, z), z, R()]);
    }
    instanced(new THREE.IcosahedronGeometry(0.22, 0), ([, , , k]) => ['#ff5a7a', '#ffd23f', '#ffffff', '#ff8a3c'][Math.floor(k * 4)], flowers, ([x, y, z], d) => { d.position.set(x, y + 0.25, z); d.scale.setScalar(1); d.rotation.set(0, 0, 0); });

    // clouds that drift and actually cast shadows
    const clouds = [];
    for (let i = 0; i < 9; i++) {
      const cg = new THREE.Group();
      for (let k = 0; k < 4; k++) { const s = 2.5 + R() * 3; const m = put(cg, new THREE.IcosahedronGeometry(s, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1 }), k * 3.2 - 5, (R() - 0.5) * 1.5, (R() - 0.5) * 3); m.scale.y = 0.6; m.receiveShadow = false; }
      cg.position.set((R() - 0.5) * 200, 34 + R() * 14, (R() - 0.5) * 160 - 30);
      cg.userData.v = 1 + R() * 1.5;
      G.add(cg); clouds.push(cg);
    }

    // ---- Antigua: arch, houses, dance floor ----
    const archPos = { x: -14.5, z: -9.4 };
    const th = Math.atan2(-12, -6);
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
    const houses = [[-41, -10, '#e8a33d'], [-41, -19.5, '#3d7ea6'], [-39, -29, '#e07a9a'], [-27, -2.5, '#f2d16b'], [-35.5, -2.5, '#7bb38a'], [-22, -30, '#c8553d']];
    for (const [x, z, col] of houses) {
      const hs = new THREE.Group(); hs.position.set(x, 0.1, z); G.add(hs);
      const w = 7, d = 6.4, ht = 4.6;
      rbox(hs, w, ht, d, col, 0, ht / 2, 0, 0.08);
      rbox(hs, w + 0.3, 0.35, d + 0.3, WHT, 0, 0.18, 0, 0.04);
      const roof = put(hs, new THREE.CylinderGeometry(0.01, 4.5, 2.2, 4, 1).rotateY(Math.PI / 4), '#b4553a', 0, ht + 1.1, 0);
      roof.scale.set(1.2, 1, 1.05);
      for (const sx of [-1.8, 1.8]) rbox(hs, 1.3, 1.6, 0.2, '#3a2a22', sx, 2.6, d / 2 + 0.02, 0.05);
      rbox(hs, 1.5, 2.6, 0.2, '#5a3a26', 0, 1.3, d / 2 + 0.02, 0.05);
      for (const sx of [-1.8, 1.8]) rbox(hs, 1.6, 0.25, 0.4, WHT, sx, 1.7, d / 2 + 0.1, 0.04);
      hs.rotation.y = x < -38 ? Math.PI / 2 : z > -10 ? Math.PI : 0;
      colliders.push({ x, z, hw: x < -38 ? d / 2 : w / 2, hd: x < -38 ? w / 2 : d / 2 });
    }
    // dance floor with string lights
    const DF = { x: -29, z: -21, s: 9 };
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
        const m = new THREE.MeshBasicMaterial({ color: bulbCols[i % 4], toneMapped: false });
        bulbs.push(put(G, new THREE.SphereGeometry(0.16, 6, 4), m, lerp(a.x, b.x, t), 4.9 - sag, lerp(a.z, b.z, t)));
      }
    }
    const speaker = new THREE.Group(); speaker.position.set(DF.x + 6.4, 0.1, DF.z + 3.5); speaker.rotation.y = -Math.PI / 2; G.add(speaker);
    rbox(speaker, 1.6, 2.6, 1.3, '#1c1c22', 0, 1.3, 0, 0.12);
    const cones = [put(speaker, new THREE.CylinderGeometry(0.5, 0.5, 0.1, 12).rotateX(Math.PI / 2), '#444', 0, 1.8, 0.66), put(speaker, new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12).rotateX(Math.PI / 2), '#444', 0, 0.8, 0.66)];
    colliders.push({ x: speaker.position.x, z: speaker.position.z, r: 1 });
    const onFloor = (car) => Math.abs(car.x - DF.x) < 4.6 && Math.abs(car.z - DF.z) < 4.6;
    let danceTime = 0;

    // ---- the lake: dock and a sailboat ----
    for (let z = DOCK.z1; z > DOCK.z0; z -= 1.05) rbox(G, 3.4, 0.22, 0.95, '#a57a4f', -12, 0.14, z, 0.04);
    for (const z of [-50, -55, -60]) for (const x of [-13.7, -10.3]) put(G, new THREE.CylinderGeometry(0.2, 0.2, 3, 6), '#6b4a32', x, -0.8, z);
    const boat = new THREE.Group(); G.add(boat);
    rbox(boat, 1.8, 0.8, 4.4, '#f7f3ea', 0, 0, 0, 0.3);
    rbox(boat, 1.84, 0.2, 4.44, '#2bb3a3', 0, 0.1, 0, 0.05);
    put(boat, new THREE.CylinderGeometry(0.08, 0.08, 6.5, 5), '#6b4a32', 0, 3.3, 0.3);
    const sailG = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0.8, -1.4, 0, 6.3, 0.25, 0, 0.8, 0.25], 3));
    sailG.computeVertexNormals();
    put(boat, sailG, new THREE.MeshStandardMaterial({ color: '#fff8ea', side: THREE.DoubleSide, flatShading: true }), 0.05, 0, 0);
    put(boat, new THREE.BoxGeometry(0.02, 0.4, 0.7), LAVA, 0, 6.6, 0.6);

    // ---- soccer pitch ----
    const lineM = new THREE.MeshBasicMaterial({ color: '#f4f7ee' });
    const line = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), lineM); m.position.set(x, 0.04, z); m.receiveShadow = true; G.add(m); };
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
    const ballG = new THREE.IcosahedronGeometry(1.1, 1);
    const bc = new Float32Array(ballG.attributes.position.count * 3);
    for (let i = 0; i < bc.length; i += 9) { const dark = (i / 9) % 5 === 0; for (let k = 0; k < 9; k++) bc[i + k] = dark ? 0.08 : 0.95; }
    ballG.setAttribute('color', new THREE.BufferAttribute(bc, 3));
    const ballM = new THREE.Mesh(ballG, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.5 }));
    ballM.castShadow = true; G.add(ballM);
    const ball = { mesh: ballM, x: pcx, z: pcz, y: 0, vx: 0, vz: 0, vy: 0, r: 1.1, mass: 0.6, bounce: 0.75, drag: 0.55, yOff: 1.1, roll: true, home: [pcx, pcz], grounded: true };
    bodies.push(ball);
    let goalCool = 0;
    // training cones
    for (let i = 0; i < 5; i++) {
      const cg = new THREE.Group();
      put(cg, new THREE.ConeGeometry(0.45, 1, 8), '#ff7a2a', 0, 0.5, 0);
      put(cg, new THREE.CylinderGeometry(0.6, 0.6, 0.1, 8), '#ff7a2a', 0, 0.05, 0);
      G.add(cg);
      const x = 14 + i * 2.6, z = -1.5;
      bodies.push({ mesh: cg, x, z, y: 0, vx: 0, vz: 0, vy: 0, r: 0.55, mass: 0.2, bounce: 0.3, drag: 3, hop: 0.3, yOff: 0, home: [x, z], grounded: true });
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
      G.add(kb);
      const x = 35 + i * 1.6, z = 7;
      bodies.push({ mesh: kb, x, z, y: 0, vx: 0, vz: 0, vy: 0, r: 0.65, mass: 3, bounce: 0.2, drag: 4, yOff: 0, home: [x, z], grounded: true });
    }

    // ---- camp: fire, pot, tent, hammock ----
    const fire = new THREE.Group(); fire.position.set(40, h(40, 22), 22); G.add(fire);
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; put(fire, new THREE.DodecahedronGeometry(0.45, 0), '#8f8a82', Math.cos(a) * 1.5, 0.25, Math.sin(a) * 1.5); }
    for (let i = 0; i < 3; i++) { const l = rbox(fire, 0.4, 0.4, 2.4, '#6b4a32', 0, 0.35, 0, 0.1); l.rotation.y = i * 1.05; l.rotation.x = 0.15; }
    const flames = [['#ff5a2a', 0.9, 1.9], ['#ffa23a', 0.6, 1.4], ['#ffe07a', 0.35, 0.9]].map(([col, r, ht]) => {
      const f = put(fire, new THREE.ConeGeometry(r, ht, 6), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }), 0, 0.5 + ht / 2, 0);
      f.castShadow = false; return f;
    });
    put(fire, new THREE.CylinderGeometry(0.75, 0.6, 1, 10), '#2a2d36', 2.4, 0.5, -0.6);
    put(fire, new THREE.CylinderGeometry(0.66, 0.66, 0.06, 10), '#c96f3a', 2.4, 1.02, -0.6);
    rbox(fire, 0.12, 0.12, 2, '#a57a4f', 2.6, 1.3, -0.3, 0.04).rotation.x = -0.9;
    put(fire, new THREE.CylinderGeometry(1.1, 1.1, 0.12, 12), '#2a2d36', -2.3, 0.55, 0.8);
    const fireLight = new THREE.PointLight('#ff8a3a', 60, 20, 1.6); fireLight.position.set(40, h(40, 22) + 2.5, 22); G.add(fireLight);
    colliders.push({ x: 40, z: 22, r: 2 });
    let emberT = 0;
    // a stump to sit on
    put(G, new THREE.CylinderGeometry(0.7, 0.8, 0.9, 8), '#7a5638', 43.5, h(43.5, 19.5) + 0.45, 19.5); colliders.push({ x: 43.5, z: 19.5, r: 0.8 });
    const tent = new THREE.Group(); tent.position.set(48.5, h(48.5, 28), 28); tent.rotation.y = -0.6; G.add(tent);
    const prism = put(tent, new THREE.CylinderGeometry(2.4, 2.4, 5, 3).rotateZ(Math.PI / 2).rotateX(Math.PI / 6 * 0), '#ff7a2a', 0, 1.2, 0);
    prism.rotation.x = Math.PI / 2; prism.rotation.z = Math.PI / 2; prism.rotation.y = Math.PI / 2;
    prism.position.y = 1.2;
    rbox(tent, 0.08, 2.5, 0.08, '#6b4a32', 0, 1.25, 2.6, 0.02);
    put(tent, new THREE.CylinderGeometry(0.9, 0.9, 0.05, 3).rotateX(Math.PI / 2), '#3a2a22', 0, 0.75, 2.52).rotation.z = Math.PI / 2;
    colliders.push({ x: 48.5, z: 28, r: 2.6 });
    const ham = new THREE.CatmullRomCurve3([new THREE.Vector3(hamA[0], h(...hamA) + 2.2, hamA[1]), new THREE.Vector3((hamA[0] + hamB[0]) / 2, h(...hamA) + 1.0, (hamA[1] + hamB[1]) / 2), new THREE.Vector3(hamB[0], h(...hamB) + 2.2, hamB[1])]);
    const hm = put(G, new THREE.TubeGeometry(ham, 16, 0.45, 5), '#2bb3a3');
    hm.scale.y = 1;
    const book = new THREE.Group(); book.position.copy(ham.getPoint(0.5)).add(new THREE.Vector3(0, 0.45, 0)); book.rotation.set(0, 0.6, 0); G.add(book);
    rbox(book, 0.9, 0.12, 1.3, '#c4392f', -0.47, 0.06, 0, 0.03).rotation.z = 0.25;
    rbox(book, 0.9, 0.12, 1.3, '#c4392f', 0.47, 0.06, 0, 0.03).rotation.z = -0.25;
    for (let i = 0; i < 2; i++) {
      const cr = new THREE.Group(); rbox(cr, 1.6, 1.6, 1.6, '#b98a55', 0, 0.8, 0, 0.12); rbox(cr, 1.64, 0.25, 1.64, '#8c6239', 0, 1.2, 0, 0.04); rbox(cr, 1.64, 0.25, 1.64, '#8c6239', 0, 0.4, 0, 0.04); G.add(cr);
      const x = 33 + i * 2.2, z = 17;
      bodies.push({ mesh: cr, x, z, y: 0, vx: 0, vz: 0, vy: 0, r: 0.95, mass: 1.6, bounce: 0.2, drag: 3.5, yOff: 0, home: [x, z], grounded: true });
    }

    // ---- summit marker ----
    const sy = h(HILL.x, HILL.z);
    const cairn = new THREE.Group(); cairn.position.set(HILL.x + 2.5, sy, HILL.z - 1.5); G.add(cairn);
    [[1.2, 0.5], [0.95, 1.2], [0.7, 1.8], [0.45, 2.3]].forEach(([s, y]) => put(cairn, new THREE.DodecahedronGeometry(s, 0), '#9a958c', 0, y, 0).scale.y = 0.7);
    colliders.push({ x: HILL.x + 2.5, z: HILL.z - 1.5, r: 1.3 });
    const sign = new THREE.Group(); sign.position.set(HILL.x - 3, sy, HILL.z + 2); sign.rotation.y = 0.3; G.add(sign);
    rbox(sign, 0.25, 3, 0.25, '#6b4a32', 0, 1.5, 0, 0.05);
    const sb = rbox(sign, 4, 1.3, 0.2, '#e9d3a8', 0, 2.8, 0, 0.05);
    decal(sb, 3.8, 1.2, label('', { w: 512, h: 160, fg: '#3a2a22', font: `800 52px ${DISP}`, lines: ['ACATENANGO', '3,976 m'] }), 0, 0, 0.11);
    colliders.push({ x: HILL.x - 3, z: HILL.z + 2, r: 0.4 });

    // ---- signpost at spawn (in Spanish, it's Guatemala) ----
    const post = new THREE.Group(); post.position.set(5.5, 0, -3.5); G.add(post);
    rbox(post, 0.35, 5.6, 0.35, '#6b4a32', 0, 2.8, 0, 0.05);
    [['ANTIGUA', -14.5, -9.4, '#f0b73a'], ['LAGO DE ATITLÁN', -12, -48, '#2bb3a3'], ['LA CANCHA', 18, -12, '#ffffff'], ['ACATENANGO', 46, -58, '#e9d3a8'], ['CAMPAMENTO', 40, 22, '#ff9a5c']].forEach(([t, tx, tz, col], i) => {
      const arm = new THREE.Group(); arm.position.y = 5 - i * 0.85; arm.rotation.y = Math.atan2(tx - 5.5, tz + 3.5) - Math.PI / 2; post.add(arm);
      const b = rbox(arm, 4.4, 0.7, 0.16, col, 2.3, 0, 0, 0.04);
      decal(b, 4.2, 0.62, label(t, { w: 640, h: 96, fg: '#2a2622', font: `800 50px ${DISP}` }), 0, 0, 0.09);
      decal(b, 4.2, 0.62, label(t, { w: 640, h: 96, fg: '#2a2622', font: `800 50px ${DISP}` }), 0, 0, -0.09, 0, Math.PI);
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
    const flag = (id, text, x, z, dy = 1) => { const m = buildFlag(); const y = ground(x, z) + dy; m.position.set(x, y, z); G.add(m); flags.push({ id, text, x, z, y: y + 0.9, mesh: m }); };
    flag('w4', 'DAN{3976_meters}', HILL.x, HILL.z);
    flag('w5', 'DAN{read_the_wind}', -12, -59.6);
    flag('w6', 'DAN{la_antigua}', archPos.x, archPos.z, 1);
    flag('w7', 'DAN{leave_no_trace}', 45.5, 24.5);
    const danceFlag = { id: 'w8', text: 'DAN{one_two_three_five_six_seven}', x: DF.x, z: DF.z, y: -99, mesh: new THREE.Group() };
    flags.push(danceFlag);

    zones.push(
      { id: 'familia', x: archPos.x, z: archPos.z, r: 7.5, ly: 13.6 },
      { id: 'dance', x: DF.x, z: DF.z, r: 6.5, ly: 6.4 },
      { id: 'lake', x: -12, z: -54, r: 7, ly: 3, lz: -56, view: [-8, 30, -140] },
      { id: 'pitch', x: pcx, z: pcz, r: 11, ly: 5, lz: PITCH.z0 },
      { id: 'gym', x: 31, z: 6, r: 5.5, ly: 6, lz: 2.6 },
      { id: 'fire', x: 40, z: 21, r: 5.5, ly: 5.4, lz: 22 },
      { id: 'hammock', x: 34, z: 30, r: 4.5, ly: 5.6, lz: 32.5 },
      { id: 'summit', x: HILL.x, z: HILL.z, r: 8, ly: sy + 5.5, lx: HILL.x - 3, lz: HILL.z + 2, view: [146, 60, -86] },
      { id: 'portal', x: 0, z: 9.5, r: 5, ly: 4, go: 2.9, to: 'desk' },
    );

    return {
      group: G, colliders, bodies, zones, flags, blocked, ground,
      spawn: { x: 0, z: 2, a: Math.PI },
      places: {
        outside: [0, 2, Math.PI], familia: [-10, -7, Math.atan2(-12, -6)], dance: [-24, -16, -Math.PI * 0.75], lake: [-12, -50, Math.PI],
        pitch: [20, -10, Math.PI / 2], gym: [27, 10, Math.PI * 0.8], fire: [34, 15, Math.PI * 0.25], hammock: [30, 24, 0.3],
        summit: [48.5, -58.5, Math.PI * 0.9],
      },
      env: { fog: '#f1cfa8', fogNear: 70, fogFar: 300, hemi: ['#cfe3ff', '#8a7a55', 1.25], sun: ['#ffe9c8', 2.5], sunOff: [-34, 46, 26], cam: [0, 29, 24], exposure: 1.0 },
      dance: onFloor,
      update(t, dt, car) {
        // Fuego breathes every couple of seconds
        puffT -= dt;
        if (puffT <= 0) { puffT = 1.6 + Math.random() * 1.5; const p = puffs[puffI = (puffI + 1) % puffs.length]; p.userData.life = 1; p.position.copy(crater); }
        for (const p of puffs) {
          if (p.userData.life <= 0) continue;
          p.userData.life -= dt / 9;
          const k = 1 - p.userData.life;
          p.position.y += dt * (5 - k * 3); p.position.x -= dt * 2.4;
          p.scale.setScalar(2.5 + k * 11);
          p.material.opacity = Math.min(1, k * 6) * p.userData.life * 0.9;
        }
        for (const cl of clouds) { cl.position.x += cl.userData.v * dt; if (cl.position.x > 120) cl.position.x = -120; }
        glints.forEach(g => { g.material.opacity = Math.max(0, Math.sin(t * 1.3 + g.userData.p * 3)) * 0.6; });
        const ba = t * 0.045;
        boat.position.set(LAKE.x + Math.cos(ba) * 15, -0.35 + Math.sin(t * 1.6) * 0.08, LAKE.z - 3 + Math.sin(ba) * 8);
        boat.rotation.set(Math.sin(t * 1.3) * 0.04, -ba - Math.PI, Math.sin(t * 1.1) * 0.06);
        // fire
        flames.forEach((f, i) => { const s = 1 + Math.sin(t * (11 + i * 5)) * 0.12 + Math.sin(t * 23 + i) * 0.06; f.scale.set(s, 1 + Math.sin(t * 9 + i * 2) * 0.18, s); f.rotation.y = t * (1 + i); });
        fireLight.intensity = 55 + Math.sin(t * 13) * 8 + Math.sin(t * 29) * 5;
        emberT -= dt;
        if (emberT <= 0) { emberT = 0.25; burst(40, h(40, 22) + 1.5, 22, 1, ['#ffb13c', '#ff5a2a'], 1, 1.4, 4); }
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
        const b = beat(t);
        const bi = Math.floor(b);
        tiles.forEach(({ m, i, j }) => {
          const lit = on ? (i + j + bi) % 3 === 0 || (i === 2 && j === 2) : ((i * 7 + j * 3 + Math.floor(t * 1.5)) % 9 === 0);
          const col = tileCols[(i + j * 2 + bi) % 4];
          m.emissive.set(lit ? col : '#000');
          m.emissiveIntensity = lit ? (on ? 1.4 - (b % 1) * 0.8 : 0.4) : 0;
        });
        bulbs.forEach((bb, i) => { bb.scale.setScalar(on ? 1 + 0.4 * Math.max(0, Math.sin((b + i * 0.25) * Math.PI)) : 1); });
        const thump = on ? 1 + Math.max(0, 1 - (b % 1) * 4) * 0.15 : 1;
        cones.forEach(cn => cn.scale.set(thump, thump, 1));
        if (on) { danceTime += dt; if (danceTime > 8 && !danceFlag.got) { danceFlag.got = true; sfx('flag'); burst(car.x, car.y + 2, car.z, 50, tileCols, 10); opts.onFlag('w8', danceFlag.text); } }
        else danceTime = 0;
        pring.material.opacity = 0.35 + Math.sin(t * 3) * 0.2;
      },
    };
  }
}
