// Echte Buslinien (OSM-Linienwege, VBL- und PostAuto-Liniennummern) mit Fahrzeugen im Comic-Look:
// VBL blau-weiss (Trolleybus Hess lighTram 25 m doppelgelenkig, Gelenk- und Solobusse), PostAuto gelb.
import * as THREE from 'three';
import type { Terrain } from './terrain';
import { toon } from './world';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface BusLine { ref: string; op: string; to: string; kind: 'double' | 'artic' | 'rigid'; trolley: boolean; wire?: boolean; len: number; pts: number[][]; stops: [number, string][] }
interface Bus { line: number; s: number; v: number; dwell: number; yT: number; yo: number; nextStop: number; group: THREE.Group; segs: THREE.Object3D[]; segL: number; gap: number; alive: boolean }
export interface BusPlayer { x: number; z: number; heading: number; speed: number; siren?: boolean }

const MAX_BUSES = 14;
const LANE = 1.7;

function sideTex(op: string, ref: string, flip = false) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d')!;
  const pag = op === 'PAG';
  g.fillStyle = pag ? '#FFCC00' : '#F4F6F8'; g.fillRect(0, 0, 512, 128);           // Dach/Grundfarbe
  g.fillStyle = '#25313B'; g.fillRect(0, 26, 512, 52);                               // Fensterband
  g.fillStyle = 'rgba(255,255,255,.18)'; for (let x = 10; x < 512; x += 64) g.fillRect(x, 30, 8, 44); // Spiegelung
  g.fillStyle = '#1B1F24'; for (let x = 62; x < 512; x += 64) g.fillRect(x, 26, 4, 52);             // Fensterpfosten
  g.fillStyle = pag ? '#FFCC00' : '#0B5CAB'; g.fillRect(0, 78, 512, 50);             // Unterteil
  if (!pag) { g.fillStyle = '#FFFFFF'; g.fillRect(0, 78, 512, 5); }
  g.font = 'bold 34px system-ui, sans-serif'; g.fillStyle = pag ? '#D2001E' : '#FFFFFF'; g.textAlign = flip ? 'right' : 'left'; g.fillText(pag ? 'PostAuto' : 'vbl', flip ? 486 : 26, 118);
  g.fillStyle = pag ? '#D2001E' : '#FFFFFF'; g.font = 'bold 30px system-ui, sans-serif'; g.fillText(ref, flip ? 72 : 440, 118);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function frontTex(op: string, ref: string, to: string) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d')!;
  const pag = op === 'PAG';
  g.fillStyle = pag ? '#FFCC00' : '#0B5CAB'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#111'; g.fillRect(14, 10, 228, 40);                                  // Zielanzeige
  g.fillStyle = '#FFB000'; g.font = 'bold 30px monospace'; g.fillText(ref, 22, 41);
  g.font = 'bold 19px monospace'; g.fillText(to.slice(0, 15), 22 + (ref.length + 1) * 18, 38);
  g.fillStyle = '#25313B'; g.fillRect(14, 58, 228, 112);                              // Frontscheibe
  g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(30, 160); g.lineTo(90, 66); g.lineTo(120, 66); g.lineTo(60, 160); g.fill();
  g.fillStyle = '#FFF7D6'; g.fillRect(20, 206, 40, 18); g.fillRect(196, 206, 40, 18); // Scheinwerfer
  if (!pag) { g.fillStyle = '#FFFFFF'; g.font = 'bold 28px system-ui'; g.fillText('vbl', 104, 226); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Ein Bus = eine Atlas-Textur (Seite, Front, Heck, Dach, Unterseite) → 1 Zeichenaufruf je Wagenkasten statt 5 */
const ATLAS = 1024;
const R = { side: [0, 0, 512, 128], side2: [0, 128, 512, 128], front: [512, 0, 256, 256], roof: [768, 0, 256, 128], dark: [768, 128, 256, 128], rear: [0, 256, 512, 560] } as Record<string, number[]>;
function busAtlas(op: string, ref: string, to: string) {
  const c = document.createElement('canvas'); c.width = c.height = ATLAS; const g = c.getContext('2d')!;
  const st = sideTex(op, ref).image as HTMLCanvasElement, st2 = sideTex(op, ref, true).image as HTMLCanvasElement, fr = frontTex(op, ref, to).image as HTMLCanvasElement, rt = rearTex(op);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const draw = () => {
    g.drawImage(st, 0, 0, 512, 128); g.drawImage(st2, 0, 128, 512, 128); g.drawImage(fr, 512, 0, 256, 256);
    g.fillStyle = op === 'PAG' ? '#FFCC00' : '#F4F6F8'; g.fillRect(768, 0, 256, 128); g.fillStyle = '#1B1F24'; g.fillRect(768, 128, 256, 128);
    g.drawImage(rt.image as HTMLCanvasElement, 0, 256, 512, 560); t.needsUpdate = true;
  };
  draw(); (rt as any).listeners.push(draw);
  return toon('#ffffff', { map: t });
}
function busSegGeo(segL: number, front: boolean, rear: boolean) {
  const geo = new THREE.BoxGeometry(2.55, 2.75, segL).toNonIndexed(); const uv = geo.getAttribute('uv');
  const faces = [['side', false], ['side2', false], ['roof', false], ['dark', false], [front ? 'front' : 'roof', false], [rear ? 'rear' : 'roof', false]] as [string, boolean][];
  faces.forEach(([k, mirror], f) => { const [x, y, w, h] = R[k]; const u0 = x / ATLAS, u1 = (x + w) / ATLAS, vt = 1 - y / ATLAS, vb = 1 - (y + h) / ATLAS;
    for (let i = f * 6; i < f * 6 + 6; i++) { const u = mirror ? 1 - uv.getX(i) : uv.getX(i); uv.setXY(i, u0 + u * (u1 - u0), vb + uv.getY(i) * (vt - vb)); } });
  geo.clearGroups(); return geo;
}

/** Heck: Werbung «Kinderspital Zentralschweiz» mit Luksi (ein Canvas je Betreiberfarbe, Luksi-Bild wird nachgeladen) */
const rearCache = new Map<string, THREE.CanvasTexture>();
function rearTex(op: string) {
  const k = op === 'PAG' ? 'PAG' : 'VBL'; const old = rearCache.get(k); if (old) return old;
  const c = document.createElement('canvas'); c.width = 512; c.height = 560; const g = c.getContext('2d')!; g.scale(2, 2);
  const imgs: { luksi?: HTMLImageElement; logo?: HTMLImageElement } = {};
  const draw = () => {
    g.fillStyle = k === 'PAG' ? '#FFCC00' : '#0B5CAB'; g.fillRect(0, 0, 256, 280);
    g.fillStyle = '#25313B'; g.fillRect(16, 12, 224, 70);                               // Heckscheibe
    g.fillStyle = '#FFFFFF'; g.beginPath(); (g as any).roundRect ? (g as any).roundRect(12, 92, 232, 140, 14) : g.rect(12, 92, 232, 140); g.fill(); // Werbefläche
    const L = imgs.luksi; if (L) { const h = 128, w = L.width * h / L.height; g.drawImage(L, 16, 98, w, h); }
    const G = imgs.logo; if (G) { const w = 140, h = G.height * w / G.width; g.drawImage(G, 100, 162 - h / 2, w, h); }
    g.fillStyle = '#D61E1E'; g.fillRect(14, 244, 34, 18); g.fillRect(208, 244, 34, 18);   // Rücklichter
    t.needsUpdate = true; for (const f of ((t as any).listeners || [])) f();
  };
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; rearCache.set(k, t); (t as any).listeners = [] as (() => void)[];
  draw();
  const a = new Image(); a.onload = () => { imgs.luksi = a; draw(); }; a.src = 'img/luksi/lp2-winkt.webp';
  const b = new Image(); b.onload = () => { imgs.logo = b; draw(); }; b.src = 'img/kinderspital-logo.png';
  return t;
}

export class Buses {
  group = new THREE.Group();
  buses: Bus[] = [];
  private cum: number[][] = [];
  private rnd = (() => { let a = 77; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  private mats = new Map<string, THREE.Material[]>();
  private rearMats = new Map<string, THREE.Material>();
  private atlasMats = new Map<string, THREE.Material>();
  private rearMat(op: string) { let r = this.rearMats.get(op); if (!r) { r = toon('#ffffff', { map: rearTex(op) }); this.rearMats.set(op, r); } return r; }
  private sig: number[][] = []; private sigState: (i: number) => number = () => 0;
  stats = { spawns: 0, stops: 0 };

  constructor(public lines: BusLine[], private terrain: Terrain) {
    this.group.name = 'buses';
    for (const l of lines) { const c = [0]; for (let i = 1; i < l.pts.length; i++) c.push(c[i - 1] + Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1])); this.cum.push(c); }
  }
  setSignals(pos: number[][], state: (i: number) => number) { this.sig = pos; this.sigState = state; }

  /** Fahrleitung über allen Trolleybus-Strecken: 2 Drähte je Fahrtrichtung in 5.6 m Höhe, Masten alle ~35 m */
  buildWires() {
    const g = new THREE.Group(); g.name = 'fahrleitung';
    const pos: number[] = [], seen = new Set<string>(), poles: number[][] = [], poleSeen = new Set<string>();
    this.lines.forEach((l, li) => {
      if (!l.trolley || l.wire === false) return; // neue Batterie-Trolley-Strecken ohne Fahrleitung
      const C = this.cum[li], L = C[C.length - 1];
      let prev: number[][] | null = null;
      for (let s = 0; s <= L; s += 6) {
        const P = this.lines[li].pts; void P;
        const [x, z, h] = this.at(li, s);
        const k = Math.round(x / 2) + ',' + Math.round(z / 2);
        const dup = seen.has(k); seen.add(k);
        const y = this.terrain.height(x, z) + 5.6, ox = Math.cos(h) * 0.3, oz = -Math.sin(h) * 0.3;
        const cur = [[x + ox, y, z + oz], [x - ox, y, z - oz]];
        if (prev && !dup) for (let w = 0; w < 2; w++) pos.push(prev[w][0], prev[w][1], prev[w][2], cur[w][0], cur[w][1], cur[w][2]);
        prev = cur;
        if (s % 36 < 6) { const px = x - Math.cos(h) * 3.0, pz = z + Math.sin(h) * 3.0, pk = Math.round(px / 12) + ',' + Math.round(pz / 12); if (!poleSeen.has(pk)) { poleSeen.add(pk); poles.push([px, pz, h]); } }
      }
    });
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#2A2F33' })));
    const poleG = new THREE.CylinderGeometry(0.11, 0.14, 6.4, 6); poleG.translate(0, 3.2, 0);
    const armG = new THREE.BoxGeometry(3.4, 0.1, 0.1); armG.translate(-1.7, 5.75, 0);
    const pm = new THREE.InstancedMesh(poleG, toon('#4A5257'), poles.length), am = new THREE.InstancedMesh(armG, toon('#4A5257'), poles.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    poles.forEach(([x, z, h], i) => { e.set(0, h + Math.PI, 0); q.setFromEuler(e); m.compose(v.set(x, this.terrain.height(x, z), z), q, one); pm.setMatrixAt(i, m); am.setMatrixAt(i, m); });
    g.add(pm, am);
    return g;
  }

  // Haltestellennamen: kleiner Pool von Schildern, die den nächsten Haltestellen folgen
  private labels: { sp: THREE.Sprite; name: string; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture }[] = [];
  private stopList: [number, number, string][] = [];
  setStops(stops: [number, number, string][]) {
    // gleiche Namen (beide Strassenseiten) nur einmal zählen, wenn näher als 40 m
    for (const st of stops) if (st[2] && !this.stopList.some((o) => o[2] === st[2] && Math.hypot(o[0] - st[0], o[1] - st[1]) < 40)) this.stopList.push(st);
    for (let i = 0; i < 6; i++) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 96; const ctx = c.getContext('2d')!;
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true })); sp.scale.set(7.5, 1.4, 1); sp.visible = false;
      this.group.add(sp); this.labels.push({ sp, name: '', ctx, tex });
    }
  }
  updateLabels(x: number, z: number) {
    if (!this.labels.length) return;
    const near = this.stopList.map((s) => [Math.hypot(s[0] - x, s[1] - z), s] as [number, [number, number, string]]).filter((a) => a[0] < 160).sort((a, b) => a[0] - b[0]).slice(0, this.labels.length);
    this.labels.forEach((L, i) => {
      const n = near[i]; if (!n) { L.sp.visible = false; return; }
      const [sx, sz, name] = n[1];
      if (L.name !== name) {
        L.name = name; const g = L.ctx;
        g.clearRect(0, 0, 512, 96); g.fillStyle = '#FFFFFF'; g.strokeStyle = '#1E5AA8'; g.lineWidth = 8;
        g.beginPath(); g.roundRect(4, 4, 504, 88, 16); g.fill(); g.stroke();
        g.fillStyle = '#1E5AA8'; g.beginPath(); g.arc(52, 48, 28, 0, 7); g.fill(); g.fillStyle = '#FFF'; g.font = 'bold 36px system-ui'; g.fillText('H', 40, 61);
        g.fillStyle = '#1B1F24'; g.font = 'bold 40px system-ui, sans-serif'; g.fillText(name.slice(0, 18), 96, 62);
        L.tex.needsUpdate = true;
      }
      L.sp.position.set(sx, this.terrain.height(sx, sz) + 4.2, sz); L.sp.visible = true;
    });
  }

  /** Punkt + Richtung bei Bogenlänge s auf Linie li (rechts versetzt) */
  private at(li: number, s: number): [number, number, number] {
    const P = this.lines[li].pts, C = this.cum[li];
    s = Math.max(0, Math.min(C[C.length - 1], s));
    let lo = 0, hi = C.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (C[m] <= s) lo = m; else hi = m; }
    const a = P[lo], b = P[hi], L = C[hi] - C[lo] || 1, u = (s - C[lo]) / L;
    const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
    return [a[0] + (b[0] - a[0]) * u - dz * LANE, a[1] + (b[1] - a[1]) * u + dx * LANE, Math.atan2(dx, dz)];
  }

  private makeBus(li: number): Bus {
    const l = this.lines[li];
    const n = l.kind === 'double' ? 3 : l.kind === 'artic' ? 2 : 1;
    const segL = l.kind === 'double' ? 7.9 : l.kind === 'artic' ? 8.7 : 12, gap = 0.6;
    const key = l.op + '|' + l.ref + '|' + l.to;
    const g = new THREE.Group(); const segs: THREE.Object3D[] = [];
    const wheelG = new THREE.CylinderGeometry(0.5, 0.5, 2.62, 10); wheelG.rotateZ(Math.PI / 2);
    const wheelM = toon('#1B1F24');
    for (let i = 0; i < n; i++) {
      const seg = new THREE.Group();
      let am = this.atlasMats.get(key); if (!am) { am = busAtlas(l.op, l.ref, l.to); this.atlasMats.set(key, am); }
      const body = new THREE.Mesh(busSegGeo(segL, i === 0, i === n - 1), am); body.position.y = 1.72; seg.add(body);
      for (const z of [segL / 2 - 2.2, -segL / 2 + 2.0]) { const w = new THREE.Mesh(wheelG, wheelM); w.position.set(0, 0.5, z); seg.add(w); }
      if (i === 0 && l.trolley) { // Stromabnehmer (Trolleybus)
        // Fuss vorne auf dem Dach, Stangen steigen nach HINTEN zur Fahrleitung (5.6 m) an – wie beim echten Trolleybus
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 1.0), toon('#2A2F33')); base.position.set(0, 3.2, 0.6); seg.add(base);
        const A = 0.36, L = 6.2;
        for (const x of [-0.3, 0.3]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, L, 5), toon('#2A2F33')); pole.rotation.x = -(Math.PI / 2 - A); pole.position.set(x, 3.3 + Math.sin(A) * L / 2, 0.8 - Math.cos(A) * L / 2); seg.add(pole);
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.35), toon('#1A1D20')); head.position.set(x, 3.3 + Math.sin(A) * L, 0.8 - Math.cos(A) * L); seg.add(head); }
      }
      // Räder und Stromabnehmer (alle dunkel) zu einem Netz zusammenfassen: 1 Zeichenaufruf statt bis 7
      const dark: THREE.BufferGeometry[] = [];
      for (const c of [...seg.children]) { if (c === body) continue; const mm = c as THREE.Mesh; mm.updateMatrix(); const q = (mm.geometry.index ? mm.geometry.toNonIndexed() : mm.geometry.clone()); q.deleteAttribute('uv'); q.applyMatrix4(mm.matrix); dark.push(q); seg.remove(c); }
      if (dark.length) seg.add(new THREE.Mesh(mergeGeometries(dark, false)!, wheelM));
      g.add(seg); segs.push(seg);
    }
    this.group.add(g);
    return { line: li, s: 0, v: 0, dwell: 0, yT: 0, yo: 0, nextStop: 0, group: g, segs, segL, gap, alive: true };
  }

  private spawn(pls: BusPlayer[], initial: boolean) {
    // Linien bevorzugen, deren Weg nahe einem Spieler verläuft
    for (let k = 0; k < 40; k++) {
      const li = Math.floor(this.rnd() * this.lines.length), l = this.lines[li], C = this.cum[li];
      const s = initial ? this.rnd() * C[C.length - 1] * 0.8 : this.rnd() * Math.min(300, C[C.length - 1] * 0.3);
      const [x, z] = this.at(li, s);
      const d = Math.min(...pls.map((p) => Math.hypot(p.x - x, p.z - z)));
      if (d < 90 || d > 600) continue;
      if (this.buses.some((b) => b.alive && b.line === li && Math.abs(b.s - s) < 150)) continue;
      if (this.buses.some((b) => b.alive && b.segs.some((sg) => Math.hypot(sg.position.x - x, sg.position.z - z) < 70))) continue; // nicht in andere Busse hinein
      const b = this.makeBus(li); b.s = s; b.v = 6; b.nextStop = l.stops.findIndex((st) => st[0] > s); if (b.nextStop < 0) b.nextStop = l.stops.length;
      this.buses.push(b); this.stats.spawns++;
      return;
    }
  }

  update(dt: number, pls: BusPlayer[], onBump: (x: number, z: number) => void) {
    // entfernte oder angekommene Busse abbauen
    for (const b of this.buses) {
      const C = this.cum[b.line]; const [x, z] = this.at(b.line, b.s);
      if (b.s >= C[C.length - 1] - 1 || Math.min(...pls.map((p) => Math.hypot(p.x - x, p.z - z))) > 750) { b.alive = false; this.group.remove(b.group); b.group.traverse((o: any) => o.geometry?.dispose()); }
    }
    const first = this.buses.length === 0;
    this.buses = this.buses.filter((b) => b.alive);
    if (this.buses.length < MAX_BUSES) this.spawn(pls, first || this.buses.length < MAX_BUSES / 2);
    for (const b of this.buses) {
      const l = this.lines[b.line];
      let want = 9.5;
      const [x, z, h] = this.at(b.line, b.s), [x2, z2, h2] = this.at(b.line, b.s + 18);
      void x2; void z2;
      let dh = Math.abs(h2 - h); if (dh > Math.PI) dh = 2 * Math.PI - dh;
      if (dh > 0.35) want = 5;
      // Haltestelle: anhalten, Türen auf (8 s)
      if (b.dwell > 0) { b.dwell -= dt; want = 0; }
      else if (b.nextStop < l.stops.length) {
        const ds = l.stops[b.nextStop][0] - b.s;
        if (ds < 22) want = Math.min(want, Math.max(0, ds) * 0.45);
        if (ds < 1.2) { b.dwell = 8; b.nextStop++; this.stats.stops++; }
      }
      const fx = Math.sin(h), fz = Math.cos(h);
      // Ambulanz vor dem Bus → warten; Ampel rot → halten
      for (const p of pls) { const qx = p.x - x, qz = p.z - z, al = qx * fx + qz * fz; if (al > 0 && al < 13 && Math.abs(qx * fz - qz * fx) < 2.8) want = 0; }
      // anderer Bus vor mir (auch andere Linie auf gleicher Strasse) → Abstand halten, kein «Tatzelwurm»
      for (const o of this.buses) { if (o === b) continue;
        for (const sg of o.segs) { const qx = sg.position.x - x, qz = sg.position.z - z, al = qx * fx + qz * fz;
          if (al > 0 && al < 26 && Math.abs(qx * fz - qz * fx) < 2.6) want = Math.min(want, al < o.segL / 2 + 4 ? 0 : (al - o.segL / 2 - 4) * 0.6); } }
      // Blaulicht + Sirene von hinten oder entgegenkommend → rechts ran und anhalten
      let amb = 1e9;
      for (const p of pls) { if (!p.siren) continue; const qx = p.x - x, qz = p.z - z, d = Math.hypot(qx, qz); if (d > 80) continue;
        const al = qx * fx + qz * fz, oncoming = al >= 2 && (Math.sin(p.heading) * fx + Math.cos(p.heading) * fz) < -0.3;
        if (al < 2 || oncoming) { b.yT = 3; amb = Math.min(amb, d); } }
      b.yT = Math.max(0, b.yT - dt);
      if (b.yT > 0) want = Math.min(want, amb < 35 ? 0 : 2.5);
      b.yo += ((b.yT > 0 ? 1.6 : 0) - b.yo) * Math.min(1, dt * 1.5);
      for (let i = 0; i < this.sig.length; i++) { const qx = this.sig[i][0] - x, qz = this.sig[i][1] - z, al = qx * fx + qz * fz; if (al > 2 && al < 14 && Math.abs(qx * fz - qz * fx) < 9 && this.sigState(i) > 0) want = Math.min(want, al < 5 ? 0 : (al - 5) * 0.8); }
      b.v += Math.max(-6 * dt, Math.min(1.8 * dt, want - b.v));
      b.s += b.v * dt;
      // Segmente entlang des Wegs ausrichten (Gelenkbus folgt der Kurve)
      let sFront = b.s;
      for (const seg of b.segs) {
        const [ax, az] = this.at(b.line, sFront), [bx, bz] = this.at(b.line, sFront - b.segL);
        const cx = (ax + bx) / 2, cz = (az + bz) / 2;
        const sl = Math.hypot(ax - bx, az - bz) || 1, ox = -(az - bz) / sl * b.yo, oz = (ax - bx) / sl * b.yo; // nach rechts ausweichen
        seg.position.set(cx + ox, Math.max(this.terrain.height(ax, az), this.terrain.height(bx, bz)) , cz + oz);
        seg.rotation.y = Math.atan2(ax - bx, az - bz);
        sFront -= b.segL + b.gap;
      }
      // harmloser Rempler
      for (const p of pls) {
        for (const seg of b.segs) {
          const d = Math.hypot(p.x - seg.position.x, p.z - seg.position.z);
          if (d < b.segL / 2 + 1.2) {
            const lx = (p.x - seg.position.x) * Math.cos(seg.rotation.y) - (p.z - seg.position.z) * Math.sin(seg.rotation.y);
            if (Math.abs(lx) < 2.6 && Math.abs(p.speed) > 1.5) { const pf = Math.sin(p.heading) * (seg.position.x - p.x) + Math.cos(p.heading) * (seg.position.z - p.z); if (pf * Math.sign(p.speed) > 0) { p.speed *= -0.25; onBump(p.x, p.z); } }
          }
        }
      }
    }
  }
}
