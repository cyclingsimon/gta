// Browser-Helfer für die Geodaten-Übertragung (im eingebauten Browser auf gta.simon-infanger.ch einspritzen).
// 14q: nach Neustart des Browsers neu geschrieben, damit sie nicht mehr verloren gehen.
window.ofetch = window.ofetch || window.fetch.bind(window);
window.CS = 250000; window.PKS = window.PKS || {};
window.gz = async (u8) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
window.b64 = (u8) => { let s = ''; const C = 0x8000; for (let i = 0; i < u8.length; i += C) s += String.fromCharCode.apply(null, u8.subarray(i, i + C)); return btoa(s); };
window.packGz = async (prefix, files) => {
  const enc = new TextEncoder(); const hdr = enc.encode(JSON.stringify(files.map(([n, b]) => [n, b.length])));
  const tot = 4 + hdr.length + files.reduce((a, [, b]) => a + b.length, 0); const o = new Uint8Array(tot);
  new DataView(o.buffer).setUint32(0, hdr.length, true); o.set(hdr, 4); let p = 4 + hdr.length; for (const [, b] of files) { o.set(b, p); p += b.length; }
  const z = await gz(o); PKS[prefix] = b64(z); return [tot, z.length, Math.ceil(PKS[prefix].length / CS)];
};
window.chunk = (prefix, i) => { const s = prefix + String(i).padStart(3, '0') + PKS[prefix].slice(i * CS, (i + 1) * CS) + '|'; return s.length < 120000 ? s + '#'.repeat(120000 - s.length) : s; };
// swissBUILDINGS3D-Kacheln (Level 11)
window.tileJob = (id, x0, x1, y0, y1) => {
  const J = { id, files: {}, done: 0, ok: 0, bytes: 0, n: (x1 - x0 + 1) * (y1 - y0 + 1), st: 'run', err: 0 }; window['J_' + id] = J;
  const L = []; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) L.push([x, y]); let i = 0;
  const worker = async () => { while (i < L.length) { const [x, y] = L[i++];
    for (let a = 0; a < 3; a++) { try { const r = await ofetch(`https://3d.geo.admin.ch/ch.swisstopo.swissbuildings3d.3d/v1/20260520/11/${x}/${y}.b3dm`);
      if (r.ok) { const b = new Uint8Array(await r.arrayBuffer()); if (b.length) { J.files[`20260520_11_${x}_${y}.b3dm`] = b; J.ok++; J.bytes += b.length; } } break; } catch (e) { if (a === 2) J.err++; } }
    J.done++; } };
  Promise.all(Array.from({ length: 16 }, worker)).then(() => { J.st = 'ok'; });
};
// TIFF-LZW (MSB-first, «early change»), swissALTI3D: gekachelt, float32, ohne Prädiktor
window.lzw = (src) => {
  const out = []; let dict, bits, pos = 0, old = -1;
  const reset = () => { dict = []; for (let i = 0; i < 256; i++) dict.push([i]); dict.push(null, null); bits = 9; };
  reset();
  const rd = () => { let v = 0; for (let i = 0; i < bits; i++) { const B = src[(pos + i) >> 3]; v = (v << 1) | ((B >> (7 - ((pos + i) & 7))) & 1); } pos += bits; return v; };
  while (pos + bits <= src.length * 8) {
    const c = rd(); if (c === 257) break; if (c === 256) { reset(); old = -1; continue; }
    let e; if (old < 0) { e = dict[c]; for (const v of e) out.push(v); old = c; continue; }
    if (c < dict.length && dict[c]) { e = dict[c]; dict.push(dict[old].concat(e[0])); } else { e = dict[old].concat(dict[old][0]); dict.push(e); }
    for (const v of e) out.push(v); old = c;
    if (dict.length + 1 >= (1 << bits) && bits < 12) bits++;
  }
  return Uint8Array.from(out);
};
window.tif = (buf) => {
  const dv = new DataView(buf); const le = dv.getUint16(0) === 0x4949; const u16 = (o) => dv.getUint16(o, le), u32 = (o) => dv.getUint32(o, le);
  const ifd = u32(4), n = u16(ifd), T = {};
  for (let i = 0; i < n; i++) { const o = ifd + 2 + i * 12, tg = u16(o), ty = u16(o + 2), cnt = u32(o + 4); const sz = ty === 3 ? 2 : ty === 4 ? 4 : ty === 12 ? 8 : 1; const vo = cnt * sz <= 4 ? o + 8 : u32(o + 8);
    const vals = []; for (let k = 0; k < Math.min(cnt, 100000); k++) vals.push(ty === 3 ? u16(vo + k * 2) : ty === 4 ? u32(vo + k * 4) : ty === 12 ? dv.getFloat64(vo + k * 8, le) : dv.getUint8(vo + k)); T[tg] = vals; }
  const W = T[256][0], H = T[257][0], tw = T[322][0], th = T[323][0], offs = T[324], cnts = T[325];
  if (T[259][0] !== 5) throw new Error('Kompression ' + T[259][0]);
  const tx = Math.ceil(W / tw); const a = new Float32Array(W * H);
  for (let t = 0; t < offs.length; t++) { const raw = lzw(new Uint8Array(buf, offs[t], cnts[t])); const f = new DataView(raw.buffer); const x0 = (t % tx) * tw, y0 = Math.floor(t / tx) * th;
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const X = x0 + x, Y = y0 + y; if (X >= W || Y >= H) continue; const k = (y * tw + x) * 4; if (k + 4 <= raw.length) a[Y * W + X] = f.getFloat32(k, le); } }
  return { W, H, a };
};
// swissALTI3D 2 m → 4 m Int16 (dm über 400 m), Format wie data/a/alti4/E-N.i16
window.ALTI = window.ALTI || {}; window.ALOG = window.ALOG || [];
window.altiStart = (TL) => { window.altiRun = (async () => {
  const one = async ([E, N]) => { const key = E + '-' + N; if (ALTI[key]) return; let ok = false;
    for (const y of [2024, 2023, 2022, 2021, 2020, 2019]) { const u = `https://data.geo.admin.ch/ch.swisstopo.swissalti3d/swissalti3d_${y}_${key}/swissalti3d_${y}_${key}_2_2056_5728.tif`;
      try { const r = await ofetch(u); if (!r.ok) continue; const t = tif(await r.arrayBuffer()); const o = new Int16Array(250 * 250);
        for (let j = 0; j < 250; j++) for (let i = 0; i < 250; i++) { const s = (t.a[(2 * j) * 500 + 2 * i] + t.a[(2 * j) * 500 + 2 * i + 1] + t.a[(2 * j + 1) * 500 + 2 * i] + t.a[(2 * j + 1) * 500 + 2 * i + 1]) / 4; o[j * 250 + i] = Math.round((s - 400) * 10); }
        ALTI[key] = [y, o]; ok = true; break; } catch (e) { ALOG.push([key, y, String(e)]); } }
    if (!ok) ALOG.push([key, 'fehlt']); };
  let i = 0; await Promise.all(Array.from({ length: 4 }, async () => { while (i < TL.length) await one(TL[i++]); }));
  ALOG.push('fertig ' + Object.keys(ALTI).length); })(); };
// Höhen-Kachel für die Übertragung: Zeilen-Delta + Byte-Shuffle (tools/geo/unpack_region.py)
window.altiDS = (a) => { const d = new Int16Array(a.length); for (let i = 0; i < a.length; i++) d[i] = i % 250 ? a[i] - a[i - 1] : (i >= 250 ? a[i] - a[i - 250] : a[i]);
  const u = new Uint8Array(d.buffer), s = new Uint8Array(u.length), h = u.length / 2; for (let i = 0; i < h; i++) { s[i] = u[2 * i]; s[h + i] = u[2 * i + 1]; } return s; };
// Overpass mit Wiederholung
window.overpass = async (q) => { for (let a = 0; a < 5; a++) { try { const r = await ofetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q) }); const t = await r.text();
  if (t[0] === '{') return new TextEncoder().encode(JSON.stringify(JSON.parse(t))); } catch (e) {} await new Promise((r) => setTimeout(r, 25000)); } return null; };
'Helfer geladen';
