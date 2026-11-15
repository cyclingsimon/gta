// P-A Lauf 7: Schiffe und Boote des Vierwaldstättersees als Low-Poly-Bausteine (Vertex-Farben, Sparmaterial, je Schiff 1 Netz + 1 Konturnetz).
// Gleiche Konvention wie steamship() in src/world.ts: Eingabe = Umriss-Polygon (Spiel-Meter), Rechteck-Einpassung, Rückgabe-Gruppe,
// innere Gruppe mit lokaler x-Achse = Schiffslängsachse (Bug +x), y = 0 Wasserlinie. Boote wie in fun.ts Boats: Längsachse z, Mitte im Ursprung.
// Belege (docs/par/realismus.md, Lauf 7): SGV-Flotte mit fünf historischen Raddampfern (Uri 1901, Unterwalden 1902, Schiller 1906,
// Gallia 1913, Stadt Luzern 1928) und 16 Motorschiffen (Wikipedia «Lake Lucerne Navigation Company»); MS Diamant 2017, 63.5 × 13.3 m,
// fünf Decks (shiptec.ch). [Annahme] Farben/Aufteilung der Aufbauten, Schornsteinfarbe, Bootsformen.
import * as THREE from 'three';
import { REAL } from './config';
import { sparParts, box, tris, type SparPart } from './geo';
import { realMaterial } from './spar';

/** Rechteck-Einpassung wie world.ts steamship(): liefert Länge, Breite, Mittelpunkt, Drehung */
function fit(p: number[][]) {
  let best: any = null;
  for (let i = 0; i < p.length; i++) {
    const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length];
    const a = Math.atan2(z2 - z1, x2 - x1), ca = Math.cos(a), sa = Math.sin(a);
    let mnA = Infinity, mxA = -Infinity, mnB = Infinity, mxB = -Infinity;
    for (const [x, z] of p) { const A = x * ca + z * sa, B = -x * sa + z * ca; mnA = Math.min(mnA, A); mxA = Math.max(mxA, A); mnB = Math.min(mnB, B); mxB = Math.max(mxB, B); }
    const ar = (mxA - mnA) * (mxB - mnB);
    if (!best || ar < best.ar) best = { a, mnA, mxA, mnB, mxB, ar };
  }
  let { a, mnA, mxA, mnB, mxB } = best;
  let L = mxA - mnA, Wd = mxB - mnB;
  if (Wd > L) { a += Math.PI / 2; [L, Wd] = [Wd, L]; const cA = (mnA + mxA) / 2, cB = (mnB + mxB) / 2; mnA = cB - L / 2; mxA = cB + L / 2; mnB = -cA - Wd / 2; mxB = -cA + Wd / 2; }
  const cA = (mnA + mxA) / 2, cB = (mnB + mxB) / 2, ca = Math.cos(a), sa = Math.sin(a);
  return { L, Wd, a, x: cA * ca - cB * sa, z: cA * sa + cB * ca };
}
/** Gruppe wie steamship(): äussere Gruppe, innere mit Lage/Drehung; Netz + Kontur (1 LineSegments) */
function wrap(geo: THREE.BufferGeometry, f: { a: number; x: number; z: number }, name: string) {
  const g = new THREE.Group(); g.position.set(f.x, 0, f.z); g.rotation.y = -f.a;
  const m = new THREE.Mesh(geo, realMaterial()); m.castShadow = true; m.name = name; g.add(m);
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 35), new THREE.LineBasicMaterial({ color: '#3b302b' })));
  const out = new THREE.Group(); out.name = name; out.add(g); return out;
}
const bowG = (hw: number, len: number, h: number, y: number, x: number) => { const g = new THREE.ConeGeometry(hw, len, 4); g.rotateZ(-Math.PI / 2); g.rotateX(Math.PI / 4); g.scale(1, h / (hw * 1.414), 1); g.translate(x + len / 2, y, 0); return g; };
const WHITE = '#F6F4EE', WATER = '#2F3B35', WIN = '#4F6F8C', GOLD = '#C9A227';

/** Raddampfer (Stadt Luzern, Unterwalden …): weisser Rumpf mit dunkler Wasserlinie und goldener Zierlinie, Radkästen,
 *  zwei Salondecks mit Fensterbändern, Sonnendeck mit Reling, schräger Schornstein, Masten. ≤ 400 Dreiecke. */
export function steamerGeometry(L: number, Wd: number) {
  const hw = Wd * 0.62, P: SparPart[] = [];
  P.push([box(L * 0.9, 0.7, hw, -L * 0.02, -0.15, 0), WATER], [box(L * 0.9, 2.0, hw + 0.02, -L * 0.02, 1.2, 0), WHITE], [box(L * 0.9, 0.14, hw + 0.05, -L * 0.02, 2.0, 0), GOLD]);
  P.push([bowG(hw / 2, 6, 2.6, 0.9, L * 0.43), WHITE]);
  P.push([new THREE.CylinderGeometry(hw / 2, hw / 2, 2.7, 8, 1, false, Math.PI, Math.PI).translate(-L * 0.47, 0.85, 0), WHITE]);
  P.push([box(L * 0.6, 2.4, hw * 0.92, -L * 0.06, 3.4, 0), WHITE], [box(L * 0.56, 1.0, hw * 0.92 + 0.04, -L * 0.06, 3.5, 0), WIN]);
  P.push([box(L * 0.36, 2.0, hw * 0.8, -L * 0.12, 5.6, 0), WHITE], [box(L * 0.32, 0.85, hw * 0.8 + 0.04, -L * 0.12, 5.7, 0), WIN]);
  P.push([box(L * 0.44, 0.2, hw * 0.92, -L * 0.12, 6.7, 0), '#B9875A']);                                       // Sonnendeck (Holz)
  for (const s of [-1, 1]) P.push([box(L * 0.44, 0.6, 0.06, -L * 0.12, 7.1, s * hw * 0.45), WHITE]);          // Reling
  for (const s of [-1, 1]) {                                                                                   // Radkästen
    P.push([new THREE.CylinderGeometry(2.9, 2.9, Wd * 0.18, 8, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).translate(L * 0.06, 1.3, s * (hw / 2 + Wd * 0.09)), WHITE]);
    P.push([box(5.6, 0.16, Wd * 0.18 + 0.04, L * 0.06, 1.3, s * (hw / 2 + Wd * 0.09)), GOLD]);
  }
  const rake = 0.2, cx = L * 0.05, cy = 9.0, dx = -Math.sin(rake), dy = Math.cos(rake);                        // schräger Schornstein (nach hinten)
  P.push([new THREE.CylinderGeometry(0.9, 1.0, 5, 8, 1, true).rotateZ(rake).translate(cx, cy, 0), '#E8C35A']);
  P.push([new THREE.CylinderGeometry(0.95, 0.95, 0.8, 8, 1, true).rotateZ(rake).translate(cx + dx * 2.9, cy + dy * 2.9, 0), '#2B2B2B']);
  P.push([box(0.16, 7, 0.16, L * 0.4, 4.5, 0), '#5A4A3A'], [box(0.12, 3.5, 0.12, -L * 0.47, 3.6, 0), '#5A4A3A']); // Masten
  return sparParts(P);
}
/** Modernes Motorschiff (Vorbild MS Diamant: 63.5 × 13.3 m): kantige weisse Aufbauten mit grossen Glasbändern, 3 Decks + Steuerhaus. ≤ 300 Dreiecke. */
export function motorshipGeometry(L: number, Wd: number) {
  const hw = Wd * 0.95, P: SparPart[] = [];
  P.push([box(L * 0.9, 0.8, hw, -L * 0.03, -0.1, 0), WATER], [box(L * 0.9, 1.9, hw + 0.02, -L * 0.03, 1.25, 0), WHITE], [box(L * 0.9, 0.16, hw + 0.05, -L * 0.03, 0.4, 0), '#1F5FAE']);
  P.push([bowG(hw / 2, 7, 2.7, 0.95, L * 0.42), WHITE]);
  P.push([box(L * 0.76, 2.5, hw * 0.94, -L * 0.07, 3.45, 0), WHITE], [box(L * 0.72, 1.5, hw * 0.94 + 0.04, -L * 0.07, 3.5, 0), '#3E5568']);
  P.push([box(L * 0.6, 2.4, hw * 0.86, -L * 0.1, 5.9, 0), WHITE], [box(L * 0.56, 1.4, hw * 0.86 + 0.04, -L * 0.1, 5.95, 0), '#3E5568']);
  P.push([box(L * 0.3, 2.0, hw * 0.7, -L * 0.05, 8.1, 0), WHITE], [box(L * 0.26, 1.1, hw * 0.7 + 0.04, -L * 0.05, 8.2, 0), '#3E5568']);
  P.push([box(4.5, 1.6, hw * 0.5, L * 0.12, 9.9, 0), WHITE], [box(0.05, 0.9, hw * 0.46, L * 0.12 + 2.27, 10.0, 0), '#3E5568']); // Steuerhaus
  P.push([box(0.14, 4, 0.14, L * 0.12, 12.6, 0), '#8A9096']);
  return sparParts(P);
}
/** Kleine Boote (Längsachse z, Mitte im Ursprung, Wasserlinie y ≈ 0): Rumpf getönt (aTint) → Farbe per Instanz/Ein-Netz-Farbe */
export type BoatKind = 'ruderboot' | 'segelboot' | 'pedalo';
const BOATS = new Map<BoatKind, THREE.BufferGeometry>();
export function boatGeometry(k: BoatKind) {
  const c = BOATS.get(k); if (c) return c;
  const bow = (w: number, len: number, h: number, y: number, z: number) => { const g = new THREE.ConeGeometry(w / 2, len, 4); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 4); g.scale(1, h / (w * 0.707), 1); g.translate(0, y, z + len / 2); return g; };
  let P: SparPart[] = [];
  switch (k) {
    case 'ruderboot': P = [[box(1.3, 0.5, 3.0, 0, 0.15, -0.3), '#FFFFFF', 0, 1], [bow(1.3, 1.2, 0.5, 0.15, 1.2), '#FFFFFF', 0, 1], [box(1.25, 0.08, 0.3, 0, 0.42, 0.2), '#B9875A'], [box(1.25, 0.08, 0.3, 0, 0.42, -0.9), '#B9875A']]; break; // 44
    case 'segelboot': P = [[box(2.0, 0.8, 4.6, 0, 0.2, -0.4), '#FFFFFF', 0, 1], [bow(2.0, 1.6, 0.8, 0.2, 1.9), '#FFFFFF', 0, 1], [box(1.2, 0.5, 1.6, 0, 0.85, -0.6), '#F4F1E6'],
      [new THREE.CylinderGeometry(0.05, 0.07, 8, 4, 1, true).translate(0, 4.6, 0.6), '#B9BEC4'], [box(0.08, 0.08, 2.8, 0, 1.6, -0.8), '#B9BEC4']]; break; // 52 (Mast ohne Segel – im Hafen)
    case 'pedalo': P = [[box(0.45, 0.45, 2.8, -0.55, 0.12, 0), '#FFFFFF', 0, 1], [box(0.45, 0.45, 2.8, 0.55, 0.12, 0), '#FFFFFF', 0, 1], [box(1.5, 0.12, 1.4, 0, 0.42, -0.2), '#E8E4D8'],
      [box(1.4, 0.5, 0.12, 0, 0.7, -0.75), '#FFFFFF', 0, 1]]; break; // 48
  }
  const g = sparParts(P); BOATS.set(k, g); return g;
}
export function shipTris(): Record<string, number> {
  return { dampfer: tris(steamerGeometry(62, 13)), motorschiff: tris(motorshipGeometry(63.5, 13.3)), ruderboot: tris(boatGeometry('ruderboot')), segelboot: tris(boatGeometry('segelboot')), pedalo: tris(boatGeometry('pedalo')) };
}

/** E10a (src/world.ts, Block `if (s.kind === 'ship')`): `G.add(steamship(s.b.p));` → `G.add(realSteamship(s.b.p) ?? steamship(s.b.p));` */
export function realSteamship(p: number[][], on = REAL.ships): THREE.Group | null {
  if (!on) return null; const f = fit(p); return wrap(steamerGeometry(f.L, f.Wd), f, 'raddampfer');
}
/** E10b (src/fun.ts, Klasse Ships, Konstruktor): `const obj = steamship([[-31, -6.5], [31, -6.5], [31, 6.5], [-31, 6.5]]);`
 *  → `const obj = realKursschiff(i, [[-31, -6.5], [31, -6.5], [31, 6.5], [-31, 6.5]]) ?? steamship([[-31, -6.5], [31, -6.5], [31, 6.5], [-31, 6.5]]);`
 *  Gerade Routen-Nummer: Raddampfer, ungerade: Motorschiff. */
export function realKursschiff(i: number, p: number[][], on = REAL.ships): THREE.Group | null {
  if (!on) return null; const f = fit(p);
  return i % 2 === 0 ? wrap(steamerGeometry(f.L, f.Wd), f, 'raddampfer') : wrap(motorshipGeometry(f.L, f.Wd), f, 'motorschiff');
}
/** E10c (src/fun.ts, Klasse Boats, Konstruktor): `const o = new THREE.Mesh(mergeGeometries(parts, false)!, boatMat);`
 *  → `const o = realBoat(i, c) ?? new THREE.Mesh(mergeGeometries(parts, false)!, boatMat);` – Pedalo/Ruderboot/Segelboot im Wechsel, Rumpf in Farbe c. */
export function realBoat(i: number, color: string, on = REAL.ships): THREE.Mesh | null {
  if (!on) return null;
  const k: BoatKind = (['pedalo', 'ruderboot', 'pedalo', 'segelboot'] as BoatKind[])[i % 4];
  const g = boatGeometry(k).clone(), col = g.getAttribute('color'), t = g.getAttribute('aTint'), c = new THREE.Color(color);
  for (let j = 0; j < col.count; j++) if (t.getX(j) > 0.5) col.setXYZ(j, c.r, c.g, c.b);
  const m = new THREE.Mesh(g, realMaterial()); m.name = 'boot-' + k; return m;
}
