import * as THREE from 'three';
/** 17c: Wartende an Bushaltestellen – 0 bis 4 stehende Figuren (gleicher Stil wie die Fussgänger: Körper + Kopf), auch Kinder.
 *  Fest (kein Gehen), ein Netz mit Vertexfarben, keine Kollision. Stehen nur auf freiem Boden, nie auf der Fahrbahn. */
const KLEID = ['#E4572E', '#2F6FB5', '#F2C418', '#3E8E4E', '#8E5BD0', '#F28CB1', '#2E3A46', '#1FA6A0', '#C8322B', '#F4F4F2'], HAUT = ['#F1C9A5', '#E8B796', '#C68E6A', '#8D5B3E', '#F6D7BD'];
const h2 = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
export function buildWartende(stops: number[][], groundY: (x: number, z: number) => number, frei: (x: number, z: number) => boolean): THREE.Mesh | null {
  const pos: number[] = [], col: number[] = [], used: number[][] = [];
  const body = new THREE.CylinderGeometry(0.24, 0.3, 1.15, 6, 1, true).translate(0, 0.62, 0).toNonIndexed(), head = new THREE.IcosahedronGeometry(0.22, 0).translate(0, 1.42, 0);
  const bp = body.attributes.position.array as Float32Array, hp = head.attributes.position.array as Float32Array;
  const add = (a: Float32Array, x: number, y: number, z: number, s: number, c: THREE.Color) => { for (let i = 0; i < a.length; i += 3) { pos.push(x + a[i] * s, y + a[i + 1] * s, z + a[i + 2] * s); col.push(c.r, c.g, c.b); } };
  const c1 = new THREE.Color(), c2 = new THREE.Color(); let n = 0;
  stops.forEach(([sx, sz], si) => { const cnt = Math.floor(h2(sx, sz) * 5); let placed = 0;
    for (let k = 0; k < 8 && placed < cnt; k++) { const a = h2(sx + k * 3.1, sz - k) * Math.PI * 2, r = 0.9 + h2(sx - k, sz + k * 2.3) * 1.8, x = sx + Math.cos(a) * r, z = sz + Math.sin(a) * r;
      if (!frei(x, z) || !frei(x + 0.4, z) || !frei(x - 0.4, z) || !frei(x, z + 0.4) || !frei(x, z - 0.4)) continue;
      const s = h2(x, z) < 0.22 ? 0.66 : h2(z, x) < 0.2 ? 0.86 : 1, y = groundY(x, z);
      add(bp, x, y, z, s, c1.set(KLEID[(si * 3 + k) % KLEID.length])); add(hp, x, y, z, s, c2.set(HAUT[(si + k * 2) % HAUT.length])); placed++; n++; }
    if (placed) used.push([sx, sz]); });
  body.dispose(); head.dispose(); if (!n) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.name = 'wartende'; m.userData.pos = used; console.log('[bau] Wartende', n, 'an', used.length, 'Haltestellen, Dreiecke', pos.length / 9); return m;
}
