import * as THREE from 'three';
/** 17b: Velofahrerinnen und Velofahrer auf Radstreifen und Velowegen (Luzern ist Velostadt). Immer nur eine Handvoll in der Nähe der Ambulanz;
 *  wer weit weg ist, wird auf einen Radstreifen in der Nähe umgesetzt. Keine Kollision: kommt die Ambulanz näher als 9 m, halten sie am Rand an. */
type Road = { p: number[][]; c: string; w: number; b?: number | boolean; cy?: number[]; tu?: unknown };
interface Velo { r: number; s: number; dir: 1 | -1; v: number; v0: number; side: number; x: number; z: number; h: number; on: boolean }
const JERSEY = ['#E4572E', '#F2C418', '#2F6FB5', '#3E8E4E', '#C8322B', '#8E5BD0', '#F28CB1', '#1FA6A0', '#F4F4F4', '#FF8A1F'];
function part(g: THREE.BufferGeometry, col: string) { const n = g.toNonIndexed(), c = new THREE.Color(col), a = new Float32Array(n.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } n.setAttribute('color', new THREE.BufferAttribute(a, 3)); n.deleteAttribute('uv'); return n; }
function merge(gs: THREE.BufferGeometry[]) { let n = 0; for (const g of gs) n += g.attributes.position.count; const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  for (const g of gs) { P.set(g.attributes.position.array as Float32Array, o); N.set(g.attributes.normal.array as Float32Array, o); C.set(g.attributes.color.array as Float32Array, o); o += g.attributes.position.count * 3; g.dispose(); }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('color', new THREE.BufferAttribute(C, 3)); return m; }
const box = (w: number, h: number, d: number, x: number, y: number, z: number, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); return g.translate(x, y, z); };
export class Velos {
  group = new THREE.Group(); list: Velo[] = []; private cand: { r: Road; L: number; cum: number[] }[] = [];
  private bike: THREE.InstancedMesh; private shirt: THREE.InstancedMesh; private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private p = new THREE.Vector3(); private one = new THREE.Vector3(1, 1, 1); private zero = new THREE.Vector3(0, 0, 0);
  private seed = 4711; private rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  constructor(roads: Road[], private groundY: (x: number, z: number) => number, n = 14) {
    this.group.name = 'velos';
    for (const r of roads) { if (r.b || r.tu || r.p.length < 2) continue; if (!(r.c === 'cycleway' || (r.cy && (r.cy[0] || r.cy[1])))) continue;
      const cum = [0]; for (let i = 1; i < r.p.length; i++) cum.push(cum[i - 1] + Math.hypot(r.p[i][0] - r.p[i - 1][0], r.p[i][1] - r.p[i - 1][1])); if (cum[cum.length - 1] >= 60) this.cand.push({ r, L: cum[cum.length - 1], cum }); }
    // Velo (vorne = +z): zwei Räder, Rahmen, Lenker; Mensch: Beine, Kopf, Helm – Leibchen separat (Farbe je Fahrer)
    const wheel = (z: number) => new THREE.CylinderGeometry(0.34, 0.34, 0.05, 10).rotateZ(Math.PI / 2).translate(0, 0.34, z);
    const bikeG = merge([part(wheel(0.52), '#1B1D20'), part(wheel(-0.52), '#1B1D20'), part(box(0.05, 0.05, 0.75, 0, 0.74, 0.02, -0.12), '#2B6CB0'), part(box(0.05, 0.05, 0.62, 0, 0.52, 0.2, 0.75), '#2B6CB0'), part(box(0.05, 0.5, 0.05, 0, 0.62, -0.26, 0.25), '#2B6CB0'),
      part(box(0.05, 0.6, 0.05, 0, 0.68, 0.46, -0.3), '#9AA0A6'), part(box(0.46, 0.04, 0.04, 0, 1.0, 0.38), '#1B1D20'), part(box(0.14, 0.05, 0.26, 0, 0.92, -0.32), '#1B1D20'),
      part(box(0.13, 0.62, 0.14, -0.1, 0.62, -0.12, 0.35), '#2E3440'), part(box(0.13, 0.62, 0.14, 0.1, 0.66, -0.02, -0.2), '#2E3440'),
      part(new THREE.IcosahedronGeometry(0.13, 0).translate(0, 1.56, 0.22), '#E8B796'), part(new THREE.SphereGeometry(0.155, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.6, 0.22), '#F4F4F4')]);
    const shirtG = merge([part(box(0.36, 0.62, 0.22, 0, 1.2, -0.02, 0.6), '#ffffff'), part(box(0.09, 0.09, 0.5, -0.17, 1.2, 0.26, -0.5), '#ffffff'), part(box(0.09, 0.09, 0.5, 0.17, 1.2, 0.26, -0.5), '#ffffff')]);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.bike = new THREE.InstancedMesh(bikeG, mat, n); this.shirt = new THREE.InstancedMesh(shirtG, mat.clone(), n); this.bike.frustumCulled = this.shirt.frustumCulled = false; this.bike.castShadow = true;
    const c = new THREE.Color(); for (let i = 0; i < n; i++) { this.list.push({ r: -1, s: 0, dir: 1, v: 0, v0: 4 + this.rnd() * 2.5, side: 0, x: 0, z: 0, h: 0, on: false }); this.shirt.setColorAt(i, c.set(JERSEY[i % JERSEY.length])); }
    this.group.add(this.bike, this.shirt); this.group.visible = this.cand.length > 0;
  }
  private nearK: number[] = []; private nearAt = [1e9, 1e9];
  private place(v: Velo, cx: number, cz: number) {
    if (Math.hypot(cx - this.nearAt[0], cz - this.nearAt[1]) > 120) { this.nearAt = [cx, cz]; this.nearK = []; this.cand.forEach((c, k) => { if (c.r.p.some((q) => Math.hypot(q[0] - cx, q[1] - cz) < 420)) this.nearK.push(k); }); }
    if (!this.nearK.length) { v.on = false; return; }
    for (let t = 0; t < 12; t++) { const k = this.nearK[Math.floor(this.rnd() * this.nearK.length)], c = this.cand[k], s = this.rnd() * c.L; const [x, z] = this.at(c, s); const d = Math.hypot(x - cx, z - cz);
      if (d > 110 && d < 380) { v.r = k; v.s = s; v.dir = this.rnd() < 0.5 ? 1 : -1; v.on = true; v.v = v.v0; return; } } v.on = false; }
  private at(c: { r: Road; cum: number[] }, s: number): [number, number, number, number] { let i = 1; while (i < c.cum.length - 1 && c.cum[i] < s) i++; const A = c.r.p[i - 1], B = c.r.p[i], l = c.cum[i] - c.cum[i - 1] || 1, t = (s - c.cum[i - 1]) / l; return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, (B[0] - A[0]) / l, (B[1] - A[1]) / l]; }
  private tick = 0;
  update(dt: number, cars: { x: number; z: number }[]) {
    if (!this.cand.length || !cars.length) return; const cx = cars[0].x, cz = cars[0].z; this.tick++;
    this.list.forEach((v, i) => {
      if (!v.on || Math.min(...cars.map((c) => Math.hypot(v.x - c.x, v.z - c.z))) > 460) { if ((this.tick + i * 3) % 12 === 0) this.place(v, cx, cz); if (!v.on) { this.m.compose(this.zero, this.q.identity(), this.zero); this.bike.setMatrixAt(i, this.m); this.shirt.setMatrixAt(i, this.m); return; } }
      const c = this.cand[v.r]; const near = cars.some((k) => Math.hypot(v.x - k.x, v.z - k.z) < 9);
      v.v += ((near ? 0 : v.v0) - v.v) * Math.min(1, dt * 3); v.side += ((near ? 1.1 : 0) - v.side) * Math.min(1, dt * 3);
      v.s += v.dir * v.v * dt; if (v.s > c.L) { v.s = c.L; v.dir = -1; } else if (v.s < 0) { v.s = 0; v.dir = 1; }
      const [x, z, ux, uz] = this.at(c, v.s), dx = ux * v.dir, dz = uz * v.dir, off = (c.r.c === 'cycleway' ? Math.min(0.6, c.r.w / 4) : c.r.w / 2 - 0.75) + v.side;
      v.x = x - dz * off; v.z = z + dx * off; const th = Math.atan2(dx, dz); let dh = th - v.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI; v.h += dh * Math.min(1, dt * 6);
      this.e.set(0, v.h, 0); this.q.setFromEuler(this.e); this.p.set(v.x, this.groundY(v.x, v.z) + 0.02, v.z); this.m.compose(this.p, this.q, this.one); this.bike.setMatrixAt(i, this.m); this.shirt.setMatrixAt(i, this.m);
    });
    this.bike.instanceMatrix.needsUpdate = true; this.shirt.instanceMatrix.needsUpdate = true;
  }
}
