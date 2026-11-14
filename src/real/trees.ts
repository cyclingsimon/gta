// P-A Lauf 1: Baumarten für Luzern als Low-Poly-Geometrie-Fabriken (Comic-/Toon-Stil, InstancedMesh-tauglich).
// Jede Art = EINE Geometrie mit Vertex-Farben (Stamm + Krone) → ein InstancedMesh je Art; Farbvariation über setColorAt
// (treeTint liefert helle Töne nahe Weiss, die die Vertex-Farbe nur leicht verschieben).
// Masse: Höhe in Metern bei Skalierung 1, Fuss bei y = 0. Formen nach Bestimmungsmerkmalen (Habitus); Höhen sind
// typische Stadtbaum-Werte [Annahme, Vertrauen mittel] – Altbäume am Quai können deutlich grösser sein.
import * as THREE from 'three';
import { paint, roundNormals, tris, hash2, weighted } from './geo';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Mask } from '../world';

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
export function treeGeometry(s: TreeSpecies, lite = false): G {
  const key = s + (lite ? ':lite' : ''); const c = CACHE.get(key); if (c) return c;
  D1 = lite ? 0 : 1;
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
/** Dreieckszahl je Art (für Doku/Budget) */
export function treeTris(lite = false): Record<TreeSpecies, number> {
  const o = {} as Record<TreeSpecies, number>; for (const s of TREE_SPECIES) o[s] = tris(treeGeometry(s, lite)); return o;
}
/** Instanz-Farbe: helle Variation um Weiss (multipliziert die Vertex-Farbe) */
export function treeTint(x: number, z: number, out = new THREE.Color()) {
  const a = hash2(x, z), b = hash2(z, x);
  return out.setRGB(0.86 + a * 0.14, 0.88 + b * 0.12, 0.84 + a * 0.12);
}

/** Lage/Tags eines Baums. kind wie props.json trees[i][3]: 0/undefined Einzelbaum, 2 Obstgarten (landuse=orchard), 3 Baumreihe (natural=tree_row) */
export interface TreeCtx {
  x: number; z: number; needle?: boolean; kind?: number; forest?: boolean;
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
  const r = hash2(c.x * 0.37 + 11, c.z * 0.53 - 7);
  if (c.kind === 2) return 'obstbaum';
  const needle = c.needle || c.osm?.leaf_type === 'needleleaved';
  if (needle) return r < 0.72 ? 'fichte' : 'tanne';
  if (c.forest) return weighted<TreeSpecies>([['buche', 45], ['fichte', 38], ['tanne', 12], ['linde', 5]], r);
  if (c.nearWater) return weighted<TreeSpecies>([['platane', 50], ['rosskastanie', 30], ['linde', 20]], r);
  if (c.kind === 3 || c.nearRoad) return weighted<TreeSpecies>([['linde', 45], ['rosskastanie', 25], ['platane', 25], ['buche', 5]], r);
  return weighted<TreeSpecies>([['linde', 28], ['rosskastanie', 22], ['buche', 22], ['platane', 8], ['fichte', 12], ['tanne', 4], ['obstbaum', 4]], r);
}
/** Kontext aus der Spielmaske ableiten (Wasser im Umkreis 15 m, Strasse im Umkreis 6 m) */
export function ctxFromMask(mask: Pick<Mask, 'at' | 'isRoad'>, x: number, z: number, t?: number[]): TreeCtx {
  let nearWater = false, nearRoad = false;
  for (let k = 0; k < 8 && !nearWater; k++) { const a = k * Math.PI / 4; if (mask.at(x + Math.cos(a) * 15, z + Math.sin(a) * 15) === 1 || mask.at(x + Math.cos(a) * 8, z + Math.sin(a) * 8) === 1) nearWater = true; }
  for (let k = 0; k < 8 && !nearRoad; k++) { const a = k * Math.PI / 4; if (mask.isRoad(x + Math.cos(a) * 6, z + Math.sin(a) * 6)) nearRoad = true; }
  return { x, z, needle: t ? t[2] === 1 : false, kind: t ? t[3] : undefined, nearWater, nearRoad };
}

/** Fertige Instanzen: Liste [x, z, Skalierung, Art] → Gruppe mit einem InstancedMesh je Art.
 *  groundY(x, z) = Bodenhöhe; mat = Material (z. B. toon('#ffffff', { vertexColors: true })). */
export function buildTreeInstances(list: [number, number, number, TreeSpecies][], groundY: (x: number, z: number) => number, mat: THREE.Material, lite = false) {
  const grp = new THREE.Group(); grp.name = 'baeume-arten';
  const by = new Map<TreeSpecies, [number, number, number][]>();
  for (const [x, z, s, sp] of list) { const a = by.get(sp) || []; a.push([x, z, s]); by.set(sp, a); }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  for (const [sp, L] of by) {
    const im = new THREE.InstancedMesh(treeGeometry(sp, lite), mat, L.length);
    L.forEach(([x, z, s], i) => {
      const r = hash2(x, z); e.set(0, r * 6.283, sp === 'obstbaum' ? (hash2(z, x) - 0.5) * 0.12 : 0); q.setFromEuler(e);
      sc.set(s, s * (0.92 + hash2(z, x) * 0.16), s); m.compose(v.set(x, groundY(x, z) - 0.15, z), q, sc);
      im.setMatrixAt(i, m); im.setColorAt(i, treeTint(x, z, col));
    });
    im.computeBoundingSphere(); im.name = 'baum-' + sp; grp.add(im);
  }
  return grp;
}
