import * as THREE from 'three';
import { S, mat, buildWorld } from './world.js';

const params = new URLSearchParams(location.search);
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let calm = motionQuery.matches;
motionQuery.addEventListener('change', (e) => { calm = e.matches; });

/* ---- renderer, scene, light (the diorama's studio, at game scale) ------- */
const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 600);

const hemi = new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.0);
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.04;
Object.assign(key.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 160 });
const fill = new THREE.DirectionalLight(0xfff4e6, 0.5);
fill.position.set(-5, 3, -4);
scene.add(hemi, key, key.target, fill);

const world = buildWorld(scene);
const { home, mill, stones, sky, walkables } = world;

/* ---- the wanderer: the diorama's little hooded figure ------------------- */
const player = new THREE.Group();
player.name = 'player';
const body = new THREE.Group();
body.scale.setScalar(S);
player.add(body);
const part = (geo, material, pos, scale = [1, 1, 1]) => {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.scale.set(...scale);
  m.castShadow = true;
  body.add(m);
  return m;
};
part(new THREE.CapsuleGeometry(0.0038, 0.0058, 8, 20), mat.terracotta, [0, 0.0062, 0]);
part(new THREE.SphereGeometry(0.0036, 24, 16), mat.cream, [0, 0.0134, 0]);
part(new THREE.SphereGeometry(0.0040, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.7), mat.grass, [0, 0.0140, -0.0004]);
part(new THREE.SphereGeometry(0.0030, 16, 12), mat.cream, [0, 0.0082, -0.0044], [1, 0.9, 0.8]);
const footL = part(new THREE.SphereGeometry(0.0020, 12, 10), mat.basalt, [-0.0022, 0.0016, 0.0008], [1, 0.7, 1.3]);
const footR = part(new THREE.SphereGeometry(0.0020, 12, 10), mat.basalt, [0.0022, 0.0016, 0.0008], [1, 0.7, 1.3]);
scene.add(player);

const RADIUS = 0.7, SPEED = 6.5, JUMP = 8.5, GRAVITY = 24, STEP_UP = 1.2, SNAP_DOWN = 1.0;
const state = {
  pos: new THREE.Vector3(home.spawn.x, 0, home.spawn.z),
  vel: new THREE.Vector3(),
  vy: 0,
  grounded: true,
  on: home,
  safe: null,
  facing: 0,
  stride: 0,
  falling: 0,         // seconds spent falling off the world
  hold: 0,            // a short pause while the gate wakes
  gateOpen: false,
  arrived: false,
  windy: false,
};
state.pos.y = home.groundAt(state.pos.x, state.pos.z);
state.safe = { x: state.pos.x, y: state.pos.y, z: state.pos.z, w: home };

/* ---- input: keyboard, mouse drag, touch joystick ------------------------ */
const keys = new Set();
const cam = { yaw: 0, pitch: 0.42, dist: 13, yawVel: 0 };
const toGate = [home.gate.x - state.pos.x, home.gate.z - state.pos.z];
cam.yaw = Math.atan2(-toGate[0], -toGate[1]);
state.facing = Math.atan2(toGate[0], toGate[1]);
let jumpQueued = false;

const MOVE = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
// keys belong to the game only while focus is on the canvas/body, not on UI controls or dialogs
const onControl = (el) => !!(el && el.closest && el.closest('button, a[href], input, select, textarea, summary, dialog, [contenteditable], [role="button"], [role="dialog"]'));
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || onControl(e.target)) return;
  if (MOVE[e.code] || e.code === 'KeyQ' || e.code === 'KeyE' || e.code === 'Space') e.preventDefault();
  if (e.code === 'Space' && !e.repeat) jumpQueued = true;
  if (e.code === 'KeyT' && !e.repeat) setTime(document.documentElement.dataset.islandTime === 'dusk' ? 'day' : 'dusk');
  keys.add(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const look = { id: null, lx: 0, ly: 0 };
const stickEl = document.querySelector('.stick');
const knobEl = document.querySelector('.stick-knob');
canvas.addEventListener('pointerdown', (e) => {
  canvas.focus();
  if (e.pointerType !== 'mouse' && stick.id === null && e.clientX < innerWidth * 0.45) {
    Object.assign(stick, { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 });
    stickEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    stickEl.classList.add('on');
  } else if (look.id === null) {
    Object.assign(look, { id: e.pointerId, lx: e.clientX, ly: e.clientY });
  } else return;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === stick.id) {
    const dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
    const len = Math.hypot(dx, dy), max = 48, k = len > max ? max / len : 1;
    stick.x = (dx * k) / max;
    stick.y = (dy * k) / max;
    knobEl.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  } else if (e.pointerId === look.id) {
    cam.yaw -= (e.clientX - look.lx) * 0.006;
    cam.pitch = THREE.MathUtils.clamp(cam.pitch + (e.clientY - look.ly) * 0.004, 0.12, 1.1);
    look.lx = e.clientX;
    look.ly = e.clientY;
  }
});
const release = (e) => {
  if (e.pointerId === stick.id) {
    Object.assign(stick, { id: null, x: 0, y: 0 });
    knobEl.style.transform = '';
    stickEl.classList.remove('on');
  }
  if (e.pointerId === look.id) look.id = null;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  cam.dist = THREE.MathUtils.clamp(cam.dist + e.deltaY * 0.01, 7, 24);
}, { passive: false });
document.querySelector('.jump').addEventListener('pointerdown', (e) => { e.preventDefault(); jumpQueued = true; });

/* ---- messages ----------------------------------------------------------- */
const toastEl = document.querySelector('.toast');
const placeEl = document.querySelector('.place');
let toastTimer = 0;
function toast(text, ms = 4200) {
  toastEl.textContent = text;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
}
let placeName = 'Home';
function setPlace(name) {
  if (!name || name === placeName) return;
  placeName = name;
  placeEl.textContent = name;
}

/* ---- day / dusk (same light sets and contract as the diorama) ----------- */
const THEMES = {
  day: { hemi: [0xffffff, 0xd8d2c4, 1.0], key: [0xffffff, 2.2], keyDir: [4, 7, 5], fill: [0xfff4e6, 0.5],
    emissive: 0x000000, emissiveI: 0, glowColor: 0x4a3f33, point: 0, water: 0xe6ecda },
  dusk: { hemi: [0x5a6b86, 0x2a2320, 0.55], key: [0xffb37a, 1.15], keyDir: [-5, 3.2, 2], fill: [0x6e7fa8, 0.35],
    emissive: 0xffb45e, emissiveI: 1.6, glowColor: 0xffd9a0, point: 30, water: 0xc9d4c6 },
};
const keyDir = new THREE.Vector3(4, 7, 5).normalize();
function setTime(nameRaw) {
  const name = THEMES[nameRaw] ? nameRaw : 'day';
  const t = THEMES[name];
  hemi.color.setHex(t.hemi[0]); hemi.groundColor.setHex(t.hemi[1]); hemi.intensity = t.hemi[2];
  key.color.setHex(t.key[0]); key.intensity = t.key[1];
  keyDir.set(...t.keyDir).normalize();
  fill.color.setHex(t.fill[0]); fill.intensity = t.fill[1];
  mat.glow.color.setHex(t.glowColor);
  mat.glow.emissive.setHex(t.emissive);
  mat.glow.emissiveIntensity = t.emissiveI;
  mat.water.color.setHex(t.water);
  home.lights.hearth.intensity = t.point;
  home.lights.lamp.intensity = t.point * 0.8;
  document.documentElement.dataset.islandTime = name;
  document.querySelectorAll('.toggle button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.time === name)));
  try { localStorage.setItem('island-time', name); } catch (_) {}
  dispatchEvent(new CustomEvent('island:time', { detail: name }));
  return name;
}
window.setIslandTime = setTime;
document.querySelectorAll('.toggle button').forEach((b) => b.addEventListener('click', () => setTime(b.dataset.time)));

/* ---- moving about ------------------------------------------------------- */
function groundUnder(x, z, y) {
  let best = null, on = null;
  for (const w of walkables) {
    const h = w.groundAt(x, z);
    if (h !== null && h <= y + STEP_UP && (best === null || h > best)) { best = h; on = w; }
  }
  return { h: best, on };
}

function pushOut(x, z) {
  for (const w of [home, mill]) {
    for (const c of w.colliders) {
      const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), min = c.r + RADIUS;
      if (d < min && d > 1e-4) { x = c.x + (dx / d) * min; z = c.z + (dz / d) * min; }
    }
  }
  return [x, z];
}

const fadeEl = document.querySelector('.fade');
function respawn() {
  const { x, z, w } = state.safe;
  // land a little further in than where you stepped off
  const dx = w.x - x, dz = w.z - z, d = Math.hypot(dx, dz) || 1, inset = Math.min(1.5, d);
  state.pos.set(x + (dx / d) * inset, 0, z + (dz / d) * inset);
  state.pos.y = w.groundAt(state.pos.x, state.pos.z) ?? 30;
  state.vel.set(0, 0, 0);
  state.vy = 0;
  state.falling = 0;
  state.grounded = true;
  snapCamera = true;
  fadeEl.classList.remove('on');
}

function step(dt, t) {
  let ix = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + stick.x;
  let iz = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - stick.y;
  if (state.hold > 0) { state.hold -= dt; ix = 0; iz = 0; }
  const il = Math.hypot(ix, iz);
  if (il > 1) { ix /= il; iz /= il; }
  if (keys.has('KeyQ')) cam.yaw += dt * 1.8;
  if (keys.has('KeyE')) cam.yaw -= dt * 1.8;

  // camera-relative: forward is where the camera looks
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
  const want = new THREE.Vector3((fx * iz - fz * ix) * SPEED, 0, (fz * iz + fx * ix) * SPEED);
  const grip = state.grounded ? 12 : 3;
  state.vel.lerp(want, 1 - Math.exp(-grip * dt));

  let [nx, nz] = pushOut(state.pos.x + state.vel.x * dt, state.pos.z + state.vel.z * dt);
  const ahead = groundUnder(nx, nz, state.pos.y);
  const wall = walkables.some((w) => { const h = w.groundAt(nx, nz, 0); return h !== null && h > state.pos.y + STEP_UP; });
  if (wall) { nx = state.pos.x; nz = state.pos.z; }
  state.pos.x = nx;
  state.pos.z = nz;

  if (jumpQueued && state.grounded) { state.vy = JUMP; state.grounded = false; }
  jumpQueued = false;

  const g = wall ? groundUnder(nx, nz, state.pos.y) : ahead;
  if (state.grounded && g.h !== null && state.pos.y - g.h < SNAP_DOWN) {
    state.pos.y = g.h;
    state.vy = 0;
    state.on = g.on;
  } else {
    state.vy -= GRAVITY * dt;
    state.pos.y += state.vy * dt;
    state.grounded = false;
    if (g.h !== null && state.pos.y <= g.h && state.vy <= 0) {
      state.pos.y = g.h;
      state.vy = 0;
      state.grounded = true;
      state.on = g.on;
    }
  }

  if (state.grounded) {
    state.falling = 0;
    if (state.on === home || state.on === mill) setPlace(state.on.label);
    state.safe = { x: state.pos.x, y: state.pos.y, z: state.pos.z, w: state.on };
  } else if (g.h === null) {
    state.falling += dt;
    if (state.falling > 0.35 && !fadeEl.classList.contains('on')) {
      fadeEl.classList.add('on');
      if (state.falling < 1) toast('Whoops. The clouds carry you back.', 2600);
    }
    if (calm ? state.falling > 0.4 : state.falling > 1.4) respawn();
  }

  // face the way you walk, with a little waddle
  const speed = Math.hypot(state.vel.x, state.vel.z);
  if (speed > 0.4) state.facing = Math.atan2(state.vel.x, state.vel.z);
  player.rotation.y += Math.atan2(Math.sin(state.facing - player.rotation.y), Math.cos(state.facing - player.rotation.y)) * (1 - Math.exp(-12 * dt));
  state.stride += dt * speed * 1.6;
  const swing = state.grounded ? Math.min(speed / SPEED, 1) : 0;
  const bob = calm ? 0 : Math.abs(Math.sin(state.stride)) * 0.18 * swing;
  player.position.set(state.pos.x, state.pos.y + bob, state.pos.z);
  body.rotation.z = calm ? 0 : Math.sin(state.stride) * 0.06 * swing;
  footL.position.z = 0.0008 + Math.sin(state.stride) * 0.0022 * swing;
  footR.position.z = 0.0008 - Math.sin(state.stride) * 0.0022 * swing;

  events(dt);
}

/* ---- the story beats ---------------------------------------------------- */
function events(dt) {
  const near = (p, r) => Math.hypot(state.pos.x - p.x, state.pos.z - p.z) < r;

  if (!state.gateOpen && near(home.gate, 2.2)) {
    state.gateOpen = true;
    home.spark.mesh.visible = false;
    home.spark.light.intensity = 0;
    state.hold = 0.8;
    toast('The gate hums. Stones rise out of the clouds.');
    stones.forEach((s, i) => { s.delay = calm ? 0 : i * 0.18; s.group.visible = true; });
  }
  for (const s of stones) {
    if (!state.gateOpen || s.rise >= 1) continue;
    s.delay -= dt;
    if (s.delay > 0) continue;
    s.rise = calm ? 1 : Math.min(1, s.rise + dt * 1.6);
    const e = 1 - Math.pow(1 - s.rise, 3);
    s.baseY = s.targetY - (1 - e) * 34;
    s.enabled = s.rise >= 1;
  }

  if (!state.arrived && state.grounded && state.on === mill) {
    state.arrived = true;
    toast('Windmill Island · 2 of 3. Climb the hill.');
  }
  if (!state.windy && state.grounded && state.on === mill && near(mill.top, 4.2)) {
    state.windy = true;
    toast('The wind turns, and the sails with it. Island 3 comes next: this prototype ends here.', 6500);
  }
  if (state.windy) mill.wind = Math.min(1, mill.wind + dt * 0.4);
}

/* ---- camera ------------------------------------------------------------- */
let snapCamera = true;
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  const target = new THREE.Vector3(state.pos.x, Math.max(state.pos.y, state.safe.y - 5) + 2.2, state.pos.z);
  if (snapCamera) { camTarget.copy(target); snapCamera = false; }
  camTarget.lerp(target, 1 - Math.exp(-(calm ? 14 : 7) * dt));
  const cp = Math.cos(cam.pitch);
  camera.position.set(
    camTarget.x + Math.sin(cam.yaw) * cp * cam.dist,
    camTarget.y + Math.sin(cam.pitch) * cam.dist,
    camTarget.z + Math.cos(cam.yaw) * cp * cam.dist,
  );
  camera.lookAt(camTarget);
  // the shadow box follows you, so one small shadow map stays sharp
  key.target.position.copy(camTarget);
  key.position.copy(camTarget).addScaledVector(keyDir, 60);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 62 : 50;   // a wider view on a phone held upright
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

/* ---- go ----------------------------------------------------------------- */
setTime(params.get('time') || (() => { try { return localStorage.getItem('island-time'); } catch (_) { return null; } })() || 'day');
toast(matchMedia('(pointer: coarse)').matches
  ? 'Thumb on the left to walk, drag on the right to look. Find the spark by the gate.'
  : 'WASD or arrows to walk, drag to look. Find the spark by the gate.', 6000);

const timer = new THREE.Timer();
let time = 0;
renderer.setAnimationLoop((ts) => {
  timer.update(ts);
  const dt = Math.min(timer.getDelta(), 1 / 20);
  time += dt;
  for (const w of walkables) w.update(time, calm, dt);
  sky.update(time, calm);
  step(dt, time);
  updateCamera(dt);
  renderer.render(scene, camera);
});
document.documentElement.classList.add('ready');
if (params.has('debug')) window.__game = { state, cam, mill, stones };
