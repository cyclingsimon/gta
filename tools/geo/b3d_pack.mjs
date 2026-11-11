// Filtert, vereinfacht und packt swissBUILDINGS3D-Gebäude für das Spiel.
// Ausgabe: public/data/b3d.bin (Int16 Positionen in dm, Uint16 Indizes) + public/data/b3d.json (Index)
import fs from 'fs';
import { MeshoptSimplifier } from 'meshoptimizer';
await MeshoptSimplifier.ready;
const raw0 = JSON.parse(fs.readFileSync('data/buildings3d_raw.json'));
// Teile (Dach/Wände, Kachelgrenzen) pro EGID zusammenführen
const merged = new Map(); let anon = 0;
for (const b of raw0.buildings) {
  const key = b.egid ? 'E' + b.egid : 'A' + anon++;
  if (!merged.has(key)) { merged.set(key, { egid: b.egid, dmax: b.dmax, dmin: b.dmin, v: [], f: [] }); }
  const m = merged.get(key); const off = m.v.length / 3;
  for (const x of b.v) m.v.push(x); for (const i of b.f) m.f.push(i + off);
}
const raw = { buildings: [...merged.values()] };
console.log('Teile', raw0.buildings.length, '→ Gebäude', raw.buildings.length);
const SEA = 433.6, X0 = -1500, Z0 = -1100, X1 = 1150, Z1 = 1250;
const meta = []; const posChunks = []; const idxChunks = []; const edgeChunks = []; let vOff = 0, iOff = 0, eOff = 0, triIn = 0, triOut = 0;
for (const b of raw.buildings) {
  const v = b.v, n = v.length / 3;
  let cx = 0, cz = 0, ymin = 1e9, ymax = -1e9;
  for (let i = 0; i < n; i++) { cx += v[i * 3]; cz += v[i * 3 + 2]; ymin = Math.min(ymin, v[i * 3 + 1]); ymax = Math.max(ymax, v[i * 3 + 1]); }
  cx /= n; cz /= n;
  if (cx < X0 || cx > X1 || cz < Z0 || cz > Z1) continue;
  if (ymax - ymin < 1.5) continue; // Kleinstobjekte
  // Vertices verschweissen (gleiche Position auf 2 cm)
  const wmap = new Map(); const wpos = []; const remap = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    const k = Math.round(v[i * 3] * 50) + ',' + Math.round(v[i * 3 + 1] * 50) + ',' + Math.round(v[i * 3 + 2] * 50);
    let id = wmap.get(k); if (id === undefined) { id = wpos.length / 3; wmap.set(k, id); wpos.push(v[i * 3], v[i * 3 + 1] - SEA, v[i * 3 + 2]); }
    remap[i] = id;
  }
  const pos = new Float32Array(wpos);
  let idx = new Uint32Array(b.f.length);
  let m = 0; for (let t = 0; t < b.f.length; t += 3) { const a = remap[b.f[t]], c = remap[b.f[t + 1]], d = remap[b.f[t + 2]]; if (a === c || c === d || a === d) continue; idx[m++] = a; idx[m++] = c; idx[m++] = d; }
  idx = idx.slice(0, m);
  triIn += idx.length / 3;
  // Vereinfachen: Ziel 45 % der Indizes, maximale Abweichung 0.3 m (relativ zur Objektgrösse)
  const nW = pos.length / 3;
  const ext = Math.max(1, Math.hypot(...[0, 1, 2].map((k) => { let mn = 1e9, mx = -1e9; for (let i = 0; i < nW; i++) { mn = Math.min(mn, pos[i * 3 + k]); mx = Math.max(mx, pos[i * 3 + k]); } return mx - mn; })));
  if (idx.length > 60) {
    const [simp] = MeshoptSimplifier.simplify(idx, pos, 3, Math.max(36, Math.floor(idx.length * 0.45 / 3) * 3), 0.3 / ext, []);
    if (simp.length >= 12) idx = simp;
  }
  // nur benutzte Vertices behalten
  const map = new Map(); const nv = []; const ni = [];
  for (const k of idx) { if (!map.has(k)) { map.set(k, nv.length / 3); nv.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); } ni.push(map.get(k)); }
  if (nv.length / 3 > 65535) continue;
  const q = new Int16Array(nv.length); for (let i = 0; i < nv.length; i++) q[i] = Math.round(nv[i] * 10);
  // Konturkanten: Rand oder Knick > 35°
  const fn = []; const em = new Map();
  for (let t = 0; t < ni.length; t += 3) {
    const a = ni[t], c = ni[t + 1], d = ni[t + 2];
    const ux = nv[c * 3] - nv[a * 3], uy = nv[c * 3 + 1] - nv[a * 3 + 1], uz = nv[c * 3 + 2] - nv[a * 3 + 2];
    const vx = nv[d * 3] - nv[a * 3], vy = nv[d * 3 + 1] - nv[a * 3 + 1], vz = nv[d * 3 + 2] - nv[a * 3 + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
    fn.push([nx / l, ny / l, nz / l]);
    for (const [e1, e2] of [[a, c], [c, d], [d, a]]) { const k = e1 < e2 ? e1 * 65536 + e2 : e2 * 65536 + e1; if (!em.has(k)) em.set(k, []); em.get(k).push(t / 3); }
  }
  const edges = [];
  const cos35 = Math.cos(35 * Math.PI / 180);
  for (const [k, fs] of em) {
    let hard = fs.length === 1;
    if (!hard) { const [f1, f2] = [fn[fs[0]], fn[fs[1]]]; const dot = Math.abs(f1[0] * f2[0] + f1[1] * f2[1] + f1[2] * f2[2]); hard = dot < cos35; }
    if (hard) edges.push(Math.floor(k / 65536), k % 65536);
  }
  posChunks.push(q); idxChunks.push(new Uint16Array(ni)); edgeChunks.push(new Uint16Array(edges));
  meta.push([b.egid || 0, vOff, nv.length / 3, iOff, ni.length, Math.round(cx * 10) / 10, Math.round(cz * 10) / 10, Math.round((ymin - SEA) * 10) / 10, Math.round((ymax - SEA) * 10) / 10, eOff, edges.length]);
  vOff += nv.length / 3; iOff += ni.length; eOff += edges.length; triOut += ni.length / 3;
}
const posBytes = vOff * 6, pad = (4 - (posBytes % 4)) % 4;
const out = Buffer.alloc(posBytes + pad + iOff * 2 + eOff * 2);
let o = 0; for (const c of posChunks) { Buffer.from(c.buffer).copy(out, o); o += c.byteLength; } o += pad;
for (const c of idxChunks) { Buffer.from(c.buffer).copy(out, o); o += c.byteLength; }
for (const c of edgeChunks) { Buffer.from(c.buffer).copy(out, o); o += c.byteLength; }
fs.writeFileSync('public/data/b3d.bin', out);
fs.writeFileSync('public/data/b3d.json', JSON.stringify({ source: 'swissBUILDINGS3D 3.0 © swisstopo (3D Tiles, Stand 2026-05-20)', fields: ['egid', 'vStart', 'vCount', 'iStart', 'iCount', 'cx', 'cz', 'ymin', 'ymax', 'eStart', 'eCount'], posBytes, pad, idxCount: iOff, edgeCount: eOff, buildings: meta }));
console.log('Gebäude', meta.length, 'Dreiecke', triIn, '→', triOut, 'Vertices', vOff, 'Datei', (out.length / 1e6).toFixed(1), 'MB');
