// P-A Lauf 2: Einbau-Bausteine für buildProps (world.ts) – je EIN Aufruf, mit Rückfall auf das bisherige Aussehen.
import * as THREE from 'three';
import { toon, type Mask } from '../world';
import { REAL } from './config';
import { hash2, parts } from './geo';
import { buildFurniture, furnitureGeometry } from './furniture';

type M = Pick<Mask, 'at' | 'isRoad'>;
type HY = (x: number, z: number) => number;

/** Richtung (rad, für makeRotationY) in der die meisten Strassenzellen liegen → +z des Möbels zeigt zur Strasse */
function towardRoad(mask: M, x: number, z: number, d = [2, 4, 6]) {
  let best = hash2(x, z) * Math.PI * 2, bn = 0;
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; let n = 0; for (const r of d) if (mask.isRoad(x + Math.sin(a) * r, z + Math.cos(a) * r)) n++; if (n > bn) { bn = n; best = a; } }
  return best;
}

/** Mittelpunkte der bereits modellierten Wartehallen (city.json «shelters», Luzern-Kern, berechnet 14.11.2026) */
export const SHELTERS_CITY = [[150, 115], [104, 103], [203, 387], [187, 388], [173, 423], [326, 371], [303, 385], [238, 101], [-73, 390], [185, 42]];

/** Bushaltestellen: Wartehalle (Rückwand von der Strasse weg) an rund der Hälfte der Haltestellen [Annahme – OSM shelter=yes fehlt
 *  in props.json], sonst das bisherige blaue Schild. Keine Halle näher als 30 m an den Bahnhof-Wartehallen (city.json shelters).
 *  EIN-ZEILEN-EINBAU (buildProps, ganzer Block «Bushaltestellen: blaues Schild» ersetzen):
 *    if (P.stops.length) G.add(...buildStops(P.stops, mask, (x, z) => terrain.height(x, z)));
 *  REAL.shelters = false → nur das bisherige Schild (identisch zu vorher). Rückgabe: InstancedMeshes (chunkInstanced-tauglich). */
export function buildStops(stops: any[][], mask: M, groundY: HY, avoid: number[][] = SHELTERS_CITY, on = REAL.shelters, share = 0.5): THREE.InstancedMesh[] {
  const hall: number[][] = [], sign: number[][] = [];
  for (const s of stops) {
    const [x, z] = s, far = avoid.every(([ax, az]) => Math.hypot(ax - x, az - z) > 30);
    if (on && far && hash2(x * 1.7, z * 0.3) < share) hall.push([x, z, towardRoad(mask, x, z, [3, 5])]); else sign.push(s);
  }
  const out: THREE.InstancedMesh[] = [];
  if (sign.length) { // bisheriges Schild, unverändert
    const poleG = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 4); poleG.translate(0, 1.3, 0);
    const signG = new THREE.BoxGeometry(0.6, 0.45, 0.05); signG.translate(0, 2.55, 0);
    const st = new THREE.InstancedMesh(parts([[poleG, '#8A8F94'], [signG, '#2F6FB8']]), toon('#ffffff', { vertexColors: true }), sign.length);
    const m4 = new THREE.Matrix4();
    sign.forEach(([x, z], i) => { m4.makeRotationY(hash2(x + 1, z) * Math.PI); m4.setPosition(x, groundY(x, z), z); st.setMatrixAt(i, m4); });
    st.computeBoundingSphere(); st.name = 'stops'; out.push(st);
  }
  // Wartehalle: offene Front (+z) zur Strasse
  if (hall.length) out.push(...buildFurniture('wartehalle', hall, groundY, toon('#ffffff', { vertexColors: true })));
  return out;
}

/** Laternen: in der Altstadt-Box [Annahme: x −700..250, z −450..150] Altstadt-Kandelaber, an Hauptstrassen (3. Wert) moderne
 *  Mastleuchte 8 m mit Ausleger zur Fahrbahn, übrige wie bisher (Mast + Kopf). Leuchtteile mit Nachtlicht (NIGHT.value).
 *  EIN-ZEILEN-EINBAU (buildProps, die Zeilen von `const poleG` bis `G.add(pole, head);` im Block `if (P.lamps.length)` ersetzen):
 *    G.add(...buildLamps(P.lamps, mask, (x, z) => terrain.height(x, z)));
 *  REAL.lamps = false → exakt die bisherigen Laternen (pole + head, Material «lampHead»). */
export function buildLamps(lamps: number[][], mask: M, groundY: HY, on = REAL.lamps, altstadt = [-700, -450, 250, 150]): THREE.InstancedMesh[] {
  const out: THREE.InstancedMesh[] = [];
  const inAlt = (x: number, z: number) => x > altstadt[0] && z > altstadt[1] && x < altstadt[2] && z < altstadt[3];
  const alt: number[][] = [], main: number[][] = [], rest: number[][] = [];
  for (const l of lamps) { const [x, z] = l; const a = towardRoad(mask, x, z);
    if (on && inAlt(x, z)) alt.push([x, z, a]); else if (on && l[2]) main.push([x, z, a]); else rest.push(l); }
  if (rest.length) { // bisherige Laterne, unverändert (inkl. 1.6× Höhe an Hauptstrassen, falls REAL.lamps = false)
    const poleG = new THREE.CylinderGeometry(0.07, 0.1, 4.6, 5); poleG.translate(0, 2.3, 0);
    const headG = new THREE.BoxGeometry(0.7, 0.22, 0.32); headG.translate(0.25, 4.65, 0);
    const pole = new THREE.InstancedMesh(poleG, toon('#3E4A45'), rest.length);
    const head = new THREE.InstancedMesh(headG, toon('#FFF2B8', { emissive: new THREE.Color('#5A4E20') }), rest.length); head.material.name = 'lampHead';
    const m4 = new THREE.Matrix4(), sc = new THREE.Matrix4();
    rest.forEach((l, i) => { const [x, z] = l; let best = hash2(x, z) * Math.PI * 2, bn = 0;
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; let n = 0; for (const d of [2, 4, 6]) if (mask.isRoad(x + Math.cos(a) * d, z + Math.sin(a) * d)) n++; if (n > bn) { bn = n; best = a; } }
      m4.makeRotationY(-best); if (l[2]) m4.multiply(sc.makeScale(1, 1.6, 1)); m4.setPosition(x, groundY(x, z), z); pole.setMatrixAt(i, m4); head.setMatrixAt(i, m4); });
    pole.name = 'lamps'; out.push(pole, head);
  }
  const mat = toon('#ffffff', { vertexColors: true });
  if (alt.length) out.push(...buildFurniture('kandelaber', alt, groundY, mat));
  if (main.length) out.push(...buildFurniture('kandelaber_modern', main, groundY, mat));
  for (const im of out) if (im.name.startsWith('moebel-kandelaber') && !im.name.endsWith('-licht')) im.name = 'lamps';
  return out;
}

/** Bank-Geometrie für den bestehenden Bank-Block (buildProps). EIN-ZEILEN-EINBAU: im `new THREE.InstancedMesh(colorMerge([...]), …)`
 *  den Ausdruck `colorMerge([...])` durch `realBenchGeometry() ?? colorMerge([...])` ersetzen. REAL.bench = false → null (bisherige Bank). */
export function realBenchGeometry(on = REAL.bench): THREE.BufferGeometry | null {
  return on ? furnitureGeometry('bank') : null;
}

