import * as THREE from 'three';
import { toon, outline, type Mask } from './world';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Terrain } from './terrain';
import type { Controls } from './input';

export type Difficulty = 'entdecken' | 'rettung' | 'profi';
const VMAX: Record<Difficulty, number> = { entdecken: 25, rettung: 33, profi: 40 }; // m/s: 90 / 119 / 144 km/h, mit Blaulicht +15 %

function textSprite(text: string, bg: string, fg: string, w = 256, h = 96, font = 'bold 44px system-ui, sans-serif') {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, h / 2 - 4); g.fill();
  g.lineWidth = 6; g.strokeStyle = '#3b302b'; g.stroke();
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }));
  s.scale.set(w / 100, h / 100, 1);
  return s;
}
export { textSprite };

/** Rettungswagen im Kastenaufbau-Stil (Fahrerkabine + Wechselkoffer), ohne Logos. */
export function buildAmbulance() {
  const root = new THREE.Group();
  const body = new THREE.Group(); // wird für Wackeln/Neigen bewegt
  root.add(body);
  const white = toon('#F7F7F4'), yellow = toon('#E3EE3A'), red = toon('#D8343A'), dark = toon('#2E3440'), glass = toon('#4F6F8C'), grey = toon('#9AA0A6');
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, line = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); body.add(m); if (line) body.add(outline(m)); return m;
  };
  // Koffer (hinten), Front zeigt nach +z
  add(new THREE.BoxGeometry(2.3, 2.35, 4.3), white, 0, 1.85, -1.05);
  // Warnstreifen
  add(new THREE.BoxGeometry(2.34, 0.45, 4.32), yellow, 0, 1.15, -1.05, false);
  add(new THREE.BoxGeometry(2.35, 0.12, 4.33), red, 0, 1.45, -1.05, false);
  // Kabine
  add(new THREE.BoxGeometry(2.2, 1.35, 1.6), white, 0, 1.45, 1.95);
  add(new THREE.BoxGeometry(2.24, 0.45, 1.62), yellow, 0, 1.15, 1.95, false);
  const hood = add(new THREE.BoxGeometry(2.1, 0.55, 1.0), white, 0, 1.0, 3.05);
  hood.rotation.x = 0.12;
  // Frontscheibe + Seitenfenster
  const ws = add(new THREE.BoxGeometry(2.0, 0.8, 0.08), glass, 0, 1.75, 2.72, false); ws.rotation.x = -0.35;
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.06, 0.6, 0.9), glass, s * 1.11, 1.75, 2.0, false);
  // Fahrgestell + Räder
  add(new THREE.BoxGeometry(2.1, 0.35, 6.2), dark, 0, 0.55, 0.3, false);
  const wheelG = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 12); wheelG.rotateZ(Math.PI / 2);
  const wheels: THREE.Mesh[] = [];
  const steerPivots: THREE.Group[] = [];
  for (const [x, z] of [[-1.05, 2.4], [1.05, 2.4], [-1.05, -2.0], [1.05, -2.0]]) {
    // Lenkgelenk: Pivot dreht um y, das Rad darin nur um seine Achse → kein Eiern
    const pivot = new THREE.Group(); pivot.position.set(x, 0.45, z); body.add(pivot);
    const w = new THREE.Mesh(wheelG, dark); pivot.add(w); wheels.push(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.37, 8).rotateZ(Math.PI / 2), grey); pivot.add(hub);
    if (z > 0) steerPivots.push(pivot);
  }
  // Scheinwerfer + Rückleuchten
  const headM = new THREE.MeshBasicMaterial({ color: '#FFF4C2' });
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.45, 0.22, 0.06), headM, s * 0.75, 1.05, 3.56, false);
    add(new THREE.BoxGeometry(0.3, 0.3, 0.06), new THREE.MeshBasicMaterial({ color: '#c0392b' }), s * 0.95, 0.95, -3.22, false);
  }
  // Blaulichtbalken auf der Kabine + Blaulichter hinten oben
  const blueOn = new THREE.MeshBasicMaterial({ color: '#3fa9ff' });
  const blueOff = new THREE.MeshBasicMaterial({ color: '#1d4f86' });
  add(new THREE.BoxGeometry(1.7, 0.12, 0.45), dark, 0, 2.2, 2.0, false);
  const lights: THREE.Mesh[] = [];
  for (const [x, y, z] of [[-0.55, 2.38, 2.0], [0.55, 2.38, 2.0], [-1.0, 3.12, -3.0], [1.0, 3.12, -3.0]]) {
    lights.push(add(new THREE.BoxGeometry(0.5, 0.25, 0.4), blueOff, x, y, z, false));
  }
  // Seitlicher Stern-des-Lebens-freier Hinweis: einfaches weisses Kreuz auf blauem Feld, kein Logo
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.04, 0.8, 0.8), toon('#0E73BA'), s * 1.17, 2.25, -1.4, false);
    add(new THREE.BoxGeometry(0.05, 0.55, 0.16), white, s * 1.18, 2.25, -1.4, false);
    add(new THREE.BoxGeometry(0.05, 0.16, 0.55), white, s * 1.18, 2.25, -1.4, false);
  }
  // Hecktüren mit Fenstern und Warnwinkeln (Comic-Textur)
  const rear = document.createElement('canvas'); rear.width = 128; rear.height = 128;
  const rg = rear.getContext('2d')!;
  rg.fillStyle = '#F7F7F4'; rg.fillRect(0, 0, 128, 128);
  rg.fillStyle = '#4F6F8C'; rg.fillRect(12, 12, 46, 34); rg.fillRect(70, 12, 46, 34);
  rg.fillStyle = 'rgba(255,255,255,.5)'; rg.fillRect(18, 16, 8, 26); rg.fillRect(76, 16, 8, 26);
  rg.save(); rg.beginPath(); rg.rect(0, 74, 128, 54); rg.clip();
  for (let x = -128; x < 256; x += 22) { rg.fillStyle = (x / 22) % 2 ? '#D8343A' : '#E3EE3A'; rg.beginPath(); rg.moveTo(x, 128); rg.lineTo(x + 11, 128); rg.lineTo(x + 11 + 54, 74); rg.lineTo(x + 54, 74); rg.fill(); }
  rg.restore();
  rg.strokeStyle = '#3b302b'; rg.lineWidth = 3; rg.beginPath(); rg.moveTo(64, 4); rg.lineTo(64, 124); rg.stroke();
  rg.strokeRect(2, 2, 124, 124);
  rg.fillStyle = '#9AA0A6'; rg.fillRect(54, 58, 6, 12); rg.fillRect(68, 58, 6, 12);
  const rearTex = new THREE.CanvasTexture(rear); rearTex.colorSpace = THREE.SRGBColorSpace;
  const rearPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.26, 2.3), new THREE.MeshBasicMaterial({ map: rearTex }));
  rearPlane.position.set(0, 1.85, -3.215); rearPlane.rotation.y = Math.PI; body.add(rearPlane);
  // Seitliche Beschriftung «144» und Fenster im Koffer
  const side = document.createElement('canvas'); side.width = 256; side.height = 128;
  const sg = side.getContext('2d')!;
  sg.clearRect(0, 0, 256, 128);
  sg.fillStyle = '#4F6F8C'; sg.fillRect(150, 10, 70, 40); sg.fillStyle = 'rgba(255,255,255,.45)'; sg.fillRect(156, 14, 10, 32);
  sg.strokeStyle = '#3b302b'; sg.lineWidth = 3; sg.strokeRect(150, 10, 70, 40);
  sg.fillStyle = '#0E73BA'; sg.font = 'bold 44px system-ui, sans-serif'; sg.fillText('144', 20, 48);
  const sideTex = new THREE.CanvasTexture(side); sideTex.colorSpace = THREE.SRGBColorSpace;
  for (const sgn of [-1, 1]) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 2.05), new THREE.MeshBasicMaterial({ map: sideTex, transparent: true }));
    pl.position.set(sgn * 1.162, 2.45, -1.05); pl.rotation.y = sgn * Math.PI / 2;
    body.add(pl);
  }
  // Luksi (Originalgrafik, nie neu gezeichnet) als Billboard auf dem Kabinendach
  const luksiTex = new THREE.TextureLoader().load('img/luksi-winkt.png');
  luksiTex.colorSpace = THREE.SRGBColorSpace;
  const luksi = new THREE.Sprite(new THREE.SpriteMaterial({ map: luksiTex, transparent: true, alphaTest: 0.2 }));
  luksi.center.set(0.5, 0.05);
  luksi.position.set(0, 2.3, 1.9); luksi.scale.set(1.75 * 0.903, 1.75, 1); // Seitenverhältnis 542×600
  body.add(luksi);
  // Schwindel-Sternchen (bei Remplern)
  const dizzy = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: '#FFD447' }));
    dizzy.add(s);
  }
  dizzy.position.y = 3.8; dizzy.visible = false;
  root.add(dizzy);

  // Feste Teile nach Material zusammenfassen (Konturen in ein Liniennetz): ~45 → ~12 Zeichenaufrufe
  {
    const keep = new Set<THREE.Material>([white, yellow, red, dark, glass, grey]);
    const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>(); const lineGeos: THREE.BufferGeometry[] = []; let lineMat: THREE.Material | null = null;
    for (const c of [...body.children]) {
      const mm = c as THREE.Mesh;
      if ((mm as any).isMesh && keep.has(mm.material as THREE.Material) && !lights.includes(mm)) {
        mm.updateMatrix(); const q = mm.geometry.index ? mm.geometry.toNonIndexed() : mm.geometry.clone(); q.deleteAttribute('uv'); q.applyMatrix4(mm.matrix);
        const a = byMat.get(mm.material as THREE.Material) || []; a.push(q); byMat.set(mm.material as THREE.Material, a); body.remove(c);
      } else if ((c as any).isLineSegments) { const ls = c as THREE.LineSegments; ls.updateMatrix(); lineGeos.push(ls.geometry.clone().applyMatrix4(ls.matrix)); lineMat = ls.material as THREE.Material; body.remove(c); }
    }
    for (const [mat, gs] of byMat) body.add(new THREE.Mesh(mergeGeometries(gs, false)!, mat));
    if (lineGeos.length && lineMat) body.add(new THREE.LineSegments(mergeGeometries(lineGeos, false)!, lineMat));
  }
  return { root, body, lights, blueOn, blueOff, dizzy, wheels, steerPivots, mats: { white, yellow, red, rear: rearPlane.material } };
}

export class Vehicle {
  x = 0; z = 0; y = 0; heading = 0; pitch = 0; roll = 0; speed = 0; steerAngle = 0;
  siren = false;
  bumps = 0; // Zähler für Sterne
  wobble = 0; // Sekunden Schwindel-Effekt
  model = buildAmbulance();
  skin = 'standard'; private skinT = 0;
  /** Lackierung (freigespielt mit Luksi-Herzen) */
  setSkin(name: string) {
    this.skin = name; const { white, yellow, red } = this.model.mats as unknown as Record<string, THREE.MeshToonMaterial>;
    const S: Record<string, string[]> = { standard: ['#F7F7F4', '#E3EE3A', '#D8343A'], regenbogen: ['#F7F7F4', '#E3EE3A', '#D8343A'], luksi: ['#FFD447', '#1E5AA8', '#F39204'], gold: ['#E8C14A', '#FFF2B0', '#B8860B'] };
    const c = S[name] || S.standard; white.color.set(c[0]); yellow.color.set(c[1]); red.color.set(c[2]);
    (this.model.mats as any).rear.color.set(name === 'gold' ? '#F0CF73' : name === 'luksi' ? '#FFE27A' : '#ffffff');
  }
  animateSkin(dt: number) { if (this.skin !== 'regenbogen') return; this.skinT += dt; const { yellow, red } = this.model.mats as unknown as Record<string, THREE.MeshToonMaterial>; yellow.color.setHSL((this.skinT * 0.25) % 1, 0.85, 0.6); red.color.setHSL((this.skinT * 0.25 + 0.5) % 1, 0.85, 0.5); (this.model.mats as any).rear.color.setHSL((this.skinT * 0.25) % 1, 0.7, 0.8); }
  private t = 0;
  constructor(public mask: Mask, public terrain: Terrain) { this.model.root.rotation.order = 'YXZ'; }

  get fx() { return Math.sin(this.heading); }
  get fz() { return Math.cos(this.heading); }

  blocked(x: number, z: number, h: number) {
    const fx = Math.sin(h), fz = Math.cos(h), rx = fz, rz = -fx;
    for (const [a, b] of [[3.2, 1.0], [3.2, -1.0], [-3.1, 1.0], [-3.1, -1.0], [0, 1.1], [0, -1.1], [1.6, 1.1], [1.6, -1.1], [-1.6, 1.1], [-1.6, -1.1]]) {
      const v = this.mask.at(x + fx * a + rx * b, z + fz * a + rz * b);
      if (v !== 0) return v;
    }
    return 0;
  }

  /** Rückgabe: true, wenn es in diesem Schritt einen Rempler gab */
  update(dt: number, c: Controls, diff: Difficulty, onBump: (hard: boolean) => void) {
    const n = Math.abs(this.speed) > 18 ? 3 : 1;
    for (let i = 0; i < n; i++) this.step(dt / n, c, diff, onBump, i === n - 1);
  }

  private step(dt: number, c: Controls, diff: Difficulty, onBump: (hard: boolean) => void, render: boolean) {
    this.t += dt;
    const vmax = VMAX[diff] * (this.siren ? 1.15 : 1);
    // Längsdynamik
    if (c.throttle > 0) {
      if (this.speed < -0.3) this.speed += 20 * dt * c.throttle; // aus Rückwärts bremsen
      else this.speed += (diff === 'profi' ? 20 : 16) * c.throttle * dt * (1 - Math.max(0, this.speed) / vmax) + (this.speed > vmax ? -6 * dt : 0);
    }
    if (c.brake > 0) {
      if (this.speed > 0.3) this.speed -= 24 * dt * c.brake;
      else this.speed = Math.max(-6, this.speed - 7 * dt * c.brake);
    }
    if (!c.throttle && !c.brake) this.speed *= 1 - Math.min(1, 0.9 * dt);
    this.speed -= Math.sin(this.pitch) * 4.5 * dt; // Hang (arcade-sanft)
    if (Math.abs(this.speed) < 0.05 && !c.throttle) this.speed = 0;

    // Lenkung: bei Tempo weniger Einschlag (gutmütig)
    const sp = Math.abs(this.speed);
    const maxSteer = 0.62 - Math.min(0.5, sp * 0.016);
    const target = -c.steer * maxSteer;
    this.steerAngle += (target - this.steerAngle) * Math.min(1, dt * 8);
    const turn = (this.speed / 3.8) * Math.tan(this.steerAngle);
    const nh = this.heading + turn * dt;
    const nx = this.x + Math.sin(nh) * this.speed * dt;
    const nz = this.z + Math.cos(nh) * this.speed * dt;

    let hit = this.blocked(nx, nz, nh);
    if (!hit) { this.x = nx; this.z = nz; this.heading = nh; }
    else {
      // gleiten an der Wand entlang
      if (!this.blocked(nx, this.z, nh)) { this.x = nx; this.heading = nh; this.speed *= 0.82; }
      else if (!this.blocked(this.x, nz, nh)) { this.z = nz; this.heading = nh; this.speed *= 0.82; }
      else if (!this.blocked(this.x, this.z, nh)) { this.heading = nh; this.speed *= -0.25; }
      else { this.speed *= -0.25; }
      if (sp > 4) {
        this.bumps++;
        this.wobble = 1.3;
        onBump(hit === 1);
      }
    }

    if (!render) return;
    // Darstellung
    const m = this.model;
    // Gelände: Höhe, Neigung längs und quer
    const T = this.terrain;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading), rx = fz, rz = -fx;
    const hf = T.height(this.x + fx * 2.6, this.z + fz * 2.6), hb = T.height(this.x - fx * 2.6, this.z - fz * 2.6);
    const hl = T.height(this.x + rx * 1.1, this.z + rz * 1.1), hr = T.height(this.x - rx * 1.1, this.z - rz * 1.1);
    const ty = Math.max((hf + hb) / 2, T.height(this.x, this.z));
    this.y += (ty - this.y) * Math.min(1, dt * 14);
    this.pitch += (Math.max(-0.35, Math.min(0.35, Math.atan2(hf - hb, 5.2))) - this.pitch) * Math.min(1, dt * 10);
    this.roll += (Math.max(-0.12, Math.min(0.12, Math.atan2(hl - hr, 2.2) * 0.5)) - this.roll) * Math.min(1, dt * 10);
    m.root.position.set(this.x, this.y + 0.3, this.z);
    m.root.rotation.y = this.heading;
    m.root.rotation.x = -this.pitch;
    m.root.rotation.z = this.roll;
    m.body.rotation.z = -this.steerAngle * Math.min(1, sp / 15) * 0.12; // Neigung in Kurven
    m.body.rotation.x = -(c.throttle - c.brake) * 0.012 * Math.min(1, sp / 3);
    for (const w of m.wheels) w.rotation.x += (this.speed * dt) / 0.45;
    m.steerPivots[0].rotation.y = m.steerPivots[1].rotation.y = this.steerAngle;
    // Blaulicht
    const phase = Math.floor(this.t * 6) % 2;
    m.lights.forEach((l, i) => (l.material = this.siren && (i + phase) % 2 === 0 ? m.blueOn : m.blueOff));
    // Schwindel
    if (this.wobble > 0) {
      this.wobble -= dt;
      m.dizzy.visible = true;
      m.dizzy.children.forEach((s, i) => {
        const a = this.t * 4 + (i * Math.PI * 2) / 5;
        s.position.set(Math.cos(a) * 1.4, Math.sin(this.t * 6 + i) * 0.2, Math.sin(a) * 1.4);
        s.rotation.y += dt * 5;
      });
      m.body.position.y = Math.abs(Math.sin(this.t * 18)) * 0.12 * this.wobble;
    } else { m.dizzy.visible = false; m.body.position.y = 0; }
  }
}
