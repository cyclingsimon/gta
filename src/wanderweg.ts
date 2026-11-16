import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CityData } from './world';
import { SIGN_PLACES } from './signPlaces';

/** 17a: Gelbe Wanderwegweiser an Verzweigungen von Wegen und Feldstrassen (OSM path/track): Pfosten mit gelben Pfeiltafeln,
 *  Ziel = nächster Ort in dieser Richtung, Gehzeit bei 4.2 km/h mit 25 % Umwegzuschlag [Annahme]. Mindestabstand 300 m. */
export function buildWanderwegweiser(d: CityData, yOf: (x: number, z: number) => number, frei: (x: number, z: number) => boolean): THREE.Group | null {
  const key = (q: number[]) => Math.round(q[0]) + ',' + Math.round(q[1]);
  const at = new Map<string, { r: CityData['roads'][0]; i: number }[]>();
  for (const r of d.roads) { if ((r.c !== 'path' && r.c !== 'track') || r.b || (r as any).tu || r.p.length < 2) continue; r.p.forEach((q, i) => { const k = key(q); if (!at.has(k)) at.set(k, []); at.get(k)!.push({ r, i }); }); }
  const along = (r: CityData['roads'][0], i: number, dir: number) => { let acc = 0, k = i; while (acc < 60) { const n = k + dir; if (n < 0 || n >= r.p.length) break; acc += Math.hypot(r.p[n][0] - r.p[k][0], r.p[n][1] - r.p[k][1]); k = n; }
    const x = r.p[k][0] - r.p[i][0], z = r.p[k][1] - r.p[i][1], L = Math.hypot(x, z); return L > 8 ? [x / L, z / L] : null; };
  type Panel = { x: number; z: number; y: number; ux: number; uz: number; txt: string };
  const panels: Panel[] = [], poles: number[][] = [], done: number[][] = [];
  for (const [k, list] of at) { const br: number[][] = []; for (const e of list) for (const dir of [-1, 1]) { const u = along(e.r, e.i, dir); if (u && !br.some((b) => b[0] * u[0] + b[1] * u[1] > 0.9)) br.push(u); }
    if (br.length < 3) continue; const [jx, jz] = k.split(',').map(Number); if (done.some((q) => Math.hypot(q[0] - jx, q[1] - jz) < 300)) continue;
    const used = new Set<string>(), signs: { u: number[]; txt: string }[] = [];
    for (const u of br) { let best: [number, string, number] | null = null;
      for (const [n, px, pz] of SIGN_PLACES) { const dx = px - jx, dz = pz - jz, dist = Math.hypot(dx, dz); if (dist < 350 || dist > 7000 || used.has(n)) continue; const cos = (dx * u[0] + dz * u[1]) / dist; if (cos < 0.8) continue; const sc = (1 - cos) * 5 + dist / 6000; if (!best || sc < best[0]) best = [sc, n, dist]; }
      if (!best) continue; used.add(best[1]); const min = Math.max(5, Math.round(best[2] * 1.25 / 70 / 5) * 5); signs.push({ u, txt: best[1] + '|' + (min >= 60 ? Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : '') : min + ' min') }); }
    if (!signs.length) continue;
    let px = jx, pz = jz, ok = false; for (let r = 2; r <= 5 && !ok; r++) for (let a = 0; a < 8 && !ok; a++) { const x = jx + Math.sin(a * Math.PI / 4) * r, z = jz + Math.cos(a * Math.PI / 4) * r; if (frei(x, z)) { px = x; pz = z; ok = true; } }
    if (!ok) continue; done.push([jx, jz]); const y = yOf(px, pz); poles.push([px, pz, y, Math.min(3, signs.length)]);
    signs.slice(0, 3).forEach((s, n) => panels.push({ x: px, z: pz, y: y + 2.0 + n * 0.36, ux: s.u[0], uz: s.u[1], txt: s.txt })); }
  if (!panels.length) return null;
  const names = [...new Set(panels.map((p) => p.txt))], RH = 48, W = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = THREE.MathUtils.ceilPowerOfTwo(names.length * 2 * RH); const g = cv.getContext('2d')!;
  names.forEach((t, i) => { const [nm, zeit] = t.split('|');
    for (const side of [0, 1]) { const y0 = (i * 2 + side) * RH; g.save(); if (side) { g.translate(W, 0); g.scale(-1, 1); }
      g.fillStyle = '#F6C915'; g.beginPath(); g.moveTo(2, y0 + 4); g.lineTo(W - 30, y0 + 4); g.lineTo(W - 3, y0 + RH / 2); g.lineTo(W - 30, y0 + RH - 4); g.lineTo(2, y0 + RH - 4); g.closePath(); g.fill(); g.strokeStyle = '#2A2A2A'; g.lineWidth = 2; g.stroke(); g.restore();
      g.fillStyle = '#17181A'; g.textBaseline = 'middle'; let fs = 22; g.font = `bold ${fs}px sans-serif`; while (g.measureText(nm).width > 130 && fs > 12) { fs--; g.font = `bold ${fs}px sans-serif`; }
      g.textAlign = 'left'; g.fillText(nm, side ? 36 : 10, y0 + RH / 2 + 1); g.font = '16px sans-serif'; g.textAlign = 'right'; g.fillText(zeit, side ? W - 10 : W - 36, y0 + RH / 2 + 1); } });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const pos: number[] = [], uv: number[] = [], L = 1.4, H = 0.265, V = cv.height;
  for (const p of panels) { const i = names.indexOf(p.txt), ax = p.x + p.ux * 0.06, az = p.z + p.uz * 0.06, bx = p.x + p.ux * (L + 0.06), bz = p.z + p.uz * (L + 0.06);
    for (const side of [0, 1]) { const v0 = 1 - ((i * 2 + side) * RH + RH) / V, v1 = 1 - ((i * 2 + side) * RH) / V, nx = -p.uz, nz = p.ux, e = side ? -0.012 : 0.012;
      const A = [ax + nx * e, p.y, az + nz * e], B = [bx + nx * e, p.y, bz + nz * e], C = [bx + nx * e, p.y + H, bz + nz * e], D = [ax + nx * e, p.y + H, az + nz * e]; const [ua, ub] = side ? [1, 0] : [0, 1];
      const tri = side ? [[A, ua, v0], [C, ub, v1], [B, ub, v0], [A, ua, v0], [D, ua, v1], [C, ub, v1]] : [[A, ua, v0], [B, ub, v0], [C, ub, v1], [A, ua, v0], [C, ub, v1], [D, ua, v1]];
      for (const [P, u, v] of tri as [number[], number, number][]) { pos.push(P[0], P[1], P[2]); uv.push(u, v); } } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const grp = new THREE.Group(); grp.name = 'wanderwegweiser'; grp.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.FrontSide })));
  grp.add(new THREE.Mesh(mergeGeometries(poles.map(([x, z, y, n]) => { const hh = 2.05 + n * 0.36; const c = new THREE.CylinderGeometry(0.045, 0.045, hh, 5, 1, true); c.translate(x, y + hh / 2, z); return c; }))!, new THREE.MeshLambertMaterial({ color: '#8C9299' })));
  (window as any).__wanderweg = poles.map((q) => [Math.round(q[0]), Math.round(q[1])]);
  console.log('[bau] Wanderwegweiser', poles.length, 'Tafeln', panels.length); return grp;
}
