import * as THREE from 'three';

/* The diorama is built in tiny units (the island is ~12 cm across). The game keeps those
   numbers so the shapes stay identical, and scales each island up by S into metres. */
export const S = 200;

export const mat = {
  grass: new THREE.MeshStandardMaterial({ name: 'grass', color: 0x7a8a5e, roughness: 0.72, metalness: 0.0 }),
  stone: new THREE.MeshStandardMaterial({ name: 'stone', color: 0xb39c7e, roughness: 0.88, metalness: 0.0 }),
  basalt: new THREE.MeshStandardMaterial({ name: 'basalt', color: 0x3b332b, roughness: 0.66, metalness: 0.12 }),
  cream: new THREE.MeshStandardMaterial({ name: 'cream', color: 0xf2e6d2, roughness: 0.58, metalness: 0.0 }),
  terracotta: new THREE.MeshStandardMaterial({ name: 'terracotta', color: 0xc67139, roughness: 0.6, metalness: 0.0 }),
  water: new THREE.MeshStandardMaterial({ name: 'water', color: 0xe6ecda, roughness: 0.22, metalness: 0.05 }),
  glow: new THREE.MeshStandardMaterial({ name: 'glow', color: 0x4a3f33, roughness: 0.4, emissive: 0x000000 }),
  cloud: new THREE.MeshStandardMaterial({ name: 'cloud', color: 0xfbf4e8, roughness: 1.0, metalness: 0.0 }),
  spark: new THREE.MeshStandardMaterial({ name: 'spark', color: 0xffe1d0, emissive: 0xf6a06b, emissiveIntensity: 1.4, roughness: 0.3 }),
};

const V = (x, y) => new THREE.Vector2(x, y);
const lathe = (pts, seg = 64) => new THREE.LatheGeometry(pts, seg);
const pol = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
const boulder = new THREE.SphereGeometry(1, 28, 20);
const canopy = new THREE.SphereGeometry(1, 32, 22);

function adder(parent) {
  return (name, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], into = parent) => {
    const m = new THREE.Mesh(geo, material);
    m.name = name;
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
    into.add(m);
    return m;
  };
}

/** Height of a lathe profile's top surface at radius r (the points up to the widest one). */
function topOf(profile) {
  let widest = 0;
  profile.forEach((p, i) => { if (p.x > profile[widest].x) widest = i; });
  const top = profile.slice(0, widest + 1);
  const fn = (r) => {
    for (let i = 0; i < top.length - 1; i++) {
      const a = top[i], b = top[i + 1];
      if (r >= a.x && r <= b.x) return a.y + (b.y - a.y) * ((r - a.x) / (b.x - a.x));
    }
    return top[top.length - 1].y;
  };
  return { fn, maxR: top[top.length - 1].x };
}

/**
 * A walkable thing: an island or a stepping stone. The game asks it for the ground height
 * under a point; colliders are round obstacles in world x/z (houses, trees, posts).
 */
function walkable({ name, label, group, x, z, baseY, profile, bob = 0.0022, phase = 0 }) {
  const { fn, maxR } = topOf(profile);
  group.position.set(x, baseY, z);
  group.scale.setScalar(S);
  return {
    name, label, group, x, z, baseY, bob, phase,
    maxR: maxR * S,
    colliders: [],
    enabled: true,
    /** World height of the top surface at world (px, pz), or null when off this walkable. */
    groundAt(px, pz, margin = 0.25) {
      if (!this.enabled) return null;
      const r = Math.hypot(px - this.x, pz - this.z);
      if (r > this.maxR + margin) return null;
      return this.group.position.y + fn(Math.min(r, this.maxR) / S) * S;
    },
    update(t, calm) {
      this.group.position.y = this.baseY + (calm ? 0 : Math.sin(t * 0.8 + this.phase) * this.bob * S);
    },
  };
}

/* ======================================================================= */
/* Island 1: Home — the diorama island, same shapes and coordinates.        */
/* ======================================================================= */
function buildHome() {
  const g = new THREE.Group();
  g.name = 'home_island';
  const add = adder(g);

  const grassProfile = [
    V(0.0000, 0.1200), V(0.0180, 0.1197), V(0.0320, 0.1188), V(0.0440, 0.1168),
    V(0.0520, 0.1138), V(0.0578, 0.1086), V(0.0592, 0.1024), V(0.0560, 0.0988),
    V(0.0400, 0.0972), V(0.0200, 0.0966), V(0.0000, 0.0964),
  ];
  add('grass_cap', lathe(grassProfile), mat.grass);
  const surf = topOf(grassProfile).fn;
  const at = (x, z) => [x, surf(Math.hypot(x, z)), z];

  add('rock_mass', lathe([
    V(0.0000, 0.1010), V(0.0300, 0.1000), V(0.0500, 0.0978), V(0.0586, 0.0930),
    V(0.0548, 0.0876), V(0.0455, 0.0848), V(0.0500, 0.0796), V(0.0400, 0.0736),
    V(0.0446, 0.0682), V(0.0330, 0.0604), V(0.0286, 0.0512), V(0.0200, 0.0424),
    V(0.0128, 0.0344), V(0.0072, 0.0284), V(0.0030, 0.0248), V(0.0000, 0.0236),
  ]), mat.stone);
  [
    ['shelf_a', [0.0300, 0.0856, 0.0225], [0.0175, 0.0062, 0.0150], [0, 0.4, 0.14]],
    ['shelf_b', [-0.0270, 0.0788, -0.0270], [0.0185, 0.0070, 0.0160], [0.06, -0.5, -0.12]],
    ['shelf_c', [0.0085, 0.0668, -0.0330], [0.0140, 0.0054, 0.0125], [0, 0.2, 0.18]],
    ['shelf_d', [-0.0190, 0.0545, 0.0150], [0.0105, 0.0044, 0.0095], [0, 0.8, -0.16]],
  ].forEach(([name, p, s, r]) => add(name, boulder, mat.stone, p, r, s));
  const drifters = [
    [[0.0230, 0.0170, 0.0140], [0.0068, 0.0056, 0.0062], 0.0],
    [[-0.0270, 0.0260, -0.0080], [0.0052, 0.0044, 0.0050], 1.7],
    [[0.0060, 0.0080, -0.0290], [0.0040, 0.0034, 0.0038], 3.1],
    [[-0.0130, 0.0400, 0.0330], [0.0058, 0.0046, 0.0054], 4.4],
  ].map(([p, s, phase], i) => ({ m: add(`drift_${i}`, boulder, mat.stone, p, [phase * 0.3, phase, 0], s), baseY: p[1], phase }));

  /* cottage */
  const cx = -0.0205, cz = 0.0110;
  const cy = surf(Math.hypot(cx, cz));
  add('cottage_walls', new THREE.CylinderGeometry(0.0152, 0.0158, 0.0200, 48), mat.cream, [cx, cy + 0.0086, cz]);
  add('cottage_roof', new THREE.ConeGeometry(0.0214, 0.0155, 48), mat.terracotta, [cx, cy + 0.0263, cz]);
  add('roof_finial', new THREE.SphereGeometry(0.0030, 20, 14), mat.basalt, [cx, cy + 0.0348, cz]);
  add('chimney', new THREE.CylinderGeometry(0.0034, 0.0038, 0.0140, 24), mat.stone,
    [cx + 0.0105, cy + 0.0268, cz + 0.0050], [0.16, 0, -0.16]);
  add('flag_pole', new THREE.CylinderGeometry(0.0007, 0.0007, 0.0170, 10), mat.basalt, [cx, cy + 0.0430, cz]);
  const pennantShape = new THREE.Shape();
  pennantShape.moveTo(0, 0); pennantShape.lineTo(0.0115, 0.0022); pennantShape.lineTo(0, 0.0050); pennantShape.closePath();
  const pennant = add('pennant', new THREE.ExtrudeGeometry(pennantShape, { depth: 0.0006, bevelEnabled: false }),
    mat.terracotta, [cx, cy + 0.0458, cz], [0, 0.6, 0]);
  const faceAngle = Math.atan2(cz, cx);
  const fd = [Math.cos(faceAngle), Math.sin(faceAngle)];
  add('door', new THREE.CylinderGeometry(0.0048, 0.0048, 0.0024, 32), mat.basalt,
    [cx + fd[0] * 0.0146, cy + 0.0062, cz + fd[1] * 0.0146], [Math.PI / 2, 0, -faceAngle + Math.PI / 2]);
  add('window_a', new THREE.CylinderGeometry(0.0030, 0.0030, 0.0024, 24), mat.glow,
    [cx - fd[1] * 0.0142 + fd[0] * 0.0040, cy + 0.0118, cz + fd[0] * 0.0142 + fd[1] * 0.0040], [Math.PI / 2, 0, -faceAngle]);
  add('window_b', new THREE.CylinderGeometry(0.0030, 0.0030, 0.0024, 24), mat.glow,
    [cx + fd[1] * 0.0142 - fd[0] * 0.0040, cy + 0.0118, cz - fd[0] * 0.0142 - fd[1] * 0.0040], [Math.PI / 2, 0, -faceAngle]);

  /* tree */
  const tx = 0.0270, tz = -0.0150;
  const ty = surf(Math.hypot(tx, tz));
  add('tree_trunk', new THREE.CylinderGeometry(0.0034, 0.0058, 0.0230, 24), mat.basalt, [tx, ty + 0.0100, tz], [0, 0, -0.06]);
  add('tree_canopy_main', canopy, mat.grass, [tx - 0.0010, ty + 0.0300, tz], [0, 0, 0], [0.0150, 0.0128, 0.0146]);
  add('tree_canopy_left', canopy, mat.grass, [tx - 0.0115, ty + 0.0250, tz + 0.0035], [0, 0, 0], [0.0098, 0.0086, 0.0094]);
  add('tree_canopy_right', canopy, mat.grass, [tx + 0.0100, ty + 0.0262, tz - 0.0045], [0, 0, 0], [0.0090, 0.0080, 0.0088]);
  const blossom = new THREE.SphereGeometry(0.0027, 16, 12);
  [[tx - 0.0030, ty + 0.0408, tz + 0.0040], [tx + 0.0112, ty + 0.0330, tz + 0.0050],
    [tx - 0.0152, ty + 0.0288, tz - 0.0030], [tx + 0.0040, ty + 0.0350, tz - 0.0120],
  ].forEach((p, i) => add(`blossom_${i}`, blossom, mat.cream, p));

  /* path and gate */
  const pathEnd = -1.25, pathR = 0.0340;
  const pathSweep = faceAngle - pathEnd;
  add('path', new THREE.TorusGeometry(pathR, 0.0042, 14, 96, pathSweep), mat.terracotta,
    [0, surf(pathR) - 0.0014, 0], [-Math.PI / 2, 0, -faceAngle], [1, 0.48, 1]);
  const [gx, gz] = pol(0.0450, pathEnd);
  const gy = surf(Math.hypot(gx, gz));
  const beta = -pathEnd - Math.PI / 2;
  const span = 0.0120, postH = 0.0120;
  const ax = Math.cos(beta) * span, az = -Math.sin(beta) * span;
  add('gate_arch', new THREE.TorusGeometry(span, 0.0034, 16, 40, Math.PI), mat.stone, [gx, gy + postH - 0.0010, gz], [0, beta, 0]);
  add('gate_post_l', new THREE.CylinderGeometry(0.0036, 0.0044, postH + 0.0030, 24), mat.stone, [gx + ax, gy + postH / 2 - 0.0015, gz + az]);
  add('gate_post_r', new THREE.CylinderGeometry(0.0036, 0.0044, postH + 0.0030, 24), mat.stone, [gx - ax, gy + postH / 2 - 0.0015, gz - az]);
  add('gate_keystone', new THREE.SphereGeometry(0.0044, 22, 16), mat.terracotta, [gx, gy + postH + span - 0.0022, gz], [0, 0, 0], [1, 0.82, 1]);

  /* the spark: what wakes the gate */
  const spark = add('spark', new THREE.SphereGeometry(0.0024, 20, 14), mat.spark, [gx, gy + 0.0080, gz]);
  spark.castShadow = false;
  const sparkLight = new THREE.PointLight(0xffb066, 15, 0.05 * S, 2);
  sparkLight.position.copy(spark.position);
  g.add(sparkLight);

  /* lantern */
  const [lx, lz] = pol(0.0400, pathEnd + 0.30);
  const ly = surf(Math.hypot(lx, lz));
  add('lantern_post', new THREE.CylinderGeometry(0.0013, 0.0018, 0.0160, 12), mat.basalt, [lx, ly + 0.0075, lz]);
  add('lantern_glass', new THREE.SphereGeometry(0.0034, 20, 14), mat.glow, [lx + 0.0030, ly + 0.0140, lz], [0, 0, 0], [1, 1.15, 1]);

  /* pond and waterfall */
  const wa = 0.86;
  const [px, pz] = pol(0.0360, wa);
  add('pond_rim', new THREE.TorusGeometry(0.0108, 0.0022, 14, 48), mat.grass, at(px, pz), [-Math.PI / 2 + 0.17, -wa, 0], [1, 0.7, 1]);
  add('pond', new THREE.CylinderGeometry(0.0106, 0.0106, 0.0030, 48), mat.water, [px, surf(0.036) - 0.0006, pz], [0, -wa, -0.17]);
  const fall = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0330, 0.1176, 0), new THREE.Vector3(0.0440, 0.1166, 0),
    new THREE.Vector3(0.0530, 0.1128, 0), new THREE.Vector3(0.0590, 0.1082, 0),
    new THREE.Vector3(0.0630, 0.0990, 0), new THREE.Vector3(0.0640, 0.0860, 0),
    new THREE.Vector3(0.0615, 0.0720, 0), new THREE.Vector3(0.0575, 0.0615, 0),
  ]);
  add('waterfall', new THREE.TubeGeometry(fall, 40, 0.0028, 16, false), mat.water, [0, 0, 0], [0, -wa, 0], [1, 1, 1.7]);

  /* ground cover */
  add('bush_a', canopy, mat.grass, at(-0.0395, -0.0245), [0, 0, 0], [0.0098, 0.0076, 0.0092]);
  add('bush_b', canopy, mat.grass, at(0.0060, 0.0430), [0, 0, 0], [0.0078, 0.0060, 0.0074]);
  add('bush_c', canopy, mat.grass, at(-0.0300, -0.0330), [0, 0, 0], [0.0064, 0.0050, 0.0062]);
  add('rock_a', boulder, mat.stone, at(0.0440, -0.0040), [0, 0, 0], [0.0080, 0.0058, 0.0076]);
  add('rock_b', boulder, mat.stone, at(-0.0300, 0.0330), [0, 0, 0], [0.0056, 0.0044, 0.0054]);
  const mushroom = (name, x, z, s) => {
    const [mx, my, mz] = at(x, z);
    add(`${name}_stem`, new THREE.CylinderGeometry(0.0022 * s, 0.0026 * s, 0.0080 * s, 16), mat.cream, [mx, my + 0.0034 * s, mz]);
    add(`${name}_cap`, new THREE.SphereGeometry(0.0058 * s, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat.terracotta, [mx, my + 0.0070 * s, mz]);
  };
  mushroom('mushroom_a', 0.0030, -0.0330, 1.05);
  mushroom('mushroom_b', 0.0135, -0.0375, 0.9);

  const hearth = new THREE.PointLight(0xffb066, 0, 0.09 * S, 2);
  hearth.position.set(cx, cy + 0.012, cz);
  g.add(hearth);
  const lamp = new THREE.PointLight(0xffc27a, 0, 0.06 * S, 2);
  lamp.position.set(lx + 0.0030, ly + 0.0140, lz);
  g.add(lamp);

  const island = walkable({ name: 'home', label: 'Home', group: g, x: 0, z: 0, baseY: 0, profile: grassProfile });
  const w = (x, z, r) => ({ x: x * S, z: z * S, r: r * S });
  island.colliders.push(
    w(cx, cz, 0.0160), w(tx, tz, 0.0050), w(gx + ax, gz + az, 0.0044), w(gx - ax, gz - az, 0.0044),
    w(lx, lz, 0.0018), w(px, pz, 0.0100), w(-0.0395, -0.0245, 0.0090), w(0.0060, 0.0430, 0.0070),
    w(-0.0300, -0.0330, 0.0058), w(0.0440, -0.0040, 0.0074), w(-0.0300, 0.0330, 0.0052),
  );
  island.lights = { hearth, lamp };
  const [spx, spz] = pol(pathR, faceAngle - 0.8);
  island.spawn = { x: spx * S, z: spz * S };
  island.gate = { x: gx * S, z: gz * S, angle: pathEnd, r: 0.0450 * S };
  island.spark = { mesh: spark, light: sparkLight, baseY: spark.position.y };

  const baseUpdate = island.update.bind(island);
  island.update = (t, calm) => {
    baseUpdate(t, calm);
    if (calm) return;
    for (const d of drifters) {
      d.m.position.y = d.baseY + Math.sin(t * 1.1 + d.phase) * 0.0018;
      d.m.rotation.y += 0.004;
    }
    pennant.rotation.z = Math.sin(t * 2.4) * 0.12;
    if (spark.visible) spark.position.y = island.spark.baseY + Math.sin(t * 2.2) * 0.0012;
  };
  return island;
}

/* ======================================================================= */
/* Stepping stones: tiny floating islands that rise when the gate wakes.    */
/* ======================================================================= */
const stoneProfile = [V(0, 0), V(0.0050, -0.0002), V(0.0075, -0.0012), V(0.0079, -0.0028), V(0.0060, -0.0036), V(0, -0.0037)];
const stoneRock = lathe([
  V(0, -0.0020), V(0.0072, -0.0026), V(0.0066, -0.0060), V(0.0042, -0.0100), V(0.0016, -0.0140), V(0, -0.0156),
], 32);
const stoneCap = lathe(stoneProfile, 32);

function buildStones(home, mill) {
  const dirX = Math.cos(home.gate.angle), dirZ = Math.sin(home.gate.angle);
  const homeEdgeY = home.groundAt(home.maxR * dirX, home.maxR * dirZ);
  const millEdgeY = mill.groundAt(mill.x - mill.maxR * dirX, mill.z - mill.maxR * dirZ);
  const first = home.maxR + 1.3;
  const last = Math.hypot(mill.x, mill.z) - mill.maxR - 1.3;
  const n = 6;
  const stones = [];
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const r = first + (last - first) * k;
    const y = homeEdgeY + (millEdgeY - homeEdgeY) * k + Math.sin(Math.PI * k) * 1.0;
    const g = new THREE.Group();
    g.name = `stone_${i}`;
    const add = adder(g);
    add('cap', stoneCap, mat.grass);
    add('rock', stoneRock, mat.stone, [0, 0, 0], [0, i, 0]);
    const s = walkable({ name: `stone_${i}`, label: null, group: g, x: dirX * r, z: dirZ * r, baseY: y, profile: stoneProfile, bob: 0.0012, phase: i * 0.9 });
    s.targetY = y;
    s.baseY = y - 34;
    s.rise = 0;            // 0 = hidden below the clouds, 1 = in place
    s.enabled = false;
    g.visible = false;
    stones.push(s);
  }
  return stones;
}

/* ======================================================================= */
/* Island 2: Windmill — a hill with a mill whose sails wait for the wind.    */
/* ======================================================================= */
function buildMill(x, z, towardHome) {
  const g = new THREE.Group();
  g.name = 'windmill_island';
  const add = adder(g);

  const grassProfile = [
    V(0.0000, 0.1280), V(0.0060, 0.1270), V(0.0140, 0.1200), V(0.0220, 0.1105), V(0.0300, 0.1080),
    V(0.0380, 0.1062), V(0.0430, 0.1040), V(0.0460, 0.0990), V(0.0440, 0.0960), V(0.0300, 0.0950), V(0.0000, 0.0948),
  ];
  add('grass_cap', lathe(grassProfile), mat.grass);
  const surf = topOf(grassProfile).fn;
  const at = (px, pz) => [px, surf(Math.hypot(px, pz)), pz];
  add('rock_mass', lathe([
    V(0.0000, 0.0990), V(0.0300, 0.0985), V(0.0450, 0.0960), V(0.0420, 0.0900), V(0.0360, 0.0870),
    V(0.0390, 0.0820), V(0.0300, 0.0740), V(0.0250, 0.0640), V(0.0160, 0.0540), V(0.0090, 0.0440),
    V(0.0040, 0.0360), V(0.0000, 0.0330),
  ]), mat.stone);
  add('shelf_a', boulder, mat.stone, [0.0250, 0.0830, -0.0180], [0, 0.6, 0.12], [0.0150, 0.0055, 0.0130]);
  add('shelf_b', boulder, mat.stone, [-0.0220, 0.0700, 0.0150], [0, -0.3, -0.1], [0.0120, 0.0048, 0.0110]);

  /* the mill on top, its sails facing the way you came */
  const top = surf(0);
  const face = Math.atan2(towardHome[1], towardHome[0]);
  add('mill_tower', new THREE.CylinderGeometry(0.0058, 0.0088, 0.0270, 32), mat.cream, [0, top + 0.0130, 0]);
  add('mill_band', new THREE.TorusGeometry(0.0072, 0.0010, 10, 32), mat.terracotta, [0, top + 0.0120, 0], [Math.PI / 2, 0, 0]);
  add('mill_cap', new THREE.ConeGeometry(0.0078, 0.0110, 32), mat.terracotta, [0, top + 0.0318, 0]);
  add('mill_door', new THREE.CylinderGeometry(0.0030, 0.0030, 0.0020, 24), mat.basalt,
    [towardHome[0] * 0.0084, top + 0.0040, towardHome[1] * 0.0084], [Math.PI / 2, 0, -face + Math.PI / 2]);
  add('mill_window', new THREE.CylinderGeometry(0.0020, 0.0020, 0.0018, 20), mat.glow,
    [towardHome[0] * 0.0066, top + 0.0170, towardHome[1] * 0.0066], [Math.PI / 2, 0, -face + Math.PI / 2]);

  const sails = new THREE.Group();
  sails.name = 'mill_sails';
  sails.position.set(towardHome[0] * 0.0080, top + 0.0250, towardHome[1] * 0.0080);
  sails.rotation.y = Math.PI / 2 - face;          // local +z points toward home
  g.add(sails);
  add('hub', new THREE.SphereGeometry(0.0022, 16, 12), mat.basalt, [0, 0, 0.0010], [0, 0, 0], [1, 1, 1], sails);
  const spinner = new THREE.Group();
  spinner.position.z = 0.0016;
  sails.add(spinner);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2 + 0.3;
    spinner.add(arm);
    add('spar', new THREE.BoxGeometry(0.0010, 0.0180, 0.0008), mat.basalt, [0, 0.0090, 0], [0, 0, 0], [1, 1, 1], arm);
    add('blade', new THREE.BoxGeometry(0.0046, 0.0120, 0.0005), mat.cream, [0.0026, 0.0114, 0.0003], [0, 0, 0], [1, 1, 1], arm);
  }

  /* a path of terracotta stones from the landing up to the door */
  for (let i = 0; i < 6; i++) {
    const r = 0.0400 - i * 0.0052;
    const wob = Math.sin(i * 1.7) * 0.0030;
    const px = towardHome[0] * r - towardHome[1] * wob, pz = towardHome[1] * r + towardHome[0] * wob;
    add(`path_${i}`, boulder, mat.terracotta, at(px, pz), [0, i, 0], [0.0040, 0.0013, 0.0036]);
  }
  const side = [-towardHome[1], towardHome[0]];
  const bushes = [[0.024, 0.016, 0.0080], [-0.026, -0.010, 0.0070], [0.010, -0.030, 0.0062], [-0.030, 0.020, 0.0056]];
  bushes.forEach(([bx, bz, s], i) => add(`bush_${i}`, canopy, mat.grass, at(bx, bz), [0, 0, 0], [s, s * 0.78, s * 0.94]));
  add('rock_a', boulder, mat.stone, at(side[0] * 0.032, side[1] * 0.032), [0, 0, 0], [0.0070, 0.0050, 0.0066]);
  const fl = new THREE.SphereGeometry(0.0016, 12, 8);
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7 + 2.2, r = 0.020 + (i % 3) * 0.004;
    add(`flower_${i}`, fl, i % 2 ? mat.cream : mat.terracotta, at(Math.cos(a) * r, Math.sin(a) * r));
  }

  const island = walkable({ name: 'mill', label: 'Windmill Island', group: g, x, z, baseY: 1.4, profile: grassProfile, phase: 1.9 });
  island.colliders.push({ x, z, r: 0.0092 * S });
  bushes.forEach(([bx, bz, s]) => island.colliders.push({ x: x + bx * S, z: z + bz * S, r: s * 0.9 * S }));
  island.colliders.push({ x: x + side[0] * 0.032 * S, z: z + side[1] * 0.032 * S, r: 0.0066 * S });
  island.top = { x, z };
  island.wind = 0;          // 0 = still; eases to 1 once you reach the top
  const baseUpdate = island.update.bind(island);
  island.update = (t, calm, dt) => {
    baseUpdate(t, calm);
    spinner.rotation.z -= dt * island.wind * (calm ? 0.6 : 2.2);
  };
  return island;
}

/* ======================================================================= */
/* Sky: drifting clouds at island height and a sea of clouds far below.     */
/* ======================================================================= */
function buildSky() {
  const sky = new THREE.Group();
  sky.name = 'sky';
  const puff = new THREE.SphereGeometry(1, 18, 12);
  const drift = new THREE.Group();
  sky.add(drift);
  const shape = [[0, 0, 0, 1], [2.8, -0.2, 0.4, 0.72], [-2.6, -0.4, -0.6, 0.66], [0.8, 1.2, -0.4, 0.6]];
  [[34, 0.5, 30, 1.4], [40, 2.4, 22, 1.1], [30, 4.0, 34, 0.9], [46, 5.2, 26, 1.3], [58, 1.4, 28, 1.2], [52, 3.3, 18, 1.0]]
    .forEach(([r, a, y, s]) => {
      const c = new THREE.Group();
      shape.forEach(([dx, dy, dz, k]) => {
        const m = new THREE.Mesh(puff, mat.cloud);
        m.position.set(dx * s, dy * s, dz * s);
        m.scale.set(2.3 * s * k, 1.45 * s * k, 2.1 * s * k);
        c.add(m);
      });
      c.position.set(Math.cos(a) * r + 6, y, Math.sin(a) * r - 18);
      drift.add(c);
    });

  const n = 140;
  const sea = new THREE.InstancedMesh(puff, mat.cloud, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, r = 8 + Math.sqrt(rnd()) * 110;
    p.set(Math.cos(a) * r + 6, -14 + rnd() * 6, Math.sin(a) * r - 18);
    const s = 4 + rnd() * 7;
    sc.set(s * 1.4, s * 0.55, s * 1.2);
    m4.compose(p, q, sc);
    sea.setMatrixAt(i, m4);
  }
  sky.add(sea);
  return { group: sky, update(t, calm) { if (!calm) drift.rotation.y = Math.sin(t * 0.02) * 0.12; } };
}

/* ======================================================================= */
export function buildWorld(scene) {
  const home = buildHome();
  const dirX = Math.cos(home.gate.angle), dirZ = Math.sin(home.gate.angle);
  const millDist = 40;
  const mill = buildMill(dirX * millDist, dirZ * millDist, [-dirX, -dirZ]);
  const stones = buildStones(home, mill);
  const sky = buildSky();
  scene.add(home.group, mill.group, sky.group, ...stones.map((s) => s.group));
  return { home, mill, stones, sky, walkables: [home, mill, ...stones] };
}
