// P-A Lauf 1: Verkehrsautos ohne Marken (Kombi, Kleinwagen, SUV, Lieferwagen) + Velo, Low-Poly mit Vertex-Farben.
// Je Typ ZWEI Geometrien: «body» (weiss, wird pro Instanz per setColorAt in der Autofarbe getönt) und «fixed»
// (Scheiben, Reifen, Lichter – nicht getönt). Front zeigt nach +z, Radaufstand y = 0. Masse an typischen
// Fahrzeugklassen orientiert [Annahme, Vertrauen hoch für Grössenordnung, keine Modellvorlage].
import * as THREE from 'three';
import { parts, box, cylX, tube, tris, hash2, weighted, type Part } from './geo';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from '../world';
import { REAL } from './config';
import { buildFurniture } from './furniture';

export type CarType = 'kombi' | 'kleinwagen' | 'suv' | 'lieferwagen';
export const CAR_TYPES: CarType[] = ['kombi', 'kleinwagen', 'suv', 'lieferwagen'];
/** Länge (m) je Typ – für Abstandslogik im Verkehr */
export const CAR_LEN: Record<CarType, number> = { kombi: 4.75, kleinwagen: 3.9, suv: 4.6, lieferwagen: 5.4 };

/** Farbanteile Neuwagen 2024 (KBA Deutschland, via autohaus.de) als Näherung für die Schweiz [Annahme, Vertrauen mittel]:
 *  Grau/Silber 33 %, Schwarz 26.6 %, Weiss 19.9 %, Blau 8.9 %, Rot 4.7 %, Grün 3.1 %, Rest 3.8 %.
 *  Für die Schweiz bestätigt nur qualitativ (pressetext 10.02.2025): unbunte Farben dominieren, bei bunten Blau vor Rot und Grün.
 *  Schwarz ist im Toon-Stil leicht aufgehellt, damit Form und Kontur lesbar bleiben. */
const COLORS: [string[], number][] = [
  [['#8C9196', '#A9AEB2', '#6B7075', '#C3C6C8'], 33], [['#2A2D31', '#33373C'], 26.6], [['#F2F2EF', '#E6E7E3'], 19.9],
  [['#2F5D9E', '#1F3F73', '#5B86C2'], 8.9], [['#B8302C', '#8E2421'], 4.7], [['#4E6B4A', '#2F4F3E'], 3.1], [['#C9A24A', '#7A5A3C', '#E58A3A'], 3.8],
];
/** Autofarbe aus Zufallszahl 0..1 (deterministisch) */
export function carColor(r: number): string {
  const grp = weighted(COLORS.map(([c, w]) => [c, w] as [string[], number]), r);
  return grp[Math.floor(hash2(r * 97, 3.1) * grp.length) % grp.length];
}
/** Fahrzeugtyp-Mix im Stadtverkehr [Annahme]: Kombi 34 %, SUV 30 %, Kleinwagen 24 %, Lieferwagen 12 % */
export function carTypeFor(r: number): CarType {
  return weighted<CarType>([['kombi', 34], ['suv', 30], ['kleinwagen', 24], ['lieferwagen', 12]], r);
}

const GLASS = '#3E5568', TIRE = '#1E2125', RIM = '#9AA0A6', HEAD = '#FFF4C2', TAIL = '#C0392B', TRIM = '#2A2E33';
/** Profil-Körper: Seitenansicht (z, y) als Polygon, entlang x extrudiert (Breite w) */
function profile(pts: number[][], w: number) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(w / 2, 0, 0); return g;
}
function wheels(zf: number, zr: number, r: number, hw: number): Part[] {
  const o: Part[] = [];
  for (const z of [zf, zr]) for (const s of [-1, 1]) { o.push([cylX(r, 0.22, 10, s * hw, r, z), TIRE], [cylX(r * 0.55, 0.24, 6, s * hw, r, z), RIM]); }
  return o;
}
/** Fensterband: Seitenscheiben als dünne Boxen leicht ausserhalb des Körpers */
function sideGlass(z0: number, z1: number, y0: number, y1: number, hw: number): Part[] {
  return [[box(0.02, y1 - y0, z1 - z0, -hw, (y0 + y1) / 2, (z0 + z1) / 2), GLASS], [box(0.02, y1 - y0, z1 - z0, hw, (y0 + y1) / 2, (z0 + z1) / 2), GLASS]];
}
function lights(zf: number, zr: number, y: number, hw: number): Part[] {
  return [[box(0.36, 0.12, 0.03, -hw + 0.28, y, zf), HEAD], [box(0.36, 0.12, 0.03, hw - 0.28, y, zf), HEAD],
    [box(0.3, 0.12, 0.03, -hw + 0.22, y + 0.05, zr), TAIL], [box(0.3, 0.12, 0.03, hw - 0.22, y + 0.05, zr), TAIL]];
}

/** Scheibe zwischen Unterkante (zb, yb) und Oberkante (zt, yt), etwas nach aussen versetzt */
function screen(zb: number, yb: number, zt: number, yt: number, w: number, out = 1) {
  const L = Math.hypot(zt - zb, yt - yb) * 0.9, a = Math.atan2(zt - zb, yt - yb), nz = Math.cos(a) * 0.02 * out, ny = -Math.sin(a) * 0.02 * out;
  return new THREE.BoxGeometry(w, L, 0.03).rotateX(a).translate(0, (yb + yt) / 2 + Math.abs(ny), (zb + zt) / 2 + nz);
}
/** geneigte Scheibe: erst um x drehen, dann verschieben */
function rbox(w: number, h: number, d: number, rx: number, y: number, z: number) { return new THREE.BoxGeometry(w, h, d).rotateX(rx).translate(0, y, z); }

const CACHE = new Map<CarType, { body: THREE.BufferGeometry; fixed: THREE.BufferGeometry }>();
export function carGeometry(t: CarType) {
  const c = CACHE.get(t); if (c) return c;
  let B: Part[] = [], F: Part[] = [];
  const W = '#FFFFFF';
  switch (t) {
    case 'kombi': { // 4.75 × 1.82 × 1.48 m, langes Dach bis zum Heck
      const hw = 0.91;
      B = [[profile([[2.37, 0.3], [2.4, 0.72], [1.25, 0.9], [0.35, 1.42], [-1.95, 1.46], [-2.35, 1.0], [-2.38, 0.3]], 1.82), W]];
      F = [...wheels(1.45, -1.4, 0.33, 0.82), ...sideGlass(-1.9, 0.3, 1.0, 1.36, hw + 0.005), [screen(1.25, 0.9, 0.35, 1.42, 1.6), GLASS],
        [screen(-2.35, 1.0, -1.95, 1.46, 1.6, -1), GLASS], ...lights(2.39, -2.37, 0.78, hw), [box(1.84, 0.16, 0.12, 0, 0.36, 2.34), TRIM], [box(1.84, 0.16, 0.12, 0, 0.36, -2.34), TRIM],
        [box(0.06, 0.04, 1.6, -0.6, 1.5, -0.6), TRIM], [box(0.06, 0.04, 1.6, 0.6, 1.5, -0.6), TRIM]]; // Dachreling
      break; }
    case 'kleinwagen': { // 3.9 × 1.72 × 1.48 m, kurzes Heck
      const hw = 0.86;
      B = [[profile([[1.95, 0.3], [1.98, 0.74], [1.08, 0.93], [0.3, 1.46], [-1.6, 1.48], [-1.92, 1.05], [-1.95, 0.3]], 1.72), W]];
      F = [...wheels(1.22, -1.25, 0.3, 0.77), ...sideGlass(-1.5, 0.22, 1.0, 1.38, hw + 0.005), [screen(1.08, 0.93, 0.3, 1.46, 1.5), GLASS],
        [screen(-1.92, 1.05, -1.6, 1.48, 1.5, -1), GLASS], ...lights(1.97, -1.94, 0.8, hw), [box(1.74, 0.16, 0.1, 0, 0.36, 1.92), TRIM], [box(1.74, 0.16, 0.1, 0, 0.36, -1.92), TRIM]];
      break; }
    case 'suv': { // 4.6 × 1.88 × 1.68 m, hohe Front, Bodenfreiheit
      const hw = 0.94;
      B = [[profile([[2.28, 0.42], [2.32, 1.0], [1.2, 1.14], [0.4, 1.64], [-1.8, 1.68], [-2.28, 1.22], [-2.3, 0.42]], 1.88), W]];
      F = [...wheels(1.38, -1.38, 0.38, 0.85), ...sideGlass(-1.8, 0.35, 1.18, 1.56, hw + 0.005), [screen(1.2, 1.14, 0.4, 1.64, 1.66), GLASS],
        [screen(-2.28, 1.22, -1.8, 1.68, 1.66, -1), GLASS], ...lights(2.31, -2.29, 0.98, hw), [box(1.9, 0.26, 0.12, 0, 0.5, 2.26), TRIM], [box(1.9, 0.26, 0.12, 0, 0.5, -2.26), TRIM],
        [box(1.92, 0.12, 0.9, 0, 0.62, 1.38), TRIM], [box(1.92, 0.12, 0.9, 0, 0.62, -1.38), TRIM]]; // Radlauf-Verkleidung
      break; }
    case 'lieferwagen': { // Kastenwagen 5.4 × 2.0 × 2.3 m, kurze Haube, hoher Kasten
      const hw = 1.0;
      B = [[profile([[2.7, 0.35], [2.72, 0.95], [2.15, 1.25], [1.45, 2.22], [-2.62, 2.28], [-2.7, 2.1], [-2.7, 0.35]], 2.0), W]];
      F = [...wheels(1.95, -1.65, 0.35, 0.92), ...sideGlass(1.0, 1.75, 1.3, 1.95, hw + 0.005), [screen(2.15, 1.25, 1.45, 2.22, 1.8), GLASS],
        ...lights(2.71, -2.71, 0.95, hw), [box(2.02, 0.2, 0.12, 0, 0.42, 2.66), TRIM], [box(2.02, 0.2, 0.12, 0, 0.42, -2.68), TRIM],
        [box(0.02, 1.7, 0.02, -1.005, 1.25, -0.2), TRIM], [box(0.02, 1.7, 0.02, 1.005, 1.25, -0.2), TRIM]]; // Schiebetür-Fuge
      break; }
  }
  const o = { body: parts(B), fixed: parts(F) }; CACHE.set(t, o); return o;
}
export function carTris(): Record<CarType, number> {
  const o = {} as Record<CarType, number>; for (const t of CAR_TYPES) { const g = carGeometry(t); o[t] = tris(g.body) + tris(g.fixed); } return o;
}

/** Velo (Stadtvelo, 1.75 m lang), Rahmenfarbe als Vertex-Farbe; Instanz-Farbe tönt alles → Instanzen nahe Weiss lassen.
 *  Front nach +z, Fuss y = 0. */
let VELO: THREE.BufferGeometry | null = null;
export function veloGeometry(frame = '#2F6FB8') {
  if (VELO && frame === '#2F6FB8') return VELO;
  const V = (x: number, y: number, z: number) => ({ x, y, z }), R = 0.34;
  const ring = (z: number) => new THREE.TorusGeometry(R, 0.03, 4, 12).rotateY(Math.PI / 2).translate(0, R, z);
  const P: Part[] = [[ring(0.55), TIRE], [ring(-0.5), TIRE],
    [tube(V(0, R, -0.5), V(0, 0.62, 0.05), 0.022), frame], [tube(V(0, 0.62, 0.05), V(0, R, 0.0), 0.022), frame], [tube(V(0, R, -0.5), V(0, R, 0.0), 0.02), frame],
    [tube(V(0, 0.62, 0.05), V(0, 0.72, 0.45), 0.024), frame], [tube(V(0, 0.72, 0.45), V(0, R, 0.55), 0.02), frame], [tube(V(0, R, 0), V(0, 0.82, -0.12), 0.022), frame],
    [box(0.12, 0.05, 0.24, 0, 0.84, -0.14), TRIM], [tube(V(0, 0.72, 0.45), V(0, 0.95, 0.42), 0.02), TRIM], [tube(V(-0.28, 0.95, 0.4), V(0.28, 0.95, 0.4), 0.016), TRIM]];
  const g = parts(P); if (frame === '#2F6FB8') VELO = g; return g;
}

// ---------------------------------------------------------------------------------------------------------------
// Lauf 2: Einbau-Bausteine

/** Velo mit Fahrer:in (Baustein für Velo-Verkehr; keine Fahrlogik). Neutrale Figur (Jacke, Helm), keine Luksi-Figur. */
let RIDER: THREE.BufferGeometry | null = null;
export function veloRiderGeometry() {
  if (RIDER) return RIDER;
  const V = (x: number, y: number, z: number) => ({ x, y, z });
  const body: Part[] = [
    [tube(V(0, 0.86, -0.12), V(0, 1.42, 0.12), 0.17, 6), '#3D8BD8'],                     // Oberkörper leicht nach vorn
    [tube(V(-0.1, 0.84, -0.1), V(-0.1, 0.55, 0.08), 0.07, 5), '#2F4858'], [tube(V(0.1, 0.84, -0.1), V(0.1, 0.42, 0.0), 0.07, 5), '#2F4858'], // Beine
    [tube(V(-0.16, 1.36, 0.1), V(-0.22, 0.98, 0.4), 0.05, 5), '#3D8BD8'], [tube(V(0.16, 1.36, 0.1), V(0.22, 0.98, 0.4), 0.05, 5), '#3D8BD8'], // Arme
    [new THREE.SphereGeometry(0.12, 8, 6).translate(0, 1.6, 0.16), '#E8B98F'],
    [new THREE.SphereGeometry(0.14, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.64, 0.15), '#F2B33D'], // Helm
  ];
  RIDER = mergeGeometries([veloGeometry(), parts(body)], false)!; return RIDER;
}

/** Ersatz für die zwei bisherigen InstancedMeshes «body»/«cabin» in traffic.ts.
 *  EIN-ZEILEN-EINBAU (traffic.ts Konstruktor, statt der Zeilen `this.body = …` und `this.cabin = …`):
 *    ({ body: this.body, cabin: this.cabin } = realCarMeshes(N_CARS, bodyG, cabG) as any);
 *  Die Rückgabe verhält sich wie InstancedMesh (setMatrixAt, setColorAt, instanceMatrix.needsUpdate, frustumCulled, name),
 *  verteilt aber Auto i auf das Netz seines Typs. REAL.cars = false → exakt die bisherigen Kisten. */
export function realCarMeshes(n: number, oldBody: THREE.BufferGeometry, oldCabin: THREE.BufferGeometry, on = REAL.cars) {
  if (!on) return { body: new THREE.InstancedMesh(oldBody, toon('#ffffff'), n), cabin: new THREE.InstancedMesh(oldCabin, toon('#BFD8E6'), n) };
  const type = Array.from({ length: n }, (_, i) => carTypeFor((i * 0.618034 + 0.07) % 1));
  const idx = type.map((t, i) => type.slice(0, i).filter((u) => u === t).length);
  const mats = { body: toon('#ffffff', { vertexColors: true }), fixed: toon('#ffffff', { vertexColors: true }) };
  const nets = new Map<CarType, THREE.InstancedMesh[]>();
  for (const t of CAR_TYPES) {
    const k = type.filter((u) => u === t).length; if (!k) continue; const g = carGeometry(t);
    const b = new THREE.InstancedMesh(g.body, mats.body, k), f = new THREE.InstancedMesh(g.fixed, mats.fixed, k);
    for (const im of [b, f]) { im.frustumCulled = false; im.name = 'traffic'; }
    nets.set(t, [b, f]);
  }
  const c = new THREE.Color();
  type.forEach((t, i) => nets.get(t)![0].setColorAt(idx[i], c.set(carColor((i * 0.381966 + 0.13) % 1))));
  const proxy = (part: 0 | 1) => {
    const o = new THREE.Object3D() as any;
    for (const [, nm] of nets) o.add(nm[part]);
    o.setMatrixAt = (i: number, m: THREE.Matrix4) => nets.get(type[i])![part].setMatrixAt(idx[i], m);
    o.setColorAt = () => { /* Farben kommen aus carColor (Farbverteilung CH) */ };
    o.instanceMatrix = { set needsUpdate(v: boolean) { for (const [, nm] of nets) nm[part].instanceMatrix.needsUpdate = v; } };
    o.carType = (i: number) => type[i];
    return o as THREE.InstancedMesh;
  };
  return { body: proxy(0), cabin: proxy(1) };
}

/** Geparkte Autos am Strassenrand von Wohn-/Erschliessungsstrassen (city.json roads: residential, living_street, service,
 *  unclassified, tertiary). Abstand 6 m, Lücken per Zufall, nicht in Kreuzungsnähe (12 m), nur auf freier Fläche
 *  (Mask.at === 0, keine Strasse) – also neben der Fahrbahn, nicht im Weg [Annahme: Parkfelder/Vorplätze].
 *  EIN-ZEILEN-EINBAU (world.ts, buildWorld, nach dem Baum-Block): group.add(...buildParkedCars(d.roads, mask, (x, z) => terrain.height(x, z)));
 *  max = Obergrenze (Dreiecke ≈ 410 × max). avoid = Punkte, an denen nicht geparkt wird (props.lamps, props.stops, Bäume).
 *  REAL.parked = false → []. */
export function buildParkedCars(roads: { p: number[][]; c: string; w?: number; b?: number; tu?: number }[], mask: { at(x: number, z: number): number; isRoad(x: number, z: number): boolean },
  groundY: (x: number, z: number) => number, max = 400, on = REAL.parked, avoid: number[][] = []): THREE.InstancedMesh[] {
  if (!on) return [];
  const av = new Set<string>(); for (const [x, z] of avoid) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) av.add((Math.floor(x / 4) + a) + ',' + (Math.floor(z / 4) + b)); // Laternen, Haltestellen, Bäume: 4–8 m frei
  const OK = new Set(['residential', 'living_street', 'service', 'unclassified', 'tertiary']);
  const ends = new Set<string>(); for (const r of roads) for (const q of [r.p[0], r.p[r.p.length - 1]]) ends.add(Math.round(q[0] / 12) + ',' + Math.round(q[1] / 12));
  const nearEnd = (x: number, z: number) => ends.has(Math.round(x / 12) + ',' + Math.round(z / 12)); // Kreuzungen/Strassenenden (Raster 12 m)
  const spots: [number, number, number, CarType][] = [];
  for (const r of roads) {
    if (!OK.has(r.c) || r.b || r.tu) continue; const W = (r.w || 6) / 2 + 1.3;
    for (let i = 1; i < r.p.length && spots.length < max; i++) {
      const A = r.p[i - 1], B = r.p[i], L = Math.hypot(B[0] - A[0], B[1] - A[1]); if (L < 8) continue;
      const dx = (B[0] - A[0]) / L, dz = (B[1] - A[1]) / L, h = Math.atan2(dx, dz);
      for (let s = 4; s < L - 4 && spots.length < max; s += 6) for (const side of [-1, 1]) {
        const x = A[0] + dx * s + dz * W * side, z = A[1] + dz * s - dx * W * side, r0 = hash2(x * 0.7, z * 1.3);
        if (r0 < 0.55 || nearEnd(x, z) || av.has(Math.floor(x / 4) + ',' + Math.floor(z / 4))) continue;
        let free = true; for (const [a, b] of [[0, 0], [2.2, 0], [-2.2, 0], [0, 0.9], [0, -0.9]]) { const px = x + dx * a + dz * b, pz = z + dz * a - dx * b; if (mask.at(px, pz) !== 0 || mask.isRoad(px, pz)) { free = false; break; } }
        if (!free) continue;
        spots.push([x, z, h + (hash2(z, x) < 0.5 ? 0 : Math.PI), carTypeFor(hash2(x + 3, z - 5))]);
      }
    }
  }
  const out: THREE.InstancedMesh[] = [], mb = toon('#ffffff', { vertexColors: true }), mf = toon('#ffffff', { vertexColors: true });
  const m = new THREE.Matrix4(), c = new THREE.Color();
  for (const t of CAR_TYPES) {
    const L = spots.filter((p) => p[3] === t); if (!L.length) continue; const g = carGeometry(t);
    const b = new THREE.InstancedMesh(g.body, mb, L.length), f = new THREE.InstancedMesh(g.fixed, mf, L.length);
    L.forEach(([x, z, h], i) => { m.makeRotationY(h); m.setPosition(x, groundY(x, z), z); b.setMatrixAt(i, m); f.setMatrixAt(i, m); b.setColorAt(i, c.set(carColor(hash2(x, z)))); });
    for (const im of [b, f]) { im.computeBoundingSphere(); im.name = 'geparkt-' + t; out.push(im); }
  }
  return out;
}

/** Abgestellte Velos an Veloständern: je Ankerpunkt [x, z, Drehung] ein Ständer (3 Bügel) mit 1–5 Velos
 *  (z. B. Bahnhof, grössere Haltestellen). EIN-ZEILEN-EINBAU: G.add(...buildParkedVelos(anker, (x, z) => terrain.height(x, z))); */
export function buildParkedVelos(anchors: number[][], groundY: (x: number, z: number) => number, on = REAL.parked): THREE.InstancedMesh[] {
  if (!on || !anchors.length) return [];
  const velos: number[][] = [];
  const m = new THREE.Matrix4(), q = new THREE.Matrix4();
  for (const [x, z, a = 0] of anchors) {
    const n = 1 + Math.floor(hash2(x, z) * 5);
    for (let k = 0; k < n; k++) { const off = -1.2 + k * 0.6, ca = Math.cos(a), sa = Math.sin(a); velos.push([x + ca * off, z - sa * off, a + Math.PI / 2 + (hash2(k, x) - 0.5) * 0.15]); }
  }
  const out = buildFurnitureList('velostaender', anchors, groundY);
  const im = new THREE.InstancedMesh(veloGeometry(), toon('#ffffff', { vertexColors: true }), velos.length);
  const c = new THREE.Color(), cols = ['#FFFFFF', '#F2C7C7', '#C7D9F2', '#3A3A3A', '#D9F2C7', '#F2E6C7'];
  velos.forEach(([x, z, a], i) => { m.makeRotationY(a); q.makeTranslation(x, groundY(x, z), z); im.setMatrixAt(i, q.multiply(m)); im.setColorAt(i, c.set(cols[Math.floor(hash2(x, z) * cols.length)])); });
  im.computeBoundingSphere(); im.name = 'velos-geparkt';
  return [...out, im];
}
function buildFurnitureList(k: 'velostaender', list: number[][], groundY: (x: number, z: number) => number) {
  return buildFurniture(k, list, groundY, toon('#ffffff', { vertexColors: true }));
}
