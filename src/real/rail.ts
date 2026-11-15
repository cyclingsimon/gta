// P-A Lauf 7: Triebzüge der Region Luzern als Low-Poly-Wagenkästen (Vertex-Farben, Sparmaterial → 1 Material für alle Züge).
// Gleiche Masse/Ursprung/Ausrichtung wie trainCarGeo() in src/fun.ts: Wagenmitte im Ursprung, Längsachse z (Fahrtrichtung +z),
// Unterkante y = 0.5, Länge carL (SBB 24 m, zb 19 m). Je Wagen ≤ 120 Dreiecke.
// Belege (s. docs/par/realismus.md, Lauf 7): FLIRT verkehrt als S-Bahn u. a. im Kanton Luzern (sbb.ch); Voralpen-Express = SOB Traverso,
// «copper and red livery (with black window frames and grey doors)» (Wikipedia Voralpen Express), «kupferfarben» (SOB 06.06.2018).
// [Annahme] Farbaufteilung FLIRT/Dosto (SBB) und Zentralbahn; Traverso auf der Strecke über Küssnacht (VAE Luzern–Arth-Goldau).
import * as THREE from 'three';
import { REAL } from './config';
import { sparParts, box, quad, tris, type SparPart } from './geo';
import { realMaterial } from './spar';

export type TrainType = 'flirt' | 'dosto' | 'zb' | 'traverso';
/** Zugtyp nach Strecke: Zentralbahn (kind 'zb', Richtung Süd/Horw–Stans), Küssnacht → Voralpen-Express (Traverso), IR → Doppelstock, sonst FLIRT */
export function trainTypeFor(kind: string, name = ''): TrainType {
  if (kind === 'zb') return 'zb';
  if (/küssnacht|arth|voralpen/i.test(name)) return 'traverso';
  if (/\bIR\b|IC|RE\b|zürich/i.test(name)) return 'dosto';
  return 'flirt';
}
const STYLE: Record<TrainType, { W: number; H: number; body: string; win: string; band: string; low: string; door: string; front: string; rows: number }> = {
  flirt: { W: 2.9, H: 3.4, body: '#F4F4F2', win: '#26313B', band: '#D52B1E', low: '#5E656B', door: '#D52B1E', front: '#D52B1E', rows: 1 },     // [Annahme]
  dosto: { W: 2.9, H: 4.3, body: '#F4F4F2', win: '#26313B', band: '#D52B1E', low: '#D52B1E', door: '#9AA0A6', front: '#D52B1E', rows: 2 },     // [Annahme] rot-weiss
  zb: { W: 2.65, H: 3.3, body: '#F4F4F2', win: '#2B3036', band: '#C8202C', low: '#C8202C', door: '#C8202C', front: '#C8202C', rows: 1 },       // [Annahme] weiss-rot, schmaler (Meterspur)
  traverso: { W: 2.9, H: 3.6, body: '#B87333', win: '#151719', band: '#B87333', low: '#8E2A22', door: '#8A8F94', front: '#8E2A22', rows: 1 },  // belegt: kupfer/rot, schwarze Fensterrahmen, graue Türen
};
const CACHE = new Map<string, THREE.BufferGeometry>();
/** Wagenkasten: nose = +1 (Führerstand vorne, +z), −1 (hinten, −z), 0 (Mittelwagen), 2 (beide Enden) */
export function trainCarGeometry(t: TrainType, carL: number, nose: number): THREE.BufferGeometry {
  const key = t + ':' + carL + ':' + nose; const c = CACHE.get(key); if (c) return c;
  const S = STYLE[t], W = S.W, y0 = 0.5, y1 = y0 + S.H, hz = carL / 2, P: SparPart[] = [];
  const noseLen = 2.2, front = nose === 1 || nose === 2, back = nose === -1 || nose === 2;
  const z0 = back ? -hz + noseLen : -hz, z1 = front ? hz - noseLen : hz, L = z1 - z0, zc = (z0 + z1) / 2;
  P.push([box(W, S.H - 0.55, L, 0, y0 + 0.55 + (S.H - 0.55) / 2, zc), S.body]);                 // Kasten
  P.push([box(W - 0.3, 0.55, carL - 0.4, 0, y0 + 0.275, 0), '#2B2F33']);                          // Fahrwerk/Unterbau
  P.push([box(W + 0.02, 0.32, L, 0, y0 + 0.75, zc), S.low]);                                     // unteres Band
  const wy = S.rows === 2 ? [y0 + 1.35, y0 + 3.0] : [y0 + 2.05];
  const side = (za: number, zb: number, ya: number, yb: number, col: string, off: number) => { for (const sx of [-1, 1]) { const x = sx * (W / 2 + off); P.push([quad([x, ya, za], [x, ya, zb], [x, yb, zb], [x, yb, za], [sx, 0, 0]), col]); } };
  for (const y of wy) { P.push([box(W + 0.03, 0.85, L - 0.6, 0, y, zc), S.win]); side(zc - L / 2 + 0.2, zc + L / 2 - 0.2, y - 0.56, y - 0.44, S.band, 0.02); } // Fensterband + Zierlinie (Vierecke)
  for (const dz of [-L * 0.3, L * 0.3]) side(zc + dz - 0.65, zc + dz + 0.65, y0 + 0.45, y1 - 0.3, S.door, 0.03); // Doppeltüren (Vierecke beidseitig)
  P.push([box(W - 0.6, 0.35, L * 0.5, 0, y1 + 0.17, zc), '#8A9096']);                            // Dachaufbau
  const noseG = (dir: number) => { // Führerstand: Seitenprofil mit schräger Front (extrudiert), Scheibe, Lichter
    const s = new THREE.Shape(), b = 0, f = noseLen, pr = [[b, y0], [f - 0.1, y0], [f, y0 + 1.0], [f - 0.9, y1 - 0.15], [f - 1.3, y1], [b, y1]];
    s.moveTo(pr[0][0], pr[0][1]); for (const q of pr.slice(1)) s.lineTo(q[0], q[1]);
    const g = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(W / 2, 0, 0);
    if (dir < 0) g.rotateY(Math.PI); g.translate(0, 0, dir > 0 ? hz - noseLen : -hz + noseLen);
    P.push([g, S.front]);
    // Flächen der Front: unten (hz−0.1 → hz bei y0..y0+1), Scheibe schräg (hz → hz−0.9 bei y0+1..y1−0.15); 3 cm davor
    const zLow = (y: number) => dir * (hz - 0.1 + 0.1 * (y - y0) + 0.03), zWs = (y: number) => dir * (hz - 0.9 * (y - y0 - 1) / (y1 - 0.15 - y0 - 1) + 0.03);
    const ya = y0 + 1.12, yb = y1 - 0.3;
    P.push([quad([-W / 2 + 0.25, ya, zWs(ya)], [W / 2 - 0.25, ya, zWs(ya)], [W / 2 - 0.3, yb, zWs(yb)], [-W / 2 + 0.3, yb, zWs(yb)], [0, 0.7, dir]), S.win]);
    for (const sx of [-1, 1]) P.push([quad([sx * (W / 2 - 0.2), y0 + 0.5, zLow(y0 + 0.5)], [sx * (W / 2 - 0.6), y0 + 0.5, zLow(y0 + 0.5)], [sx * (W / 2 - 0.6), y0 + 0.75, zLow(y0 + 0.75)], [sx * (W / 2 - 0.2), y0 + 0.75, zLow(y0 + 0.75)], [0, 0, dir]), '#FFF4C2', 1]);
  };
  if (front) noseG(1); if (back) noseG(-1);
  const g = sparParts(P); CACHE.set(key, g); return g;
}
export function trainTris(): Record<string, number> {
  const o: Record<string, number> = {};
  for (const t of ['flirt', 'dosto', 'zb', 'traverso'] as TrainType[]) { const L = t === 'zb' ? 19 : 24; o[t + '_mitte'] = tris(trainCarGeometry(t, L, 0)); o[t + '_ende'] = tris(trainCarGeometry(t, L, 1)); }
  return o;
}
/** EIN-ZEILEN-EINBAU (E9, src/fun.ts, Klasse Trains, Konstruktor, Zeile
 *    `for (let k = 0; k < n; k++) { const b = new THREE.Mesh(geo, m[0]); this.group.add(b); cars.push(b); }`):
 *  `new THREE.Mesh(geo, m[0])` ersetzen durch `(realTrainCar(line.kind, line.name, carL, k, n) ?? new THREE.Mesh(geo, m[0]))`.
 *  Wagen 0 fährt vorne (+z = Fahrtrichtung, so setzt Trains.update die Drehung), letzter Wagen hat den Führerstand hinten.
 *  REAL.trains = false → null (bisheriger Kasten). */
export function realTrainCar(kind: string, name: string, carL: number, k: number, n: number, on = REAL.trains): THREE.Mesh | null {
  if (!on) return null;
  const nose = n === 1 ? 2 : k === 0 ? 1 : k === n - 1 ? -1 : 0;
  const m = new THREE.Mesh(trainCarGeometry(trainTypeFor(kind, name), carL, nose), realMaterial()); m.name = 'zug-' + trainTypeFor(kind, name); return m;
}
