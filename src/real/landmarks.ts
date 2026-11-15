// P-A Lauf 8: Wahrzeichen Bahnhofplatz/Seebecken als Sparform-Bausteine (Vertex-Farben, gemeinsames Material «realSpar»
// mit Nachtlicht über aGlow). Jede Funktion liefert EINE THREE.Group (1 Netz + optional 1 Konturnetz).
// Lage/Ausrichtung/Masse IMMER als Parameter – keine Koordinaten geraten. Ursprung = Mitte am Boden, y0 = Bodenhöhe,
// rot = Drehung um y (rad; 0 = lokale x-Achse zeigt nach Osten/+x). Quellen und Annahmen: docs/par/realismus.md, Lauf 8.
import * as THREE from 'three';
import { sparParts, box, tris, type SparPart } from './geo';
import { realMaterial } from './spar';

export interface Place { x: number; z: number; y0?: number; rot?: number }
function group(P: SparPart[], at: Place, name: string, edges = true) {
  const geo = sparParts(P), g = new THREE.Group(); g.name = name;
  g.position.set(at.x, at.y0 ?? 0, at.z); g.rotation.y = at.rot ?? 0;
  const m = new THREE.Mesh(geo, realMaterial()); m.castShadow = true; m.receiveShadow = true; g.add(m);
  if (edges) g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 35), new THREE.LineBasicMaterial({ color: '#3b302b' })));
  (g as any).userData.dreiecke = tris(geo); return g;
}

/** 1) Torbogen (altes Bahnhofsportal 1896, Kupferfigur «Zeitgeist» von R. Kissling – hier nur angedeutet).
 *  Lokale x-Achse = Längsachse des Bogens (Durchgang in z-Richtung). W/D: OSM-Grundriss ~20.5 × 5.2 m; Höhen [Annahme nach Foto]:
 *  Bogen 7 m breit, Scheitel 11 m, Gesims 13 m, Attika bis 16.9 m, Figur bis ~23 m. ≈ 330 Dreiecke. */
export function torbogenSpar(at: Place, W = 20.5, D = 5.2) {
  const STONE = '#CFC4AC', DARK = '#B5A98F', BRONZE = '#4E6B5A', P: SparPart[] = [];
  const sh = new THREE.Shape(); sh.moveTo(-W / 2, 0); sh.lineTo(W / 2, 0); sh.lineTo(W / 2, 13); sh.lineTo(-W / 2, 13); sh.lineTo(-W / 2, 0);
  const hole = new THREE.Path(); hole.moveTo(-3.5, 0); hole.lineTo(-3.5, 7.5); hole.absarc(0, 7.5, 3.5, Math.PI, 0, true); hole.lineTo(3.5, 0); hole.lineTo(-3.5, 0); sh.holes.push(hole);
  P.push([new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -D / 2), STONE]);
  P.push([box(W + 1, 0.9, D + 1, 0, 13.45, 0), DARK], [box(W - 4, 2.6, D - 0.6, 0, 15.2, 0), STONE], [box(W - 3.4, 0.5, D - 0.2, 0, 16.7, 0), DARK], [box(W + 0.4, 1.2, D + 0.4, 0, 0.6, 0), DARK]);
  for (const sz of [-1, 1]) for (const x of [-6.2, -4.6, 4.6, 6.2]) P.push([box(0.9, 11.6, 0.6, x, 6.4, sz * (D / 2 + 0.3)), STONE]); // Säulen als Pilaster
  for (const sz of [-1, 1]) P.push([box(1.4, 1.6, 0.4, 0, 10.6, sz * (D / 2 + 0.1)), DARK]);                               // Schlussstein
  P.push([box(5, 1.2, 3, 0, 17.6, 0), DARK], [new THREE.ConeGeometry(1.3, 4.2, 6, 1, true).translate(0, 20.3, 0), BRONZE],
    [new THREE.IcosahedronGeometry(0.55, 0).translate(0, 22.7, 0), BRONZE], [new THREE.ConeGeometry(0.8, 2.6, 5, 1, true).translate(-1.8, 19.5, 0.4), BRONZE], [new THREE.ConeGeometry(0.8, 2.6, 5, 1, true).translate(1.8, 19.5, 0.4), BRONZE]);
  return group(P, at, 'torbogen-spar');
}

/** 2) KKL-Dach: dünne, weit auskragende Platte (luzern.com: 113 × 107 m, 12 000 m², 21 m hoch, freie Auskragung diagonal 45 m;
 *  espazium: Kupferdach, kragt 20 m frei vor die Hauptfassade). Platte mit dünner Messerkante (Dicke Mitte/Rand [Annahme] 1.6/0.35 m),
 *  leicht geneigt [Annahme 1°]. Kein Nachtlicht (Unterseite wäre mit dem gemeinsamen Leuchtton zu grell). Lokale x = Länge (Richtung See), z = Breite.
 *  height = Unterkante über y0. ≈ 40 Dreiecke. */
export function kklDachSpar(at: Place, length = 113, width = 107, height = 21, thickMid = 1.6, thickEdge = 0.35) {
  const s = new THREE.Shape(), L = length / 2;
  s.moveTo(-L, 0); s.lineTo(L, 0); s.lineTo(L, thickEdge); s.lineTo(L * 0.6, thickMid); s.lineTo(-L * 0.6, thickMid); s.lineTo(-L, thickEdge); s.lineTo(-L, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false }); g.translate(0, height, -width / 2); g.rotateZ(-0.017);
  // Seitenkanten ebenfalls dünn: Platte mit abgeschrägter Breitseite = zweite, schmale Randleiste aussen (Annahme)
  return group([[g, '#5E6670'], [box(length * 0.995, 0.25, 0.4, 0, height + thickEdge * 0.5, width / 2 - 0.2), '#8C6B4F'], [box(length * 0.995, 0.25, 0.4, 0, height + thickEdge * 0.5, -width / 2 + 0.2), '#8C6B4F']], at, 'kkl-dach-spar');
}

/** 3a) Wasserturm (luzern.com: Höhe 34.5 m, Grundriss Achteck mit 4.4–5 m Seitenlänge, Umfang 39 m).
 *  Mauerwerk bräunlich, Zeltdach mit Ziegeln, Schiessscharten/Fenster als dunkle Felder [Farben, Dachhöhe 9 m: Annahme]. ≈ 110 Dreiecke. */
export function wasserturmSpar(at: Place, height = 34.5, side = 4.7, roofH = 9) {
  const R = side / (2 * Math.sin(Math.PI / 8)), bodyH = height - roofH, P: SparPart[] = [];
  P.push([new THREE.CylinderGeometry(R, R * 1.03, bodyH, 8, 1, true).rotateY(Math.PI / 8).translate(0, bodyH / 2, 0), '#A8865E']);
  P.push([new THREE.CylinderGeometry(R * 1.04, R * 1.04, 0.8, 8, 1, true).rotateY(Math.PI / 8).translate(0, bodyH - 0.4, 0), '#8E6F4E']); // Kranz
  P.push([new THREE.ConeGeometry(R * 1.12, roofH, 8, 1, false).rotateY(Math.PI / 8).translate(0, bodyH + roofH / 2, 0), '#7A3F2E']);   // Zeltdach
  P.push([new THREE.CylinderGeometry(0.04, 0.06, 2.0, 4, 1, true).translate(0, height + 0.9, 0), '#C9A227']);                          // Spitze
  const ap = R * Math.cos(Math.PI / 8) + 0.03;
  for (let k = 0; k < 8; k++) for (const [y, h] of [[bodyH * 0.45, 1.2], [bodyH * 0.75, 1.0]]) { // Fenster/Scharten
    const a = k * Math.PI / 4, w = 0.6, q = new THREE.PlaneGeometry(w, h); q.translate(0, y, ap); q.rotateY(a); P.push([q, '#2B2622']); }
  return group(P, at, 'wasserturm-spar');
}

/** 3b) Kapellbrücke – Dach- und Geländer-Aufsatz entlang einer Polylinie (Länge 202.9 m, mit Vordächern 204.7 m: Wikipedia;
 *  Blumenschmuck: luzern.com Bildbeschreibung). Giebeldach als extrudiertes Profil je Segment (Ziegelrot), Blumenkästen aussen am
 *  Geländer als Farbband rot über grün. Breite [Annahme 4.6 m wie bisheriges Modell], Firsthöhe/Traufe [Annahme] 4.6/3.0 m über Deck.
 *  pts = Polylinie [x, z] (Weltkoordinaten), deckY(x, z) = Deckhöhe. Gruppe liegt im Ursprung (Punkte sind Weltkoordinaten). ≈ 68 Dreiecke je Segment. */
export function kapellbrueckeAufsatz(pts: number[][], deckY: (x: number, z: number) => number, width = 4.6, ridge = 4.6, eave = 3.0) {
  const P: SparPart[] = [], hw = width / 2;
  const prof = new THREE.Shape(); { const o = hw + 0.7, t = 0.22;
    prof.moveTo(-o, eave); prof.lineTo(0, ridge); prof.lineTo(o, eave); prof.lineTo(o, eave - t); prof.lineTo(0, ridge - t); prof.lineTo(-o, eave - t); prof.lineTo(-o, eave); }
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1], len = Math.hypot(x2 - x1, z2 - z1); if (len < 0.3) continue;
    const ang = Math.atan2(x2 - x1, z2 - z1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, y = deckY(mx, mz);
    const m = new THREE.Matrix4().makeRotationY(ang).setPosition(mx, y, mz);
    const roof = new THREE.ExtrudeGeometry(prof, { depth: len + 0.5, bevelEnabled: false }).translate(0, 0, -(len + 0.5) / 2); roof.applyMatrix4(m); P.push([roof, '#8B3A2B']);
    for (const s of [-1, 1]) {
      P.push([box(0.5, 0.3, len + 0.1, s * (hw + 0.5), 1.15, 0).applyMatrix4(m), '#3F8A3A']);  // Grün
      P.push([box(0.55, 0.2, len, s * (hw + 0.52), 1.38, 0).applyMatrix4(m), '#E8322E']);      // Geranien
    }
  }
  return group(P, { x: 0, z: 0 }, 'kapellbruecke-aufsatz', false);
}

/** 4) Bushof-Dach am Bahnhofplatz: flache Platte auf zwei Stützenreihen [Annahme: Höhe 4 m, Stützen alle ~8 m, Plattendicke 0.3 m,
 *  Farben Stahlgrau/Weiss – Bahnhof Luzern Wikipedia nennt nur «grossen Busbahnhof» mit ~20 Haltekanten]. Unterseite leuchtet abends.
 *  Lokale x = Länge. ≈ 12 + 24·n Dreiecke (n Stützenpaare). */
export function bushofDachSpar(at: Place, length = 40, width = 6, height = 4, spacing = 8, roofCol = '#E8ECEE') {
  const P: SparPart[] = [[box(length, 0.3, width, 0, height + 0.15, 0), roofCol, 'unten'], [box(length + 0.1, 0.12, width + 0.1, 0, height + 0.36, 0), '#6E767C']];
  const n = Math.max(2, Math.round(length / spacing) + 1);
  for (let k = 0; k < n; k++) { const x = -length / 2 + 1 + k * (length - 2) / (n - 1); for (const s of [-1, 1]) P.push([box(0.22, height, 0.22, x, height / 2, s * (width / 2 - 0.8)), '#5B6168']); }
  return group(P, at, 'bushof-dach-spar');
}

/** Hilfe: Lage aus einem OSM-Umriss ableiten (Schwerpunkt, Drehung = längste Kante → lokale x-Achse, Boden = tiefster Eckpunkt),
 *  wie torbogen() in world.ts. Keine geratenen Koordinaten – alles aus den vorhandenen Daten. */
export function placeFromPolygon(p: number[][], groundY: (x: number, z: number) => number): Place & { length: number } {
  let best = 0, ax = 1, az = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > best) { best = L; ax = (b[0] - a[0]) / L; az = (b[1] - a[1]) / L; } }
  let cx = 0, cz = 0; for (const q of p) { cx += q[0]; cz += q[1]; } cx /= p.length; cz /= p.length;
  return { x: cx, z: cz, y0: Math.min(...p.map(([x, z]) => groundY(x, z))), rot: -Math.atan2(az, ax), length: best };
}
/** Bushof-Dach aus einem OSM-Umriss (building=roof): Rechteck mit minimaler Fläche einpassen → bushofDachSpar */
export function bushofDachAusUmriss(p: number[][], groundY: (x: number, z: number) => number, height = 4, roofCol = '#BFD6E2') {
  let best: { a: number; L: number; Wd: number; cx: number; cz: number; ar: number } | null = null;
  for (let i = 0; i < p.length; i++) {
    const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length], a = Math.atan2(z2 - z1, x2 - x1), ca = Math.cos(a), sa = Math.sin(a);
    let mnA = Infinity, mxA = -Infinity, mnB = Infinity, mxB = -Infinity;
    for (const [x, z] of p) { const A = x * ca + z * sa, B = -x * sa + z * ca; mnA = Math.min(mnA, A); mxA = Math.max(mxA, A); mnB = Math.min(mnB, B); mxB = Math.max(mxB, B); }
    const L = mxA - mnA, Wd = mxB - mnB, cA = (mnA + mxA) / 2, cB = (mnB + mxB) / 2;
    if (!best || L * Wd < best.ar) best = { a, L, Wd, cx: cA * ca - cB * sa, cz: cA * sa + cB * ca, ar: L * Wd };
  }
  const b = best!, long = b.L >= b.Wd;
  return bushofDachSpar({ x: b.cx, z: b.cz, y0: Math.min(...p.map(([x, z]) => groundY(x, z))), rot: -(b.a + (long ? 0 : Math.PI / 2)) }, Math.max(b.L, b.Wd), Math.min(b.L, b.Wd), height, 8, roofCol);
}
