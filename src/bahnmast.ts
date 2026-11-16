import * as THREE from 'three';

/** 17a: Fahrleitung der Bahn – Masten mit Ausleger alle ~50 m neben dem Gleis, Fahrdraht und Tragseil darüber.
 *  lines = sichtbare Gleisachsen (ohne Tunnel). railY = Gleishöhe (auch auf Bahnbrücken), frei = Mast darf hier stehen.
 *  Ein Netz, Vertexfarben, keine Kollision. */
export function buildFahrleitung(lines: number[][][], railY: (x: number, z: number) => number, groundY: (x: number, z: number) => number, frei: (x: number, z: number) => boolean, deckAt: (x: number, z: number) => number = () => NaN): THREE.Mesh | null {
  /** P-C W3: unter einer Strassenbrücke (Deck weniger als 8 m über dem Gleis) keine Drähte und keine Masten */
  const unterDeck = (x: number, z: number) => { const b = deckAt(x, z); return !isNaN(b) && b - railY(x, z) > 2 && b - railY(x, z) < 8; };
  const pos: number[] = [], col: number[] = [];
  const C = (hex: string) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const quad = (a: number[], b: number[], c: number[], d: number[], k: number[]) => { for (const p of [a, b, c, a, c, d]) { pos.push(p[0], p[1], p[2]); col.push(k[0], k[1], k[2]); } };
  /** Quader zwischen zwei Punkten (Achse a→b), Querschnitt s × s – 4 Seiten */
  const beam = (a: number[], b: number[], s: number, k: number[]) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]) || 1; const u = Math.abs(d[1]) / L > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const n1 = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]], l1 = Math.hypot(n1[0], n1[1], n1[2]) || 1; for (let i = 0; i < 3; i++) n1[i] *= s / 2 / l1;
    const n2 = [d[1] * n1[2] - d[2] * n1[1], d[2] * n1[0] - d[0] * n1[2], d[0] * n1[1] - d[1] * n1[0]], l2 = Math.hypot(n2[0], n2[1], n2[2]) || 1; for (let i = 0; i < 3; i++) n2[i] *= s / 2 / l2;
    const P = (q: number[], s1: number, s2: number) => [q[0] + n1[0] * s1 + n2[0] * s2, q[1] + n1[1] * s1 + n2[1] * s2, q[2] + n1[2] * s1 + n2[2] * s2];
    for (const [s1, s2, t1, t2] of [[1, 1, -1, 1], [-1, 1, -1, -1], [-1, -1, 1, -1], [1, -1, 1, 1]]) quad(P(a, s1, s2), P(a, t1, t2), P(b, t1, t2), P(b, s1, s2), k); };
  const MAST = C('#5E6A66'), ARM = C('#8A9390'), WIRE = C('#2E3336'), ISO = C('#7A4A2E');
  const cell = new Set<string>(), wcell = new Set<string>(); let nMast = 0;
  for (const l of lines) { if (l.length < 2) continue;
    let acc = 25; // erster Mast 25 m nach Linienanfang
    for (let i = 0; i + 1 < l.length; i++) { const A = l[i], B = l[i + 1], sl = Math.hypot(B[0] - A[0], B[1] - A[1]); if (sl < 0.5) continue; const ux = (B[0] - A[0]) / sl, uz = (B[1] - A[1]) / sl;
      // Fahrdraht + Tragseil (dünne Bänder), je Gleisstück einmal (Doppelspur-Duplikate über Zellen ausfiltern)
      const wk = Math.round((A[0] + B[0]) / 4) + ',' + Math.round((A[1] + B[1]) / 4); let zu = false; for (let q = 0; q <= sl && !zu; q += 8) zu = unterDeck(A[0] + ux * q, A[1] + uz * q); if (!wcell.has(wk) && !zu) { wcell.add(wk); const ya = railY(A[0], A[1]), yb = railY(B[0], B[1]);
        for (const [h, w] of [[5.5, 0.07], [6.5, 0.05]]) quad([A[0] - uz * w, ya + h, A[1] + ux * w], [A[0] + uz * w, ya + h, A[1] - ux * w], [B[0] + uz * w, yb + h, B[1] - ux * w], [B[0] - uz * w, yb + h, B[1] + ux * w], WIRE); }
      while (acc <= sl) { const x = A[0] + ux * acc, z = A[1] + uz * acc; acc += 50;
        const ck = Math.round(x / 14) + ',' + Math.round(z / 14); if (cell.has(ck) || unterDeck(x, z)) continue;
        for (const sd of [1, -1]) { const mx = x - uz * 3.1 * sd, mz = z + ux * 3.1 * sd; if (!frei(mx, mz)) continue;
          cell.add(ck); nMast++; const yr = railY(x, z), g0 = groundY(mx, mz), yg = yr - g0 > 2 ? yr - 0.6 : Math.min(g0, yr); // auf Viadukten steht der Mast auf der Brücke, nicht unten im Trottoir
          beam([mx, yg - 0.3, mz], [mx, yr + 7.4, mz], 0.24, MAST);
          beam([mx, yr + 6.5, mz], [x, yr + 6.5, z], 0.09, ARM); beam([mx, yr + 5.2, mz], [x + uz * 0.3 * sd, yr + 5.55, z - ux * 0.3 * sd], 0.07, ARM);
          beam([mx - uz * 0.15 * sd, yr + 6.5, mz + ux * 0.15 * sd], [mx - uz * 0.55 * sd, yr + 6.5, mz + ux * 0.55 * sd], 0.16, ISO);
          break; } }
      acc -= sl; } }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.name = 'fahrleitung'; m.userData.dreiecke = pos.length / 9;
  console.log('[bau] Fahrleitung Masten', nMast, 'Dreiecke', pos.length / 9);
  return m;
}
