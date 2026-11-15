// P-A Lauf 1: Baumarten für Luzern als Low-Poly-Geometrie-Fabriken (Comic-/Toon-Stil, InstancedMesh-tauglich).
// Jede Art = EINE Geometrie mit Vertex-Farben (Stamm + Krone) → ein InstancedMesh je Art; Farbvariation über setColorAt
// (treeTint liefert helle Töne nahe Weiss, die die Vertex-Farbe nur leicht verschieben).
// Masse: Höhe in Metern bei Skalierung 1, Fuss bei y = 0. Formen nach Bestimmungsmerkmalen (Habitus); Höhen sind
// typische Stadtbaum-Werte [Annahme, Vertrauen mittel] – Altbäume am Quai können deutlich grösser sein.
import * as THREE from 'three';
import { paint, roundNormals, tris, hash2, weighted } from './geo';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, type Mask } from '../world';
import { REAL, type TreeMode } from './config';

export type TreeSpecies = 'linde' | 'rosskastanie' | 'platane' | 'buche' | 'fichte' | 'tanne' | 'obstbaum';
export const TREE_SPECIES: TreeSpecies[] = ['linde', 'rosskastanie', 'platane', 'buche', 'fichte', 'tanne', 'obstbaum'];
/** typische Höhe (m) bei Skalierung 1 */
export const TREE_HEIGHT: Record<TreeSpecies, number> = { linde: 13, rosskastanie: 12, platane: 15, buche: 17, fichte: 19, tanne: 18, obstbaum: 6 };

type G = THREE.BufferGeometry;
/** Krone: Ikosaeder (detail 0 = 20, 1 = 80 Dreiecke), gestaucht, runde Normalen */
function lobe(r: number, sx: number, sy: number, sz: number, x: number, y: number, z: number, detail: number, col: string): G {
  const g = new THREE.IcosahedronGeometry(r, detail); g.scale(sx, sy, sz); roundNormals(g); g.translate(x, y, z);
  return paint(g, col);
}
/** Stamm: offener Zylinder (6 Seiten = 12 Dreiecke) */
function trunk(r0: number, r1: number, h: number, col: string, y0 = 0, seg = 6): G {
  const g = new THREE.CylinderGeometry(r1, r0, h, seg, 1, true); g.translate(0, y0 + h / 2, 0); return paint(g, col);
}
/** schräger Ast vom Punkt (0, y0, 0) in Richtung (dx, dy, dz) */
function branch(y0: number, dx: number, dy: number, dz: number, r: number, col: string): G {
  const L = Math.hypot(dx, dy, dz), g = new THREE.CylinderGeometry(r * 0.6, r, L, 5, 1, true); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize()));
  g.translate(0, y0, 0); return paint(g, col);
}
/** Nadelbaum-Etage: Kegel mit Boden (7 Seiten = 14 Dreiecke) */
function tier(r: number, h: number, y0: number, col: string, seg = 7): G {
  const g = new THREE.ConeGeometry(r, h, seg, 1, false); g.translate(0, y0 + h / 2, 0);
  // weich schattieren: Normalen leicht nach aussen kippen
  return paint(g, col);
}

const BARK = '#6E5038', BARK_GREY = '#8E8E86', BARK_PLAT_A = '#C8BE9C', BARK_PLAT_B = '#8C8A68';
const CACHE = new Map<string, G>();
let D1 = 1; // Kronen-Detail (1 = rund, 0 = «lite»)
/** Geometrie einer Baumart (zwischengespeichert, nicht verändern – für InstancedMesh direkt verwenden) */
export type TreeQuality = 'min' | 'lite' | 'full';
export function treeGeometry(s: TreeSpecies, q: TreeQuality | boolean = 'full'): G {
  const Q: TreeQuality = q === true ? 'lite' : q === false ? 'full' : q;
  const key = s + ':' + Q; const c = CACHE.get(key); if (c) return c;
  if (Q === 'min') { const g = minTree(s); CACHE.set(key, g); return g; }
  D1 = Q === 'lite' ? 0 : 1;
  let L: G[] = [];
  switch (s) {
    case 'linde': // Tilia: aufrechter Stamm, dichte, eiförmig-hochgewölbte Krone, sattgrün
      L = [trunk(0.32, 0.24, 4.2, BARK), branch(3.4, 0.9, 1.6, 0, 0.14, BARK), branch(3.6, -0.7, 1.5, 0.5, 0.13, BARK),
        lobe(1, 3.4, 4.4, 3.4, 0, 8.2, 0, D1, '#5E9A45'), lobe(1, 1.9, 1.8, 1.9, 0.3, 11.6, -0.2, 0, '#66A34C')];
      break;
    case 'rosskastanie': // Aesculus: kurzer kräftiger Stamm, breite, dichte Kuppelkrone, dunkleres Grün
      L = [trunk(0.42, 0.3, 3.2, BARK), branch(2.8, 1.3, 1.4, 0.4, 0.17, BARK), branch(2.8, -1.2, 1.5, -0.5, 0.17, BARK),
        lobe(1, 4.6, 3.6, 4.6, 0, 7.6, 0, D1, '#3F7E3A'),
        lobe(1, 2.4, 2.1, 2.4, 2.9, 6.0, 1.2, 0, '#44843D'), lobe(1, 2.4, 2.1, 2.4, -2.6, 6.2, -1.6, 0, '#3A7636'), lobe(1, 2.2, 2.0, 2.2, -0.6, 6.0, 3.0, 0, '#41813B')];
      break;
    case 'platane': { // Platanus: gefleckte Borke (hell/oliv), Gabelung, breite lockere Krone aus mehreren Ballen
      const tA = trunk(0.38, 0.32, 2.6, BARK_PLAT_A), tB = trunk(0.32, 0.28, 2.2, BARK_PLAT_B, 2.6);
      L = [tA, tB, branch(4.6, 1.8, 2.6, 0.3, 0.2, BARK_PLAT_A), branch(4.6, -1.6, 2.7, -0.6, 0.2, BARK_PLAT_A), branch(4.4, 0.2, 2.4, 1.6, 0.17, BARK_PLAT_B),
        lobe(1, 3.6, 3.0, 3.6, 0, 11.4, 0, D1, '#77A24E'),
        lobe(1, 2.7, 2.3, 2.7, 3.3, 9.4, 0.6, 0, '#6F9B48'), lobe(1, 2.7, 2.3, 2.7, -3.1, 9.6, -1.1, 0, '#7AA552'), lobe(1, 2.5, 2.2, 2.5, 0.2, 9.2, 3.1, 0, '#729E4B'), lobe(1, 2.5, 2.2, 2.5, -0.4, 9.8, -3.1, 0, '#6C9846')];
      break; }
    case 'buche': // Fagus: glatter grauer Stamm, hohe ovale Krone, frisches Grün
      L = [trunk(0.34, 0.24, 6.0, BARK_GREY), branch(5.0, 1.0, 2.0, 0.2, 0.14, BARK_GREY), branch(5.2, -0.9, 2.1, -0.4, 0.14, BARK_GREY),
        lobe(1, 3.6, 5.2, 3.6, 0, 11.4, 0, D1, '#5F9C3E'), lobe(1, 2.0, 2.0, 2.0, 0, 15.2, 0.3, 0, '#68A645')];
      break;
    case 'fichte': // Picea: schlank, spitz, dunkelgrün, Etagen bis fast zum Boden
      L = [trunk(0.3, 0.12, 18.5, BARK, 0, 5),
        tier(3.0, 6.0, 1.6, '#2F5E3A'), tier(2.5, 5.4, 5.6, '#31633C'), tier(1.9, 5.0, 9.4, '#33673E'), tier(1.2, 5.2, 13.8, '#356B40')];
      break;
    case 'tanne': // Abies alba: breiter, stumpfere «Storchennest»-Spitze, silbriges Dunkelgrün
      L = [trunk(0.34, 0.14, 16.5, BARK_GREY, 0, 5),
        tier(3.6, 5.6, 2.2, '#2E5B45'), tier(3.0, 5.2, 6.0, '#305F47'), tier(2.3, 4.6, 9.6, '#326349'), tier(1.6, 3.2, 13.2, '#34674B'),
        lobe(1, 1.2, 0.8, 1.2, 0, 16.6, 0, 0, '#34674B')];
      break;
    case 'obstbaum': // Hochstamm (Apfel/Birne): ~1.8 m Stamm, runde lockere Krone, oft etwas schief
      L = [trunk(0.2, 0.15, 2.0, BARK), branch(1.8, 0.8, 1.1, 0.2, 0.09, BARK), branch(1.8, -0.7, 1.1, -0.3, 0.09, BARK),
        lobe(1, 2.6, 2.1, 2.6, 0.15, 3.9, 0, D1, '#6FA24A'), lobe(1, 1.2, 1.0, 1.2, -1.5, 3.4, 0.9, 0, '#76A84F')];
      break;
  }
  const g = mergeGeometries(L, false)!; CACHE.set(key, g); return g;
}
/** Sparform für die ganze Stadt (Budget: 3500 Bäume ≤ ~180 000 Dreiecke): Stamm 4-seitig offen (8), Kronen nur Ikosaeder detail 0 (20),
 *  Nadelbäume 3 Etagen à 5 Seiten (10). Gleiche Umrisse/Farben wie die volle Form, nur gröber. */
function minTree(s: TreeSpecies): G {
  const T = (r0: number, r1: number, h: number, col: string, y0 = 0) => trunk(r0, r1, h, col, y0, 4);
  const C = (r: number, h: number, y0: number, col: string) => tier(r, h, y0, col, 5);
  let L: G[] = [];
  switch (s) {
    case 'linde': L = [T(0.32, 0.24, 5.0, BARK), lobe(1, 3.4, 4.4, 3.4, 0, 8.2, 0, 0, '#5E9A45'), lobe(1, 1.9, 1.8, 1.9, 0.3, 11.6, -0.2, 0, '#66A34C')]; break;
    case 'rosskastanie': L = [T(0.42, 0.3, 4.0, BARK), lobe(1, 4.6, 3.6, 4.6, 0, 7.6, 0, 0, '#3F7E3A'), lobe(1, 2.6, 2.2, 2.6, 2.4, 6.0, -1.0, 0, '#44843D')]; break;
    case 'platane': L = [T(0.38, 0.3, 3.0, BARK_PLAT_A), T(0.3, 0.26, 3.0, BARK_PLAT_B, 3.0), lobe(1, 4.4, 3.2, 4.4, 0, 10.8, 0, 0, '#77A24E')]; break;
    case 'buche': L = [T(0.34, 0.24, 6.5, BARK_GREY), lobe(1, 3.6, 5.2, 3.6, 0, 11.4, 0, 0, '#5F9C3E'), lobe(1, 2.0, 2.0, 2.0, 0, 15.2, 0.3, 0, '#68A645')]; break;
    case 'fichte': L = [T(0.3, 0.12, 4.0, BARK), C(3.0, 7.0, 1.6, '#2F5E3A'), C(2.2, 6.4, 6.6, '#31633C'), C(1.4, 6.6, 11.2, '#356B40')]; break;
    case 'tanne': L = [T(0.34, 0.14, 4.0, BARK_GREY), C(3.6, 6.4, 2.2, '#2E5B45'), C(2.7, 5.8, 7.0, '#305F47'), C(1.8, 4.4, 11.4, '#34674B')]; break;
    case 'obstbaum': L = [T(0.2, 0.15, 2.2, BARK), lobe(1, 2.6, 2.1, 2.6, 0.15, 3.9, 0, 0, '#6FA24A')]; break;
  }
  return mergeGeometries(L, false)!;
}
/** Dreieckszahl je Art (für Doku/Budget) */
export function treeTris(q: TreeQuality = 'full'): Record<TreeSpecies, number> {
  const o = {} as Record<TreeSpecies, number>; for (const s of TREE_SPECIES) o[s] = tris(treeGeometry(s, q)); return o;
}
/** Instanz-Farbe: helle Variation um Weiss (multipliziert die Vertex-Farbe) */
export function treeTint(x: number, z: number, out = new THREE.Color()) {
  const a = hash2(x, z), b = hash2(z, x);
  return out.setRGB(0.86 + a * 0.14, 0.88 + b * 0.12, 0.84 + a * 0.12);
}

/** Lage/Tags eines Baums. kind wie props.json trees[i][3]: 0/undefined Einzelbaum, 2 Obstgarten (landuse=orchard), 3 Baumreihe (natural=tree_row) */
export interface TreeCtx {
  x: number; z: number; needle?: boolean; kind?: number; forest?: boolean;
  /** Spielhöhe y (m über Seespiegel 433.6 m); Nadelbäume ohne OSM-Kennung erst ab y > 270 (≈ 700 m ü. M.) */
  y?: number;
  /** gepflasterte Fläche ringsum (Platz): Strassen-/Platzzellen in ≥ 6 von 8 Richtungen */
  plaza?: boolean;
  /** Seeufer/Reuss in der Nähe (z. B. Mask.at === 1 im Umkreis 15 m) */
  nearWater?: boolean;
  /** Strasse in der Nähe (Mask.isRoad im Umkreis 6 m) */
  nearRoad?: boolean;
  /** OSM-Tags, falls vorhanden (genus, species, leaf_type) */
  osm?: { genus?: string; species?: string; leaf_type?: string };
}
const GENUS: Record<string, TreeSpecies> = {
  tilia: 'linde', aesculus: 'rosskastanie', platanus: 'platane', fagus: 'buche', carpinus: 'buche', quercus: 'buche',
  picea: 'fichte', abies: 'tanne', pinus: 'fichte', larix: 'fichte', taxus: 'tanne',
  malus: 'obstbaum', pyrus: 'obstbaum', prunus: 'obstbaum', juglans: 'obstbaum', cydonia: 'obstbaum',
  acer: 'linde', fraxinus: 'linde', betula: 'buche', ulmus: 'linde', robinia: 'linde',
};
/** Baumart nach Lage und Tags wählen (deterministisch je Standort).
 *  Gewichte [Annahme, Vertrauen mittel]: Luzerner Quais mit Platanen/Kastanien, Strassenalleen meist Linde/Kastanie/Platane,
 *  Mittelland-Wald Fichte + Buche häufigste Arten, Weisstanne seltener (LFI), Obstgärten = Hochstamm. */
export function pickSpecies(c: TreeCtx): TreeSpecies {
  const g = (c.osm?.genus || c.osm?.species || '').toLowerCase().split(/[\s;]/)[0];
  if (g && GENUS[g]) return GENUS[g];
  const r = hash2(c.x * 0.37 + 11, c.z * 0.53 - 7), hoch = (c.y ?? 0) > 270;
  // Lauf 6: Obstbäume nur bei props-Kennung Obstgarten (2); Baumreihen (3) sind Alleebäume
  if (c.kind === 2) return 'obstbaum';
  const needle = c.needle || c.osm?.leaf_type === 'needleleaved';
  if (needle) return r < 0.72 ? 'fichte' : 'tanne';
  if (c.forest) return hoch ? weighted<TreeSpecies>([['fichte', 45], ['tanne', 20], ['buche', 35]], r) : weighted<TreeSpecies>([['buche', 70], ['linde', 10], ['fichte', 15], ['tanne', 5]], r);
  // Quais/Ufer (Belege: Nationalquai «zwei Reihen Kastanienbäume», Inseli «grosse Platanen», Schweizerhofquai Linden – s. Doku)
  if (c.nearWater && (c.kind === 3 || c.nearRoad)) return weighted<TreeSpecies>([['rosskastanie', 45], ['linde', 30], ['platane', 25]], r);
  if (c.nearWater) return weighted<TreeSpecies>([['platane', 45], ['rosskastanie', 30], ['linde', 25]], r);
  if (c.plaza) return weighted<TreeSpecies>([['rosskastanie', 60], ['linde', 25], ['platane', 15]], r);   // Plätze [Annahme]
  if (c.kind === 3 || c.nearRoad) return weighted<TreeSpecies>([['linde', 50], ['platane', 25], ['rosskastanie', 20], ['buche', 5]], r); // Alleen [Annahme]
  if (hoch) return weighted<TreeSpecies>([['fichte', 35], ['tanne', 15], ['buche', 35], ['linde', 15]], r);
  return weighted<TreeSpecies>([['linde', 32], ['rosskastanie', 26], ['buche', 30], ['platane', 12]], r); // Parks/Gärten unten: nur Laubbäume [Annahme]
}
/** Kontext aus der Spielmaske ableiten (Wasser im Umkreis 15 m, Strasse im Umkreis 6 m) */
export function ctxFromMask(mask: Pick<Mask, 'at' | 'isRoad'>, x: number, z: number, t?: number[]): TreeCtx {
  let nearWater = false, nearRoad = false;
  for (let k = 0; k < 8 && !nearWater; k++) { const a = k * Math.PI / 4; if (mask.at(x + Math.cos(a) * 15, z + Math.sin(a) * 15) === 1 || mask.at(x + Math.cos(a) * 8, z + Math.sin(a) * 8) === 1) nearWater = true; }
  let nr = 0; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (mask.isRoad(x + Math.cos(a) * 6, z + Math.sin(a) * 6)) nr++; }
  nearRoad = nr > 0;
  return { x, z, needle: t ? t[2] === 1 : false, kind: t ? t[3] : undefined, nearWater, nearRoad, plaza: nr >= 6 };
}

/** Fertige Instanzen: Liste [x, z, Skalierung, Art] → Gruppe mit einem InstancedMesh je Art.
 *  groundY(x, z) = Bodenhöhe; mat = Material (z. B. toon('#ffffff', { vertexColors: true })). */
export function buildTreeInstances(list: [number, number, number, TreeSpecies][], groundY: (x: number, z: number) => number, mat: THREE.Material, qual: TreeQuality | boolean = 'min') {
  const grp = new THREE.Group(); grp.name = 'baeume-arten';
  const by = new Map<TreeSpecies, [number, number, number][]>();
  for (const [x, z, s, sp] of list) { const a = by.get(sp) || []; a.push([x, z, s]); by.set(sp, a); }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  for (const [sp, L] of by) {
    const im = new THREE.InstancedMesh(treeGeometry(sp, qual), mat, L.length);
    L.forEach(([x, z, s], i) => {
      const r = hash2(x, z); e.set(0, r * 6.283, sp === 'obstbaum' ? (hash2(z, x) - 0.5) * 0.12 : 0); q.setFromEuler(e);
      sc.set(s, s * (0.92 + hash2(z, x) * 0.16), s); m.compose(v.set(x, groundY(x, z) - 0.15, z), q, sc);
      im.setMatrixAt(i, m); im.setColorAt(i, treeTint(x, z, col));
    });
    im.computeBoundingSphere(); im.name = 'baum-' + sp; grp.add(im);
  }
  return grp;
}

/** EIN-ZEILEN-EINBAU für world.ts (Block «Bäume (instanziert)»):
 *    group.add(buildRealTrees(trees, props?.trees, mask, (x, z) => terrain.ground(x, z)));
 *  trees = [x, z, s][] wie in buildWorld; osm = props.trees ([x, z, nadel, art]) für Nadel/Obstgarten/Baumreihe (Zuordnung über exakte Koordinate).
 *  REAL.trees = 'alt' → exakt die bisherigen Kugelbäume (2 InstancedMeshes, 44 Dreiecke/Baum). */
export function buildRealTrees(trees: number[][], osm: number[][] | undefined, mask: Pick<Mask, 'at' | 'isRoad'>, groundY: (x: number, z: number) => number, mode: TreeMode = REAL.trees) {
  if (mode === 'alt') {
    const grp = new THREE.Group();
    const trunkG = new THREE.CylinderGeometry(0.35, 0.45, 3, 6); trunkG.translate(0, 1.5, 0);
    const crownG = new THREE.IcosahedronGeometry(2.6, 0); crownG.translate(0, 4.6, 0);
    const trunkI = new THREE.InstancedMesh(trunkG, toon('#7A5638'), trees.length);
    const crownI = new THREE.InstancedMesh(crownG, toon('#5E9B4F'), trees.length);
    const m = new THREE.Matrix4();
    trees.forEach(([x, z, s], i) => {
      m.makeScale(s, s, s); m.setPosition(x, groundY(x, z) - 0.2, z);
      trunkI.setMatrixAt(i, m); crownI.setMatrixAt(i, m);
      crownI.setColorAt(i, new THREE.Color().setHSL(0.27 + hash2(x, z) * 0.06, 0.38, 0.42 + hash2(z, x) * 0.1));
    });
    grp.add(trunkI, crownI); return grp;
  }
  const list = realTreeList(trees, osm, mask, groundY);
  // Lauf 6: 'min' fest in 500-m-Zellen gebacken (1 Netz je Zelle, eigene Bounding-Sphere → Frustum-Culling); 'lite'/'full' wie bisher instanziert
  if (mode === 'min') return buildTreeCells(list, (x, z) => groundY(x, z) - 0.05);
  return buildTreeInstances(list, (x, z) => groundY(x, z) + 0.15 - 0.2, toon('#ffffff', { vertexColors: true }), mode);
}

/** Liste [x, z, Skalierung, Art] aus den Spiel-Bäumen (Art nach Lage/Tags/Höhe) */
export function realTreeList(trees: number[][], osm: number[][] | undefined, mask: Pick<Mask, 'at' | 'isRoad'>, groundY: (x: number, z: number) => number) {
  const info = new Map<string, number[]>(); for (const t of osm || []) info.set(t[0] + ',' + t[1], t);
  return trees.map(([x, z, s]) => {
    const t = info.get(x + ',' + z), c = ctxFromMask(mask, x, z, t); c.y = groundY(x, z);
    const sp = pickSpecies(c);
    return [x, z, sp === 'obstbaum' ? 0.85 + hash2(x, z) * 0.3 : s * 0.75, sp] as [number, number, number, TreeSpecies];
  });
}

/** Bäume fest in Zellen backen: je Zelle EIN Mesh (alle Arten), Farbe je Baum (treeTint) eingebacken.
 *  Speicher sparsam: Position Float32, Normale Int8 (normiert), Farbe Uint8 (normiert) ≈ 18 Byte je Ecke.
 *  Rückgabe: EINE Gruppe (Name «baeume-zellen»), Kinder = Zellen-Meshes. */
export function buildTreeCells(list: [number, number, number, TreeSpecies][], groundY: (x: number, z: number) => number, cell = 500, q: TreeQuality = 'min') {
  const grp = new THREE.Group(); grp.name = 'baeume-zellen';
  const by = new Map<string, [number, number, number, TreeSpecies][]>();
  for (const t of list) { const k = Math.floor(t[0] / cell) + ',' + Math.floor(t[1] / cell); const a = by.get(k) || []; a.push(t); by.set(k, a); }
  const mat = toon('#ffffff', { vertexColors: true });
  const m = new THREE.Matrix4(), nm = new THREE.Matrix3(), qq = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  for (const L of by.values()) {
    let n = 0; for (const t of L) n += treeGeometry(t[3], q).getAttribute('position').count;
    const P = new Float32Array(n * 3), N = new Int8Array(n * 3), C = new Uint8Array(n * 3); let o = 0;
    for (const [x, z, s, sp] of L) {
      const g = treeGeometry(sp, q), gp = g.getAttribute('position'), gn = g.getAttribute('normal'), gc = g.getAttribute('color');
      const r = hash2(x, z); e.set(0, r * 6.283, sp === 'obstbaum' ? (hash2(z, x) - 0.5) * 0.12 : 0); qq.setFromEuler(e);
      sc.set(s, s * (0.92 + hash2(z, x) * 0.16), s); m.compose(v.set(x, groundY(x, z), z), qq, sc); nm.getNormalMatrix(m);
      treeTint(x, z, col);
      for (let i = 0; i < gp.count; i++, o++) {
        v.fromBufferAttribute(gp, i).applyMatrix4(m); P[o * 3] = v.x; P[o * 3 + 1] = v.y; P[o * 3 + 2] = v.z;
        v.fromBufferAttribute(gn, i).applyMatrix3(nm).normalize(); N[o * 3] = Math.round(v.x * 127); N[o * 3 + 1] = Math.round(v.y * 127); N[o * 3 + 2] = Math.round(v.z * 127);
        C[o * 3] = Math.min(255, Math.round(gc.getX(i) * col.r * 255)); C[o * 3 + 1] = Math.min(255, Math.round(gc.getY(i) * col.g * 255)); C[o * 3 + 2] = Math.min(255, Math.round(gc.getZ(i) * col.b * 255));
      }
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(P, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(N, 3, true)); bg.setAttribute('color', new THREE.BufferAttribute(C, 3, true));
    bg.computeBoundingSphere(); bg.computeBoundingBox();
    const mesh = new THREE.Mesh(bg, mat); mesh.name = 'baum-zelle'; (mesh as any).userData.baeume = L.length; grp.add(mesh);
  }
  return grp;
}
