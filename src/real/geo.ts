// P-A Realismus-Bausteine: gemeinsame Helfer für Low-Poly-Geometrie mit Vertex-Farben.
// Alle Bausteine in src/real/* liefern EINE BufferGeometry (nicht indiziert, mit Attribut «color»),
// damit sie direkt als InstancedMesh mit toon('#ffffff', { vertexColors: true }) gezeichnet werden können:
// 1 Zeichenaufruf je Bausteinart, egal wie viele Exemplare.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];

/** Geometrie einfärben (Vertex-Farbe), UV entfernen, nicht indiziert */
export function paint(g: THREE.BufferGeometry, col: THREE.ColorRepresentation) {
  const q = g.index ? g.toNonIndexed() : g.clone();
  q.deleteAttribute('uv');
  const c = new THREE.Color(col), n = q.getAttribute('position').count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  q.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return q;
}
/** Teile [Geometrie, Farbe] zu einer Geometrie zusammenfassen */
export function parts(list: Part[]) {
  return mergeGeometries(list.map(([g, c]) => paint(g, c)), false)!;
}
/** Dreieckszahl einer Geometrie */
export function tris(g: THREE.BufferGeometry) {
  return g.index ? g.index.count / 3 : g.getAttribute('position').count / 3;
}
/** Kugelige Normalen (runde Toon-Schattierung statt Facetten), um Mittelpunkt c */
export function roundNormals(g: THREE.BufferGeometry, c = new THREE.Vector3()) {
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) - c.x, y = p.getY(i) - c.y, z = p.getZ(i) - c.z, l = Math.hypot(x, y, z) || 1;
    n.setXYZ(i, x / l, y / l, z / l);
  }
  n.needsUpdate = true; return g;
}
/** Box mit Mittelpunkt (x, y, z) */
export function box(w: number, h: number, d: number, x = 0, y = 0, z = 0) {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}
/** Zylinder (stehend) mit Fuss auf y0 */
export function cyl(rTop: number, rBot: number, h: number, seg: number, x = 0, y0 = 0, z = 0) {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg).translate(x, y0 + h / 2, z);
}
/** Liegender Zylinder entlang x (Räder, Rohre) */
export function cylX(r: number, len: number, seg: number, x = 0, y = 0, z = 0) {
  return new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2).translate(x, y, z);
}
/** Rohr zwischen zwei Punkten (für Bügel, Gestänge) */
export function tube(a: THREE.Vector3Like, b: THREE.Vector3Like, r: number, seg = 5) {
  const A = new THREE.Vector3(a.x, a.y, a.z), B = new THREE.Vector3(b.x, b.y, b.z), L = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r, r, L, seg);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  g.applyQuaternion(q); const m = A.add(B).multiplyScalar(0.5); g.translate(m.x, m.y, m.z);
  return g;
}
/** Deterministischer Zufall 0..1 aus zwei Zahlen (gleich wie world.ts hash) */
export function hash2(x: number, z: number) {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
/** Gewichtete Auswahl: werte = [Schlüssel, Gewicht][], r = 0..1 */
export function weighted<T>(werte: [T, number][], r: number): T {
  const sum = werte.reduce((a, w) => a + w[1], 0); let acc = 0;
  for (const [k, w] of werte) { acc += w / sum; if (r < acc) return k; }
  return werte[werte.length - 1][0];
}
