import * as THREE from 'three';
/** 21b «Mehr Leben»: Kinder auf Spielplätzen und in Parks. Sie spielen (hüpfen), drehen sich zur Ambulanz und winken, wenn sie nah vorbeifährt – ein Herz steigt auf.
 *  Kein Zähler, keine Aufgabe, keine Kollision. Wenige bewegte Figuren (Pool), die jeweils an die nächsten Plätze um die Ambulanz gesetzt werden.
 *  Bei Schnee steht neben jedem Kind ein Schneemann. Figuren im Stil der Fussgänger (Körper + Kopf), Luksi wird nicht gezeichnet. */
const KLEID = ['#E4572E', '#2F6FB5', '#F2C418', '#3E8E4E', '#8E5BD0', '#F28CB1', '#1FA6A0', '#C8322B'], HAUT = ['#F1C9A5', '#E8B796', '#C68E6A', '#8D5B3E', '#F6D7BD'];
const h2 = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
interface Kid { g: THREE.Group; arm: THREE.Mesh; heart: THREE.Sprite; snow: THREE.Group; spot: number; t: number; wave: number; y0: number; boost: number; sy: number }
let heartTex: THREE.Texture | null = null;
function heartTexture() {
  if (heartTex) return heartTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d')!;
  c.fillStyle = '#FF4F9A'; c.strokeStyle = '#1D1E1B'; c.lineWidth = 4; c.beginPath(); c.moveTo(32, 54); c.bezierCurveTo(4, 34, 8, 10, 24, 12); c.bezierCurveTo(29, 12, 32, 16, 32, 20); c.bezierCurveTo(32, 16, 35, 12, 40, 12); c.bezierCurveTo(56, 10, 60, 34, 32, 54); c.closePath(); c.fill(); c.stroke();
  heartTex = new THREE.CanvasTexture(cv); heartTex.colorSpace = THREE.SRGBColorSpace; return heartTex;
}
export class Winker {
  group = new THREE.Group(); private kids: Kid[] = []; private spots: number[][] = []; private tick = 0;
  private groundY: (x: number, z: number) => number = () => 0;
  constructor(n: number) {
    this.group.name = 'winker';
    const body = new THREE.CylinderGeometry(0.2, 0.26, 0.78, 6).translate(0, 0.5, 0), head = new THREE.IcosahedronGeometry(0.2, 0).translate(0, 1.1, 0), armG = new THREE.BoxGeometry(0.09, 0.46, 0.09).translate(0, 0.21, 0);
    const white = new THREE.MeshLambertMaterial({ color: '#F7FAFF' }), dark = new THREE.MeshLambertMaterial({ color: '#2E3A46' }), carrot = new THREE.MeshLambertMaterial({ color: '#F28C28' });
    const s1 = new THREE.SphereGeometry(0.42, 10, 8), s2 = new THREE.SphereGeometry(0.3, 10, 8), s3 = new THREE.SphereGeometry(0.21, 10, 8), cone = new THREE.ConeGeometry(0.045, 0.22, 6).rotateX(Math.PI / 2), eye = new THREE.SphereGeometry(0.03, 6, 4);
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group(), cl = new THREE.MeshLambertMaterial({ color: KLEID[i % KLEID.length] }), sk = new THREE.MeshLambertMaterial({ color: HAUT[(i * 2) % HAUT.length] });
      g.add(new THREE.Mesh(body, cl), new THREE.Mesh(head, sk));
      const armL = new THREE.Mesh(armG, cl); armL.position.set(-0.24, 0.8, 0); armL.rotation.z = Math.PI - 0.25; g.add(armL);
      const arm = new THREE.Mesh(armG, cl); arm.position.set(0.24, 0.8, 0); arm.rotation.z = Math.PI + 0.25; g.add(arm);
      g.scale.setScalar(0.78 + (i % 3) * 0.1);
      const heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTexture(), transparent: true, depthWrite: false })); heart.scale.setScalar(0.55); heart.visible = false; this.group.add(heart);
      const snow = new THREE.Group(); const a = new THREE.Mesh(s1, white), b = new THREE.Mesh(s2, white), c = new THREE.Mesh(s3, white); a.position.y = 0.36; b.position.y = 0.95; c.position.y = 1.4;
      const nose = new THREE.Mesh(cone, carrot); nose.position.set(0, 1.4, 0.26); const e1 = new THREE.Mesh(eye, dark), e2 = new THREE.Mesh(eye, dark); e1.position.set(-0.08, 1.47, 0.18); e2.position.set(0.08, 1.47, 0.18);
      snow.add(a, b, c, nose, e1, e2); snow.visible = false; this.group.add(snow);
      g.visible = false; this.group.add(g); this.kids.push({ g, arm, heart, snow, spot: -1, t: i * 1.7, wave: 0, y0: 0, boost: 0, sy: 0 });
    }
  }
  /** Plätze der aktiven Gegend: [x, z] – nur freie Stellen (nicht Strasse, Haus, Wasser) */
  setSpots(centers: number[][], groundY: (x: number, z: number) => number, frei: (x: number, z: number) => boolean) {
    this.groundY = groundY; this.spots = [];
    for (const [cx, cz, cnt] of centers) for (let k = 0, put = 0; k < 9 && put < (cnt || 1); k++) {
      const a = h2(cx + k * 2.3, cz - k) * Math.PI * 2, r = (cnt === 3 ? 3.4 : 1.5) + h2(cx - k, cz + k * 1.7) * 4, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (!frei(x, z) || !frei(x + 0.6, z) || !frei(x - 0.6, z) || !frei(x, z + 0.6) || !frei(x, z - 0.6)) continue; this.spots.push([x, z]); put++; }
    for (const k of this.kids) { k.spot = -1; k.g.visible = false; k.heart.visible = false; k.snow.visible = false; }
    console.log('[bau] Winkende Kinder: Plätze', this.spots.length);
  }
  /** 21d Hupe: Kinder im Umkreis winken sofort (3 s), Schneemänner hüpfen und drehen sich einmal («Hut lupfen»). Gibt die Zahl der Kinder zurück. */
  honk(x: number, z: number) { let n = 0; for (const k of this.kids) if (k.spot >= 0 && Math.hypot(k.g.position.x - x, k.g.position.z - z) < 90) { k.boost = 3; n++; } return n; }
  update(dt: number, cars: { x: number; z: number; speed?: number }[], snow: boolean) {
    const car = cars[0]; if (!car || !this.spots.length) return;
    this.tick -= dt;
    if (this.tick <= 0) { this.tick = 1; const used = new Set(this.kids.map((k) => k.spot));
      for (const k of this.kids) { const s = k.spot >= 0 ? this.spots[k.spot] : null;
        if (s && Math.hypot(s[0] - car.x, s[1] - car.z) < 380) continue;
        let best = -1, bd = 350; for (let i = 0; i < this.spots.length; i++) { if (used.has(i)) continue; const d = Math.hypot(this.spots[i][0] - car.x, this.spots[i][1] - car.z); if (d < bd) { bd = d; best = i; } }
        used.delete(k.spot); k.spot = best; k.g.visible = best >= 0; k.snow.visible = false; k.heart.visible = false;
        if (best >= 0) { used.add(best); const [x, z] = this.spots[best]; k.y0 = this.groundY(x, z); k.g.position.set(x, k.y0, z); k.g.rotation.y = h2(x, z) * 6.28;
          const sa = h2(z, x) * 6.28; k.snow.position.set(x + Math.cos(sa) * 1.3, this.groundY(x + Math.cos(sa) * 1.3, z + Math.sin(sa) * 1.3), z + Math.sin(sa) * 1.3); k.snow.rotation.y = sa; } } }
    for (const k of this.kids) { if (k.spot < 0) continue; k.t += dt; k.snow.visible = snow;
      let near = 1e9, nx = 0, nz = 0; for (const c of cars) { const d = Math.hypot(c.x - k.g.position.x, c.z - k.g.position.z); if (d < near) { near = d; nx = c.x; nz = c.z; } }
      if (k.boost > 0) { k.boost -= dt; if (near > 60) { nx = cars[0].x; nz = cars[0].z; near = 59; } }
      if (k.snow.visible) { k.sy = k.boost > 2 ? Math.sin((3 - k.boost) * Math.PI) * 0.45 : 0; k.snow.position.y = this.groundY(k.snow.position.x, k.snow.position.z) + k.sy; if (k.boost > 2) k.snow.rotation.y += dt * 6.283; }
      const want = near < 42 || k.boost > 0 ? 1 : 0; k.wave += (want - k.wave) * Math.min(1, dt * 5);
      if (near < 60) { const ta = Math.atan2(nx - k.g.position.x, nz - k.g.position.z); let d = ta - k.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); k.g.rotation.y += d * Math.min(1, dt * 6); }
      k.arm.rotation.z = Math.PI + 0.25 - k.wave * (2.6 + Math.sin(k.t * 11) * 0.45);
      k.g.position.y = k.y0 + Math.abs(Math.sin(k.t * (3 + k.wave * 3))) * (0.07 + k.wave * 0.16);
      k.heart.visible = k.wave > 0.5; if (k.heart.visible) { const ph = (k.t * 0.8) % 1; k.heart.position.set(k.g.position.x, k.y0 + 1.5 + ph * 1.1, k.g.position.z); (k.heart.material as THREE.SpriteMaterial).opacity = 1 - ph * ph; }
    }
  }
}
