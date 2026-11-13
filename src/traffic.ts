// R12: Verkehr und Passanten – friedlich, comicartig, nie gefährlich.
// Autos folgen dem Strassengraph (Einbahn beachtet, rechts fahren), machen dem Blaulicht Platz.
// Passanten spazieren auf Fuss- und Altstadtwegen und hüpfen der Ambulanz rechtzeitig aus dem Weg.
import * as THREE from 'three';
import type { NavGraph } from './nav';
import type { Terrain } from './terrain';
import type { Mask } from './world';
import { toon } from './world';

let N_CARS = 36, N_PEDS = 60;
const CAR_COLORS = ['#D9473B', '#3E7CC9', '#F2C14E', '#F4F4F2', '#2E3A46', '#7BB662', '#9AA3AD', '#E58A3A', '#6C4FA3', '#1F5E4B'];
const PED_COLORS = ['#E2574C', '#3D8BD8', '#F2B33D', '#6BBF59', '#A066C9', '#F28AB2', '#2F4858', '#E9E2D0', '#47B5A8'];
const SKIN = ['#F2D0B3', '#E0B48F', '#C48C62', '#8D5A3B'];

interface Car { a: number; b: number; s: number; len: number; v: number; vmax: number; off: number; offT: number; yieldT: number; x: number; z: number; h: number; alive: boolean; bus?: boolean; dwell?: number; cool?: number; fly?: number; fx?: number; fz?: number; fy?: number; vx?: number; vz?: number; vy?: number; spin?: number; spinV?: number; roll?: number }
const N_BUS = 0; // Busse: eigene Klasse mit echten Linien (bus.ts)
interface Ped { a: number; b: number; s: number; len: number; side: number; v: number; x: number; z: number; h: number; hop: number; hx: number; hz: number; alive: boolean; y0: number }

export interface TrafficPlayer { x: number; z: number; heading: number; speed: number; siren: boolean }

export class Traffic {
  group = new THREE.Group();
  cars: Car[] = []; peds: Ped[] = [];
  stats = { bumps: 0, dodges: 0, minPedDist: 99, spawnsCar: 0, spawnsPed: 0, carsOffRoad: 0 };
  private carOut: number[][] = [];  // ausgehende Autokanten je Knoten
  private pedOut: number[][] = [];  // ausgehende Fusswegkanten je Knoten
  private carSpawn: number[] = []; private pedSpawn: number[] = [];
  private body: THREE.InstancedMesh; private cabin: THREE.InstancedMesh; private busBody: THREE.InstancedMesh; private busWin: THREE.InstancedMesh;
  private stops: number[][] = [];
  setStops(st: number[][]) { this.stops = st; }
  private pbody: THREE.InstancedMesh; private phead: THREE.InstancedMesh;
  private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private sc = new THREE.Vector3(1, 1, 1); private p = new THREE.Vector3();
  private rnd = mulberry(1291);

  // Ampeln: Position, Phase, Instanz-Lampe
  private sig: number[][] = []; private sigLamp: THREE.InstancedMesh | null = null; private time = 0;
  private cG = new THREE.Color('#4CE06A'); private cY = new THREE.Color('#FFC233'); private cR = new THREE.Color('#FF4A3D');
  /** 0 grün, 1 gelb, 2 rot – Zyklus 24 s, Nachbarampeln versetzt */
  sigState(i: number) { const [x, z] = this.sig[i]; const ph = (this.time + ((Math.floor(x / 30) + Math.floor(z / 30)) & 1) * 12) % 24; return ph < 10 ? 0 : ph < 12 ? 1 : 2; }
  setSignals(pos: number[][], lamp: THREE.InstancedMesh | null) { this.sig = pos; this.sigLamp = lamp; }

  setMask(m: Mask) { this.mask = m; }

  constructor(private nav: NavGraph, private terrain: Terrain, private mask: Mask, opts: { cars?: number; peds?: number } = {}) {
    N_CARS = opts.cars ?? 36; N_PEDS = opts.peds ?? 60;
    const n = nav.xs.length;
    for (let i = 0; i < n; i++) {
      const co: number[] = [], po: number[] = [];
      for (const e of nav.adj[i]) {
        const len = Math.hypot(nav.xs[e.to] - nav.xs[i], nav.zs[e.to] - nav.zs[i]);
        if (len < 0.3) continue;
        const c = e.w / len;
        if (c <= 1.31) co.push(e.to);
        if (c >= 1.19) po.push(e.to);
      }
      this.carOut.push(co); this.pedOut.push(po);
      if (co.length && nav.mainNode[i]) this.carSpawn.push(i);
      if (po.length) this.pedSpawn.push(i);
    }
    const bodyG = new THREE.BoxGeometry(1.8, 0.85, 4.1); bodyG.translate(0, 0.72, 0);
    const cabG = new THREE.BoxGeometry(1.58, 0.68, 2.0); cabG.translate(0, 1.47, -0.25);
    this.body = new THREE.InstancedMesh(bodyG, toon('#ffffff'), N_CARS);
    this.cabin = new THREE.InstancedMesh(cabG, toon('#BFD8E6'), N_CARS);
    const pb = new THREE.CylinderGeometry(0.24, 0.3, 1.15, 7); pb.translate(0, 0.62, 0);
    const ph = new THREE.SphereGeometry(0.22, 8, 6); ph.translate(0, 1.42, 0);
    this.pbody = new THREE.InstancedMesh(pb, toon('#ffffff'), N_PEDS);
    this.phead = new THREE.InstancedMesh(ph, toon('#ffffff'), N_PEDS);
    for (let i = 0; i < N_CARS; i++) this.body.setColorAt(i, new THREE.Color(CAR_COLORS[i % CAR_COLORS.length]));
    for (let i = 0; i < N_PEDS; i++) { this.pbody.setColorAt(i, new THREE.Color(PED_COLORS[i % PED_COLORS.length])); this.phead.setColorAt(i, new THREE.Color(SKIN[i % SKIN.length])); }
    for (const im of [this.body, this.cabin, this.pbody, this.phead]) { im.frustumCulled = false; im.name = 'traffic'; this.group.add(im); }
    // VBL-Bus (blau), 12 m
    const bb = new THREE.BoxGeometry(2.5, 2.6, 12); bb.translate(0, 1.75, 0);
    const bw = new THREE.BoxGeometry(2.54, 0.9, 10.6); bw.translate(0, 2.25, 0.3);
    this.busBody = new THREE.InstancedMesh(bb, toon('#1E5AA8'), N_BUS); this.busWin = new THREE.InstancedMesh(bw, toon('#BFD8E6'), N_BUS);
    for (const im of [this.busBody, this.busWin]) { im.frustumCulled = false; im.name = 'traffic'; this.group.add(im); }
    for (let i = 0; i < N_BUS; i++) this.cars.push({ a: 0, b: 0, s: 0, len: 1, v: 0, vmax: 9, off: 1.7, offT: 1.7, yieldT: 0, x: 0, z: 0, h: 0, alive: false, bus: true, dwell: 0, cool: 0 });
    for (let i = 0; i < N_CARS; i++) this.cars.push({ a: 0, b: 0, s: 0, len: 1, v: 0, vmax: 9, off: 1.6, offT: 1.6, yieldT: 0, x: 0, z: 0, h: 0, alive: false });
    for (let i = 0; i < N_PEDS; i++) this.peds.push({ a: 0, b: 0, s: 0, len: 1, side: 1, v: 1.2, x: 0, z: 0, h: 0, hop: 0, hx: 0, hz: 0, alive: false, y0: 0 });
  }

  private edgeLen(a: number, b: number) { return Math.hypot(this.nav.xs[b] - this.nav.xs[a], this.nav.zs[b] - this.nav.zs[a]); }
  private oneway(a: number, b: number) { return !this.carOut[b].includes(a); }

  private pickNext(out: number[][], a: number, b: number, mainOnly = false) {
    const o = out[b]; if (!o.length) return a;
    let choices = o.length > 1 ? o.filter((t) => t !== a) : o;
    if (mainOnly) { const m = choices.filter((t) => this.nav.mainNode[t]); if (m.length) choices = m; }
    const hx = this.nav.xs[b] - this.nav.xs[a], hz = this.nav.zs[b] - this.nav.zs[a];
    // lieber geradeaus, aber mit Zufall
    let best = choices[0], bs = -1e9;
    for (const t of choices) {
      const dx = this.nav.xs[t] - this.nav.xs[b], dz = this.nav.zs[t] - this.nav.zs[b];
      const cos = (hx * dx + hz * dz) / ((Math.hypot(hx, hz) * Math.hypot(dx, dz)) || 1);
      const sc = cos + this.rnd() * 1.2;
      if (sc > bs) { bs = sc; best = t; }
    }
    return best;
  }

  private spawnCar(c: Car, pls: TrafficPlayer[]) {
    const pl = pls[Math.floor(this.rnd() * pls.length)];
    for (let k = 0; k < 40; k++) {
      const a = this.carSpawn[Math.floor(this.rnd() * this.carSpawn.length)];
      const d = Math.hypot(this.nav.xs[a] - pl.x, this.nav.zs[a] - pl.z);
      if (d < 90 || d > 380 || pls.some((q) => Math.hypot(this.nav.xs[a] - q.x, this.nav.zs[a] - q.z) < 80)) continue;
      if (this.cars.some((o) => o.alive && Math.hypot(o.x - this.nav.xs[a], o.z - this.nav.zs[a]) < 15)) continue;
      const b = this.carOut[a][Math.floor(this.rnd() * this.carOut[a].length)];
      Object.assign(c, { a, b, s: 0, len: this.edgeLen(a, b), v: 6, vmax: c.bus ? 8 : 8 + this.rnd() * 4, alive: true, yieldT: 0, dwell: 0, cool: 0, fly: 0, fx: 0, fz: 0, fy: 0, spin: 0 });
      c.off = c.offT = this.oneway(a, b) ? 0 : 1.7;
      this.stats.spawnsCar++;
      return;
    }
  }

  private spawnPed(p: Ped, pls: TrafficPlayer[]) {
    const pl = pls[Math.floor(this.rnd() * pls.length)];
    for (let k = 0; k < 40; k++) {
      const a = this.pedSpawn[Math.floor(this.rnd() * this.pedSpawn.length)];
      const d = Math.hypot(this.nav.xs[a] - pl.x, this.nav.zs[a] - pl.z);
      if (d < 35 || d > 170 || pls.some((q) => Math.hypot(this.nav.xs[a] - q.x, this.nav.zs[a] - q.z) < 30)) continue;
      const b = this.pedOut[a][Math.floor(this.rnd() * this.pedOut[a].length)];
      Object.assign(p, { a, b, s: this.rnd() * this.edgeLen(a, b), len: this.edgeLen(a, b), side: this.rnd() < 0.5 ? -1.4 : 1.4, v: 1.0 + this.rnd() * 0.6, hop: 0, alive: true });
      this.stats.spawnsPed++;
      return;
    }
  }

  update(dt: number, pls: TrafficPlayer[], onBump: (x: number, z: number) => void) {
    const far = (x: number, z: number, r: number) => pls.every((q) => Math.hypot(x - q.x, z - q.z) > r);
    this.time += dt;
    if (this.sigLamp) for (let i = 0; i < this.sig.length; i++) { const st = this.sigState(i); this.sigLamp.setColorAt(i, st === 0 ? this.cG : st === 1 ? this.cY : this.cR); }
    if (this.sigLamp && this.sigLamp.instanceColor) this.sigLamp.instanceColor.needsUpdate = true;
    const nav = this.nav;
    // ---- Autos ----
    for (const c of this.cars) {
      if (!c.alive || far(c.x, c.z, 450)) { c.alive = false; this.spawnCar(c, pls); if (!c.alive) continue; }
      const ax = nav.xs[c.a], az = nav.zs[c.a], bx = nav.xs[c.b], bz = nav.zs[c.b];
      const dx = (bx - ax) / c.len, dz = (bz - az) / c.len;
      // Blaulicht hinter mir? → rechts ran und langsam
      // Blaulicht + Sirene: Ambulanz von hinten ODER entgegenkommend → rechts ran, nahe ganz anhalten
      let ambNear = 1e9;
      for (const pl of pls) { if (!pl.siren) continue; const rx = pl.x - c.x, rz = pl.z - c.z, rd = Math.hypot(rx, rz); if (rd > 80) continue;
        const along = rx * dx + rz * dz, hx = Math.sin(pl.heading), hz = Math.cos(pl.heading);
        const behind = along < 2, oncoming = along >= 2 && (hx * dx + hz * dz) < -0.3;
        if (behind || oncoming) { c.yieldT = 3; ambNear = Math.min(ambNear, rd); } }
      c.yieldT = Math.max(0, c.yieldT - dt);
      let want = c.yieldT > 0 ? (ambNear < 30 ? 0 : 2.5) : c.vmax;
      c.offT = this.oneway(c.a, c.b) ? (c.yieldT > 0 ? 2.6 : 0) : (c.yieldT > 0 ? 4.0 : 1.7);
      // Kurve voraus → bremsen
      if (c.len - c.s < 10) want = Math.min(want, 5.5);
      // Abstand halten: Ambulanz oder anderes Auto vor mir
      const ahead = (ox: number, oz: number, r: number) => { const qx = ox - c.x, qz = oz - c.z; const along = qx * dx + qz * dz, side = Math.abs(qx * dz - qz * dx); return along > 0 && along < r && side < 2.6; };
      for (const pl of pls) if (ahead(pl.x, pl.z, 11)) want = 0;
      // Rot oder Gelb an der Ampel vor mir → anhalten (Ampel steht am rechten Rand)
      for (let i = 0; i < this.sig.length; i++) {
        const [sx, sz] = this.sig[i]; const qx = sx - c.x, qz = sz - c.z; const along = qx * dx + qz * dz;
        if (along > 2 && along < 14 && Math.abs(qx * dz - qz * dx) < 9 && this.sigState(i) > 0 && c.yieldT <= 0) { want = Math.min(want, along < 5 ? 0 : (along - 5) * 0.8); }
      }
      for (const o of this.cars) if (o !== c && o.alive && ahead(o.x, o.z, 9)) { want = Math.min(want, o.v * 0.8); }
      if (c.bus) {
        c.cool = Math.max(0, (c.cool || 0) - dt);
        if ((c.dwell || 0) > 0) { c.dwell! -= dt; want = 0; if (c.dwell! <= 0) c.cool = 25; }
        else if (!c.cool) for (const [sx, sz] of this.stops) { const qx = sx - c.x, qz = sz - c.z, al = qx * dx + qz * dz; if (al > 0 && al < 8 && Math.abs(qx * dz - qz * dx) < 7) { want = Math.min(want, al * 0.6); if (al < 2) c.dwell = 6; break; } }
      }
      c.v += Math.max(-8 * dt, Math.min(3 * dt, want - c.v));
      c.s += c.v * dt;
      while (c.s >= c.len) {
        c.s -= c.len; const n = this.pickNext(this.carOut, c.a, c.b, c.bus); c.a = c.b; c.b = n; c.len = Math.max(0.3, this.edgeLen(c.a, c.b));
      }
      c.off += (c.offT - c.off) * Math.min(1, dt * 2);
      const ax2 = nav.xs[c.a], az2 = nav.zs[c.a], ddx = (nav.xs[c.b] - ax2) / c.len, ddz = (nav.zs[c.b] - az2) / c.len;
      const nx = ax2 + ddx * c.s - ddz * c.off, nz = az2 + ddz * c.s + ddx * c.off;
      // weich drehen
      const th = Math.atan2(ddx, ddz); let dh = th - c.h; dh -= 2 * Math.PI * Math.round(dh / (2 * Math.PI)); if (!isFinite(dh)) dh = 0; /* Hänger-Schutz: begrenzt statt while */
      c.h += dh * Math.min(1, dt * 6);
      c.x = nx; c.z = nz;
      if (c.fly! > 0) { // Hüpf-Flug, danach sanft zurück auf die Spur
        c.fly! += dt; c.v = 0;
        if (c.fy! > 0 || c.vy! > 0) { c.vy! -= 20 * dt; c.fx! += c.vx! * dt; c.fz! += c.vz! * dt; c.fy! += c.vy! * dt; c.spin! += c.spinV! * dt; c.roll = Math.sin(c.fly! * 9) * 0.25;
          if (c.fy! < 0) { c.fy = 0; if (Math.abs(c.vy!) > 3) { c.vy = -c.vy! * 0.4; c.vx! *= 0.5; c.vz! *= 0.5; c.spinV! *= 0.5; } else c.vy = 0; } }
        else { const k = Math.min(1, dt * 1.6); c.fx! -= c.fx! * k; c.fz! -= c.fz! * k; c.spin! -= c.spin! * k; c.roll = 0;
          if (c.fly! > 3.2) { c.fly = 0; c.fx = c.fz = c.fy = c.spin = 0; } }
      }
      // Harmloser Rempler mit der Ambulanz
      for (const pl of pls) {
        const fx = Math.sin(pl.heading), fz = Math.cos(pl.heading);
        const px = c.x - pl.x, pz = c.z - pl.z, pd = Math.hypot(px, pz);
        if (pd < 3.0) {
          c.v = 0; c.s = Math.max(0, c.s - (3.0 - pd)); // zurückweichen
          if (Math.abs(pl.speed) > 1.5 && (px * fx + pz * fz) * Math.sign(pl.speed) > 0 && !(c.fly! > 0)) {
            // «Boing!»: Auto hüpft wie ein Gummiball weg, dreht sich, landet und rollt zurück auf die Spur – niemand wird verletzt
            const sp = Math.min(Math.abs(pl.speed), 25), nx2 = px / (pd || 1), nz2 = pz / (pd || 1), sg = Math.sign(pl.speed);
            c.fly = 0.001; c.fx = c.fx || 0; c.fz = c.fz || 0; c.fy = 0;
            c.vx = (fx * sg * 0.55 + nx2 * 0.45) * (4 + sp * 0.7); c.vz = (fz * sg * 0.55 + nz2 * 0.45) * (4 + sp * 0.7);
            c.vy = 4 + sp * 0.35; c.spinV = (Math.random() < 0.5 ? -1 : 1) * (3 + sp * 0.25); c.spin = c.spin || 0;
            this.burst(c.x, this.terrain.height(c.x, c.z) + 1.6, c.z);
            pl.speed *= 0.55; this.stats.bumps++; onBump(c.x, c.z); }
        }
      }
    }
    // ---- Passanten ----
    for (const p of this.peds) {
      if (!p.alive || far(p.x, p.z, 200)) { p.alive = false; this.spawnPed(p, pls); if (!p.alive) continue; }
      const ax = nav.xs[p.a], az = nav.zs[p.a], dx = (nav.xs[p.b] - ax) / p.len, dz = (nav.zs[p.b] - az) / p.len;
      for (const pl of pls) {
        const fx = Math.sin(pl.heading), fz = Math.cos(pl.heading);
        const qx = p.x - pl.x, qz = p.z - pl.z, qd = Math.hypot(qx, qz);
        // Ambulanz kommt? → comicartiger Hüpfer zur Seite (vorausschauend)
        const along = qx * fx + qz * fz, lat = qx * fz - qz * fx;
        const danger = qd < 3.2 || (Math.abs(pl.speed) > 1 && along > -2 && along < 4 + Math.abs(pl.speed) * 0.9 && Math.abs(lat) < 3);
        if (danger && p.hop <= 0) {
          const sg = lat >= 0 ? 1 : -1; // weg von der Fahrlinie
          p.hx = fz * sg; p.hz = -fx * sg; p.hop = 0.55; this.stats.dodges++;
        }
      }
      if (p.hop > 0) {
        const step = Math.min(dt, p.hop); p.hop -= step;
        const tx = p.x + p.hx * 9 * step, tz = p.z + p.hz * 9 * step;
        const v = this.mask.at(tx, tz); if (v !== 2 && v !== 1 && v !== 3) { p.x = tx; p.z = tz; }
        p.y0 = Math.sin((1 - p.hop / 0.55) * Math.PI) * 1.1;
        // nach dem Hüpfer Weg wieder aufnehmen
        if (p.hop <= 0) { p.y0 = 0; const rx = p.x - ax, rz = p.z - az; p.s = Math.max(0, Math.min(p.len, rx * dx + rz * dz)); p.side = Math.max(-4, Math.min(4, rx * dz - rz * dx)) * -1; }
      } else {
        p.s += p.v * dt;
        if (p.s >= p.len) { p.s -= p.len; const n = this.pickNext(this.pedOut, p.a, p.b); p.a = p.b; p.b = n; p.len = Math.max(0.3, this.edgeLen(p.a, p.b)); }
        const ax2 = nav.xs[p.a], az2 = nav.zs[p.a], ddx = (nav.xs[p.b] - ax2) / p.len, ddz = (nav.zs[p.b] - az2) / p.len;
        p.x = ax2 + ddx * p.s - ddz * p.side; p.z = az2 + ddz * p.s + ddx * p.side; p.h = Math.atan2(ddx, ddz);
      }
      // Notfall: nie berühren lassen
      for (const pl of pls) {
        const d2 = Math.hypot(p.x - pl.x, p.z - pl.z);
        if (d2 < 1.9) { const k = 1.9 / (d2 || 1); p.x = pl.x + (p.x - pl.x) * k; p.z = pl.z + (p.z - pl.z) * k; }
        this.stats.minPedDist = Math.min(this.stats.minPedDist, Math.hypot(p.x - pl.x, p.z - pl.z));
      }
    }
    this.draw(); this.drawStars(dt);
  }

  /** Hupe: Passanten in der Nähe machen einen Freudensprung, Autos einen kleinen Hüpfer */
  honk(x: number, z: number) {
    for (const p of this.peds) if (p.alive && p.hop <= 0 && Math.hypot(p.x - x, p.z - z) < 28) { p.hx = 0; p.hz = 0; p.hop = 0.55; }
    for (const c of this.cars) if (c.alive && !c.bus && !(c.fly! > 0) && Math.hypot(c.x - x, c.z - z) < 30) { c.fly = 0.001; c.fx = 0; c.fz = 0; c.fy = 0.01; c.vx = 0; c.vz = 0; c.vy = 3.2; c.spinV = 0; c.spin = 0; }
  }

  /** kleine Sterne, die beim Boing herumfliegen */
  private stars: THREE.InstancedMesh | null = null; private st: { x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number }[] = []; private stI = 0;
  private burst(x: number, y: number, z: number) {
    if (!this.stars) { const g = new THREE.OctahedronGeometry(0.32, 0); this.stars = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: '#FFD447' }), 40); this.stars.frustumCulled = false; this.group.add(this.stars);
      for (let i = 0; i < 40; i++) this.st.push({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, t: 0 }); }
    for (let k = 0; k < 8; k++) { const s = this.st[this.stI++ % 40], a = k / 8 * Math.PI * 2; Object.assign(s, { x, y, z, vx: Math.cos(a) * 4, vy: 3 + Math.random() * 3, vz: Math.sin(a) * 4, t: 1.1 }); }
  }
  private drawStars(dt: number) {
    if (!this.stars) return;
    this.st.forEach((s, i) => { if (s.t > 0) { s.t -= dt; s.vy -= 6 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; }
      const k = s.t > 0 ? Math.min(1, s.t * 2) : 0; this.e.set(0, s.t * 8, 0); this.q.setFromEuler(this.e); this.p.set(s.x, s.y, s.z); this.sc.set(k, k, k);
      this.m.compose(this.p, this.q, this.sc); this.stars!.setMatrixAt(i, this.m); });
    this.stars.instanceMatrix.needsUpdate = true;
  }

  private draw() {
    let i = 0, ib = 0;
    for (const c of this.cars) {
      if (c.bus) {
        if (c.alive) { this.e.set(0, c.h, 0); this.q.setFromEuler(this.e); this.p.set(c.x, this.terrain.height(c.x, c.z), c.z); this.sc.set(1, 1, 1); } else this.sc.set(0, 0, 0);
        this.m.compose(this.p, this.q, this.sc); this.busBody.setMatrixAt(ib, this.m); this.busWin.setMatrixAt(ib, this.m); ib++; continue;
      }
      if (c.alive) { const f = c.fly! > 0, ox = f ? c.fx! : 0, oz = f ? c.fz! : 0;
        this.e.set(f ? c.roll || 0 : 0, c.h + (f ? c.spin! : 0), 0); this.q.setFromEuler(this.e);
        this.p.set(c.x + ox, this.terrain.height(c.x + ox, c.z + oz) + (f ? c.fy! : 0), c.z + oz);
        const sq = f && c.fy! < 0.3 && c.fly! < 1.5 ? 0.85 : 1; this.sc.set(1 / sq, sq, 1 / sq); }
      else this.sc.set(0, 0, 0);
      this.m.compose(this.p, this.q, this.sc); this.body.setMatrixAt(i, this.m); this.cabin.setMatrixAt(i, this.m); i++;
    }
    i = 0;
    for (const p of this.peds) {
      if (p.alive) { this.e.set(0, p.h, 0); this.q.setFromEuler(this.e); this.p.set(p.x, this.terrain.height(p.x, p.z) + p.y0, p.z); this.sc.set(1, 1, 1); }
      else this.sc.set(0, 0, 0);
      this.m.compose(this.p, this.q, this.sc); this.pbody.setMatrixAt(i, this.m); this.phead.setMatrixAt(i, this.m); i++;
    }
    for (const im of [this.body, this.cabin, this.pbody, this.phead, this.busBody, this.busWin]) im.instanceMatrix.needsUpdate = true;
  }

  /** QA: Autos auf Hauswand/Wasser (ausser Brücken) zählen */
  check() {
    let off = 0, alive = 0;
    for (const c of this.cars) if (c.alive) { alive++; const v = this.mask.at(c.x, c.z); if (v === 2 || v === 3) off++; }
    return { alive, off, peds: this.peds.filter((p) => p.alive).length, ...this.stats };
  }
}

function mulberry(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
