import * as THREE from 'three';
/** 17c: Bahnsignale am Gleis – Mast mit schwarzem Schirm und einem leuchtenden Licht (grün, selten orange/rot), alle ~420 m rechts vom Gleis,
 *  dazu weisse Hektometertafeln alle 100 m. Rein optisch, ein Netz mit Vertexfarben, keine Kollision.
 *  [Annahme] Standorte sind gleichmässig verteilt, nicht die echten Signalstandorte. */
export function buildBahnsignale(lines: number[][][], railY: (x: number, z: number) => number, frei: (x: number, z: number) => boolean): THREE.Mesh | null {
  const pos: number[] = [], col: number[] = []; const C = (hex: string) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const box = (cx: number, cy: number, cz: number, w: number, h: number, d: number, ux: number, uz: number, k: number[]) => { // w quer (rechts = (-uz, ux)), d längs
    const P = (a: number, b: number, c: number) => [cx - uz * a * w / 2 + ux * c * d / 2, cy + b * h / 2, cz + ux * a * w / 2 + uz * c * d / 2];
    const F = [[[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]];
    for (const f of F) { const q = f.map((v) => P(v[0], v[1], v[2])); for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(q[i][0], q[i][1], q[i][2]); col.push(k[0], k[1], k[2]); } } };
  const MAST = C('#6A7370'), SCHIRM = C('#15181A'), WEISS = C('#F1F1EC'), LICHT = [C('#35E06A'), C('#35E06A'), C('#35E06A'), C('#FFB020'), C('#FF4030')];
  const cell = new Set<string>(); let n = 0, nh = 0;
  for (const l of lines) { if (l.length < 2) continue; let accS = 140, accH = 50;
    for (let i = 0; i + 1 < l.length; i++) { const A = l[i], B = l[i + 1], sl = Math.hypot(B[0] - A[0], B[1] - A[1]); if (sl < 0.5) continue; const ux = (B[0] - A[0]) / sl, uz = (B[1] - A[1]) / sl;
      while (accS <= sl) { const x = A[0] + ux * accS, z = A[1] + uz * accS; accS += 420; const ck = Math.round(x / 60) + ',' + Math.round(z / 60); if (cell.has(ck)) continue;
        const mx = x - uz * 2.6, mz = z + ux * 2.6; if (!frei(mx, mz)) continue; cell.add(ck); const y = railY(x, z);
        box(mx, y + 2.4, mz, 0.16, 4.8, 0.16, ux, uz, MAST); box(mx, y + 5.3, mz, 0.7, 1.3, 0.14, ux, uz, SCHIRM);
        box(mx - ux * 0.09, y + 5.45, mz - uz * 0.09, 0.26, 0.26, 0.06, ux, uz, LICHT[n % LICHT.length]); box(mx + ux * 0.09, y + 5.45, mz + uz * 0.09, 0.26, 0.26, 0.06, ux, uz, LICHT[n % LICHT.length]); /* P-C V2 */ n++; }
      accS -= sl;
      while (accH <= sl) { const x = A[0] + ux * accH, z = A[1] + uz * accH; accH += 100; const hx = x + uz * 2.3, hz = z - ux * 2.3; const ck = 'h' + Math.round(x / 30) + ',' + Math.round(z / 30); if (cell.has(ck) || !frei(hx, hz)) continue; cell.add(ck);
        const y = railY(x, z); box(hx, y + 0.5, hz, 0.06, 1.0, 0.06, ux, uz, MAST); box(hx, y + 1.1, hz, 0.34, 0.3, 0.04, ux, uz, WEISS); nh++; }
      accH -= sl; } }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true })); m.name = 'bahnsignale'; m.userData.n = n; console.log('[bau] Bahnsignale', n, 'Hektometertafeln', nh, 'Dreiecke', pos.length / 9); return m;
}
