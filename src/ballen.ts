import * as THREE from 'three';
/** 17c: Siloballen auf Wiesen (weiss, hellgrün, vereinzelt rosa – wie auf jedem Luzerner Hof): Grüppchen von 3–7 liegenden Rundballen
 *  auf rund jeder dritten Wiese. Rein optisch, ein Netz mit Vertexfarben. [Annahme] Standorte zufällig, aber fest (gleicher Ort bei jedem Start). */
type Green = { p: number[][]; k: string };
const inPoly = (x: number, z: number, p: number[][]) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
export function buildSiloballen(green: Green[], groundY: (x: number, z: number) => number, frei: (x: number, z: number) => boolean): THREE.Mesh | null {
  const pos: number[] = [], col: number[] = [], used: number[][] = []; const COLS = ['#F2F2EC', '#F2F2EC', '#CFE5C2', '#F2F2EC', '#CFE5C2', '#F4C6D6'].map((h) => new THREE.Color(h));
  let seed = 9173; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const base = new THREE.CylinderGeometry(0.62, 0.62, 1.2, 9).rotateZ(Math.PI / 2).translate(0, 0.6, 0).toNonIndexed(); const bp = base.attributes.position.array as Float32Array;
  const put = (x: number, z: number, y: number, a: number, c: THREE.Color) => { const cs = Math.cos(a), sn = Math.sin(a); for (let i = 0; i < bp.length; i += 3) { pos.push(x + bp[i] * cs + bp[i + 2] * sn, y + bp[i + 1], z - bp[i] * sn + bp[i + 2] * cs); const sh = bp[i + 1] < 0.3 ? 0.82 : 1; col.push(c.r * sh, c.g * sh, c.b * sh); } };
  green.forEach((g, gi) => { if (g.k !== 'meadow' || g.p.length < 4) return; rnd(); if (gi % 3 !== 0) return;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, ar = 0; for (let i = 0, j = g.p.length - 1; i < g.p.length; j = i++) { x0 = Math.min(x0, g.p[i][0]); x1 = Math.max(x1, g.p[i][0]); z0 = Math.min(z0, g.p[i][1]); z1 = Math.max(z1, g.p[i][1]); ar += g.p[j][0] * g.p[i][1] - g.p[i][0] * g.p[j][1]; }
    if (Math.abs(ar) / 2 < 2500) return;
    for (let t = 0; t < 14; t++) { const cx = x0 + rnd() * (x1 - x0), cz = z0 + rnd() * (z1 - z0); if (!inPoly(cx, cz, g.p)) continue; const a = rnd() * Math.PI, ux = Math.cos(a), uz = Math.sin(a), n = 3 + Math.floor(rnd() * 5);
      let ok = true; for (let k = -1; k <= n; k++) { const x = cx + ux * k * 1.5, z = cz + uz * k * 1.5; if (!inPoly(x, z, g.p) || !frei(x, z)) ok = false; } const ya = groundY(cx, cz), yb = groundY(cx + ux * n * 1.5, cz + uz * n * 1.5); if (!ok || Math.abs(ya - yb) > 1.2) continue;
      const c = COLS[Math.floor(rnd() * COLS.length)]; for (let k = 0; k < n; k++) { const x = cx + ux * k * 1.42, z = cz + uz * k * 1.42; put(x, z, groundY(x, z) - 0.05, -a + Math.PI / 2 + (rnd() - 0.5) * 0.1, c); }
      used.push([cx, cz]); break; } });
  base.dispose(); if (!pos.length) return null;
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })); m.name = 'siloballen'; m.userData.pos = used; console.log('[bau] Siloballen-Gruppen', used.length, 'Dreiecke', pos.length / 9); return m;
}
