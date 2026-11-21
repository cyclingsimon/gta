import * as THREE from 'three';
/** 21d «Welt reagiert»: Taubenschwärme auf Plätzen und in Parks. Sie picken am Boden; kommt die Ambulanz nah (< 15 m) oder wird gehupt (< 50 m), fliegt der Schwarm auf,
 *  dreht eine Runde und landet wieder. Ein InstancedMesh für alle Vögel, wenige Schwärme (Pool), immer an den nächsten Plätzen um die Ambulanz. Keine Kollision. */
const h2 = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
interface Flock { spot: number; x: number; z: number; y: number; fly: number; t: number }
export class Tauben {
  mesh: THREE.InstancedMesh; private flocks: Flock[] = []; private spots: number[][] = []; private tick = 0; private per: number; private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private s = new THREE.Vector3(); private p = new THREE.Vector3();
  private groundY: (x: number, z: number) => number = () => 0; onFlush: ((x: number, z: number) => void) | null = null;
  constructor(nFlocks: number, per: number) {
    this.per = per;
    // Vogel: Rumpf (flacher Tropfen) + zwei Flügel-Dreiecke; Flattern über die Skalierung in y
    const g = new THREE.BufferGeometry(); const P = [0, 0.06, 0.16, -0.05, 0.02, -0.14, 0.05, 0.02, -0.14, 0, 0.06, 0.16, 0.05, 0.02, -0.14, 0, 0.11, -0.02, 0, 0.06, 0.16, 0, 0.11, -0.02, -0.05, 0.02, -0.14,
      0, 0.08, 0.06, -0.3, 0.1, -0.02, 0, 0.08, -0.1, 0, 0.08, 0.06, 0, 0.08, -0.1, 0.3, 0.1, -0.02];
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: '#8E97A3', side: THREE.DoubleSide }), nFlocks * per); this.mesh.name = 'tauben'; this.mesh.frustumCulled = false; this.mesh.count = 0;
    for (let i = 0; i < nFlocks; i++) this.flocks.push({ spot: -1, x: 0, z: 0, y: 0, fly: 0, t: i * 3.3 });
  }
  setSpots(spots: number[][], groundY: (x: number, z: number) => number) { this.spots = spots; this.groundY = groundY; for (const f of this.flocks) { f.spot = -1; f.fly = 0; } console.log('[bau] Tauben: Plätze', spots.length); }
  /** Hupe: Schwärme in der Nähe fliegen auf; gibt die Anzahl zurück */
  honk(x: number, z: number) { let n = 0; for (const f of this.flocks) if (f.spot >= 0 && f.fly <= 0 && Math.hypot(f.x - x, f.z - z) < 50) { f.fly = 0.001; n++; this.onFlush?.(f.x, f.z); } return n; }
  update(dt: number, cars: { x: number; z: number }[]) {
    const car = cars[0]; if (!car || !this.spots.length) { this.mesh.count = 0; return; }
    this.tick -= dt;
    if (this.tick <= 0) { this.tick = 1.3; const used = new Set(this.flocks.map((f) => f.spot));
      for (const f of this.flocks) { if (f.spot >= 0 && Math.hypot(f.x - car.x, f.z - car.z) < 760) continue;
        let best = -1, bd = 700; for (let i = 0; i < this.spots.length; i++) { if (used.has(i)) continue; const d = Math.hypot(this.spots[i][0] - car.x, this.spots[i][1] - car.z); if (d < bd && d > 25) { bd = d; best = i; } }
        used.delete(f.spot); f.spot = best; f.fly = 0; if (best >= 0) { used.add(best); f.x = this.spots[best][0]; f.z = this.spots[best][1]; f.y = this.groundY(f.x, f.z); } } }
    let n = 0;
    for (const f of this.flocks) { if (f.spot < 0) continue; f.t += dt;
      if (f.fly <= 0) { for (const c of cars) if (Math.hypot(c.x - f.x, c.z - f.z) < 15) { f.fly = 0.001; this.onFlush?.(f.x, f.z); break; } } else { f.fly += dt; if (f.fly > 11) f.fly = 0; }
      const up = f.fly <= 0 ? 0 : Math.min(1, f.fly / 1.6) * Math.min(1, (11 - f.fly) / 2.2); // 0 am Boden … 1 in der Luft
      for (let i = 0; i < this.per; i++) { const a0 = h2(f.spot + i * 1.7, i) * 6.283, r0 = 0.6 + h2(i, f.spot * 0.3 + 1) * 3.2;
        const gx = f.x + Math.cos(a0) * r0, gz = f.z + Math.sin(a0) * r0;
        const ang = f.fly * (0.9 + (i % 3) * 0.08) + a0, rad = 7 + (i % 4) * 1.6, ax = f.x + Math.cos(ang) * rad, az = f.z + Math.sin(ang) * rad;
        const x = gx + (ax - gx) * up, z = gz + (az - gz) * up, y = f.y + up * (9 + (i % 5) * 1.3 + Math.sin(f.t * 2 + i) * 0.6) + (up > 0 ? 0 : Math.max(0, Math.sin(f.t * 5 + i * 2.1)) * 0.03);
        const head = up > 0.05 ? ang + Math.PI / 2 : a0 + Math.sin(f.t * 0.7 + i) * 1.2, flap = up > 0.02 ? 0.3 + Math.abs(Math.sin(f.t * 16 + i)) * 1.5 : 1;
        this.e.set(up > 0 ? 0 : Math.max(0, Math.sin(f.t * 5 + i * 2.1)) * 0.5, head, 0); this.q.setFromEuler(this.e); this.s.set(up > 0.02 ? 1.5 : 0.9, flap * 1.5, 1.5); this.p.set(x, y, z);
        this.m.compose(this.p, this.q, this.s); this.mesh.setMatrixAt(n++, this.m); } }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true;
  }
}
