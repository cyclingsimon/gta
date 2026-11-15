// 15b (Rückmeldung Simon 15.11.): Tankstellen – ohne Funktion, aber als Tankstelle erkennbar.
// Lage aus OpenStreetMap (amenity=fuel, © OpenStreetMap-Mitwirkende, ODbL), Ausrichtung = nächste Strasse.
// Form [Annahme, typische Schweizer Tankstelle]: Flachdach 12 × 7 m (Oberkante 5 m – bleibt unter echten Tankstellendächern aus swissBUILDINGS3D) auf vier Stützen, farbige Blende, zwei Zapfinseln mit je
// zwei Zapfsäulen, Preistafel am Strassenrand. Keine Marken, keine Logos: Blendenfarbe aus fester Auswahl (per Ort gewürfelt).
// Keine Kollision (man kann durchfahren – nichts bleibt hängen). Alle Tankstellen einer Gegend = 1 Netz + 1 Schildernetz.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sparParts, box, hash2, type SparPart } from './geo';
import { realMaterial } from './spar';

/** [x, z, kompakt?] – kompakt = 1: Standort liegt laut OSM in einem Haus (Tankstelle im Erdgeschoss/Garage); dann nur Zapfinsel + Preistafel am Strassenrand, kein Dach */
export type Fuel = [number, number, number?];
const BAND = ['#D8322B', '#1F5FB4', '#2E9A4B', '#F08A1C', '#F2C81E', '#7A3FA0'];

let signTex: THREE.CanvasTexture | null = null;
/** Preistafel: Zapfsäulen-Piktogramm (aus Rechtecken gezeichnet, keine Schriftart nötig) und zwei Preiszeilen */
function fuelSignTexture() {
  if (signTex) return signTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d')!;
  g.fillStyle = '#1B2A4A'; g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#FFFFFF'; g.fillRect(34, 26, 44, 78); g.fillRect(28, 100, 56, 10);            // Säule + Sockel
  g.fillStyle = '#1B2A4A'; g.fillRect(41, 34, 30, 22);                                          // Anzeige
  g.strokeStyle = '#FFFFFF'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';        // Schlauch mit Zapfpistole
  g.beginPath(); g.moveTo(78, 62); g.lineTo(94, 62); g.lineTo(94, 96); g.lineTo(102, 96); g.lineTo(102, 44); g.lineTo(92, 32); g.stroke();
  g.fillStyle = '#FFFFFF'; g.font = '700 22px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillStyle = '#F2C81E'; g.fillRect(10, 128, 108, 48); g.fillStyle = '#7CE08A'; g.fillRect(10, 186, 108, 48);
  g.fillStyle = '#10182B'; g.fillText('95  1.79', 64, 160); g.fillText('D   1.89', 64, 218);
  signTex = new THREE.CanvasTexture(c); signTex.colorSpace = THREE.SRGBColorSpace; signTex.anisotropy = 4;
  return signTex;
}

/** Richtung (rad um y) der nächsten Strasse; ohne Strasse in 80 m: 0 */
function roadDir(x: number, z: number, roads: { p: number[][] }[]) {
  let best = 80 * 80, rot = 0;
  for (const r of roads) for (let i = 0; i + 1 < r.p.length; i++) {
    const [ax, az] = r.p[i], [bx, bz] = r.p[i + 1], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz; if (L < 1) continue;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)), px = ax + dx * t - x, pz = az + dz * t - z, d = px * px + pz * pz;
    if (d < best) { best = d; rot = Math.atan2(-dz, dx); }
  }
  return rot;
}

export function buildFuelStations(list: Fuel[], roads: { p: number[][] }[], groundY: (x: number, z: number) => number) {
  const G = new THREE.Group(); G.name = 'real-tankstellen'; if (!list.length) return G;
  const geos: THREE.BufferGeometry[] = [], signs: THREE.BufferGeometry[] = [];
  for (const [x, z, kompakt] of list) {
    if (kompakt === 2) continue; // kein freier Platz neben Haus und Strasse gefunden (tools/geo/fuel_place.py)
    const col = BAND[Math.floor(hash2(x, z) * BAND.length) % BAND.length], P: SparPart[] = [];
    if (!kompakt) {
      P.push([box(12, 0.3, 7, 0, 4.35, 0), '#F4F5F2', 'unten'], [box(12.3, 0.8, 7.3, 0, 4.6, 0), col]);                     // Dach (Unterseite leuchtet abends) + Blende
      for (const sx of [-4.6, 4.6]) for (const sz of [-2.4, 2.4]) P.push([box(0.4, 4.2, 0.4, sx, 2.1, sz), '#D9DBD6']);      // Stützen
    }
    const tx = kompakt ? 5 : 9.2, tz = kompakt ? 0 : 4.6;                                                                   // Preistafel: kompakt in der Achse der Insel
    for (const sz of kompakt ? [0] : [-2.6, 2.6]) {
      P.push([box(7, 0.22, 1.2, 0, 0.11, sz), '#B9B6AE']);                                                                   // Zapfinsel
      for (const sx of [-1.7, 1.7]) P.push([box(0.7, 1.55, 0.5, sx, 0.99, sz), '#2B3340'], [box(0.5, 0.45, 0.54, sx, 1.4, sz), '#F4F5F2', 1], [box(0.72, 0.18, 0.52, sx, 1.86, sz), col]);
    }
    P.push([box(0.3, 7.0, 0.3, tx, 3.5, tz), '#8C9096'], [box(1.7, 0.6, 0.42, tx, 7.2, tz), col]);                       // Preistafel-Mast + Kopf
    const y = groundY(x, z), rot = roadDir(x, z, roads), M = new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z);
    geos.push(sparParts(P).applyMatrix4(M));
    for (const s of [1, -1]) {                                                                                                // Tafel beidseitig
      const pl = new THREE.PlaneGeometry(1.6, 3.2); if (s < 0) pl.rotateY(Math.PI); pl.translate(tx, 5.2, tz + s * 0.22); signs.push(pl.applyMatrix4(M));
    }
  }
  if (!geos.length) return G;
  const m = new THREE.Mesh(mergeGeometries(geos, false)!, realMaterial()); m.castShadow = true; m.receiveShadow = true; G.add(m);
  const sm = new THREE.Mesh(mergeGeometries(signs, false)!, new THREE.MeshBasicMaterial({ map: fuelSignTexture() })); sm.name = 'real-tankstellen-schild'; G.add(sm);
  for (const g of geos) g.dispose(); for (const g of signs) g.dispose();
  return G;
}
