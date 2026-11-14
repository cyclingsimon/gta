// P-A Lauf 4: Kleinmöbel Stadt – Abfallkübel, Robidog, Post-Briefkasten, Hydrant. Je Art ≤ 32 Dreiecke (gemessen 18–23),
// ein InstancedMesh je Art über das Sparmaterial (realMaterial) → höchstens 4 Zeichenaufrufe (+ Zellteilung durch chunkInstanced).
// Standorte sind HERGELEITET, nicht gemessen [Annahme, Vertrauen niedrig–mittel]: props.json enthält keine OSM-Standorte dieser Möbel.
//  - Abfallkübel: an jeder Haltestelle + an jeder 8. Bank
//  - Robidog (grün): an Fusswegen (path) alle ~1000 m Weglänge
//  - Hydrant (rot): an Wohnstrassen (residential/living_street) alle ~400 m, 0.6 m neben dem Fahrbahnrand
//  - Briefkasten (gelb): selten (~15 %) an Haltestellen im Ortskern (Box x −900..600, z −500..900)
// Budget ganz Luzern: ≤ 25 000 Dreiecke – wird hart begrenzt (Listen gleichmässig ausgedünnt).
import * as THREE from 'three';
import { REAL } from './config';
import { box, hash2, tris, sparParts } from './geo';
import { realMaterial } from './spar';

export type StreetKind = 'kuebel' | 'robidog' | 'briefkasten' | 'hydrant';
const C = (rT: number, rB: number, h: number, seg: number, y0 = 0, x = 0, z = 0) => new THREE.CylinderGeometry(rT, rB, h, seg, 1, true).translate(x, y0 + h / 2, z);
const CACHE = new Map<StreetKind, THREE.BufferGeometry>();
export function streetGeometry(k: StreetKind) {
  const c = CACHE.get(k); if (c) return c;
  let g: THREE.BufferGeometry;
  switch (k) {
    case 'kuebel': g = sparParts([[C(0.03, 0.03, 1.0, 4, 0, 0, -0.24), '#5C6166'], [C(0.21, 0.18, 0.62, 5, 0.3), '#6E7579'],
      [new THREE.CircleGeometry(0.21, 5).rotateX(-Math.PI / 2).translate(0, 0.92, 0), '#4A5054']]); break;          // 23
    case 'robidog': g = sparParts([[C(0.03, 0.03, 1.3, 4), '#5C6166'], [box(0.36, 0.7, 0.28, 0, 0.85, 0.1), '#2E8B3E']]); break; // 20
    case 'briefkasten': g = sparParts([[C(0.05, 0.05, 0.85, 4, 0, 0, -0.05), '#5C6166'], [box(0.42, 0.6, 0.32, 0, 1.15, 0), '#FFCC00']]); break; // 20
    case 'hydrant': g = sparParts([[C(0.13, 0.15, 0.72, 6), '#C8262C'], [new THREE.ConeGeometry(0.14, 0.18, 6, 1, true).translate(0, 0.81, 0), '#C8262C']]); break; // 18
  }
  CACHE.set(k, g!); return g!;
}
export function streetTris(): Record<StreetKind, number> {
  const o = {} as Record<StreetKind, number>; for (const k of ['kuebel', 'robidog', 'briefkasten', 'hydrant'] as StreetKind[]) o[k] = tris(streetGeometry(k)); return o;
}

type Road = { p: number[][]; c: string; w?: number; b?: number; tu?: number };
/** Punkte entlang von Strassen eines Typs alle «step» m, seitlich «off» m vom Rand (Seite per Hash), nur auf freier Fläche */
function along(roads: Road[], kinds: string[], step: number, off: number, mask: { at(x: number, z: number): number; isRoad(x: number, z: number): boolean }) {
  const out: number[][] = [];
  for (const r of roads) {
    if (!kinds.includes(r.c) || r.b || r.tu) continue; let acc = step * hash2(r.p[0][0], r.p[0][1]);
    for (let i = 1; i < r.p.length; i++) { const A = r.p[i - 1], B = r.p[i], L = Math.hypot(B[0] - A[0], B[1] - A[1]); if (L < 0.1) continue;
      const dx = (B[0] - A[0]) / L, dz = (B[1] - A[1]) / L;
      while (acc < L) { const side = hash2(A[0] + acc, A[1]) < 0.5 ? -1 : 1, W = (r.w || 3) / 2 + off;
        const x = A[0] + dx * acc + dz * W * side, z = A[1] + dz * acc - dx * W * side;
        if (mask.at(x, z) === 0 && !mask.isRoad(x, z)) out.push([x, z, Math.atan2(-dz * side, dx * side)]); // Front (+z) zur Strasse
        acc += step; }
      acc -= L; }
  }
  return out;
}
/** EIN-ZEILEN-EINBAU (world.ts, buildProps braucht roads → besser in buildWorld nach E6):
 *    group.add(...buildStreetFurniture(props, d.roads, mask, (x, z) => terrain.height(x, z)));
 *  props: Props aus world.ts (stops, benches). REAL.street = false → []. Rückgabe: höchstens 4 InstancedMeshes. */
export function buildStreetFurniture(props: { stops?: any[][]; benches?: number[][] } | undefined, roads: Road[], mask: { at(x: number, z: number): number; isRoad(x: number, z: number): boolean },
  groundY: (x: number, z: number) => number, budget = 25000, on = REAL.street): THREE.InstancedMesh[] {
  if (!on || !props) return [];
  const free = (x: number, z: number) => mask.at(x, z) === 0 && !mask.isRoad(x, z);
  const L: Record<StreetKind, number[][]> = { kuebel: [], robidog: [], briefkasten: [], hydrant: [] };
  for (const s of props.stops || []) { const [x, z] = s; for (const [a, b] of [[1.4, 0], [-1.4, 0], [0, 1.4], [0, -1.4]]) if (free(x + a, z + b)) { L.kuebel.push([x + a, z + b, hash2(x, z) * 6.28]); break; }
    if (x > -900 && x < 600 && z > -500 && z < 900 && hash2(x * 3.1, z) < 0.15) for (const [a, b] of [[-1.6, 1.0], [1.6, -1.0]]) if (free(x + a, z + b)) { L.briefkasten.push([x + a, z + b, hash2(z, x) * 6.28]); break; } }
  (props.benches || []).forEach(([x, z], i) => { if (i % 8 === 0) for (const [a, b] of [[1.2, 0], [-1.2, 0]]) if (free(x + a, z + b)) { L.kuebel.push([x + a, z + b, 0]); break; } });
  L.robidog = along(roads, ['path'], 1000, 0.8, mask);
  L.hydrant = along(roads, ['residential', 'living_street'], 400, 0.6, mask);
  // Budget hart einhalten: alle Listen gleichmässig ausdünnen
  const T = streetTris(); let sum = 0; for (const k in L) sum += L[k as StreetKind].length * T[k as StreetKind];
  const keep = sum > budget ? budget / sum : 1;
  const out: THREE.InstancedMesh[] = [], m = new THREE.Matrix4();
  for (const k of Object.keys(L) as StreetKind[]) {
    const list = keep < 1 ? L[k].filter((_, i) => Math.floor((i + 1) * keep) > Math.floor(i * keep)) : L[k]; if (!list.length) continue;
    const im = new THREE.InstancedMesh(streetGeometry(k), realMaterial(), list.length);
    list.forEach(([x, z, a], i) => { m.makeRotationY(a); m.setPosition(x, groundY(x, z), z); im.setMatrixAt(i, m); });
    im.computeBoundingSphere(); im.name = 'strassenmoebel-' + k; out.push(im);
  }
  return out;
}
