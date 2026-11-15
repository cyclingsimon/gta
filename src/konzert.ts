import * as THREE from 'three';
/** 16a (Simon 15.11.: «nicht intuitiv, woher die Musik kommt»): Über dem Konzerthaus schwebt eine Leuchttafel «KONZERT», aus dem Dach
 *  steigen Noten auf (mehr und grösser, je näher man ist), und beim Hineinfahren in den Hörbereich sagt eine Meldung, wo gespielt wird. */
export interface KonzertOrt { x: number; z: number; h: number; titel: string; farbe: string; meldung: string }
function tafel(titel: string, farbe: string) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 192; const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(24,18,40,0.92)'; g.beginPath(); (g as any).roundRect(6, 6, 500, 150, 28); g.fill(); g.lineWidth = 8; g.strokeStyle = farbe; g.stroke();
  g.beginPath(); g.moveTo(226, 154); g.lineTo(256, 188); g.lineTo(286, 154); g.closePath(); g.fillStyle = farbe; g.fill(); // Zeiger nach unten aufs Haus
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#FFE66D'; g.font = 'bold 64px sans-serif'; g.fillText('♪ KONZERT ♫', 256, 56);
  g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.fillText(titel, 256, 116);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function note(z: string, farbe: string) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 54px sans-serif'; g.lineWidth = 6; g.strokeStyle = '#1b1430'; g.strokeText(z, 32, 34); g.fillStyle = farbe; g.fillText(z, 32, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export class Konzerte {
  group = new THREE.Group(); private orte: { o: KonzertOrt; g: THREE.Group; sign: THREE.Sprite; notes: THREE.Sprite[]; in: boolean; y: number; yT: number }[] = []; private t = 0;
  constructor(list: KonzertOrt[]) {
    this.group.name = 'konzerte';
    for (const o of list) { const g = new THREE.Group(); g.position.set(o.x, 0, o.z); g.visible = false;
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: tafel(o.titel, o.farbe), transparent: true, depthWrite: false, fog: false })); sign.scale.set(40, 15, 1); sign.position.y = o.h + 14; g.add(sign);
      const tex = [note('♪', o.farbe), note('♫', '#FFE66D'), note('♬', '#ffffff')], notes: THREE.Sprite[] = [];
      for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex[i % 3], transparent: true, depthWrite: false, fog: false })); notes.push(s); g.add(s); }
      this.group.add(g); this.orte.push({ o, g, sign, notes, in: false, y: 0, yT: -1 }); }
  }
  /** near(i) = 0..1 Lautstärke der Ortsmusik; sagt(text) zeigt die Meldung */
  update(dt: number, cx: number, cz: number, groundY: (x: number, z: number) => number, near: (i: number) => number, sagt: (t: string) => void) {
    this.t += dt;
    this.orte.forEach((v, i) => { const d = Math.hypot(cx - v.o.x, cz - v.o.z); v.g.visible = d < 900; if (!v.g.visible) { v.in = false; return; }
      if (this.t - v.yT > 3 || v.yT < 0) { v.y = groundY(v.o.x, v.o.z); v.yT = this.t; } v.g.position.y = v.y;
      const k = near(i), puls = 1 + 0.06 * Math.sin(this.t * 7.5); v.sign.scale.set(40 * puls, 15 * puls, 1); v.sign.position.y = v.o.h + 14 + Math.sin(this.t * 1.6) * 0.8;
      v.notes.forEach((s, n) => { const p = (this.t * 0.22 + n / v.notes.length) % 1, a = n * 2.4 + this.t * 0.5, r = 5 + p * 9 + (n % 3) * 2;
        s.position.set(Math.cos(a) * r, v.o.h + 1 + p * 22, Math.sin(a) * r); const sc = (3.2 + 2.4 * k) * (0.7 + 0.6 * p); s.scale.set(sc, sc, 1); (s.material as THREE.SpriteMaterial).opacity = Math.min(1, p * 5, (1 - p) * 3); });
      if (k > 0.2 && !v.in) { v.in = true; sagt(v.o.meldung); } else if (k === 0 && d > 260) v.in = false; });
  }
}
