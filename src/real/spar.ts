// P-A Lauf 3: Sparformen für die ganze Stadt (Dreiecksbudget) + gemeinsames Material.
// Ein Material «realMaterial» für alle Sparformen: Vertex-Farben, Leuchtteile (Attribut aGlow, Nachtlicht über NIGHT.value)
// und Tönung (aTint: nur Flächen mit aTint = 1 nehmen die Instanzfarbe an – Autolack ja, Scheiben/Räder nein).
// → Leuchtteil und Körper in EINEM Netz = 1 Zeichenaufruf je Bausteinart.
// Budget (Auftrag Lauf 3): moderne Leuchte ≤ 28, Kandelaber ≤ 48, Wartehalle ≤ 120, Bank ≤ 60, geparktes Auto ≤ 180, Verkehrsauto ≤ 260.
import * as THREE from 'three';
import { toon, NIGHT } from '../world';
import { REAL } from './config';
import { sparParts, quad, box, tris, type SparPart } from './geo';
import type { CarType } from './cars';

let MAT: THREE.MeshToonMaterial | null = null;
const U = { glow: { value: new THREE.Color('#FFD27A') }, day: { value: new THREE.Color('#5A4E20') } };
/** gemeinsames Material aller Sparformen (zwischengespeichert) */
export function realMaterial() {
  if (MAT) return MAT;
  const m = toon('#ffffff', { vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = REAL.night ? NIGHT : { value: 0 }; sh.uniforms.uGlow = U.glow; sh.uniforms.uDay = U.day;
    sh.vertexShader = 'attribute float aGlow;\nattribute float aTint;\nvarying float vGlow;\n' + sh.vertexShader.replace('#include <color_vertex>', `
      #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
        vColor = vec3( 1.0 );
      #endif
      #ifdef USE_COLOR
        vColor *= color;
      #endif
      #ifdef USE_INSTANCING_COLOR
        vColor *= mix( vec3( 1.0 ), instanceColor.xyz, aTint );
      #endif
      vGlow = aGlow;`);
    sh.fragmentShader = 'uniform float uNight;\nuniform vec3 uGlow;\nuniform vec3 uDay;\nvarying float vGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vGlow * mix( uDay, uGlow, clamp( uNight, 0.0, 1.0 ) );');
  };
  m.customProgramCacheKey = () => 'realSpar' + (REAL.night ? 1 : 0);
  m.name = 'realSpar';
  MAT = m; return m;
}

const C4 = (rT: number, rB: number, h: number, seg: number, y0 = 0, x = 0, z = 0) => new THREE.CylinderGeometry(rT, rB, h, seg, 1, true).translate(x, y0 + h / 2, z);
export type SparKind = 'leuchte' | 'leuchte_modern' | 'kandelaber' | 'wartehalle' | 'bank' | 'velostaender' | 'velo';
const CACHE = new Map<string, THREE.BufferGeometry>();
/** Sparform eines Möbels (Front/Ausleger nach +z, Fuss y = 0) */
export function sparGeometry(k: SparKind): THREE.BufferGeometry {
  const c = CACHE.get(k); if (c) return c;
  let P: SparPart[] = [];
  switch (k) {
    case 'leuchte': // bisherige Laterne (4.6 m, Kopf zur Fahrbahn), Kopf leuchtet: 20 Dreiecke (alt 32)
      P = [[C4(0.07, 0.1, 4.6, 4), '#3E4A45'], [box(0.32, 0.22, 0.7, 0, 4.65, 0.25), '#FFF2B8', 1]]; break;
    case 'leuchte_modern': // Mast 8 m + Ausleger mit Leuchte als ein Kasten, Unterseite leuchtet: 20 Dreiecke
      P = [[C4(0.07, 0.11, 8, 4), '#7D858B'], [box(0.3, 0.14, 1.9, 0, 7.95, 0.85), '#6A7177', 'unten']]; break;
    case 'kandelaber': { // Altstadt: Sockel, Mast, Laterne (5-eckig) mit Boden und Dach: 38 Dreiecke
      const G = '#2F4A3C', bottom = new THREE.CircleGeometry(0.14, 5).rotateX(Math.PI / 2).translate(0, 4.35, 0);
      P = [[C4(0.16, 0.2, 0.6, 5), G], [C4(0.06, 0.08, 3.75, 4, 0.6), G], [C4(0.22, 0.14, 0.45, 5, 4.35), '#FFF2B8', 1], [bottom, '#FFF2B8', 1],
        [new THREE.ConeGeometry(0.3, 0.32, 5, 1, true).translate(0, 4.96, 0), G]]; break; }
    case 'wartehalle': { // 4.2 × 1.8 m, offene Front +z; Dach-Unterseite leuchtet, Vitrine leuchtet: 108 Dreiecke
      const S = '#5B6770';
      P = [[box(4.2, 0.12, 1.8, 0, 2.5, 0), '#E8ECEE', 'unten'], [box(3.9, 2.1, 0.03, 0, 1.25, -0.8), '#BFD8E6'], [box(0.03, 2.1, 1.5, -2.0, 1.25, 0), '#BFD8E6'],
        [box(0.08, 2.44, 0.08, -2.0, 1.22, 0.8), S], [box(0.08, 2.44, 0.08, 2.0, 1.22, 0.8), S], [box(2.2, 0.5, 0.4, 0.3, 0.25, -0.55), '#8A5A36'],
        [box(0.06, 2.9, 0.06, 2.4, 1.45, 0.9), '#8A8F94'], [box(0.62, 0.62, 0.05, 2.4, 2.75, 0.9), '#1E5AA8'], [box(0.6, 1.2, 0.1, 1.4, 1.4, -0.75), '#F4F1E6', 1]]; break; }
    case 'bank': // Sitz, Lehne (Holz), 2 Wangen: 48 Dreiecke
      P = [[box(1.8, 0.06, 0.42, 0, 0.45, -0.02), '#8A5A36'], [box(1.8, 0.3, 0.04, 0, 0.7, -0.24), '#8A5A36'], [box(0.06, 0.45, 0.5, -0.8, 0.22, -0.02), '#2F3437'], [box(0.06, 0.45, 0.5, 0.8, 0.22, -0.02), '#2F3437']]; break;
    case 'velostaender': // 3 Bügel aus je 3 Stäben: 108 Dreiecke
      for (const x of [-0.9, 0, 0.9]) P.push([box(0.05, 0.8, 0.05, x, 0.4, -0.4), '#8E959A'], [box(0.05, 0.8, 0.05, x, 0.4, 0.4), '#8E959A'], [box(0.05, 0.05, 0.85, x, 0.8, 0), '#8E959A']);
      break;
    case 'velo': { // Räder 8-eckige Scheiben, Rahmen 3 Stäbe, Lenker: 112 Dreiecke; Rahmen getönt (Instanzfarbe)
      const wheel = (z: number) => new THREE.CylinderGeometry(0.34, 0.34, 0.04, 8).rotateZ(Math.PI / 2).translate(0, 0.34, z);
      P = [[wheel(0.55), '#1E2125'], [wheel(-0.5), '#1E2125'], [box(0.05, 0.05, 0.85, 0, 0.6, 0.02), '#FFFFFF', 0, 1], [box(0.05, 0.5, 0.05, 0, 0.6, -0.12), '#FFFFFF', 0, 1],
        [box(0.05, 0.05, 1.0, 0, 0.36, 0.02), '#FFFFFF', 0, 1], [box(0.5, 0.05, 0.05, 0, 0.95, 0.42), '#2A2E33']]; break; }
  }
  const g = sparParts(P); CACHE.set(k, g); return g;
}

/** Sparform Auto (ein Netz): Profil-Körper getönt, 2 Achsen als Walzen (Räder), Scheiben und Lichter als Vierecke.
 *  88 Dreiecke – gilt für geparkte (≤ 180) und Verkehrsautos (≤ 260). Front +z. */
const PROF: Record<CarType, { p: number[][]; w: number; wf: number; wr: number; r: number; ws: number[]; rs: number[]; side: number[] }> = {
  kombi: { p: [[2.37, 0.3], [2.4, 0.72], [1.25, 0.9], [0.35, 1.42], [-1.95, 1.46], [-2.35, 1.0], [-2.38, 0.3]], w: 1.82, wf: 1.45, wr: -1.4, r: 0.33, ws: [1.25, 0.9, 0.35, 1.42], rs: [-2.35, 1.0, -1.95, 1.46], side: [-1.9, 0.3, 1.0, 1.36] },
  kleinwagen: { p: [[1.95, 0.3], [1.98, 0.74], [1.08, 0.93], [0.3, 1.46], [-1.6, 1.48], [-1.92, 1.05], [-1.95, 0.3]], w: 1.72, wf: 1.22, wr: -1.25, r: 0.3, ws: [1.08, 0.93, 0.3, 1.46], rs: [-1.92, 1.05, -1.6, 1.48], side: [-1.5, 0.22, 1.0, 1.38] },
  suv: { p: [[2.28, 0.42], [2.32, 1.0], [1.2, 1.14], [0.4, 1.64], [-1.8, 1.68], [-2.28, 1.22], [-2.3, 0.42]], w: 1.88, wf: 1.38, wr: -1.38, r: 0.38, ws: [1.2, 1.14, 0.4, 1.64], rs: [-2.28, 1.22, -1.8, 1.68], side: [-1.8, 0.35, 1.18, 1.56] },
  lieferwagen: { p: [[2.7, 0.35], [2.72, 0.95], [2.15, 1.25], [1.45, 2.22], [-2.62, 2.28], [-2.7, 2.1], [-2.7, 0.35]], w: 2.0, wf: 1.95, wr: -1.65, r: 0.35, ws: [2.15, 1.25, 1.45, 2.22], rs: [-2.7, 0.8, -2.7, 0.8], side: [1.0, 1.75, 1.3, 1.95] },
};
export function sparCarGeometry(t: CarType): THREE.BufferGeometry {
  const key = 'car:' + t; const c = CACHE.get(key); if (c) return c;
  const D = PROF[t], hw = D.w / 2, s = new THREE.Shape(); s.moveTo(D.p[0][0], D.p[0][1]); for (const q of D.p.slice(1)) s.lineTo(q[0], q[1]);
  const bodyG = new THREE.ExtrudeGeometry(s, { depth: D.w, bevelEnabled: false }); bodyG.rotateY(-Math.PI / 2); bodyG.translate(hw, 0, 0);
  const axle = (z: number) => new THREE.CylinderGeometry(D.r, D.r, D.w - 0.1, 6).rotateZ(Math.PI / 2).translate(0, D.r, z);
  const e = 0.01, GL = '#3E5568';
  const [zb, yb, zt, yt] = D.ws;
  const P: SparPart[] = [[bodyG, '#FFFFFF', 0, 1], [axle(D.wf), '#1E2125'], [axle(D.wr), '#1E2125'],
    [quad([-hw + 0.1, yb + 0.02, zb + e], [hw - 0.1, yb + 0.02, zb + e], [hw - 0.1, yt - 0.03, zt + e], [-hw + 0.1, yt - 0.03, zt + e], [0, 1, 1]), GL]];
  if (t !== 'lieferwagen') { const [z0, y0, z1, y1] = D.rs; P.push([quad([-hw + 0.1, y0 + 0.02, z0 - e], [hw - 0.1, y0 + 0.02, z0 - e], [hw - 0.1, y1 - 0.03, z1 - e], [-hw + 0.1, y1 - 0.03, z1 - e], [0, 1, -1]), GL]); }
  const [sz0, sz1, sy0, sy1] = D.side;
  for (const sx of [-1, 1]) P.push([quad([sx * (hw + e), sy0, sz0], [sx * (hw + e), sy0, sz1], [sx * (hw + e), sy1, sz1], [sx * (hw + e), sy1, sz0], [sx, 0, 0]), GL]);
  const zf = D.p[1][0] + e, zr = D.p[D.p.length - 1][0] - e, yl = D.p[1][1] - 0.18;
  for (const sx of [-1, 1]) {
    P.push([quad([sx * (hw - 0.1), yl, zf], [sx * (hw - 0.45), yl, zf], [sx * (hw - 0.45), yl + 0.12, zf], [sx * (hw - 0.1), yl + 0.12, zf], [0, 0, 1]), '#FFF4C2']);
    P.push([quad([sx * (hw - 0.08), yl, zr], [sx * (hw - 0.38), yl, zr], [sx * (hw - 0.38), yl + 0.12, zr], [sx * (hw - 0.08), yl + 0.12, zr], [0, 0, -1]), '#C0392B']);
  }
  const g = sparParts(P); CACHE.set(key, g); return g;
}
export function sparTris(): Record<string, number> {
  const o: Record<string, number> = {};
  for (const k of ['leuchte', 'leuchte_modern', 'kandelaber', 'wartehalle', 'bank', 'velostaender', 'velo'] as SparKind[]) o[k] = tris(sparGeometry(k));
  for (const t of ['kombi', 'kleinwagen', 'suv', 'lieferwagen'] as CarType[]) o['auto_' + t] = tris(sparCarGeometry(t));
  return o;
}

/** Instanzen einer Sparform: Liste [x, z, Drehung, (Höhenfaktor)] → 1 InstancedMesh (1 Zeichenaufruf) */
export function sparInstances(k: SparKind, list: number[][], groundY: (x: number, z: number) => number, name = 'real-' + k) {
  const im = new THREE.InstancedMesh(sparGeometry(k), realMaterial(), Math.max(1, list.length)); im.count = list.length;
  const m = new THREE.Matrix4(), sc = new THREE.Matrix4();
  list.forEach(([x, z, a, sy], i) => { m.makeRotationY(a || 0); if (sy && sy !== 1) m.multiply(sc.makeScale(1, sy, 1)); m.setPosition(x, groundY(x, z), z); im.setMatrixAt(i, m); });
  im.computeBoundingSphere(); im.name = name; return im;
}

/** Statische Teile fest zusammenbacken (geparkte Autos, Velos): je Zelle (m) ein Netz → 1 Zeichenaufruf je sichtbare Zelle,
 *  Farben eingebacken (Tönung nur wo aTint = 1). items: [Geometrie, Matrix, Farbe] */
export function bakeCells(items: [THREE.BufferGeometry, THREE.Matrix4, THREE.Color | null][], cell = 500, name = 'real-statisch') {
  const by = new Map<string, THREE.BufferGeometry[]>(), v = new THREE.Vector3();
  for (const [g, m, col] of items) {
    v.setFromMatrixPosition(m); const k = Math.floor(v.x / cell) + ',' + Math.floor(v.z / cell);
    const q = g.clone().applyMatrix4(m);
    if (col) { const c = q.getAttribute('color'), t = q.getAttribute('aTint'); for (let i = 0; i < c.count; i++) if (t.getX(i) > 0.5) c.setXYZ(i, c.getX(i) * col.r, c.getY(i) * col.g, c.getZ(i) * col.b); }
    const a = by.get(k) || []; a.push(q); by.set(k, a);
  }
  const out: THREE.Mesh[] = [];
  for (const gs of by.values()) { const mm = new THREE.Mesh(mergeAll(gs), realMaterial()); mm.name = name; mm.geometry.computeBoundingSphere(); out.push(mm); }
  return out;
}
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
function mergeAll(gs: THREE.BufferGeometry[]) { return mergeGeometries(gs, false)!; }
