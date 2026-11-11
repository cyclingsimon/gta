// Spass-Objekte: Leitkegel bei Baustellen und Abfalleimer an Haltestellen fliegen «Boing!» weg,
// 40 Luksi-Herzen verstecken sich in Stadt, Kriens und Horw (Sammeln, Spielstand bleibt).
import * as THREE from 'three';
import type { Terrain } from './terrain';
import { toon, steamship } from './world';

export interface FunPlayer { x: number; z: number; heading: number; speed: number }
interface Hop { x: number; z: number; h: number; x0: number; z0: number; h0: number; y: number; vx: number; vz: number; vy: number; spin: number; spinV: number; t: number; r: number; kind: 0 | 1 }

function hash(x: number, z: number) { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }

export class Fun {
  group = new THREE.Group();
  hops: Hop[] = [];
  private cone: THREE.InstancedMesh; private bin: THREE.InstancedMesh;
  private hearts: { id: number; x: number; z: number; y: number; mesh: THREE.Mesh; got: boolean }[] = [];
  private stars: THREE.InstancedMesh; private st: { x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number }[] = []; private stI = 0;
  private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private v = new THREE.Vector3(); private s = new THREE.Vector3();
  stats = { boings: 0 };

  constructor(private terrain: Terrain, sites: number[][], stops: number[][], heartSpots: number[][], got: number[],
    private onBoing: (x: number, z: number) => void, private onHeart: (n: number, total: number, first: boolean) => void) {
    this.group.name = 'fun';
    // Leitkegel: je Baustelle eine Reihe von 5 Kegeln am Strassenrand
    for (const [x, z, h] of sites) for (let k = 0; k < 5; k++) {
      const px = x + Math.sin(h) * k * 2.2, pz = z + Math.cos(h) * k * 2.2;
      this.hops.push(this.mk(px, pz, h, 0.7, 0));
    }
    for (const [x, z] of stops) this.hops.push(this.mk(x, z, hash(x, z) * 6, 0.6, 1));
    const coneG = new THREE.ConeGeometry(0.32, 0.8, 8); coneG.translate(0, 0.4, 0);
    const binG = new THREE.CylinderGeometry(0.28, 0.24, 0.85, 8); binG.translate(0, 0.43, 0);
    const nC = this.hops.filter((o) => o.kind === 0).length, nB = this.hops.length - nC;
    this.cone = new THREE.InstancedMesh(coneG, toon('#FF7A1A'), Math.max(1, nC)); this.cone.count = nC;
    this.bin = new THREE.InstancedMesh(binG, toon('#3C7D3A'), Math.max(1, nB)); this.bin.count = nB;
    for (const im of [this.cone, this.bin]) { im.frustumCulled = false; this.group.add(im); }
    const sg = new THREE.OctahedronGeometry(0.28, 0);
    this.stars = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: '#FFD447' }), 48); this.stars.frustumCulled = false; this.group.add(this.stars);
    for (let i = 0; i < 48; i++) this.st.push({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, t: 0 });
    // Herzen
    const hs = new THREE.Shape(); hs.moveTo(0, -1); hs.bezierCurveTo(-1.6, 0.1, -1.1, 1.3, 0, 0.6); hs.bezierCurveTo(1.1, 1.3, 1.6, 0.1, 0, -1);
    const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.35, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2, curveSegments: 8 }); hg.center();
    const hm = new THREE.MeshBasicMaterial({ color: '#E2001A' });
    heartSpots.forEach(([x, z], id) => {
      const mesh = new THREE.Mesh(hg, hm); mesh.scale.setScalar(1.1);
      const y = terrain.height(x, z) + 2.6; mesh.position.set(x, y, z);
      const got1 = got.includes(id); mesh.visible = !got1; this.group.add(mesh);
      this.hearts.push({ id, x, z, y, mesh, got: got1 });
    });
    this.draw(0);
  }

  open() { return this.hearts.filter((h) => !h.got).map((h) => [h.x, h.z]); }
  /** Wasserspritzer am Ufer */
  splash(x: number, z: number) {
    if (!this.drops) { const g = new THREE.SphereGeometry(0.22, 6, 4); this.drops = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: '#BFE6FF' }), 40); this.drops.frustumCulled = false; this.group.add(this.drops); for (let i = 0; i < 40; i++) this.dr.push({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, t: 0 }); }
    const y = Math.max(0.1, this.terrain.ground(x, z));
    for (let k = 0; k < 14; k++) { const d = this.dr[this.drI++ % 40], a = Math.random() * 6.28, r = 1 + Math.random() * 2.5; Object.assign(d, { x, y, z, vx: Math.cos(a) * r, vy: 4 + Math.random() * 4, vz: Math.sin(a) * r, t: 1.2 }); }
  }
  private drops: THREE.InstancedMesh | null = null; private dr: { x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number }[] = []; private drI = 0;
  get heartCount() { return this.hearts.filter((h) => h.got).length; }
  get heartTotal() { return this.hearts.length; }
  heartsGot() { return this.hearts.filter((h) => h.got).map((h) => h.id); }
  /** nächstes noch nicht gefundenes Herz (für den Tipp im Pausenmenü) */
  nearestHeart(x: number, z: number) { let b: number[] | null = null, bd = 1e9; for (const h of this.hearts) if (!h.got) { const d = Math.hypot(h.x - x, h.z - z); if (d < bd) { bd = d; b = [h.x, h.z]; } } return b; }

  private mk(x: number, z: number, h: number, r: number, kind: 0 | 1): Hop { return { x, z, h, x0: x, z0: z, h0: h, y: 0, vx: 0, vz: 0, vy: 0, spin: 0, spinV: 0, t: 0, r, kind }; }

  private burst(x: number, y: number, z: number, n = 6) {
    for (let k = 0; k < n; k++) { const s = this.st[this.stI++ % 48], a = k / n * Math.PI * 2; Object.assign(s, { x, y, z, vx: Math.cos(a) * 3.5, vy: 2.5 + Math.random() * 3, vz: Math.sin(a) * 3.5, t: 1 }); }
  }

  update(dt: number, pls: FunPlayer[], time: number) {
    for (const o of this.hops) {
      if (o.t > 0) { // fliegt oder liegt
        o.t += dt;
        if (o.y > 0 || o.vy > 0) { o.vy -= 18 * dt; o.x += o.vx * dt; o.z += o.vz * dt; o.y += o.vy * dt; o.spin += o.spinV * dt;
          if (o.y < 0) { o.y = 0; if (o.vy < -3) { o.vy = -o.vy * 0.45; o.vx *= 0.6; o.vz *= 0.6; o.spinV *= 0.6; } else { o.vy = 0; o.vx = 0; o.vz = 0; } } }
        if (o.t > 12 && Math.min(...pls.map((p) => Math.hypot(p.x - o.x0, p.z - o.z0))) > 25) { o.x = o.x0; o.z = o.z0; o.h = o.h0; o.y = 0; o.t = 0; o.spin = 0; } // still zurückstellen
        continue;
      }
      for (const p of pls) {
        if (Math.abs(p.speed) < 1.2) continue;
        const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz); if (d > 2.2 + o.r) continue;
        const fx = Math.sin(p.heading) * Math.sign(p.speed), fz = Math.cos(p.heading) * Math.sign(p.speed), sp = Math.min(Math.abs(p.speed), 25);
        o.t = 0.001; o.vx = (fx * 0.7 + dx / (d || 1) * 0.3) * (3 + sp * 0.8); o.vz = (fz * 0.7 + dz / (d || 1) * 0.3) * (3 + sp * 0.8);
        o.vy = 4 + sp * 0.45; o.spinV = (hash(o.x, time) - 0.5) * 18; o.y = 0.01;
        this.burst(o.x, this.terrain.height(o.x, o.z) + 1, o.z); this.stats.boings++; this.onBoing(o.x, o.z);
        p.speed *= 0.93; break;
      }
    }
    for (const h of this.hearts) {
      if (h.got) continue;
      h.mesh.rotation.y = time * 2 + h.id; h.mesh.position.y = h.y + Math.sin(time * 2.4 + h.id) * 0.35;
      for (const p of pls) if (Math.hypot(p.x - h.x, p.z - h.z) < 4.5) {
        h.got = true; h.mesh.visible = false; this.burst(h.x, h.y, h.z, 12);
        const n = this.heartCount; this.onHeart(n, this.hearts.length, n === 1); break;
      }
    }
    this.draw(dt);
  }

  private draw(dt: number) {
    let ic = 0, ib = 0;
    for (const o of this.hops) {
      const tip = o.t > 0 && o.y === 0 && o.vy === 0 ? Math.PI / 2 : 0; // gelandet = umgekippt
      this.e.set(o.t > 0 ? o.spin * 0.7 + tip : 0, o.h + o.spin, o.t > 0 ? o.spin * 0.4 : 0); this.q.setFromEuler(this.e);
      this.m.compose(this.v.set(o.x, this.terrain.height(o.x, o.z) + o.y + (tip ? 0.3 : 0), o.z), this.q, this.s.set(1, 1, 1));
      if (o.kind === 0) this.cone.setMatrixAt(ic++, this.m); else this.bin.setMatrixAt(ib++, this.m);
    }
    this.cone.instanceMatrix.needsUpdate = true; this.bin.instanceMatrix.needsUpdate = true;
    this.st.forEach((s, i) => { if (s.t > 0) { s.t -= dt; s.vy -= 6 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; }
      const k = s.t > 0 ? Math.min(1, s.t * 2) : 0; this.e.set(0, s.t * 8, 0); this.q.setFromEuler(this.e);
      this.m.compose(this.v.set(s.x, s.y, s.z), this.q, this.s.set(k, k, k)); this.stars.setMatrixAt(i, this.m); });
    this.stars.instanceMatrix.needsUpdate = true;
    if (this.drops) { this.dr.forEach((d, i) => { if (d.t > 0) { d.t -= dt; d.vy -= 14 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; }
      const k = d.t > 0 ? 1 : 0; this.m.compose(this.v.set(d.x, d.y, d.z), this.q.identity(), this.s.set(k, k, k)); this.drops!.setMatrixAt(i, this.m); }); this.drops.instanceMatrix.needsUpdate = true; }
  }
}

// ---------------- Tiere: Schwäne auf See und Reuss, Kühe auf den Weiden ----------------
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
function colored(g: THREE.BufferGeometry, c: string) { const col = new THREE.Color(c), n = g.getAttribute('position').count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.toNonIndexed ? g : g; }
function part(g: THREE.BufferGeometry, c: string, x: number, y: number, z: number, rx = 0) { g = g.index ? g.toNonIndexed() : g; g.rotateX(rx); g.translate(x, y, z); return colored(g, c); }
function swanGeo() {
  return mergeGeometries([
    part(new THREE.SphereGeometry(0.42, 8, 6).scale(1, 0.7, 1.6), '#FAFAF7', 0, 0.25, 0),
    part(new THREE.CylinderGeometry(0.09, 0.12, 0.9, 6), '#FAFAF7', 0, 0.75, 0.42, 0.35),
    part(new THREE.SphereGeometry(0.15, 6, 5), '#FAFAF7', 0, 1.18, 0.6),
    part(new THREE.ConeGeometry(0.07, 0.25, 5), '#F08A24', 0, 1.15, 0.8, Math.PI / 2),
  ])!;
}
function cowGeo() {
  const legs = [[-0.35, -0.6], [0.35, -0.6], [-0.35, 0.6], [0.35, 0.6]].map(([x, z]) => part(new THREE.BoxGeometry(0.18, 0.75, 0.18), '#F4F1EA', x, 0.37, z));
  return mergeGeometries([
    part(new THREE.BoxGeometry(0.9, 0.75, 1.7), '#F4F1EA', 0, 1.1, 0),
    part(new THREE.BoxGeometry(0.92, 0.5, 0.6), '#3A2E28', 0, 1.25, 0.2),     // Fleck
    part(new THREE.BoxGeometry(0.92, 0.4, 0.4), '#3A2E28', 0, 1.0, -0.5),
    part(new THREE.BoxGeometry(0.55, 0.55, 0.6), '#F4F1EA', 0, 1.35, 1.05),   // Kopf
    part(new THREE.BoxGeometry(0.5, 0.25, 0.2), '#F2B8A8', 0, 1.18, 1.38),    // Maul
    part(new THREE.BoxGeometry(0.75, 0.08, 0.1), '#D9C7A0', 0, 1.68, 1.0),    // Hörner
    part(new THREE.BoxGeometry(0.2, 0.2, 0.08), '#E8C33A', 0, 0.98, 1.35),    // Glocke
    ...legs,
  ])!;
}

export interface AnimalPlayer { x: number; z: number; speed: number }
export class Animals {
  group = new THREE.Group();
  private swans: { x: number; z: number; h: number; vx: number; vz: number; flee: number }[] = [];
  private cows: { x: number; z: number; h: number; hop: number; y: number; vy: number }[] = [];
  private sm: THREE.InstancedMesh; private cm: THREE.InstancedMesh;
  private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private v = new THREE.Vector3(); private one = new THREE.Vector3(1, 1, 1);
  constructor(private terrain: Terrain, swanSpots: number[][], cowSpots: number[][], private isWater: (x: number, z: number) => boolean) {
    this.group.name = 'animals';
    for (const [x, z] of swanSpots) this.swans.push({ x, z, h: hash(x, z) * 6.28, vx: 0, vz: 0, flee: 0 });
    for (const [x, z] of cowSpots) this.cows.push({ x, z, h: hash(z, x) * 6.28, hop: 0, y: 0, vy: 0 });
    const mat = toon('#ffffff', { vertexColors: true });
    this.sm = new THREE.InstancedMesh(swanGeo(), mat, Math.max(1, this.swans.length)); this.sm.count = this.swans.length;
    this.cm = new THREE.InstancedMesh(cowGeo(), mat, Math.max(1, this.cows.length)); this.cm.count = this.cows.length;
    for (const im of [this.sm, this.cm]) { im.frustumCulled = false; this.group.add(im); }
    this.drawCows();
  }
  /** Hupe: Kühe in der Nähe hüpfen, gibt Anzahl zurück */
  honk(x: number, z: number) { let n = 0; for (const c of this.cows) if (Math.hypot(c.x - x, c.z - z) < 45 && c.hop <= 0) { c.hop = 1; c.vy = 3.5; n++; } return n; }
  update(dt: number, pls: AnimalPlayer[], time: number) {
    for (const s of this.swans) {
      let fx = 0, fz = 0;
      for (const p of pls) { const dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz); if (d < 18) { fx += dx / (d || 1); fz += dz / (d || 1); s.flee = 1.5; } }
      const wob = time * 0.2 + hash(s.x, 1) * 10;
      const tx = fx * 2.2 + Math.cos(wob) * 0.25, tz = fz * 2.2 + Math.sin(wob) * 0.25;
      s.vx += (tx - s.vx) * Math.min(1, dt * 2); s.vz += (tz - s.vz) * Math.min(1, dt * 2);
      const nx = s.x + s.vx * dt, nz = s.z + s.vz * dt;
      if (this.isWater(nx, nz)) { s.x = nx; s.z = nz; } else { s.vx *= -0.5; s.vz *= -0.5; }
      if (Math.hypot(s.vx, s.vz) > 0.05) { const th = Math.atan2(s.vx, s.vz); let dh = th - s.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI; s.h += dh * Math.min(1, dt * 3); }
      s.flee = Math.max(0, s.flee - dt);
    }
    this.swans.forEach((s, i) => { this.e.set(0, s.h, Math.sin(time * 2 + i) * 0.04); this.q.setFromEuler(this.e); this.m.compose(this.v.set(s.x, Math.max(0.04, this.terrain.ground(s.x, s.z) + 0.06) + Math.sin(time * 1.5 + i) * 0.03, s.z), this.q, this.one); this.sm.setMatrixAt(i, this.m); });
    this.sm.instanceMatrix.needsUpdate = true;
    let moved = false;
    for (const c of this.cows) if (c.hop > 0) { moved = true; c.vy -= 14 * dt; c.y += c.vy * dt; if (c.y <= 0) { c.y = 0; c.vy = 0; c.hop = 0; } }
    if (moved) this.drawCows();
  }
  private drawCows() {
    this.cows.forEach((c, i) => { this.e.set(c.hop > 0 ? -0.25 : 0, c.h, 0); this.q.setFromEuler(this.e); this.m.compose(this.v.set(c.x, this.terrain.ground(c.x, c.z) - 0.05 + c.y, c.z), this.q, this.one); this.cm.setMatrixAt(i, this.m); });
    this.cm.instanceMatrix.needsUpdate = true;
  }
}

// ---------------- Kursschiffe (SGV-Raddampfer) auf Seebecken und Horwer Bucht ----------------
export class Ships {
  group = new THREE.Group();
  private ships: { obj: THREE.Object3D; curve: THREE.CatmullRomCurve3; len: number; s: number; dwell: number; v: number }[] = [];
  constructor(routes: number[][][]) {
    this.group.name = 'ships';
    routes.forEach((r, i) => {
      const curve = new THREE.CatmullRomCurve3(r.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
      const obj = steamship([[-31, -6.5], [31, -6.5], [31, 6.5], [-31, 6.5]]); this.group.add(obj);
      this.ships.push({ obj, curve, len: curve.getLength(), s: i * 0.37 % 1, dwell: 0, v: 5.5 });
    });
    this.update(0);
  }
  /** Hupe in der Nähe: Schiff antwortet (true) */
  honk(x: number, z: number) { return this.ships.some((sh) => Math.hypot(sh.obj.position.x - x, sh.obj.position.z - z) < 220); }
  update(dt: number) {
    const p = new THREE.Vector3(), t = new THREE.Vector3();
    for (const sh of this.ships) {
      if (sh.dwell > 0) sh.dwell -= dt; else { const before = sh.s; sh.s = (sh.s + sh.v * dt / sh.len) % 1; if (before > sh.s) sh.dwell = 25; } // am Start-Steg anlegen
      sh.curve.getPointAt(sh.s, p); sh.curve.getTangentAt(sh.s, t);
      sh.obj.position.set(p.x, Math.sin(performance.now() / 900) * 0.06, p.z); sh.obj.rotation.y = -Math.atan2(t.z, t.x);
    }
  }
}

// ---------------- Pedalos und Ruderboote: drehen gemütlich Runden vor den Badeplätzen ----------------
export class Boats {
  group = new THREE.Group();
  private boats: { obj: THREE.Object3D; cx: number; cz: number; r: number; w: number; a: number }[] = [];
  constructor(spots: number[][]) {
    this.group.name = 'boats';
    const cols = ['#F7C531', '#E94B3C', '#3FA9F5', '#7ED957', '#FF8FB1'];
    spots.forEach(([x, z], i) => {
      const o = new THREE.Group(); const c = cols[i % cols.length];
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.8), toon(c)); hull.position.y = 0.25; o.add(hull);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.5), toon('#FFFFFF')); seat.position.set(0, 0.7, -0.4); o.add(seat);
      const kid = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), toon('#F2C8A0')); kid.position.set(0.35, 1.25, -0.3); o.add(kid);
      const kid2 = kid.clone(); kid2.position.x = -0.35; o.add(kid2);
      if (i % 2 === 0) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 10), toon('#FFFFFF')); wheel.rotation.z = Math.PI / 2; wheel.position.set(0.9, 0.35, 0.6); o.add(wheel); }
      this.group.add(o);
      this.boats.push({ obj: o, cx: x, cz: z, r: 6 + (i % 3) * 3, w: (i % 2 ? 1 : -1) * (0.05 + (i % 4) * 0.012), a: i * 1.7 });
    });
    this.update(0);
  }
  update(dt: number) {
    const t = performance.now() / 1000;
    for (const b of this.boats) {
      b.a += b.w * dt;
      const x = b.cx + Math.cos(b.a) * b.r, z = b.cz + Math.sin(b.a) * b.r;
      b.obj.position.set(x, Math.sin(t * 1.3 + b.a * 3) * 0.05, z); b.obj.rotation.y = -b.a + (b.w > 0 ? Math.PI : 0); b.obj.rotation.z = Math.sin(t * 1.1 + b.a) * 0.03;
    }
  }
}

// ---------------- Züge: S-Bahn (SBB) und Zentralbahn auf den echten Gleisen ----------------
export interface TrainLine { name: string; kind: 'sbb' | 'zb'; pts: number[][] }
function trainTex(kind: string, front: boolean) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d')!;
  const body = kind === 'zb' ? '#C8202C' : '#F4F4F2', band = kind === 'zb' ? '#F4F4F2' : '#D52B1E';
  g.fillStyle = body; g.fillRect(0, 0, 256, 64);
  g.fillStyle = band; g.fillRect(0, 48, 256, 10);
  g.fillStyle = '#2C3A46'; for (let x = 10; x < 246; x += 30) g.fillRect(x, 14, 22, 22);
  g.fillStyle = kind === 'zb' ? '#F4F4F2' : '#D52B1E'; g.fillRect(118, 10, 20, 46); // Türen
  if (front) { g.fillStyle = '#2C3A46'; g.fillRect(0, 8, 256, 30); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export class Trains {
  group = new THREE.Group();
  private tr: { line: TrainLine; C: number[]; L: number; s: number; dir: number; wait: number; cars: THREE.Object3D[]; carL: number; v: number; tooted: number }[] = [];
  constructor(private terrain: Terrain, lines: TrainLine[], private onBump: (x: number, z: number) => void, private onToot: () => void) {
    this.group.name = 'trains';
    const mats = new Map<string, THREE.Material[]>();
    lines.forEach((line, i) => {
      const C = [0]; for (let k = 1; k < line.pts.length; k++) C.push(C[k - 1] + Math.hypot(line.pts[k][0] - line.pts[k - 1][0], line.pts[k][1] - line.pts[k - 1][1]));
      let m = mats.get(line.kind);
      if (!m) { const side = toon('#ffffff', { map: trainTex(line.kind, false) }), front = toon('#ffffff', { map: trainTex(line.kind, true) }), roof = toon(line.kind === 'zb' ? '#9AA0A6' : '#B9BEC4'), dark = toon('#2B2F33');
        m = [side, side, roof, dark, front, front]; mats.set(line.kind, m); }
      const n = line.kind === 'zb' ? 3 : 4, carL = line.kind === 'zb' ? 19 : 24;
      const cars: THREE.Object3D[] = [];
      for (let k = 0; k < n; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.9, 3.4, carL), m); b.position.y = 2.2; const g = new THREE.Group(); g.add(b); this.group.add(g); cars.push(g); }
      this.tr.push({ line, C, L: C[C.length - 1], s: (i * 0.29 % 1) * C[C.length - 1], dir: i % 2 ? -1 : 1, wait: 0, cars, carL, v: 0, tooted: 0 });
    });
  }
  private at(t: { line: TrainLine; C: number[] }, s: number): [number, number, number] {
    const P = t.line.pts, C = t.C; s = Math.max(0, Math.min(C[C.length - 1], s));
    let lo = 0, hi = C.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (C[m] <= s) lo = m; else hi = m; }
    const a = P[lo], b = P[hi], u = (s - C[lo]) / ((C[hi] - C[lo]) || 1);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[0] - a[0], b[1] - a[1])];
  }
  update(dt: number, pls: { x: number; z: number; heading: number; speed: number }[]) {
    for (const t of this.tr) {
      if (t.wait > 0) { t.wait -= dt; for (const c of t.cars) c.visible = false; if (t.wait <= 0) t.dir *= -1; continue; }
      const len = t.cars.length * (t.carL + 1), remain = t.dir > 0 ? t.L - t.s : t.s;
      const want = Math.min(17, Math.max(3, remain * 0.12)); t.v += (want - t.v) * Math.min(1, dt * 0.6);
      t.s += t.dir * t.v * dt;
      if (t.dir > 0 ? t.s >= t.L : t.s <= 0) { t.s = t.dir > 0 ? t.L : 0; t.wait = 25 + Math.random() * 20; t.v = 0; continue; }
      let sf = t.s;
      const fx0 = this.at(t, t.s);
      for (const c of t.cars) {
        const a = this.at(t, sf), b = this.at(t, sf - t.dir * t.carL);
        const tail = t.dir > 0 ? sf - t.carL < 0 : sf + t.carL > t.L;
        c.visible = !tail; c.position.set((a[0] + b[0]) / 2, Math.max(this.terrain.height(a[0], a[1]), this.terrain.height(b[0], b[1])) + 0.25, (a[1] + b[1]) / 2);
        c.rotation.y = Math.atan2(a[0] - b[0], a[1] - b[1]);
        sf -= t.dir * (t.carL + 1);
      }
      void len;
      // Ambulanz: Zug pfeift, wenn sie nahe am Gleis vor dem Zug ist; bei Berührung «Boing»
      for (const p of pls) {
        const d0 = Math.hypot(p.x - fx0[0], p.z - fx0[1]);
        if (d0 < 70 && performance.now() - t.tooted > 6000) { t.tooted = performance.now(); this.onToot(); }
        for (const c of t.cars) { if (!c.visible) continue; const dx = p.x - c.position.x, dz = p.z - c.position.z, h = c.rotation.y, lx = dx * Math.cos(h) - dz * Math.sin(h), lz = dx * Math.sin(h) + dz * Math.cos(h);
          if (Math.abs(lx) < 2.6 && Math.abs(lz) < t.carL / 2 + 2 && Math.abs(p.speed) > 0.5) { p.speed *= -0.4; this.onBump(p.x, p.z); break; } }
      }
    }
  }
}

// ---------------- Gondelbahn Kriens – Krienseregg – Fräkmüntegg (OSM way 28147252) ----------------
export class Gondola {
  group = new THREE.Group();
  private cab: THREE.InstancedMesh; private C: number[] = []; private P: THREE.Vector3[] = []; private L = 0; private s = 0; private n = 46;
  constructor(terrain: Terrain, g: { pts: number[][]; stations: Record<string, number>; ele: Record<string, number> }) {
    this.group.name = 'gondola';
    const pts = g.pts, iTal = g.stations['Kriens'] ?? 0, iBerg = g.stations['Fräkmüntegg'] ?? pts.length - 1, iMid = g.stations['Krienseregg'] ?? -1;
    const ground = (x: number, z: number) => terrain.ground(x, z);
    // Seilhöhe: Stationen fest, dazwischen mind. 14 m über Gelände (mit geglätteter Hüllkurve)
    const y = pts.map(([x, z], i) => i === iTal ? (g.ele['Kriens'] ?? 492) - 433.6 + 6 : i === iBerg ? (g.ele['Fräkmüntegg'] ?? 1415) - 433.6 + 6 : i === iMid ? ground(x, z) + 7 : ground(x, z) + 16);
    for (let k = 0; k < 3; k++) for (let i = 1; i < y.length - 1; i++) if (i !== iMid) y[i] = Math.max(y[i], (y[i - 1] + y[i + 1]) / 2 - 4);
    this.P = pts.map(([x, z], i) => new THREE.Vector3(x, y[i], z)); this.C = [0];
    for (let i = 1; i < this.P.length; i++) this.C.push(this.C[i - 1] + this.P[i].distanceTo(this.P[i - 1]));
    this.L = this.C[this.C.length - 1];
    // Masten an den Zwischenpunkten, Seile (zwei Stränge, ±2.5 m), Stationsdächer
    const mastM = toon('#7D858C'), ropeM = new THREE.LineBasicMaterial({ color: '#2B2F33' });
    for (let i = 1; i < pts.length - 1; i++) {
      if (i === iMid || this.P[i].distanceTo(this.P[i - 1]) < 25) continue;
      const gy = ground(pts[i][0], pts[i][1]), h = this.P[i].y - gy + 1;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, h, 6), mastM); m.position.set(pts[i][0], gy + h / 2, pts[i][1]); this.group.add(m);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.4, 0.5), mastM); arm.position.set(pts[i][0], this.P[i].y + 0.6, pts[i][1]);
      arm.rotation.y = Math.atan2(pts[i + 1][0] - pts[i - 1][0], pts[i + 1][1] - pts[i - 1][1]) + Math.PI / 2; this.group.add(arm);
    }
    for (const side of [-2.5, 2.5]) {
      const v: number[] = [];
      for (let i = 0; i < this.P.length; i++) { const a = this.P[Math.max(0, i - 1)], b = this.P[Math.min(this.P.length - 1, i + 1)], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; v.push(this.P[i].x - dz / l * side, this.P[i].y + 0.6, this.P[i].z + dx / l * side); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); this.group.add(new THREE.Line(geo, ropeM));
    }
    for (const i of [iTal, iMid, iBerg]) { if (i < 0) continue; const roof = new THREE.Mesh(new THREE.BoxGeometry(14, 1, 18), toon('#B5553C')); roof.position.set(pts[i][0], this.P[i].y + 2.5, pts[i][1]); this.group.add(roof); }
    // Kabinen (4er-Gondeln, rot mit Fenstern) hängen 2.6 m unter dem Seil
    const cg = mergeGeometries([part(new THREE.BoxGeometry(1.7, 1.8, 1.7), '#C8202C', 0, -2.6, 0), part(new THREE.BoxGeometry(1.75, 0.7, 1.4), '#2C3A46', 0, -2.3, 0), part(new THREE.BoxGeometry(1.4, 0.7, 1.75), '#2C3A46', 0, -2.3, 0), part(new THREE.BoxGeometry(0.12, 1.6, 0.12), '#555B60', 0, -0.9, 0)])!;
    this.cab = new THREE.InstancedMesh(cg, toon('#ffffff', { vertexColors: true }), this.n * 2); this.cab.frustumCulled = false; this.group.add(this.cab);
    this.update(0);
  }
  private at(s: number, side: number, out: THREE.Vector3) {
    s = Math.max(0, Math.min(this.L, s)); let lo = 0, hi = this.C.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.C[m] <= s) lo = m; else hi = m; }
    const a = this.P[lo], b = this.P[hi], u = (s - this.C[lo]) / ((this.C[hi] - this.C[lo]) || 1), dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
    return out.set(a.x + dx * u - dz / l * side, a.y + (b.y - a.y) * u + 0.6, a.z + dz * u + dx / l * side);
  }
  update(dt: number) {
    this.s = (this.s + dt * 5) % (this.L / this.n);
    const m = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), sway = Math.sin(performance.now() / 1300) * 0.04;
    q.setFromEuler(new THREE.Euler(sway, 0, 0));
    for (let k = 0; k < this.n; k++) {
      const s = this.s + k * this.L / this.n;
      m.compose(this.at(s, 2.5, v), q, one); this.cab.setMatrixAt(k, m);           // bergwärts
      m.compose(this.at(this.L - s, -2.5, v), q, one); this.cab.setMatrixAt(this.n + k, m); // talwärts
    }
    this.cab.instanceMatrix.needsUpdate = true;
  }
}
