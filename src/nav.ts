// Strassengraph aus OSM-Linien + A*-Routing für das Navi.
import type { CityData, Mask } from './world';

const COST: Record<string, number> = {
  motorway: 1, trunk: 1, primary: 1, secondary: 1, tertiary: 1, primary_link: 1, secondary_link: 1, tertiary_link: 1,
  unclassified: 1.05, residential: 1.1, living_street: 1.2, service: 1.3, pedestrian: 1.4, track: 1.8,
  footway: 2.6, cycleway: 2.2, path: 3,
};

export class NavGraph {
  xs: number[] = []; zs: number[] = [];
  adj: { to: number; w: number }[][] = [];
  carNode: boolean[] = [];
  mainNode: boolean[] = [];
  inbound: boolean[] = [];
  private key = new Map<string, number>();
  private grid = new Map<string, number[]>();

  constructor(d: CityData, mask: Mask) {
    for (const r of d.roads) {
      const c = COST[r.c];
      if (!c) continue;
      let prev = -1;
      for (const [x, z] of r.p) {
        const id = this.node(x, z, c <= 1.3, c <= 1.1);
        if (prev >= 0 && prev !== id && this.clear(prev, id, mask, !!r.b)) {
          const len = Math.hypot(this.xs[id] - this.xs[prev], this.zs[id] - this.zs[prev]);
          this.adj[prev].push({ to: id, w: len * c });
          // Einbahnstrassen: nur in Zeichenrichtung (OSM oneway=yes)
          if (!(r as any).o) this.adj[id].push({ to: prev, w: len * c });
          else this.inbound[id] = true;
        }
        prev = id;
      }
    }
    for (let i = 0; i < this.xs.length; i++) {
      const k = this.cell(this.xs[i], this.zs[i]);
      if (!this.grid.has(k)) this.grid.set(k, []);
      this.grid.get(k)!.push(i);
    }
  }

  private node(x: number, z: number, car: boolean, main: boolean) {
    const k = `${x},${z}`;
    let id = this.key.get(k);
    if (id === undefined) {
      id = this.xs.length;
      this.xs.push(x); this.zs.push(z); this.adj.push([]); this.carNode.push(car); this.mainNode.push(main);
      this.key.set(k, id);
    } else { if (car) this.carNode[id] = true; if (main) this.mainNode[id] = true; }
    return id;
  }

  /** Kante nur, wenn die Ambulanz dort wirklich fahren kann (kein Haus, kein Wasser ausser Brücken) */
  private clear(a: number, b: number, mask: Mask, bridge: boolean) {
    const x1 = this.xs[a], z1 = this.zs[a], x2 = this.xs[b], z2 = this.zs[b];
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.max(1, Math.ceil(len / 1.2));
    // Ambulanz ist 2.3 m breit: links und rechts der Mittellinie muss Platz sein
    const ox = len ? (-(z2 - z1) / len) * 1.5 : 0, oz = len ? ((x2 - x1) / len) * 1.5 : 0;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const cx = x1 + (x2 - x1) * t, cz = z1 + (z2 - z1) * t;
      for (const s of [0, 1, -1]) {
        const v = mask.at(cx + ox * s, cz + oz * s);
        if (v === 2 || v === 3) return false;
        if (v === 1 && !bridge) return false;
      }
    }
    return true;
  }

  private cell(x: number, z: number) { return `${Math.floor(x / 25)},${Math.floor(z / 25)}`; }

  nearest(x: number, z: number, carOnly: boolean | 'main' = false): number {
    let best = -1, bd = Infinity;
    for (let r = 0; r <= 10 && (best < 0 || r <= 1); r++) {
      const cx = Math.floor(x / 25), cz = Math.floor(z / 25);
      for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
        for (const id of this.grid.get(`${cx + i},${cz + j}`) || []) {
          if (!this.adj[id].length) continue;
          if (carOnly === true && !this.carNode[id]) continue;
          if (carOnly === 'main' && !this.mainNode[id]) continue;
          const dd = (this.xs[id] - x) ** 2 + (this.zs[id] - z) ** 2;
          if (dd < bd) { bd = dd; best = id; }
        }
      }
    }
    return best;
  }

  /** Nächster Knoten mit freier Sichtlinie (nicht hinter einer Hauswand) */
  nearestVisible(x: number, z: number, mask: Mask, heading?: number): number {
    const cx = Math.floor(x / 25), cz = Math.floor(z / 25);
    const cand: [number, number][] = [];
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++)
      for (const id of this.grid.get(`${cx + i},${cz + j}`) || []) if (this.adj[id].length) cand.push([(this.xs[id] - x) ** 2 + (this.zs[id] - z) ** 2, id]);
    cand.sort((a, b) => a[0] - b[0]);
    for (const [, id] of cand.slice(0, 40)) {
      const x2 = this.xs[id], z2 = this.zs[id];
      const n = Math.ceil(Math.hypot(x2 - x, z2 - z) / 1.2) || 1;
      let ok = true;
      for (let k = 1; k <= n && ok; k++) { const v = mask.at(x + ((x2 - x) * k) / n, z + ((z2 - z) * k) / n); if (v === 2 || v === 3) ok = false; }
      if (ok) return id;
    }
    return this.nearest(x, z);
  }

  /** A* – liefert Punktliste [x,z] oder null */
  route(from: number, to: number): number[][] | null {
    if (from < 0 || to < 0) return null;
    const n = this.xs.length;
    const g = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const heap: [number, number][] = [];
    const push = (f: number, id: number) => {
      heap.push([f, id]);
      let i = heap.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
    };
    const pop = () => {
      const top = heap[0]; const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last; let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
        }
      }
      return top;
    };
    const h = (id: number) => Math.hypot(this.xs[id] - this.xs[to], this.zs[id] - this.zs[to]);
    g[from] = 0; push(h(from), from);
    let steps = 0;
    while (heap.length) {
      const [, u] = pop();
      if (closed[u]) continue;
      if (u === to) break;
      closed[u] = 1;
      if (++steps > 200000) break;
      for (const e of this.adj[u]) {
        const ng = g[u] + e.w;
        if (ng < g[e.to]) { g[e.to] = ng; prev[e.to] = u; push(ng + h(e.to), e.to); }
      }
    }
    if (!isFinite(g[to])) return null;
    const path: number[][] = [];
    for (let v = to; v >= 0; v = prev[v]) path.push([this.xs[v], this.zs[v]]);
    return path.reverse();
  }
}

export function pathLength(p: number[][]) {
  let s = 0;
  for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return s;
}
