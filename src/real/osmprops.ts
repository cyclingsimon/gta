// P-A Lauf 10: Bausteine für OSM-Objekte (Stil wie src/real/fuel.ts): Liste in Spielkoordinaten + groundY → EINE THREE.Group,
// alles einer Gegend in einem Netz (realMaterial), Teile über sparParts/box. Keine Kollision, keine Logos.
// Masse/Quellen/Annahmen: docs/par/realismus.md, Lauf 10.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sparParts, box, quad, hash2, tris, type SparPart } from './geo';
import { realMaterial } from './spar';

type GY = (x: number, z: number) => number;
/** Rotation um y, die die lokale x-Achse auf die Richtung (dx, dz) dreht (wie fuel.ts roadDir) */
const rotTo = (dx: number, dz: number) => Math.atan2(-dz, dx);
/** dünner Stab (offener Zylinder, seg Seiten = 2·seg Dreiecke) zwischen zwei Punkten */
function rod(a: number[], b: number[], r: number, seg = 3) {
  const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]), L = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r, r, L, seg, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
  const m = A.add(B).multiplyScalar(0.5); return g.translate(m.x, m.y, m.z);
}
function finish(geos: THREE.BufferGeometry[], name: string) {
  const G = new THREE.Group(); G.name = name; if (!geos.length) return G;
  const m = new THREE.Mesh(mergeGeometries(geos, false)!, realMaterial()); m.name = name; m.castShadow = true; m.receiveShadow = true; G.add(m);
  (G as any).userData.dreiecke = tris(m.geometry); for (const g of geos) g.dispose(); return G;
}

// ------------------------------------------------------------------------------------------------------------------
// 3) Hochspannungsleitungen: Gittermast + Seile
/** Gittermast (lokal: x = Leitungsrichtung, Traversen quer in z). Höhe 32 m [Annahme typischer 220/380-kV-Tragmast].
 *  4 schräge, sich verjüngende Eckstiele (je 6), 2 Traversen (je 12), 2 Diagonalen (je 6) = 60 Dreiecke. */
export function pylonGeometry(H = 32): THREE.BufferGeometry {
  const b = 3.2, t = 0.8, C = '#8E959A', P: SparPart[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push([rod([sx * b, 0, sz * b], [sx * t, H, sz * t], 0.22), C]);
  P.push([box(0.6, 0.5, 15, 0, H * 0.69, 0), C], [box(0.6, 0.5, 10, 0, H * 0.84, 0), C]);                    // Traversen 22 m / 27 m
  P.push([rod([-b * 0.75, H * 0.2, b * 0.75], [b * 0.4, H * 0.55, -b * 0.4], 0.12), C], [rod([b * 0.75, H * 0.2, -b * 0.75], [-b * 0.4, H * 0.55, b * 0.4], 0.12), C]);
  return sparParts(P);
}
/** Leiterseile je Mast: [Querversatz z, Höhe] – unten links/rechts an der 22-m-Traverse, oben rechts an der 27-m-Traverse (Isolator 1 m) */
const WIRES: [number, number][] = [[-6.8, 21], [6.8, 21], [4.4, 26]];
let SEIL: THREE.LineBasicMaterial | null = null;
export function seilMaterial() { if (!SEIL) { SEIL = new THREE.LineBasicMaterial({ color: '#2B2F33' }); SEIL.name = 'realSeil'; } return SEIL; }

/** EIN Aufruf je Gegend: towers = Maststandorte [x, z]; lines = Leitungen als Punktfolgen [[x, z], …] (OSM power=line, Knoten = Masten).
 *  Masten quer zum nächsten Leitungsabschnitt; Seile 3 je Leitung, je Spannfeld 3 Stützpunkte mit Durchhang (3 % der Spannweite, max. 8 m).
 *  Rückgabe: Gruppe mit 1 Mesh (alle Masten) + 1 LineSegments (alle Seile, Material «realSeil»). */
export function buildPowerLines(towers: number[][], lines: number[][][], groundY: GY, H = 32) {
  const G = new THREE.Group(); G.name = 'real-hochspannung';
  // Richtung je Punkt: nächster Leitungsabschnitt
  const segs: number[][] = []; for (const L of lines) for (let i = 0; i + 1 < L.length; i++) segs.push([L[i][0], L[i][1], L[i + 1][0], L[i + 1][1]]);
  const dirAt = (x: number, z: number) => { let best = Infinity, d = [1, 0];
    for (const [ax, az, bx, bz] of segs) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz; if (l2 < 1) continue;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), px = ax + dx * t - x, pz = az + dz * t - z, e = px * px + pz * pz;
      if (e < best) { best = e; const l = Math.sqrt(l2); d = [dx / l, dz / l]; } }
    return d; };
  // Querrichtung je Leitungspunkt: Winkelhalbierende der anliegenden Abschnitte → Seile an Knickmasten ohne Sprung
  const normals: number[][][] = lines.map((L) => L.map((_, i) => {
    const a = L[Math.max(0, i - 1)], b = L[Math.min(L.length - 1, i + 1)], c = L[i];
    let dx = 0, dz = 0;
    if (i > 0) { const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; dx += (c[0] - a[0]) / l; dz += (c[1] - a[1]) / l; }
    if (i < L.length - 1) { const l = Math.hypot(b[0] - c[0], b[1] - c[1]) || 1; dx += (b[0] - c[0]) / l; dz += (b[1] - c[1]) / l; }
    const l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l, dx / l, dz / l]; // [nx, nz, ux, uz]
  }));
  const knot = (x: number, z: number) => { for (let li = 0; li < lines.length; li++) for (let i = 0; i < lines[li].length; i++) if (Math.hypot(lines[li][i][0] - x, lines[li][i][1] - z) < 5) return normals[li][i]; return null; };
  const pg = pylonGeometry(H), geos: THREE.BufferGeometry[] = [];
  for (const [x, z] of towers) { const k = knot(x, z), [dx, dz] = k ? [k[2], k[3]] : dirAt(x, z); geos.push(pg.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(rotTo(dx, dz)).setPosition(x, groundY(x, z) - 0.2, z))); }
  const mg = finish(geos, 'real-masten'); for (const c of [...mg.children]) G.add(c); (G as any).userData.dreiecke = (mg as any).userData.dreiecke || 0;
  // Seile (Masten-Querrichtung: lokale z = Normale; Vorzeichen so, dass +z der Traversen-Seite entspricht)
  const pos: number[] = [], sc = H / 32;
  lines.forEach((L, li) => { for (let i = 0; i + 1 < L.length; i++) {
    const [ax, az] = L[i], [bx, bz] = L[i + 1], span = Math.hypot(bx - ax, bz - az); if (span < 2) continue;
    const nA = normals[li][i], nB = normals[li][i + 1], ya = groundY(ax, az), yb = groundY(bx, bz), sag = Math.min(8, span * 0.03);
    for (const [o, h] of WIRES) {
      const A = [ax + nA[0] * o, ya + h * sc, az + nA[1] * o], B = [bx + nB[0] * o, yb + h * sc, bz + nB[1] * o];
      const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - sag, (A[2] + B[2]) / 2];
      pos.push(...A, ...M, ...M, ...B);
    }
  } });
  if (pos.length) { const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.computeBoundingSphere();
    const ls = new THREE.LineSegments(lg, seilMaterial()); ls.name = 'real-seile'; G.add(ls); (G as any).userData.seilSegmente = pos.length / 6; }
  return G;
}

// ------------------------------------------------------------------------------------------------------------------
// 2) Sportplätze
/** Rechteck minimaler Fläche um ein Polygon: Mitte, Länge (≥ Breite), Breite, Richtung der Längsachse (Einheitsvektor) */
export function fitRect(p: number[][]) {
  let best: { L: number; W: number; cx: number; cz: number; ux: number; uz: number; ar: number } | null = null;
  for (let i = 0; i < p.length; i++) {
    const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length], l = Math.hypot(x2 - x1, z2 - z1); if (l < 0.5) continue;
    const ux = (x2 - x1) / l, uz = (z2 - z1) / l;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const [x, z] of p) { const A = x * ux + z * uz, B = -x * uz + z * ux; a0 = Math.min(a0, A); a1 = Math.max(a1, A); b0 = Math.min(b0, B); b1 = Math.max(b1, B); }
    const ar = (a1 - a0) * (b1 - b0); if (best && ar >= best.ar) continue;
    const cA = (a0 + a1) / 2, cB = (b0 + b1) / 2, cx = cA * ux - cB * uz, cz = cA * uz + cB * ux;
    best = a1 - a0 >= b1 - b0 ? { L: a1 - a0, W: b1 - b0, cx, cz, ux, uz, ar } : { L: b1 - b0, W: a1 - a0, cx, cz, ux: -uz, uz: ux, ar };
  }
  return best!;
}
export type Pitch = { sport: 'soccer' | 'tennis' | 'basketball'; p: number[][] };
/** Linien (lokal u = Längsachse, v = quer, Ursprung Platzmitte) → dünne Flächen 5 cm über dem Gelände, Abschnitte ≤ 12 m */
function lineStrips(P: SparPart[], segs: number[][], toW: (u: number, v: number) => number[], groundY: GY, w = 0.12, step = 12) {
  for (const [u0, v0, u1, v1] of segs) {
    const L = Math.hypot(u1 - u0, v1 - v0); if (L < 0.01) continue; const n = Math.max(1, Math.ceil(L / step)), du = (u1 - u0) / L, dv = (v1 - v0) / L, pu = -dv * w / 2, pv = du * w / 2;
    for (let k = 0; k < n; k++) {
      const a = [u0 + (u1 - u0) * k / n, v0 + (v1 - v0) * k / n], b = [u0 + (u1 - u0) * (k + 1) / n, v0 + (v1 - v0) * (k + 1) / n];
      const c = [[a[0] + pu, a[1] + pv], [b[0] + pu, b[1] + pv], [b[0] - pu, b[1] - pv], [a[0] - pu, a[1] - pv]].map(([u, v]) => { const [x, z] = toW(u, v); return [x, groundY(x, z) + 0.05, z]; });
      P.push([quad(c[0], c[1], c[2], c[3], [0, 1, 0]), '#F4F4F0']);
    }
  }
}
const rect = (hu: number, hv: number, cu = 0) => [[cu - hu, -hv, cu + hu, -hv], [cu + hu, -hv, cu + hu, hv], [cu + hu, hv, cu - hu, hv], [cu - hu, hv, cu - hu, -hv]];
const ngon = (r: number, n: number, cu = 0) => Array.from({ length: n }, (_, k) => { const a = k / n * Math.PI * 2, b = (k + 1) / n * Math.PI * 2; return [cu + Math.cos(a) * r, Math.sin(a) * r, cu + Math.cos(b) * r, Math.sin(b) * r]; });

/** EIN Aufruf je Gegend: Fussball-, Tennis-, Basketballplätze aus OSM-Umrissen (leisure=pitch, sport=*). Masse nach Regelwerk (FIFA/ITF/FIBA),
 *  in kleinere Umrisse proportional eingepasst. ≤ 200 Dreiecke je Platz (Fussball bis 110 × 75 m). */
export function buildPitches(list: Pitch[], groundY: GY) {
  const geos: THREE.BufferGeometry[] = [];
  for (const pt of list) {
    if (pt.p.length < 3) continue;
    const R = fitRect(pt.p), P: SparPart[] = [];
    const toW = (u: number, v: number) => [R.cx + R.ux * u - R.uz * v, R.cz + R.uz * u + R.ux * v];
    const post = (u: number, v: number, h: number, r = 0.06) => { const [x, z] = toW(u, v), y = groundY(x, z); P.push([rod([x, y, z], [x, y + h, z], r, 4), '#F4F4F0']); };
    const bar = (u: number, v0: number, v1: number, h: number) => { const [x0, z0] = toW(u, v0), [x1, z1] = toW(u, v1), y = groundY((x0 + x1) / 2, (z0 + z1) / 2); P.push([rod([x0, y + h, z0], [x1, y + h, z1], 0.06, 4), '#F4F4F0']); };
    if (pt.sport === 'soccer') {
      const s = Math.min(1, (R.L - 2) / 105, (R.W - 2) / 68), hu = Math.max(5, R.L / 2 - 1), hv = Math.max(4, R.W / 2 - 1); // Linien 1 m innerhalb des Umrisses
      const pa = [16.5 * s, 20.15 * s];
      lineStrips(P, [...rect(hu, hv), [0, -hv, 0, hv], ...ngon(9.15 * s, 12), ...[-1, 1].flatMap((d) => [[d * hu, -pa[1], d * (hu - pa[0]), -pa[1]], [d * (hu - pa[0]), -pa[1], d * (hu - pa[0]), pa[1]], [d * (hu - pa[0]), pa[1], d * hu, pa[1]]])], toW, groundY);
      const gw = 3.66 * Math.max(0.5, s), gh = 2.44 * Math.max(0.6, s);
      for (const d of [-1, 1]) { post(d * hu, -gw, gh); post(d * hu, gw, gh); bar(d * hu, -gw, gw, gh); }
    } else if (pt.sport === 'tennis') {
      const s = Math.min(1, (R.L - 1) / 23.77, (R.W - 1) / 10.97), hu = 11.885 * s, hv = 5.485 * s, hs = 4.115 * s, sl = 6.4 * s;
      lineStrips(P, [...rect(hu, hv), [-hu, -hs, hu, -hs], [-hu, hs, hu, hs], [-sl, -hs, -sl, hs], [sl, -hs, sl, hs], [-sl, 0, sl, 0]], toW, groundY, 0.06);
      post(0, -hv - 0.9, 1.07, 0.05); post(0, hv + 0.9, 1.07, 0.05);
      const [x0, z0] = toW(0, -hv - 0.9), [x1, z1] = toW(0, hv + 0.9), y = groundY((x0 + x1) / 2, (z0 + z1) / 2), nl = Math.hypot(x1 - x0, z1 - z0);
      P.push([box(0.03, 0.9, nl, 0, 0, 0).rotateY(Math.atan2(x1 - x0, z1 - z0)).translate((x0 + x1) / 2, y + 0.5, (z0 + z1) / 2), '#2B2F33']); // Netz
    } else {
      const s = Math.min(1, (R.L - 1) / 28, (R.W - 1) / 15), hu = 14 * s, hv = 7.5 * s;
      lineStrips(P, [...rect(hu, hv), [0, -hv, 0, hv], ...ngon(1.8 * s, 8)], toW, groundY, 0.08);
      for (const d of [-1, 1]) { // Korb: Mast hinter der Grundlinie, Brett, Ring
        const [px, pz] = toW(d * (hu + 1.0), 0), [bx, bz] = toW(d * (hu - 1.2), 0), [rx, rz] = toW(d * (hu - 1.6), 0), y = groundY(px, pz), a = rotTo(R.ux, R.uz);
        P.push([box(0.15, 3.3, 0.15, 0, 0, 0).translate(px, y + 1.65, pz), '#5B6168']);
        P.push([box(0.06, 1.05, 1.8, 0, 0, 0).rotateY(a).translate(bx, y + 3.4, bz), '#F4F4F0']);
        P.push([box(0.45, 0.05, 0.45, 0, 0, 0).rotateY(a).translate(rx, y + 3.05, rz), '#E8572B']);
        P.push([rod([px, y + 3.25, pz], [bx, y + 3.25, bz], 0.06, 3), '#5B6168']);
      }
    }
    geos.push(sparParts(P));
  }
  return finish(geos, 'real-sportplaetze');
}

// ------------------------------------------------------------------------------------------------------------------
// 1) Spielplätze
/** Spielplatz ≈ 9 × 7 m (lokal, Mitte am Boden): Schaukel (A-Gestell, 2 Sitze), Rutsche mit Leiter, Sandkasten, Wippe. Bunt [Annahme]. */
export function playgroundGeometry(): THREE.BufferGeometry {
  const P: SparPart[] = [], R = '#E8432E', B = '#2F7FD0', Y = '#F4C531', G = '#4CAF50', WOOD = '#B9875A';
  // Schaukel bei x −2.5: zwei A-Gestelle (je 2 Stäbe), Querbalken, 2 Sitze, Ketten als dünne Stäbe
  for (const z of [-1.6, 1.6]) P.push([rod([-3.3, 0, z], [-2.5, 2.4, z], 0.07), R], [rod([-1.7, 0, z], [-2.5, 2.4, z], 0.07), R]);
  P.push([rod([-2.5, 2.4, -1.7], [-2.5, 2.4, 1.7], 0.08), B]);
  for (const z of [-0.7, 0.7]) P.push([box(0.25, 0.04, 0.45, -2.5, 0.45, z), Y], [rod([-2.5, 0.47, z], [-2.5, 2.4, z], 0.02), '#7A7F84']);
  // Rutsche bei x +2.5, z +1.5: Plattform, Leiter, schräge Rutschfläche
  P.push([box(1.0, 0.1, 1.0, 2.0, 1.5, 1.5), WOOD], [rod([1.6, 0, 1.1], [1.6, 1.5, 1.1], 0.05), WOOD], [rod([2.4, 0, 1.9], [2.4, 1.5, 1.9], 0.05), WOOD]);
  P.push([box(0.08, 1.6, 0.6, 1.45, 0.8, 1.5), B]);                                                  // Leiter (als Fläche)
  { const g = new THREE.BoxGeometry(2.4, 0.06, 0.6); g.rotateZ(-0.56); g.translate(3.5, 0.8, 1.5); P.push([g, Y]); }
  // Sandkasten bei x +2.5, z −1.8: flacher Rahmen + Sand
  P.push([box(2.4, 0.12, 2.0, 2.5, 0.06, -1.8), '#E8D7A8'], [box(2.6, 0.25, 0.12, 2.5, 0.12, -2.8), WOOD], [box(2.6, 0.25, 0.12, 2.5, 0.12, -0.8), WOOD]);
  // Wippe bei x 0, z 2.6
  P.push([box(0.3, 0.45, 0.3, 0, 0.22, 2.6), R], [box(3.0, 0.08, 0.3, 0, 0.5, 2.6), G]);
  return sparParts(P);
}
/** EIN Aufruf je Gegend: list = [x, z] (OSM leisure=playground, Punkt oder Schwerpunkt); Drehung per hash2(x, z). */
export function buildPlaygrounds(list: number[][], groundY: GY) {
  const pg = playgroundGeometry(), geos = list.map(([x, z]) => pg.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(hash2(x, z) * Math.PI * 2).setPosition(x, groundY(x, z), z)));
  return finish(geos, 'real-spielplaetze');
}

// ------------------------------------------------------------------------------------------------------------------
// 4) Bahnübergänge
/** Bahnübergang (lokal: x = Strassenrichtung, Gleis quer in z; Ursprung Mitte). Je Strassenseite Andreaskreuz am Pfosten (rot-weiss)
 *  und offene Schranke (senkrecht stehender, rot-weiss gestreifter Baum) mit Antriebskasten. ≤ 80 Dreiecke. */
export function levelCrossingGeometry(): THREE.BufferGeometry {
  const P: SparPart[] = [], RD = '#D52B1E', W = '#F4F4F0';
  for (const s of [-1, 1]) {                // s = Seite (vor/nach dem Gleis), rechts der Fahrbahn
    const x = s * 4.5, z = s * 3.6;
    P.push([box(0.1, 2.2, 0.1, x, 1.1, z), '#8A8F94']);                                         // Pfosten Andreaskreuz
    for (const r of [0.6, -0.6]) P.push([new THREE.BoxGeometry(0.04, 0.16, 1.2).rotateX(r).translate(x, 2.3, z), r > 0 ? RD : W]); // Andreaskreuz (Balken rot bzw. weiss [Annahme vereinfacht])
    P.push([box(0.4, 1.0, 0.4, x, 0.5, z + s * 0.9), '#E4E6E6']);                              // Antriebskasten
    for (let k = 0; k < 3; k++) P.push([box(0.09, 0.9, 0.09, x, 1.2 + k * 0.9, z + s * 0.9), k % 2 ? W : RD]); // Schrankenbaum senkrecht (offen)
  }
  return sparParts(P);
}
/** EIN Aufruf je Gegend: list = [x, z, rot?] (OSM railway=level_crossing); rot = Strassenrichtung (rad wie fuel.ts), sonst 0. */
export function buildLevelCrossings(list: number[][], groundY: GY) {
  const g0 = levelCrossingGeometry(), geos = list.map(([x, z, r]) => g0.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(r ?? 0).setPosition(x, groundY(x, z), z)));
  return finish(geos, 'real-bahnuebergaenge');
}

// ------------------------------------------------------------------------------------------------------------------
// 5) Kamine und Funkmasten
export type MastKind = 'chimney' | 'mast' | 'tower' | 'communications_tower';
/** Kamin: runder, leicht konischer Schaft (6 Seiten) mit 2 rot-weissen Ringen oben; Funkmast: dreieckiger Schaft mit 2 Antennen-Trommeln. ≤ 40 Dreiecke. */
export function mastGeometry(kind: MastKind, h = 30): THREE.BufferGeometry {
  const P: SparPart[] = [];
  if (kind === 'chimney') {
    const r0 = Math.max(0.8, h * 0.035), r1 = r0 * 0.72, hs = h * 0.86;                               // 3 × 6 Seiten = 36 Dreiecke
    P.push([new THREE.CylinderGeometry(r1, r0, hs, 6, 1, true).translate(0, hs / 2, 0), '#B8B2A8']);
    P.push([new THREE.CylinderGeometry(r1 * 1.02, r1 * 1.04, h * 0.07, 6, 1, true).translate(0, hs + h * 0.035, 0), '#D52B1E']);
    P.push([new THREE.CylinderGeometry(r1, r1 * 1.02, h * 0.07, 6, 1, true).translate(0, hs + h * 0.105, 0), '#F4F4F0']);
    return sparParts(P);
  }
  P.push([new THREE.CylinderGeometry(0.35, 0.9, h, 3, 1, true).translate(0, h / 2, 0), '#9AA0A6']);   // 6
  P.push([new THREE.CylinderGeometry(0.75, 0.75, 1.6, 6, 1, true).translate(0, h * 0.78, 0), '#E4E6E6'], [new THREE.CylinderGeometry(0.65, 0.65, 1.4, 6, 1, true).translate(0, h * 0.9, 0), '#E4E6E6']); // 24
  P.push([new THREE.CylinderGeometry(0.02, 0.05, 3, 3, 1, true).translate(0, h + 1.5, 0), '#D52B1E']);  // 6 Spitze
  return sparParts(P);
}
/** EIN Aufruf je Gegend: list = [x, z, kind, height?] (OSM man_made=chimney/mast/tower/communications_tower, height=*); ohne Höhe 30 m [Annahme]. */
export function buildMasts(list: [number, number, MastKind, number?][], groundY: GY) {
  const geos = list.map(([x, z, k, h]) => mastGeometry(k, h && h > 3 ? h : 30).applyMatrix4(new THREE.Matrix4().makeRotationY(hash2(x, z) * 6.283).setPosition(x, groundY(x, z), z)));
  return finish(geos, 'real-masten-kamine');
}
