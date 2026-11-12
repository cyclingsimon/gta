// swissBUILDINGS3D-Kacheln (b3dm) → b3d.bin/b3d.json in einem Schritt (ohne grosse Zwischendatei)
// Aufruf: node tools/geo/b3d_build.mjs data/b3dm X0,Z0,X1,Z1
// swissBUILDINGS3D (3D Tiles, b3dm + Draco) → lokale Spielkoordinaten
// Aufruf: node tools/geo/b3dm_decode.mjs data/b3dm out.json
import fs from 'fs';
import draco3d from 'draco3d';
const dir = process.argv[2] || 'data/b3dm';
import { MeshoptSimplifier } from 'meshoptimizer';
await MeshoptSimplifier.ready;
const decoderModule = await draco3d.createDecoderModule({});
const lat0 = 47.0517, lon0 = 8.3077, D2R = Math.PI / 180;
const kx = Math.cos(lat0 * D2R) * 111320, kz = 110574;
const A = 6378137, F = 1 / 298.257223563, E2 = F * (2 - F);
function ecef2llh(x, y, z) {
  const lon = Math.atan2(y, x), p = Math.hypot(x, y);
  let lat = Math.atan2(z, p * (1 - E2)), h = 0;
  for (let i = 0; i < 5; i++) { const N = A / Math.sqrt(1 - E2 * Math.sin(lat) ** 2); h = p / Math.cos(lat) - N; lat = Math.atan2(z, p * (1 - E2 * N / (N + h))); }
  return [lat / D2R, lon / D2R, h];
}
function quatMat(q) { const [x, y, z, w] = q; return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]; }
const buildings = []; let totalTri = 0;
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.b3dm'))) {
  const buf = fs.readFileSync(dir + '/' + f); const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const ftJ = dv.getUint32(12, true), ftB = dv.getUint32(16, true), btJ = dv.getUint32(20, true), btB = dv.getUint32(24, true);
  const ft = JSON.parse(buf.subarray(28, 28 + ftJ).toString());
  const bt = btJ ? JSON.parse(buf.subarray(28 + ftJ + ftB, 28 + ftJ + ftB + btJ).toString()) : {};
  const g = 28 + ftJ + ftB + btJ + btB;
  const jl = dv.getUint32(g + 12, true);
  const gj = JSON.parse(buf.subarray(g + 20, g + 20 + jl).toString());
  const binStart = g + 20 + jl + 8;
  const rtc = ft.RTC_CENTER || [0, 0, 0];
  for (const node of gj.nodes) {
    if (node.mesh === undefined) continue;
    const R = node.rotation ? quatMat(node.rotation) : [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const T = node.translation || [0, 0, 0];
    for (const prim of gj.meshes[node.mesh].primitives) {
      const ext = prim.extensions && prim.extensions.KHR_draco_mesh_compression;
      if (!ext) continue;
      const bv = gj.bufferViews[ext.bufferView];
      const data = buf.subarray(binStart + (bv.byteOffset || 0), binStart + (bv.byteOffset || 0) + bv.byteLength);
      const dec = new decoderModule.Decoder(); const db = new decoderModule.DecoderBuffer(); db.Init(new Int8Array(data), data.length);
      const mesh = new decoderModule.Mesh(); const st = dec.DecodeBufferToMesh(db, mesh);
      if (!st.ok()) { console.error('draco fail', f); continue; }
      const nv = mesh.num_points(), nf = mesh.num_faces();
      const pa = dec.GetAttributeByUniqueId(mesh, ext.attributes.POSITION);
      const pos = new decoderModule.DracoFloat32Array(); dec.GetAttributeFloatForAllPoints(mesh, pa, pos);
      let bid = null;
      if (ext.attributes._BATCHID !== undefined) { const ba = dec.GetAttributeByUniqueId(mesh, ext.attributes._BATCHID); const b = new decoderModule.DracoFloat32Array(); dec.GetAttributeFloatForAllPoints(mesh, ba, b); bid = new Float32Array(nv); for (let i = 0; i < nv; i++) bid[i] = b.GetValue(i); decoderModule.destroy(b); }
      const P = new Float64Array(nv * 3);
      for (let i = 0; i < nv; i++) {
        const x = pos.GetValue(i * 3), y = pos.GetValue(i * 3 + 1), z = pos.GetValue(i * 3 + 2);
        // Knoten-Transformation (glTF, y-up)
        const tx = R[0] * x + R[1] * y + R[2] * z + T[0], ty = R[3] * x + R[4] * y + R[5] * z + T[1], tz = R[6] * x + R[7] * y + R[8] * z + T[2];
        // y-up → z-up, dann RTC
        const ex = tx + rtc[0], ey = -tz + rtc[1], ez = ty + rtc[2];
        const [lat, lon, h] = ecef2llh(ex, ey, ez);
        P[i * 3] = (lon - lon0) * kx; P[i * 3 + 1] = h; P[i * 3 + 2] = -(lat - lat0) * kz;
      }
      const ia = new decoderModule.DracoInt32Array(); const idx = new Uint32Array(nf * 3);
      for (let i = 0; i < nf; i++) { dec.GetFaceFromMesh(mesh, i, ia); idx[i * 3] = ia.GetValue(0); idx[i * 3 + 1] = ia.GetValue(1); idx[i * 3 + 2] = ia.GetValue(2); }
      decoderModule.destroy(ia); decoderModule.destroy(pos); decoderModule.destroy(mesh); decoderModule.destroy(db); decoderModule.destroy(dec);
      // nach Batch-ID (Gebäude) gruppieren
      const groups = new Map();
      for (let t = 0; t < nf; t++) { const b = bid ? Math.round(bid[idx[t * 3]]) : 0; if (!groups.has(b)) groups.set(b, []); groups.get(b).push(t); }
      for (const [b, tris] of groups) {
        const vmap = new Map(); const vs = []; const fs2 = [];
        for (const t of tris) for (let k = 0; k < 3; k++) { const v = idx[t * 3 + k]; if (!vmap.has(v)) { vmap.set(v, vs.length / 3); vs.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); } fs2.push(vmap.get(v)); }
        let hmax = -1e9; for (let i = 1; i < vs.length; i += 3) hmax = Math.max(hmax, vs[i]);
        buildings.push({ egid: bt.EGID ? bt.EGID[b] : null, dachMax: bt.DACH_MAX ? bt.DACH_MAX[b] : null, dachMin: bt.DACH_MIN ? bt.DACH_MIN[b] : null, hmaxEll: hmax, v: new Float64Array(vs), f: new Uint32Array(fs2) });
        totalTri += fs2.length / 3;
      }
    }
  }
}
// Geoid-Offset (Ellipsoid → LN02) aus DACH_MAX
const offs = buildings.filter((b) => b.dachMax).map((b) => b.hmaxEll - b.dachMax).sort((a, b) => a - b);
const geoid = offs[Math.floor(offs.length / 2)];
console.log('Teile', buildings.length, 'Dreiecke', totalTri, 'Geoid', geoid.toFixed(2));
for (const b of buildings) for (let i = 1; i < b.v.length; i += 3) b.v[i] -= geoid;
const raw0 = { buildings: buildings.map((b) => ({ egid: b.egid, dmax: b.dachMax, dmin: b.dachMin, v: b.v, f: b.f })) };

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
const SEA = 433.6, [X0, Z0, X1, Z1] = (process.argv[3] || '-3800,-1100,2700,6300').split(',').map(Number);
const meta = []; const posChunks = []; const idxChunks = []; const edgeChunks = []; let vOff = 0, iOff = 0, eOff = 0, triIn = 0, triOut = 0;
for (const b of raw.buildings) {
  const v = b.v, n = v.length / 3;
  let cx = 0, cz = 0, ymin = 1e9, ymax = -1e9;
  for (let i = 0; i < n; i++) { cx += v[i * 3]; cz += v[i * 3 + 2]; ymin = Math.min(ymin, v[i * 3 + 1]); ymax = Math.max(ymax, v[i * 3 + 1]); }
  cx /= n; cz /= n; cx = Math.round(cx * 10) / 10; cz = Math.round(cz * 10) / 10;
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
  // relativ zum Gebäudemittelpunkt (dm), damit grosse Spielfelder in Int16 passen
const q = new Int16Array(nv.length); for (let i = 0; i < nv.length; i += 3) { q[i] = Math.round((nv[i] - cx) * 10); q[i + 1] = Math.round(nv[i + 1] * 10); q[i + 2] = Math.round((nv[i + 2] - cz) * 10); }
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
  meta.push([b.egid || 0, vOff, nv.length / 3, iOff, ni.length, cx, cz, Math.round((ymin - SEA) * 10) / 10, Math.round((ymax - SEA) * 10) / 10, eOff, edges.length]);
  vOff += nv.length / 3; iOff += ni.length; eOff += edges.length; triOut += ni.length / 3;
}
const posBytes = vOff * 6, pad = (4 - (posBytes % 4)) % 4;
const out = Buffer.alloc(posBytes + pad + iOff * 2 + eOff * 2);
let o = 0; for (const c of posChunks) { Buffer.from(c.buffer).copy(out, o); o += c.byteLength; } o += pad;
for (const c of idxChunks) { Buffer.from(c.buffer).copy(out, o); o += c.byteLength; }
for (const c of edgeChunks) { Buffer.from(c.buffer).copy(out, o); o += c.byteLength; }
const OUT = 'public/data' + (process.env.LR ? '/' + process.env.LR : '');
fs.writeFileSync(OUT + '/b3d.bin', out);
fs.writeFileSync(OUT + '/b3d.json', JSON.stringify({ source: 'swissBUILDINGS3D 3.0 © swisstopo (3D Tiles, Stand 2026-05-20)', fields: ['egid', 'vStart', 'vCount', 'iStart', 'iCount', 'cx', 'cz', 'ymin', 'ymax', 'eStart', 'eCount'], posBytes, pad, idxCount: iOff, edgeCount: eOff, rel: true, buildings: meta.map((m) => { m[5] = Math.round(m[5] * 10) / 10; m[6] = Math.round(m[6] * 10) / 10; return m; }) }));
console.log('Gebäude', meta.length, 'Dreiecke', triIn, '→', triOut, 'Vertices', vOff, 'Datei', (out.length / 1e6).toFixed(1), 'MB');
