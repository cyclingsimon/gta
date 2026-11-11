// Gelände-Pipeline: swissALTI3D 2 m → Strassen abflachen → Höhenraster (terrain.bin) + vereinfachtes Bodennetz (ground.bin)
import fs from 'fs';
import { MeshoptSimplifier } from 'meshoptimizer';
await MeshoptSimplifier.ready;
const SEA = 433.6, X0 = -3800, Z0 = -1100, S = 2, NX = 2476, NZ = 3701;
const raw = new Int16Array(fs.readFileSync('data/terrain_2m_big.i16').buffer.slice(0));
const h = new Float32Array(raw.length); for (let i = 0; i < raw.length; i++) h[i] = raw[i] / 10 + 400 - SEA;
const city = JSON.parse(fs.readFileSync('public/data/city.json'));
// --- Strassen quer eben (wie Terrain.flattenRoads, aber offline) ---
const orig = h.slice();
const sample = (x, z) => { let fx = (x - X0) / S, fz = (z - Z0) / S; fx = Math.max(0, Math.min(NX - 1.001, fx)); fz = Math.max(0, Math.min(NZ - 1.001, fz)); const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j; const a = orig[j * NX + i], b = orig[j * NX + i + 1], c = orig[(j + 1) * NX + i], d = orig[(j + 1) * NX + i + 1]; return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz; };
const best = new Float32Array(h.length).fill(Infinity), tgt = new Float32Array(h.length), wgt = new Float32Array(h.length);
for (const r of city.roads) {
  if (r.b || ['steps', 'path'].includes(r.c)) continue;
  const half = r.w / 2, reach = half + 3;
  for (let k = 1; k < r.p.length; k++) {
    const [x1, z1] = r.p[k - 1], [x2, z2] = r.p[k]; const len = Math.hypot(x2 - x1, z2 - z1); if (len < 0.01) continue;
    const ux = (x2 - x1) / len, uz = (z2 - z1) / len;
    // Längsprofil geglättet: Mittel über ±3 m
    const hc = (t) => (sample(x1 + ux * t, z1 + uz * t) + sample(x1 + ux * (t - 3), z1 + uz * (t - 3)) + sample(x1 + ux * (t + 3), z1 + uz * (t + 3))) / 3;
    const i0 = Math.max(0, Math.floor((Math.min(x1, x2) - reach - X0) / S)), i1 = Math.min(NX - 1, Math.ceil((Math.max(x1, x2) + reach - X0) / S));
    const j0 = Math.max(0, Math.floor((Math.min(z1, z2) - reach - Z0) / S)), j1 = Math.min(NZ - 1, Math.ceil((Math.max(z1, z2) + reach - Z0) / S));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = X0 + i * S, pz = Z0 + j * S;
      const t = Math.max(0, Math.min(len, (px - x1) * ux + (pz - z1) * uz));
      const dist = Math.hypot(px - (x1 + ux * t), pz - (z1 + uz * t));
      if (dist > reach) continue;
      const idx = j * NX + i;
      if (dist < best[idx]) { best[idx] = dist; tgt[idx] = hc(t); wgt[idx] = dist <= half ? 1 : 1 - (dist - half) / 3; }
    }
  }
}
for (let i = 0; i < h.length; i++) if (best[i] < Infinity) h[i] = orig[i] * (1 - wgt[i]) + tgt[i] * wgt[i];
const out16 = new Int16Array(h.length); for (let i = 0; i < h.length; i++) out16[i] = Math.round((h[i] + SEA - 400) * 10);
{ // zeilenweise Differenzen + Byte-Trennung → komprimiert ~3x besser
  const d = new Int16Array(out16.length); for (let j = 0; j < NZ; j++) { let p = 0; for (let i = 0; i < NX; i++) { const k = j * NX + i; d[k] = out16[k] - p; p = out16[k]; } }
  const b8 = new Uint8Array(d.buffer), o = new Uint8Array(b8.length), n = d.length; for (let i = 0; i < n; i++) { o[i] = b8[2 * i]; o[n + i] = b8[2 * i + 1]; }
  fs.writeFileSync('public/data/terrain.bin', Buffer.from(o)); }
fs.writeFileSync('public/data/terrain.json', JSON.stringify({ nx: NX, nz: NZ, x0: X0, z0: Z0, step: S, flattened: true, enc: 'delta-shuffle', source: 'swissALTI3D (DTM2) via api3.geo.admin.ch profile, © swisstopo; Strassen quer eben' }));
// --- Bodennetz: je 400-m-Kachel vereinfachen (Siedlung 0.3 m, Wald/Feld 0.9 m Fehler), Kachelränder bleiben fest ---
const TS = 200; // Zellen je Kachel (400 m)
const roadPts = new Map();
for (const r of city.roads) for (const [x, z] of r.p) { const k = Math.floor((x - X0) / (TS * S)) + ',' + Math.floor((z - Z0) / (TS * S)); roadPts.set(k, (roadPts.get(k) || 0) + 1); }
const vp = []; const ni = []; const gid = new Map(); let maxErr = 0, nUrban = 0, nRural = 0;
for (let tj = 0; tj < NZ - 1; tj += TS) for (let ti = 0; ti < NX - 1; ti += TS) {
  const tw = Math.min(TS, NX - 1 - ti), th = Math.min(TS, NZ - 1 - tj);
  const urban = (roadPts.get(Math.floor(ti / TS) + ',' + Math.floor(tj / TS)) || 0) > +(process.env.UT||300);
  urban ? nUrban++ : nRural++;
  const lw = tw + 1, lh = th + 1, lpos = new Float32Array(lw * lh * 3);
  for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) { const k = (tj + j) * NX + ti + i, l = j * lw + i; lpos[l * 3] = (ti + i) * S; lpos[l * 3 + 1] = h[k]; lpos[l * 3 + 2] = (tj + j) * S; }
  const lidx = new Uint32Array(tw * th * 6); let m = 0;
  for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) { const a = j * lw + i, b = a + 1, c = a + lw, d = c + 1; lidx[m++] = a; lidx[m++] = c; lidx[m++] = b; lidx[m++] = b; lidx[m++] = c; lidx[m++] = d; }
  const ext = Math.hypot(lw * S, lh * S, 100), tol = urban ? +(process.env.TU||0.3) : +(process.env.TR||0.8);
  const [simp, err] = MeshoptSimplifier.simplify(lidx, lpos, 3, Math.floor(lidx.length * 0.02 / 3) * 3, tol / ext, ['LockBorder']);
  maxErr = Math.max(maxErr, err * ext);
  for (const v of simp) { const i = v % lw, j = Math.floor(v / lw); const gi = ti + i, gj = tj + j, key = gj * NX + gi; let id = gid.get(key); if (id === undefined) { id = vp.length / 3; gid.set(key, id); vp.push(gi, Math.round(h[key] * 10), gj); } ni.push(id); }
}
const err = maxErr / Math.hypot(NX * S, NZ * S, 200), extent = Math.hypot(NX * S, NZ * S, 200), idx = { length: (NX - 1) * (NZ - 1) * 6 };
console.log('Kacheln Siedlung', nUrban, 'Land', nRural);
const q = new Int16Array(vp.length); for (let i = 0; i < vp.length; i += 3) { q[i] = vp[i] - 32768; q[i + 1] = vp[i + 1]; q[i + 2] = vp[i + 2] - 32768; }
const niA = new Uint32Array(ni);
const pad = (4 - (q.byteLength % 4)) % 4;
const buf = Buffer.alloc(q.byteLength + pad + niA.byteLength); Buffer.from(q.buffer).copy(buf, 0); Buffer.from(niA.buffer).copy(buf, q.byteLength + pad);
fs.writeFileSync('public/data/ground.bin', buf);
fs.writeFileSync('public/data/ground.json', JSON.stringify({ vertices: vp.length / 3, indices: ni.length, posBytes: q.byteLength, pad, maxErrorM: err * extent, enc: 'grid', x0: X0, z0: Z0, step: S }));
console.log('Gitter', idx.length / 3, 'Dreiecke →', ni.length / 3, 'Vertices', vp.length / 3, 'max. Fehler', (err * extent).toFixed(3), 'm', 'Dateien', (buf.length / 1e6).toFixed(1), 'MB +', (out16.byteLength / 1e6).toFixed(1), 'MB');
