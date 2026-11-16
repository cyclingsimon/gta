import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CityData } from './world';

/** 17a: Tempo-30-Zonen. Wo eine Quartierstrasse von einer Hauptstrasse abzweigt, steht rechts das Zonensignal (SSV 2.59.1: weisse Tafel,
 *  roter Ring mit 30, darunter «ZONE») und auf der Fahrbahn ist gross «30» aufgemalt. [Annahme: Quartierstrassen ohne OSM-Tempo = Zone 30,
 *  wie in Luzern und den Agglomerationsgemeinden üblich.] frei(x, z) = Pfosten darf hier stehen. */
export function buildZone30(roads: CityData['roads'], yOf: (x: number, z: number) => number, frei: (x: number, z: number) => boolean): THREE.Group | null {
  const key = (q: number[]) => Math.round(q[0]) + ',' + Math.round(q[1]);
  const main = new Set<string>(); for (const r of roads) if (r.L && (r.v || 50) >= 50 && !(r as any).tu) for (const q of r.p) main.add(key(q));
  const QUART = new Set(['residential', 'living_street', 'unclassified']);
  const decal: number[][] = [], signs: number[][] = [], seen: number[][] = [];
  for (const r of roads) { if (!QUART.has(r.c) || r.L || r.b || (r as any).tu || r.p.length < 2 || r.w < 4.5) continue;
    for (const end of [0, 1]) { const p = end ? r.p.slice().reverse() : r.p; if (!main.has(key(p[0]))) continue; if (r.o && end) continue; // Einbahn: nur am Einfahrtsende
      let len = 0; for (let i = 0; i + 1 < p.length; i++) len += Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]); if (len < 40) continue;
      if (seen.some((s) => Math.hypot(s[0] - p[0][0], s[1] - p[0][1]) < 25)) continue; seen.push(p[0]);
      // Punkt 17 m (hinter einem Fussgängerstreifen) nach dem Knoten
      let acc = 0, i = 0; while (i + 1 < p.length - 1 && acc + Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]) < 17) { acc += Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]); i++; }
      const A = p[i], B = p[i + 1], sl = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, ux = (B[0] - A[0]) / sl, uz = (B[1] - A[1]) / sl, t = Math.min(sl, 17 - acc), x = A[0] + ux * t, z = A[1] + uz * t;
      const rx = -uz, rz = ux; // rechts in Fahrtrichtung (Spielkoordinaten: x nach Osten, z nach Süden)
      const lane = r.o || r.w < 5.4 ? 0 : r.w / 4; decal.push([x + rx * lane, z + rz * lane, ux, uz]);
      const sx = x - ux * 5 + rx * (r.w / 2 + 0.8), sz = z - uz * 5 + rz * (r.w / 2 + 0.8); if (frei(sx, sz)) signs.push([sx, sz, Math.atan2(ux, uz)]); } }
  if (!decal.length) return null;
  const grp = new THREE.Group(); grp.name = 'zone30';
  { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const g = cv.getContext('2d')!; g.clearRect(0, 0, 128, 256); g.fillStyle = '#F4F4F0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 100px sans-serif';
    g.save(); g.translate(64, 132); g.scale(1, 2.3); g.fillText('30', 0, 0); g.restore();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; const pos: number[] = [], uv: number[] = [];
    for (const [x, z, ux, uz] of decal) { const hw = 0.95, hl = 2.1, nx = -uz, nz = ux;
      const P = [[x - nx * hw - ux * hl, z - nz * hw - uz * hl, 0, 0], [x + nx * hw - ux * hl, z + nz * hw - uz * hl, 1, 0], [x + nx * hw + ux * hl, z + nz * hw + uz * hl, 1, 1], [x - nx * hw + ux * hl, z - nz * hw + uz * hl, 0, 1]];
      for (const q of [0, 1, 2, 0, 2, 3]) { const [px, pz, u, v] = P[q]; pos.push(px, yOf(px, pz) + 0.39, pz); uv.push(u, v); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    grp.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide }))); }
  if (signs.length) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 192; const g = cv.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 192); g.strokeStyle = '#222'; g.lineWidth = 3; g.strokeRect(2, 2, 124, 188);
    g.fillStyle = '#D5202A'; g.beginPath(); g.arc(64, 66, 52, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 66, 39, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 50px sans-serif'; g.fillText('30', 64, 69); g.font = 'bold 34px sans-serif'; g.fillText('ZONE', 64, 156);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; const front: THREE.BufferGeometry[] = [], rest: THREE.BufferGeometry[] = [];
    for (const [x, z, h] of signs) { const y = yOf(x, z); const f = new THREE.PlaneGeometry(0.6, 0.9); f.rotateY(h + Math.PI); f.translate(x, y + 2.45, z); front.push(f);
      const bk = new THREE.PlaneGeometry(0.6, 0.9); bk.rotateY(h); bk.translate(x + Math.sin(h) * 0.01, y + 2.45, z + Math.cos(h) * 0.01); bk.deleteAttribute('uv'); rest.push(bk);
      const c = new THREE.CylinderGeometry(0.035, 0.035, 2.9, 5, 1, true); c.deleteAttribute('uv'); c.translate(x, y + 1.45, z); rest.push(c); }
    grp.add(new THREE.Mesh(mergeGeometries(front)!, new THREE.MeshBasicMaterial({ map: tex }))); grp.add(new THREE.Mesh(mergeGeometries(rest.map((q) => q.toNonIndexed()))!, new THREE.MeshLambertMaterial({ color: '#8C9299' }))); }
  (window as any).__zone30 = decal.slice(0, 200).map((q) => [Math.round(q[0]), Math.round(q[1]), q[2], q[3]]);
  console.log('[bau] Zone 30: Bodenzeichen', decal.length, 'Signale', signs.length); return grp;
}
