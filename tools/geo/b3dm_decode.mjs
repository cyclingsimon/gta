// swissBUILDINGS3D (3D Tiles, b3dm + Draco) → lokale Spielkoordinaten
// Aufruf: node tools/geo/b3dm_decode.mjs data/b3dm out.json
import fs from 'fs';
import draco3d from 'draco3d';
const [dir, out] = process.argv.slice(2);
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
        buildings.push({ tile: f, egid: bt.EGID ? bt.EGID[b] : null, dachMax: bt.DACH_MAX ? bt.DACH_MAX[b] : null, dachMin: bt.DACH_MIN ? bt.DACH_MIN[b] : null, hmaxEll: hmax, v: vs, f: fs2 });
        totalTri += fs2.length / 3;
      }
    }
  }
}
// Geoid-Offset (Ellipsoid → LN02) aus DACH_MAX schätzen
const offs = buildings.filter((b) => b.dachMax).map((b) => b.hmaxEll - b.dachMax).sort((a, b) => a - b);
const geoid = offs[Math.floor(offs.length / 2)];
console.log('Gebäude', buildings.length, 'Dreiecke', totalTri, 'Geoid-Offset (Median)', geoid.toFixed(2), 'Streuung p10/p90', offs[Math.floor(offs.length * 0.1)].toFixed(2), offs[Math.floor(offs.length * 0.9)].toFixed(2));
fs.writeFileSync(out, JSON.stringify({ geoid, buildings: buildings.map((b) => ({ egid: b.egid, dmax: b.dachMax, dmin: b.dachMin, v: b.v.map((n, i) => (i % 3 === 1 ? Math.round((n - geoid) * 100) / 100 : Math.round(n * 100) / 100)), f: b.f })) }));
