// Gelände aus swissALTI3D (über swisstopo-Profil-Dienst, 5-m-Raster).
// Höhen relativ zum Seespiegel (433.6 m ü. M.) → y = 0 auf dem See.
export const SEA = 433.6;

export class Terrain {
  nx: number; nz: number; x0: number; z0: number; step: number;
  h: Float32Array;
  // Brückendecks (DTM enthält keine Brücken): eigenes Raster, NaN = keine Brücke
  bridgeRes = 2.5; bw: number; bh: number; bridge: Float32Array;

  constructor(raw: ArrayBuffer, meta: { nx: number; nz: number; x0: number; z0: number; step: number }, bounds: number[]) {
    this.nx = meta.nx; this.nz = meta.nz; this.x0 = meta.x0; this.z0 = meta.z0; this.step = meta.step;
    const i16 = new Int16Array(raw);
    this.h = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) this.h[i] = i16[i] / 10 + 400 - SEA;
    this.bw = Math.ceil((bounds[2] - bounds[0]) / this.bridgeRes) + 1;
    this.bh = Math.ceil((bounds[3] - bounds[1]) / this.bridgeRes) + 1;
    this.bridge = new Float32Array(this.bw * this.bh).fill(NaN);
  }

  /**
   * Strassen eben machen: Geländepunkte im Strassenkorridor erhalten die Höhe der
   * nächstgelegenen Mittellinie (Querneigung 0), mit weichem Übergang am Rand.
   */
  flattenRoads(roads: { p: number[][]; w: number; c: string; b: number }[]) {
    const orig = this.h.slice();
    const sample = (x: number, z: number) => {
      let fx = (x - this.x0) / this.step, fz = (z - this.z0) / this.step;
      fx = Math.max(0, Math.min(this.nx - 1.001, fx)); fz = Math.max(0, Math.min(this.nz - 1.001, fz));
      const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
      const a = orig[j * this.nx + i], b = orig[j * this.nx + i + 1], c = orig[(j + 1) * this.nx + i], d = orig[(j + 1) * this.nx + i + 1];
      return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
    };
    const best = new Float32Array(this.h.length).fill(Infinity);
    const target = new Float32Array(this.h.length);
    for (const r of roads) {
      if (r.b || ['steps', 'path'].includes(r.c)) continue;
      const half = r.w / 2, reach = half + 4;
      for (let k = 1; k < r.p.length; k++) {
        const [x1, z1] = r.p[k - 1], [x2, z2] = r.p[k];
        const len = Math.hypot(x2 - x1, z2 - z1); if (len < 0.01) continue;
        const ux = (x2 - x1) / len, uz = (z2 - z1) / len;
        const h1 = sample(x1, z1), h2 = sample(x2, z2);
        const i0 = Math.max(0, Math.floor((Math.min(x1, x2) - reach - this.x0) / this.step)), i1 = Math.min(this.nx - 1, Math.ceil((Math.max(x1, x2) + reach - this.x0) / this.step));
        const j0 = Math.max(0, Math.floor((Math.min(z1, z2) - reach - this.z0) / this.step)), j1 = Math.min(this.nz - 1, Math.ceil((Math.max(z1, z2) + reach - this.z0) / this.step));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const px = this.x0 + i * this.step, pz = this.z0 + j * this.step;
          const t = Math.max(0, Math.min(len, (px - x1) * ux + (pz - z1) * uz));
          const dist = Math.hypot(px - (x1 + ux * t), pz - (z1 + uz * t));
          if (dist > reach) continue;
          const idx = j * this.nx + i;
          if (dist < best[idx]) { best[idx] = dist; target[idx] = h1 + ((h2 - h1) * t) / len + (dist <= half ? 0 : 0) ; (target as any)[idx] = target[idx]; (best as any).half = half; }
          // Randgewicht merken: innerhalb der Fahrbahn voll, bis 4 m daneben auslaufend
          if (dist === best[idx]) (this as any)._w = (this as any)._w || new Float32Array(this.h.length), (this as any)._w[idx] = dist <= half ? 1 : 1 - (dist - half) / 4;
        }
      }
    }
    const w: Float32Array = (this as any)._w;
    for (let i = 0; i < this.h.length; i++) if (best[i] < Infinity) { const a = w ? w[i] : 1; this.h[i] = orig[i] * (1 - a) + target[i] * a; }
    delete (this as any)._w;
  }

  // R14: grobes Umland (200 m) aus swissALTI3D für Horizont und Spielfeldrand
  hz: Int16Array | null = null; hzm = { x0: 0, z0: 0, step: 200, nx: 0, nz: 0, scale: 0.1 };
  setHorizon(h: Int16Array, m: { x0: number; z0: number; step: number; nx: number; nz: number; scale: number }) { this.hz = h; this.hzm = m; }
  horizon(x: number, z: number) {
    const m = this.hzm, H = this.hz!;
    let fx = (x - m.x0) / m.step, fz = (z - m.z0) / m.step;
    fx = Math.max(0, Math.min(m.nx - 1.001, fx)); fz = Math.max(0, Math.min(m.nz - 1.001, fz));
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const a = H[j * m.nx + i], b = H[j * m.nx + i + 1], c = H[(j + 1) * m.nx + i], d = H[(j + 1) * m.nx + i + 1];
    return ((a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz) * m.scale;
  }

  ground(x: number, z: number) {
    if (this.hz) {
      const ox = Math.max(this.x0 - x, x - (this.x0 + (this.nx - 1) * this.step), 0), oz = Math.max(this.z0 - z, z - (this.z0 + (this.nz - 1) * this.step), 0);
      const o = Math.max(ox, oz);
      if (o > 0) { const t = Math.min(1, o / 300); const e = this.field(x, z); return e + (this.horizon(x, z) - e) * t * t * (3 - 2 * t); }
    }
    return this.field(x, z);
  }

  private field(x: number, z: number) {
    let fx = (x - this.x0) / this.step, fz = (z - this.z0) / this.step;
    fx = Math.max(0, Math.min(this.nx - 1.001, fx)); fz = Math.max(0, Math.min(this.nz - 1.001, fz));
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const a = this.h[j * this.nx + i], b = this.h[j * this.nx + i + 1];
    const c = this.h[(j + 1) * this.nx + i], d = this.h[(j + 1) * this.nx + i + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  }

  bridgeAt(x: number, z: number) {
    const i = Math.round((x - this.x0) / this.bridgeRes), j = Math.round((z - this.z0) / this.bridgeRes);
    if (i < 0 || j < 0 || i >= this.bw || j >= this.bh) return NaN;
    return this.bridge[j * this.bw + i];
  }

  /** Fahrhöhe: Brückendeck, sonst Gelände */
  height(x: number, z: number) {
    const b = this.bridgeAt(x, z);
    const g = this.ground(x, z);
    return isNaN(b) ? g : Math.max(b, g);
  }

  /** Brückendeck linear zwischen den Brückenenden eintragen */
  addBridge(p: number[][], width: number, lift = 0.25) {
    if (p.length < 2) return;
    const h0 = this.ground(p[0][0], p[0][1]), h1 = this.ground(p[p.length - 1][0], p[p.length - 1][1]);
    let total = 0; for (let i = 1; i < p.length; i++) total += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    let acc = 0;
    const r = width / 2 + 1;
    for (let i = 1; i < p.length; i++) {
      const [x1, z1] = p[i - 1], [x2, z2] = p[i];
      const len = Math.hypot(x2 - x1, z2 - z1);
      const n = Math.max(1, Math.ceil(len / 1));
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
        const y = h0 + (h1 - h0) * ((acc + len * t) / (total || 1)) + lift;
        for (let dx = -r; dx <= r; dx += this.bridgeRes) for (let dz = -r; dz <= r; dz += this.bridgeRes) {
          if (dx * dx + dz * dz > r * r) continue;
          const ii = Math.round((x + dx - this.x0) / this.bridgeRes), jj = Math.round((z + dz - this.z0) / this.bridgeRes);
          if (ii < 0 || jj < 0 || ii >= this.bw || jj >= this.bh) continue;
          const idx = jj * this.bw + ii;
          if (isNaN(this.bridge[idx]) || this.bridge[idx] < y) this.bridge[idx] = y;
        }
      }
      acc += len;
    }
  }
}

/**
 * Legt flache Dreiecke (y = Lagen-Versatz) aufs Gelände: Dreiecke werden unterteilt,
 * bis keine Kante länger als maxEdge ist, dann y = Geländehöhe + Versatz.
 */
export function drape(pos: number[], col: number[] | null, t: Terrain, maxEdge: number, useBridge = false): { pos: number[]; col: number[] | null } {
  const outP: number[] = [], outC: number[] | null = col ? [] : null;
  const stack: number[][] = [];
  for (let i = 0; i < pos.length; i += 9) {
    const tri = pos.slice(i, i + 9);
    const c = col ? col.slice(i, i + 9) : [];
    stack.push([...tri, ...c]);
  }
  const m2 = maxEdge * maxEdge;
  let guard = 0;
  while (stack.length) {
    const v = stack.pop()!;
    const P = [[v[0], v[1], v[2]], [v[3], v[4], v[5]], [v[6], v[7], v[8]]];
    const C = col ? [[v[9], v[10], v[11]], [v[12], v[13], v[14]], [v[15], v[16], v[17]]] : null;
    const e = [0, 1, 2].map((k) => { const a = P[k], b = P[(k + 1) % 3]; return (a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2; });
    const mx = Math.max(...e);
    if (mx > m2 && ++guard < 3_000_000) {
      const k = e.indexOf(mx), k1 = (k + 1) % 3, k2 = (k + 2) % 3;
      const mid = [(P[k][0] + P[k1][0]) / 2, (P[k][1] + P[k1][1]) / 2, (P[k][2] + P[k1][2]) / 2];
      const midC = C ? [(C[k][0] + C[k1][0]) / 2, (C[k][1] + C[k1][1]) / 2, (C[k][2] + C[k1][2]) / 2] : [];
      const t1 = [P[k], mid, P[k2]], t2 = [mid, P[k1], P[k2]];
      const c1 = C ? [C[k], midC, C[k2]] : null, c2 = C ? [midC, C[k1], C[k2]] : null;
      stack.push([...t1.flat(), ...(c1 ? c1.flat() : [])]);
      stack.push([...t2.flat(), ...(c2 ? c2.flat() : [])]);
      continue;
    }
    for (let k = 0; k < 3; k++) {
      const [x, y, z] = P[k];
      const base = useBridge ? t.height(x, z) : t.ground(x, z);
      outP.push(x, base + y, z);
      if (outC && C) outC.push(...C[k]);
    }
  }
  return { pos: outP, col: outC };
}
