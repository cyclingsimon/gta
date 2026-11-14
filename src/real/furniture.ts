// P-A Lauf 1: Strassenmöbel Schweiz/Luzern als Low-Poly-Geometrien mit Vertex-Farben (InstancedMesh-tauglich, Fuss bei y = 0).
// Vorderseite zeigt nach +z (zur Strasse drehen). Masse in Metern.
// Aussehen [Annahme, Vertrauen mittel] nach allgemeinem Schweizer Strassenbild; nicht an Herstellerplänen geprüft:
//  - Kandelaber: dunkelgrüner Mast mit Laternenkopf (Altstadt-Stil) bzw. «modern» grauer Mast mit flacher Leuchte
//  - VBL-Wartehalle: Glas-/Stahlhalle mit Flachdach, blaue Haltestellentafel (VBL blau-weiss belegt, s. Doku)
//  - Robidog: grüner Kasten mit Beutelspender auf Pfosten
//  - Abfallkübel Stadt Luzern: grauer Rundkübel am Pfosten [Annahme, Standorte offen: opendata.swiss «Abfallkübel – Standort und Information»]
//  - Bank: Holzlatten auf Gusseisen-Wangen; Veloständer: Stahlbügel; Hydrant: rot (Überflurhydrant); Briefkasten: Post-gelb, ohne Logo
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { parts, box, cyl, tube, tris, type Part } from './geo';
import { glowMaterial } from './night';

export type FurnitureKind = 'kandelaber' | 'kandelaber_modern' | 'wartehalle' | 'robidog' | 'abfallkuebel' | 'bank' | 'velostaender' | 'hydrant' | 'briefkasten';
export const FURNITURE: FurnitureKind[] = ['kandelaber', 'kandelaber_modern', 'wartehalle', 'robidog', 'abfallkuebel', 'bank', 'velostaender', 'hydrant', 'briefkasten'];

const V = (x: number, y: number, z: number) => ({ x, y, z });
const CACHE = new Map<FurnitureKind, THREE.BufferGeometry>(), GLOW = new Map<FurnitureKind, THREE.BufferGeometry | null>();
/** Leuchtkörper-Farbe (für Nachtbeleuchtung kann die Hauptsitzung die Vertex-Farbe '#FFF2B8' als «lampHead» erkennen) */
export const LAMP_GLOW = '#FFF2B8';

/** Grundkörper (ohne Leuchtteile) */
export function furnitureGeometry(k: FurnitureKind): THREE.BufferGeometry { build(k); return CACHE.get(k)!; }
/** Leuchtteile (Laternenglas, Deckenlicht, Fahrplanvitrine) oder null – mit glowMaterial() zeichnen */
export function furnitureGlowGeometry(k: FurnitureKind): THREE.BufferGeometry | null { build(k); return GLOW.get(k)!; }
/** Alles in einer Geometrie (Testszene/Vorschau) */
export function furnitureAll(k: FurnitureKind): THREE.BufferGeometry { const g = furnitureGlowGeometry(k); return g ? mergeGeometries([furnitureGeometry(k), g], false)! : furnitureGeometry(k); }
function build(k: FurnitureKind) {
  if (CACHE.has(k)) return;
  let P: Part[] = []; const Gl: Part[] = [];
  switch (k) {
    case 'kandelaber': { // Altstadt: Sockel, schlanker Mast, Laternenkopf (Pyramide mit Glas), 4.5 m
      const G = '#2F4A3C';
      P = [[cyl(0.16, 0.2, 0.6, 8), G], [cyl(0.06, 0.08, 3.6, 6, 0, 0.6), G], [cyl(0.12, 0.1, 0.15, 6, 0, 4.2), G],
        [new THREE.ConeGeometry(0.3, 0.3, 6).translate(0, 4.95, 0), G], [cyl(0.02, 0.04, 0.15, 4, 0, 5.1), G]];
      Gl.push([cyl(0.22, 0.14, 0.45, 6, 0, 4.35), LAMP_GLOW]);
      break; }
    case 'kandelaber_modern': // Strasse: grauer Mast 8 m, Ausleger, flache Leuchte über der Fahrbahn (+z)
      P = [[cyl(0.07, 0.11, 8, 6), '#7D858B'], [tube(V(0, 7.8, 0), V(0, 8.0, 1.4), 0.05, 5), '#7D858B'],
        [box(0.32, 0.1, 0.7, 0, 7.98, 1.6), '#5E656B']];
      Gl.push([box(0.26, 0.03, 0.6, 0, 7.92, 1.6), LAMP_GLOW]);
      break;
    case 'wartehalle': { // 4 m × 1.6 m, Höhe 2.5 m; Rückwand + Seitenwand Glas, Flachdach, Bank, Haltestellentafel
      const S = '#5B6770', GL = '#BFD8E6';
      P = [[box(4.2, 0.12, 1.8, 0, 2.5, 0), '#E8ECEE'], [box(4.24, 0.06, 1.84, 0, 2.43, 0), S],
        [box(0.08, 2.4, 0.08, -2.0, 1.2, -0.8), S], [box(0.08, 2.4, 0.08, 2.0, 1.2, -0.8), S], [box(0.08, 2.4, 0.08, -2.0, 1.2, 0.8), S],
        [box(3.9, 2.1, 0.03, 0, 1.25, -0.8), GL], [box(0.03, 2.1, 1.5, -2.0, 1.25, 0), GL], [box(4.0, 0.08, 0.06, 0, 0.2, -0.8), S],
        [box(2.2, 0.06, 0.4, 0.3, 0.5, -0.55), '#8A5A36'], [box(0.06, 0.45, 0.3, -0.7, 0.25, -0.55), S], [box(0.06, 0.45, 0.3, 1.3, 0.25, -0.55), S],
        [cyl(0.04, 0.04, 2.9, 5, 2.4, 0, 0.9), '#8A8F94'], [box(0.62, 0.62, 0.05, 2.4, 2.75, 0.9), '#1E5AA8'], [box(0.36, 0.36, 0.06, 2.4, 2.75, 0.9), '#FFFFFF']];
      Gl.push([box(0.6, 1.2, 0.1, 1.4, 1.4, -0.75), '#F4F1E6'], [box(3.4, 0.03, 0.18, 0, 2.43, -0.2), LAMP_GLOW]); // Fahrplan-Vitrine, Deckenlicht
      break; }
    case 'robidog': // grüner Kasten (Abfall) + Beutelspender auf Pfosten, 1.3 m
      P = [[cyl(0.04, 0.04, 1.3, 5), '#5C6166'], [box(0.36, 0.5, 0.28, 0, 0.75, 0.1), '#2E8B3E'], [box(0.38, 0.06, 0.3, 0, 1.03, 0.1), '#24702F'],
        [box(0.22, 0.26, 0.14, 0, 1.25, 0.07), '#2E8B3E'], [box(0.12, 0.1, 0.02, 0, 1.25, 0.15), '#FFFFFF']];
      break;
    case 'abfallkuebel': // Rundkübel ~60 l an Pfosten, grau mit Deckel
      P = [[cyl(0.04, 0.04, 1.0, 5, 0, 0, -0.22), '#5C6166'], [cyl(0.21, 0.18, 0.62, 8, 0, 0.3, 0), '#6E7579'], [cyl(0.22, 0.22, 0.06, 8, 0, 0.92, 0), '#4A5054'],
        [box(0.14, 0.05, 0.02, 0, 0.98, 0.2), '#2A2E31']];
      break;
    case 'bank': // 1.8 m, 3 Sitzlatten + 2 Rückenlatten Holz, Gusseisen-Wangen
      P = [[box(1.8, 0.04, 0.12, 0, 0.45, 0.12), '#8A5A36'], [box(1.8, 0.04, 0.12, 0, 0.45, -0.02), '#8A5A36'], [box(1.8, 0.04, 0.12, 0, 0.45, -0.16), '#8A5A36'],
        [box(1.8, 0.11, 0.03, 0, 0.62, -0.24), '#8A5A36'], [box(1.8, 0.11, 0.03, 0, 0.78, -0.26), '#8A5A36'],
        [box(0.06, 0.45, 0.5, -0.8, 0.22, -0.02), '#2F3437'], [box(0.06, 0.45, 0.5, 0.8, 0.22, -0.02), '#2F3437'],
        [box(0.06, 0.4, 0.05, -0.8, 0.65, -0.25), '#2F3437'], [box(0.06, 0.4, 0.05, 0.8, 0.65, -0.25), '#2F3437']];
      break;
    case 'velostaender': // 3 Anlehnbügel (Rohr 50 mm), Abstand 0.9 m
      for (const x of [-0.9, 0, 0.9]) P.push([tube(V(x, 0, -0.4), V(x, 0.8, -0.4), 0.025, 5), '#8E959A'], [tube(V(x, 0.8, -0.4), V(x, 0.8, 0.4), 0.025, 5), '#8E959A'], [tube(V(x, 0.8, 0.4), V(x, 0, 0.4), 0.025, 5), '#8E959A']);
      break;
    case 'hydrant': // Überflurhydrant rot, 0.9 m, zwei seitliche Abgänge, Haube
      P = [[cyl(0.13, 0.15, 0.7, 8), '#C8262C'], [new THREE.SphereGeometry(0.14, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.7, 0), '#C8262C'],
        [cyl(0.03, 0.03, 0.08, 6, 0, 0.84), '#B9BEC2'], [tube(V(-0.12, 0.45, 0), V(-0.24, 0.45, 0), 0.05, 6), '#B9BEC2'], [tube(V(0.12, 0.45, 0), V(0.24, 0.45, 0), 0.05, 6), '#B9BEC2'],
        [cyl(0.2, 0.2, 0.05, 8), '#8E959A']];
      break;
    case 'briefkasten': // Post-Briefkasten gelb auf Säule, Einwurfschlitz, ohne Logo
      P = [[box(0.12, 0.85, 0.12, 0, 0.42, -0.05), '#5C6166'], [box(0.42, 0.55, 0.32, 0, 1.12, 0), '#FFCC00'],
        [new THREE.CylinderGeometry(0.16, 0.16, 0.42, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 1.4, 0), '#FFCC00'],
        [box(0.26, 0.03, 0.02, 0, 1.28, 0.165), '#1E2228'], [box(0.3, 0.12, 0.02, 0, 0.98, 0.165), '#FFFFFF']];
      break;
  }
  CACHE.set(k, parts(P)); GLOW.set(k, Gl.length ? parts(Gl) : null);
}
export function furnitureTris(): Record<FurnitureKind, number> {
  const o = {} as Record<FurnitureKind, number>; for (const k of FURNITURE) o[k] = tris(furnitureAll(k)); return o;
}
/** Instanzen bauen: Liste [x, z, Drehung rad] → [Grundkörper, Leuchtteile?] als InstancedMesh (1–2 Zeichenaufrufe).
 *  mat = toon('#ffffff', { vertexColors: true }); Leuchtteile bekommen glowMaterial() (Nachtlicht über NIGHT.value). */
export function buildFurniture(k: FurnitureKind, list: number[][], groundY: (x: number, z: number) => number, mat: THREE.Material, geo?: { base: THREE.BufferGeometry; glow: THREE.BufferGeometry | null }) {
  const base = geo ? geo.base : furnitureGeometry(k), glow = geo ? geo.glow : furnitureGlowGeometry(k);
  const out: THREE.InstancedMesh[] = [];
  const m = new THREE.Matrix4(), mk = (g: THREE.BufferGeometry, mt: THREE.Material, nm: string) => {
    const im = new THREE.InstancedMesh(g, mt, Math.max(1, list.length)); im.count = list.length;
    list.forEach(([x, z, a, sy], i) => { m.makeRotationY(a || 0); if (sy && sy !== 1) m.multiply(new THREE.Matrix4().makeScale(1, sy, 1)); m.setPosition(x, groundY(x, z), z); im.setMatrixAt(i, m); });
    im.computeBoundingSphere(); im.name = nm; out.push(im);
  };
  mk(base, mat, 'moebel-' + k); if (glow) mk(glow, glowMaterial(), 'moebel-' + k + '-licht');
  return out;
}
