import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CityData } from './world';
import type { Terrain } from './terrain';

/** 17a: Strassennamenschilder wie in Schweizer Städten – blaue Tafel, weisse Schrift, an einem Pfosten an der Strassenecke,
 *  je Strasse eine Tafel parallel zu ihrer Strasse. Namen aus OSM (Strassennamen, keine Marken). Ein Netz + ein Atlas je Gegend.
 *  frei(x, z) = Punkt ist weder Haus noch Fahrbahn. Rückgabe: Anzahl Pfosten. */
export function strassenschilder(d: CityData, terrain: Terrain, group: THREE.Group, steel: THREE.Material, frei: (x: number, z: number) => boolean, maxNamen = 408): number {
  const CAR = new Set(['primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'pedestrian']);
  const key = (q: number[]) => Math.round(q[0]) + ',' + Math.round(q[1]);
  type E = { r: CityData['roads'][0]; i: number };
  const at = new Map<string, E[]>();
  for (const r of d.roads) { if (!r.n || r.b || (r as any).tu || !CAR.has(r.c) || r.p.length < 2) continue; r.p.forEach((q, i) => { const k = key(q); if (!at.has(k)) at.set(k, []); at.get(k)!.push({ r, i }); }); }
  const dirOf = (e: E, dir: number): number[] | null => { let acc = 0, k = e.i; const p = e.r.p; while (acc < 14) { const n = k + dir; if (n < 0 || n >= p.length) break; acc += Math.hypot(p[n][0] - p[k][0], p[n][1] - p[k][1]); k = n; }
    const x = p[k][0] - p[e.i][0], z = p[k][1] - p[e.i][1], L = Math.hypot(x, z); return L > 6 ? [x / L, z / L] : null; };
  type Panel = { x: number; z: number; y: number; ux: number; uz: number; name: string };
  const panels: Panel[] = [], poles: number[][] = [], names = new Map<string, number>(), cell = new Map<string, number[][]>();
  const near = (x: number, z: number) => { const cx = Math.floor(x / 60), cz = Math.floor(z / 60); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const q of cell.get((cx + a) + ',' + (cz + b)) || []) if (Math.hypot(q[0] - x, q[1] - z) < 55) return true; return false; };
  for (const [k, list] of at) {
    const ns = [...new Set(list.map((e) => e.r.n))]; if (ns.length < 2) continue;
    const [jx, jz] = k.split(',').map(Number); if (near(jx, jz)) continue;
    // zwei Äste mit verschiedenen Namen, möglichst rechtwinklig
    const br: { u: number[]; r: CityData['roads'][0] }[] = []; for (const e of list) for (const dir of [-1, 1]) { const u = dirOf(e, dir); if (u) br.push({ u, r: e.r }); }
    let best: [number, number, number] | null = null;
    for (let a = 0; a < br.length; a++) for (let b = a + 1; b < br.length; b++) { if (br[a].r.n === br[b].r.n) continue; const dot = Math.abs(br[a].u[0] * br[b].u[0] + br[a].u[1] * br[b].u[1]); if (dot > 0.75) continue; if (!best || dot < best[0]) best = [dot, a, b]; }
    if (!best) continue; const A = br[best[1]], B = br[best[2]];
    const nNew = (names.has(A.r.n) ? 0 : 1) + (names.has(B.r.n) ? 0 : 1); if (names.size + nNew > maxNamen) continue;
    // Pfosten in der Ecke zwischen den beiden Ästen: je halbe Breite der anderen Strasse + 1.6 m hinein
    const px = jx + A.u[0] * (B.r.w / 2 + 1.6) + B.u[0] * (A.r.w / 2 + 1.6), pz = jz + A.u[1] * (B.r.w / 2 + 1.6) + B.u[1] * (A.r.w / 2 + 1.6);
    if (!frei(px, pz)) continue;
    const y = terrain.height(px, pz); poles.push([px, pz, y]);
    const ck = Math.floor(jx / 60) + ',' + Math.floor(jz / 60); if (!cell.has(ck)) cell.set(ck, []); cell.get(ck)!.push([jx, jz]);
    [A, B].forEach((s, n) => { if (!names.has(s.r.n)) names.set(s.r.n, names.size); panels.push({ x: px, z: pz, y: y + 2.5 + n * 0.37, ux: s.u[0], uz: s.u[1], name: s.r.n }); });
  }
  if (!panels.length) { console.log('[bau] Strassenschilder 0, Knoten', at.size); return 0; }
  const CW = 256, RH = 40, COLS = 8, rows = Math.ceil(names.size / COLS), cv = document.createElement('canvas'); cv.width = CW * COLS; cv.height = THREE.MathUtils.ceilPowerOfTwo(Math.max(1, rows) * RH); const g = cv.getContext('2d')!;
  const wOf = new Map<string, number>();
  for (const [nm, i] of names) { const x0 = (i % COLS) * CW, y0 = Math.floor(i / COLS) * RH; let fs = 25; g.font = `bold ${fs}px sans-serif`; while (g.measureText(nm).width > CW - 22 && fs > 13) { fs -= 1; g.font = `bold ${fs}px sans-serif`; }
    const tw = Math.min(CW - 4, Math.ceil(g.measureText(nm).width) + 22); wOf.set(nm, tw);
    g.fillStyle = '#fff'; g.fillRect(x0, y0 + 1, tw, RH - 2); g.fillStyle = '#1B4FA0'; g.fillRect(x0 + 2, y0 + 3, tw - 4, RH - 6); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(nm, x0 + 11, y0 + RH / 2 + 1, CW - 22); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const pos: number[] = [], uv: number[] = [], H = 0.32, V = cv.height, U = cv.width;
  for (const p of panels) { const i = names.get(p.name)!, tw = wOf.get(p.name)!, L = H * tw / (RH - 2), x0 = (i % COLS) * CW, y0 = Math.floor(i / COLS) * RH;
    const u0 = x0 / U, u1 = (x0 + tw) / U, v0 = 1 - (y0 + RH - 1) / V, v1 = 1 - (y0 + 1) / V, nx = -p.uz, nz = p.ux;
    for (const side of [0, 1]) { const e = side ? -0.012 : 0.012, ax = p.x + p.ux * 0.06 + nx * e, az = p.z + p.uz * 0.06 + nz * e, bx = p.x + p.ux * (L + 0.06) + nx * e, bz = p.z + p.uz * (L + 0.06) + nz * e;
      const A = [ax, p.y, az], B = [bx, p.y, bz], C = [bx, p.y + H, bz], D = [ax, p.y + H, az];
      // Vorderseite: gesehen von +n liegt A links? Text muss auf beiden Seiten von links nach rechts lesbar sein → u je Seite passend
      const tri: [number[], number, number][] = side ? [[A, u0, v0], [B, u1, v0], [C, u1, v1], [A, u0, v0], [C, u1, v1], [D, u0, v1]] : [[A, u1, v0], [C, u0, v1], [B, u0, v0], [A, u1, v0], [D, u1, v1], [C, u0, v1]];
      for (const [P, u, v] of tri) { pos.push(P[0], P[1], P[2]); uv.push(u, v); } } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide })); mesh.name = 'strassenschild'; group.add(mesh);
  const pg: THREE.BufferGeometry[] = []; for (const [x, z, y] of poles) { const c = new THREE.CylinderGeometry(0.04, 0.04, 3.3, 5, 1, true); c.translate(x, y + 1.65, z); pg.push(c); }
  const pm = new THREE.Mesh(mergeGeometries(pg)!, steel); pm.name = 'strassenschild'; group.add(pm);
  (window as any).__strassenschilder = poles.slice(0, 400).map((q) => [Math.round(q[0]), Math.round(q[1])]);
  console.log('[bau] Strassenschilder', poles.length, 'Namen', names.size, 'Dreiecke', panels.length * 4 + poles.length * 10);
  return poles.length;
}
