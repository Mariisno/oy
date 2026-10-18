import * as THREE from 'three';

const stage = document.querySelector('three-d-stage');
await stage.ready;

// An explicit background wins over the theme's: `?bg=<color>` on the embed, or
// background="transparent" so the viewer takes the host page's own colour.
const params = new URLSearchParams(location.search);
const bgOverride = params.get('bg')
  || (stage.getAttribute('background') === 'transparent' ? 'transparent' : null);

const mat = {
  grass: new THREE.MeshStandardMaterial({ name: 'grass', color: 0x7a8a5e, roughness: 0.72, metalness: 0.0 }),
  stone: new THREE.MeshStandardMaterial({ name: 'stone', color: 0xb39c7e, roughness: 0.88, metalness: 0.0 }),
  basalt: new THREE.MeshStandardMaterial({ name: 'basalt', color: 0x3b332b, roughness: 0.66, metalness: 0.12 }),
  cream: new THREE.MeshStandardMaterial({ name: 'cream', color: 0xf2e6d2, roughness: 0.58, metalness: 0.0 }),
  terracotta: new THREE.MeshStandardMaterial({ name: 'terracotta', color: 0xc67139, roughness: 0.6, metalness: 0.0 }),
  water: new THREE.MeshStandardMaterial({ name: 'water', color: 0xe6ecda, roughness: 0.22, metalness: 0.05 }),
  glow: new THREE.MeshStandardMaterial({ name: 'glow', color: 0x4a3f33, roughness: 0.4, emissive: 0x000000 }),
  cloud: new THREE.MeshStandardMaterial({ name: 'cloud', color: 0xfbf4e8, roughness: 1.0, metalness: 0.0 }),
};

const V = (x, y) => new THREE.Vector2(x, y);
const lathe = (pts, seg = 72) => new THREE.LatheGeometry(pts, seg);

const root = new THREE.Group();
root.name = 'floating_island';
const hover = new THREE.Group();          // everything that floats
hover.name = 'island';
root.add(hover);

const add = (name, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], parent = hover) => {
  const m = new THREE.Mesh(geo, material);
  m.name = name;
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...scale);
  parent.add(m);
  return m;
};

/* ---- plinth: stays on the ground, the island hovers over it ------------ */
add('plinth', lathe([
  V(0.0000, 0.0000), V(0.0432, 0.0000), V(0.0462, 0.0024), V(0.0448, 0.0060),
  V(0.0392, 0.0136), V(0.0374, 0.0170), V(0.0352, 0.0186), V(0.0000, 0.0192),
]), mat.basalt, [0, 0, 0], [0, 0, 0], [1, 1, 1], root);

/* ---- grass cap --------------------------------------------------------- */
const grassProfile = [
  V(0.0000, 0.1200), V(0.0180, 0.1197), V(0.0320, 0.1188), V(0.0440, 0.1168),
  V(0.0520, 0.1138), V(0.0578, 0.1086), V(0.0592, 0.1024), V(0.0560, 0.0988),
  V(0.0400, 0.0972), V(0.0200, 0.0966), V(0.0000, 0.0964),
];
add('grass_cap', lathe(grassProfile), mat.grass);

function surfaceY(r) {
  const top = grassProfile.slice(0, 7);
  for (let i = 0; i < top.length - 1; i++) {
    const a = top[i], b = top[i + 1];
    if (r >= a.x && r <= b.x) return a.y + (b.y - a.y) * ((r - a.x) / (b.x - a.x));
  }
  return top[top.length - 1].y;
}
const at = (x, z) => [x, surfaceY(Math.hypot(x, z)), z];
const pol = (r, a) => [r * Math.cos(a), r * Math.sin(a)];

/* ---- rock mass: stepped strata tapering to a free-floating tip --------- */
add('rock_mass', lathe([
  V(0.0000, 0.1010), V(0.0300, 0.1000), V(0.0500, 0.0978), V(0.0586, 0.0930),
  V(0.0548, 0.0876), V(0.0455, 0.0848), V(0.0500, 0.0796), V(0.0400, 0.0736),
  V(0.0446, 0.0682), V(0.0330, 0.0604), V(0.0286, 0.0512), V(0.0200, 0.0424),
  V(0.0128, 0.0344), V(0.0072, 0.0284), V(0.0030, 0.0248), V(0.0000, 0.0236),
]), mat.stone);

const boulder = new THREE.SphereGeometry(1, 32, 24);
[
  ['shelf_a', [0.0300, 0.0856, 0.0225], [0.0175, 0.0062, 0.0150], [0, 0.4, 0.14]],
  ['shelf_b', [-0.0270, 0.0788, -0.0270], [0.0185, 0.0070, 0.0160], [0.06, -0.5, -0.12]],
  ['shelf_c', [0.0085, 0.0668, -0.0330], [0.0140, 0.0054, 0.0125], [0, 0.2, 0.18]],
  ['shelf_d', [-0.0190, 0.0545, 0.0150], [0.0105, 0.0044, 0.0095], [0, 0.8, -0.16]],
].forEach(([name, p, s, r]) => add(name, boulder, mat.stone, p, r, s));

/* satellite rocks that drift around the tip */
const drifters = [
  ['drift_a', [0.0230, 0.0170, 0.0140], [0.0068, 0.0056, 0.0062], 0.0],
  ['drift_b', [-0.0270, 0.0260, -0.0080], [0.0052, 0.0044, 0.0050], 1.7],
  ['drift_c', [0.0060, 0.0080, -0.0290], [0.0040, 0.0034, 0.0038], 3.1],
  ['drift_d', [-0.0130, 0.0400, 0.0330], [0.0058, 0.0046, 0.0054], 4.4],
  ['drift_e', [0.0380, 0.0330, -0.0200], [0.0034, 0.0028, 0.0032], 5.6],
  ['drift_f', [-0.0020, -0.0010, 0.0060], [0.0028, 0.0024, 0.0026], 2.3],
].map(([name, p, s, phase]) => {
  const m = add(name, boulder, mat.stone, p, [phase * 0.3, phase, 0], s);
  return { m, baseY: p[1], phase };
});

/* ---- cottage ----------------------------------------------------------- */
const cx = -0.0205, cz = 0.0110;
const cy = surfaceY(Math.hypot(cx, cz));
add('cottage_walls', new THREE.CylinderGeometry(0.0152, 0.0158, 0.0200, 48), mat.cream,
  [cx, cy + 0.0086, cz]);
add('cottage_roof', new THREE.ConeGeometry(0.0214, 0.0155, 48), mat.terracotta,
  [cx, cy + 0.0263, cz]);
add('roof_finial', new THREE.SphereGeometry(0.0030, 24, 18), mat.basalt,
  [cx, cy + 0.0348, cz]);
add('chimney', new THREE.CylinderGeometry(0.0034, 0.0038, 0.0140, 32), mat.stone,
  [cx + 0.0105, cy + 0.0268, cz + 0.0050], [0.16, 0, -0.16]);
add('chimney_cap', new THREE.TorusGeometry(0.0035, 0.0012, 14, 32), mat.basalt,
  [cx + 0.0116, cy + 0.0335, cz + 0.0055], [Math.PI / 2 + 0.16, 0, 0]);

add('flag_pole', new THREE.CylinderGeometry(0.0007, 0.0007, 0.0170, 12), mat.basalt,
  [cx, cy + 0.0430, cz]);
const pennantShape = new THREE.Shape();
pennantShape.moveTo(0, 0); pennantShape.lineTo(0.0115, 0.0022); pennantShape.lineTo(0, 0.0050); pennantShape.closePath();
const pennant = add('pennant', new THREE.ExtrudeGeometry(pennantShape, { depth: 0.0006, bevelEnabled: false }),
  mat.terracotta, [cx, cy + 0.0458, cz], [0, 0.6, 0]);

const faceAngle = Math.atan2(cz, cx);
const fd = [Math.cos(faceAngle), Math.sin(faceAngle)];
add('door', new THREE.CylinderGeometry(0.0048, 0.0048, 0.0024, 32), mat.basalt,
  [cx + fd[0] * 0.0146, cy + 0.0062, cz + fd[1] * 0.0146],
  [Math.PI / 2, 0, -faceAngle + Math.PI / 2]);
add('window_a', new THREE.CylinderGeometry(0.0030, 0.0030, 0.0024, 24), mat.glow,
  [cx - fd[1] * 0.0142 + fd[0] * 0.0040, cy + 0.0118, cz + fd[0] * 0.0142 + fd[1] * 0.0040],
  [Math.PI / 2, 0, -faceAngle]);
add('window_b', new THREE.CylinderGeometry(0.0030, 0.0030, 0.0024, 24), mat.glow,
  [cx + fd[1] * 0.0142 - fd[0] * 0.0040, cy + 0.0118, cz - fd[0] * 0.0142 - fd[1] * 0.0040],
  [Math.PI / 2, 0, -faceAngle]);

/* ---- tree -------------------------------------------------------------- */
const tx = 0.0270, tz = -0.0150;
const ty = surfaceY(Math.hypot(tx, tz));
add('tree_trunk', new THREE.CylinderGeometry(0.0034, 0.0058, 0.0230, 32), mat.basalt,
  [tx, ty + 0.0100, tz], [0, 0, -0.06]);
const canopy = new THREE.SphereGeometry(1, 40, 28);
add('tree_canopy_main', canopy, mat.grass, [tx - 0.0010, ty + 0.0300, tz], [0, 0, 0], [0.0150, 0.0128, 0.0146]);
add('tree_canopy_left', canopy, mat.grass, [tx - 0.0115, ty + 0.0250, tz + 0.0035], [0, 0, 0], [0.0098, 0.0086, 0.0094]);
add('tree_canopy_right', canopy, mat.grass, [tx + 0.0100, ty + 0.0262, tz - 0.0045], [0, 0, 0], [0.0090, 0.0080, 0.0088]);
const blossom = new THREE.SphereGeometry(0.0027, 20, 14);
[
  [tx - 0.0030, ty + 0.0408, tz + 0.0040],
  [tx + 0.0112, ty + 0.0330, tz + 0.0050],
  [tx - 0.0152, ty + 0.0288, tz - 0.0030],
  [tx + 0.0040, ty + 0.0350, tz - 0.0120],
].forEach((p, i) => add(`blossom_${i + 1}`, blossom, mat.cream, p));

/* ---- path, ending in a little stone gate ------------------------------- */
const pathStart = faceAngle;
const pathEnd = -1.25;
const pathR = 0.0340;
const pathSweep = pathStart - pathEnd;
add('path', new THREE.TorusGeometry(pathR, 0.0042, 18, 96, pathSweep), mat.terracotta,
  [0, surfaceY(pathR) - 0.0014, 0], [-Math.PI / 2, 0, -pathStart], [1, 0.48, 1]);
const [sx, sz] = pol(0.0415, pathEnd);
add('path_stone_a', boulder, mat.terracotta, at(sx, sz), [0, 0, 0], [0.0052, 0.0016, 0.0052]);
const [s2x, s2z] = pol(0.0300, pathEnd - 0.28);
add('path_stone_b', boulder, mat.terracotta, at(s2x, s2z), [0, 0, 0], [0.0040, 0.0014, 0.0040]);

const [gx, gz] = pol(0.0450, pathEnd);
const gy = surfaceY(Math.hypot(gx, gz));
const beta = -pathEnd - Math.PI / 2;
const span = 0.0120, postH = 0.0120;
const ax = Math.cos(beta) * span, az = -Math.sin(beta) * span;
add('gate_arch', new THREE.TorusGeometry(span, 0.0034, 20, 40, Math.PI), mat.stone,
  [gx, gy + postH - 0.0010, gz], [0, beta, 0]);
add('gate_post_l', new THREE.CylinderGeometry(0.0036, 0.0044, postH + 0.0030, 28), mat.stone,
  [gx + ax, gy + postH / 2 - 0.0015, gz + az]);
add('gate_post_r', new THREE.CylinderGeometry(0.0036, 0.0044, postH + 0.0030, 28), mat.stone,
  [gx - ax, gy + postH / 2 - 0.0015, gz - az]);
add('gate_keystone', new THREE.SphereGeometry(0.0044, 26, 18), mat.terracotta,
  [gx, gy + postH + span - 0.0022, gz], [0, 0, 0], [1, 0.82, 1]);

/* a lantern beside the gate — dark by day, lit at dusk */
const [lx, lz] = pol(0.0400, pathEnd + 0.30);
const ly = surfaceY(Math.hypot(lx, lz));
add('lantern_post', new THREE.CylinderGeometry(0.0013, 0.0018, 0.0160, 18), mat.basalt,
  [lx, ly + 0.0075, lz]);
add('lantern_arm', new THREE.TorusGeometry(0.0030, 0.0009, 10, 20, Math.PI / 2), mat.basalt,
  [lx, ly + 0.0154, lz], [Math.PI / 2, 0, 0], [1, 1, 1]);
add('lantern_glass', new THREE.SphereGeometry(0.0034, 24, 16), mat.glow,
  [lx + 0.0030, ly + 0.0140, lz], [0, 0, 0], [1, 1.15, 1]);

/* ---- pond + waterfall off the front rim -------------------------------- */
const wa = 0.86;
const [px, pz] = pol(0.0360, wa);
add('pond_rim', new THREE.TorusGeometry(0.0108, 0.0022, 16, 48), mat.grass,
  at(px, pz), [-Math.PI / 2 + 0.17, -wa, 0], [1, 0.7, 1]);
add('pond', new THREE.CylinderGeometry(0.0106, 0.0106, 0.0030, 48), mat.water,
  [px, surfaceY(0.036) - 0.0006, pz], [0, -wa, -0.17]);

const fall = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.0330, 0.1176, 0), new THREE.Vector3(0.0440, 0.1166, 0),
  new THREE.Vector3(0.0530, 0.1128, 0), new THREE.Vector3(0.0590, 0.1082, 0),
  new THREE.Vector3(0.0630, 0.0990, 0), new THREE.Vector3(0.0640, 0.0860, 0),
  new THREE.Vector3(0.0615, 0.0720, 0), new THREE.Vector3(0.0575, 0.0615, 0),
]);
add('waterfall', new THREE.TubeGeometry(fall, 48, 0.0028, 20, false), mat.water,
  [0, 0, 0], [0, -wa, 0], [1, 1, 1.7]);
const droplets = [
  [0.0555, 0.0535, 0.0030, 0.0028], [0.0520, 0.0450, -0.0045, 0.0022],
  [0.0575, 0.0395, 0.0060, 0.0018], [0.0500, 0.0330, 0.0010, 0.0014],
].map(([r, y, side, size], i) => {
  const [dx, dz] = pol(r, wa);
  const [ox, oz] = pol(side, wa + Math.PI / 2);
  const m = add(`droplet_${i + 1}`, new THREE.SphereGeometry(size, 16, 12), mat.water, [dx + ox, y, dz + oz]);
  return { m, baseY: y, span: 0.006 + i * 0.002, phase: i * 1.3 };
});

/* ---- ground cover ------------------------------------------------------ */
add('bush_a', canopy, mat.grass, at(-0.0395, -0.0245), [0, 0, 0], [0.0098, 0.0076, 0.0092]);
add('bush_b', canopy, mat.grass, at(0.0060, 0.0430), [0, 0, 0], [0.0078, 0.0060, 0.0074]);
add('bush_c', canopy, mat.grass, at(-0.0300, -0.0330), [0, 0, 0], [0.0064, 0.0050, 0.0062]);
add('bush_d', canopy, mat.grass, at(-0.0420, 0.0170), [0, 0, 0], [0.0058, 0.0046, 0.0056]);
add('rock_a', boulder, mat.stone, at(0.0440, -0.0040), [0, 0, 0], [0.0080, 0.0058, 0.0076]);
add('rock_b', boulder, mat.stone, at(-0.0300, 0.0330), [0, 0, 0], [0.0056, 0.0044, 0.0054]);

const mushroom = (name, x, z, s) => {
  const [mx, my, mz] = at(x, z);
  add(`${name}_stem`, new THREE.CylinderGeometry(0.0022 * s, 0.0026 * s, 0.0080 * s, 24), mat.cream,
    [mx, my + 0.0034 * s, mz]);
  add(`${name}_cap`, new THREE.SphereGeometry(0.0058 * s, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat.terracotta,
    [mx, my + 0.0070 * s, mz]);
};
mushroom('mushroom_a', 0.0030, -0.0330, 1.05);
mushroom('mushroom_b', 0.0135, -0.0375, 0.9);

/* ---- the walker: a small figure pacing the path ------------------------ */
const walker = new THREE.Group();
walker.name = 'walker';
hover.add(walker);
const wAdd = (name, geo, material, pos, scale = [1, 1, 1]) =>
  add(name, geo, material, pos, [0, 0, 0], scale, walker);
wAdd('walker_body', new THREE.CapsuleGeometry(0.0038, 0.0058, 8, 24), mat.terracotta, [0, 0.0062, 0]);
wAdd('walker_head', new THREE.SphereGeometry(0.0036, 28, 20), mat.cream, [0, 0.0134, 0]);
wAdd('walker_hood', new THREE.SphereGeometry(0.0040, 28, 20, 0, Math.PI * 2, 0, Math.PI / 1.7), mat.grass, [0, 0.0140, -0.0004]);
wAdd('walker_pack', new THREE.SphereGeometry(0.0030, 20, 16), mat.cream, [0, 0.0082, -0.0044], [1, 0.9, 0.8]);
wAdd('walker_foot_l', new THREE.SphereGeometry(0.0020, 16, 12), mat.basalt, [-0.0022, 0.0016, 0.0008], [1, 0.7, 1.3]);
wAdd('walker_foot_r', new THREE.SphereGeometry(0.0020, 16, 12), mat.basalt, [0.0022, 0.0016, 0.0008], [1, 0.7, 1.3]);

/* ---- clouds drifting past (added after framing, so they don't shrink it) */
const sky = new THREE.Group();
sky.name = 'clouds';
const cloud = (name, r, ang, y, s) => {
  const g = new THREE.Group();
  g.name = name;
  const puff = new THREE.SphereGeometry(1, 24, 16);
  [[0, 0, 0, 1], [0.014, -0.001, 0.002, 0.72], [-0.013, -0.002, -0.003, 0.66], [0.004, 0.006, -0.002, 0.6]]
    .forEach(([dx, dy, dz, k], i) => {
      const m = new THREE.Mesh(puff, mat.cloud);
      m.name = `${name}_puff_${i + 1}`;
      m.position.set(dx * s, dy * s, dz * s);
      m.scale.set(0.0115 * s * k, 0.0072 * s * k, 0.0105 * s * k);
      g.add(m);
    });
  const [gxx, gzz] = pol(r, ang);
  g.position.set(gxx, y, gzz);
  g.rotation.y = -ang;
  sky.add(g);
};
cloud('cloud_1', 0.110, 0.5, 0.0980, 1.45);
cloud('cloud_2', 0.122, 2.5, 0.0760, 1.10);
cloud('cloud_3', 0.104, 4.1, 0.1180, 0.85);
cloud('cloud_4', 0.118, 5.4, 0.0880, 1.25);

/* ---- day / dusk -------------------------------------------------------- */
const lights = stage._scene.children.filter((o) => o.isLight);
const hemi = lights.find((l) => l.isHemisphereLight);
const key = stage._key;
const fill = lights.find((l) => l.isDirectionalLight && l !== key);

const hearth = new THREE.PointLight(0xffb066, 0, 0.09, 2);
hearth.name = 'hearth_light';
hearth.position.set(cx, cy + 0.012, cz);
hover.add(hearth);
const lampLight = new THREE.PointLight(0xffc27a, 0, 0.06, 2);
lampLight.name = 'lantern_light';
lampLight.position.set(lx + 0.0030, ly + 0.0140, lz);
hover.add(lampLight);

const THEMES = {
  day: {
    bg: '#f5ead8',
    note: 'rgba(26, 25, 21, 0.55)',
    hemi: [0xffffff, 0xd8d2c4, 1.0],
    key: [0xffffff, 2.2, [4, 7, 5]],
    fill: [0xfff4e6, 0.5],
    shadow: 0.18,
    emissive: 0x000000, emissiveI: 0,
    glowColor: 0x4a3f33,
    point: 0,
    water: 0xe6ecda,
  },
  dusk: {
    bg: '#2e2b25',
    note: 'rgba(245, 234, 216, 0.6)',
    hemi: [0x5a6b86, 0x2a2320, 0.55],
    key: [0xffb37a, 1.15, [-5, 3.2, 2]],
    fill: [0x6e7fa8, 0.35],
    shadow: 0.1,
    emissive: 0xffb45e, emissiveI: 1.6,
    glowColor: 0xffd9a0,
    point: 0.055,
    water: 0xc9d4c6,
  },
};

function applyTheme(nameRaw) {
  const name = THEMES[nameRaw] ? nameRaw : 'day';
  const t = THEMES[name];
  if (!bgOverride) stage.style.setProperty('--stage-bg', t.bg);
  stage.style.setProperty('--stage-note-color', t.note);
  if (hemi) { hemi.color.setHex(t.hemi[0]); hemi.groundColor.setHex(t.hemi[1]); hemi.intensity = t.hemi[2]; }
  if (key) { key.color.setHex(t.key[0]); key.intensity = t.key[1]; key.position.set(...t.key[2]); }
  if (fill) { fill.color.setHex(t.fill[0]); fill.intensity = t.fill[1]; }
  if (stage._ground) stage._ground.material.opacity = t.shadow;
  mat.glow.color.setHex(t.glowColor);
  mat.glow.emissive.setHex(t.emissive);
  mat.glow.emissiveIntensity = t.emissiveI;
  mat.water.color.setHex(t.water);
  hearth.intensity = t.point;
  lampLight.intensity = t.point * 0.8;
  document.documentElement.dataset.islandTime = name;
  window.dispatchEvent(new CustomEvent('island:time', { detail: name }));
  return name;
}
window.setIslandTime = applyTheme;

/* ---- go ---------------------------------------------------------------- */
const LIFT = 0.030;
hover.position.y = LIFT;
stage.setObject(root);
root.add(sky);                             // after framing: clouds stay out of the fit
sky.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });

const startTime = params.get('time') || localStorage.getItem('island-time') || 'day';
applyTheme(startTime);

// prefers-reduced-motion: draw the scene once and leave it still (no bobbing, drifting clouds or pacing wanderer).
// The portfolio shows a still picture in that case; the page itself should be as calm.
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const t0 = performance.now();
(function frame() {
  const t = calm ? 3.2 : (performance.now() - t0) / 1000;
  hover.position.y = LIFT + Math.sin(t * 0.8) * 0.0022;
  hover.rotation.y = Math.sin(t * 0.35) * 0.02;

  for (const d of drifters) {
    d.m.position.y = d.baseY + Math.sin(t * 1.1 + d.phase) * 0.0018;
    d.m.rotation.y += 0.004;
  }
  for (const d of droplets) {
    const k = ((t * 0.55 + d.phase) % 1);
    d.m.position.y = d.baseY - k * d.span;
    d.m.scale.setScalar(1 - k * 0.45);
  }
  sky.rotation.y = t * 0.035;
  pennant.rotation.z = Math.sin(t * 2.4) * 0.12;

  /* walker paces between the gate and the cottage door */
  const tripT = 9.0;
  const u = (t % (tripT * 2)) / tripT;
  const back = u > 1;
  const k = back ? 2 - u : u;
  const ease = k * k * (3 - 2 * k);
  const ang = pathEnd + 0.10 + (pathSweep - 0.22) * ease;
  const [wx, wz] = pol(pathR, ang);
  walker.position.set(wx, surfaceY(pathR) + Math.abs(Math.sin(t * 7)) * 0.0009, wz);
  walker.rotation.y = -ang + (back ? Math.PI : 0);
  walker.rotation.z = Math.sin(t * 7) * 0.05;

  if (!calm) requestAnimationFrame(frame);
})();
