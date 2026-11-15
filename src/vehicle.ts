import * as THREE from 'three';
import { toon, outline, type Mask } from './world';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Terrain } from './terrain';
import type { Controls } from './input';

export type Difficulty = 'entdecken' | 'rettung' | 'profi';
// Höchstgeschwindigkeit in m/s MIT Blaulicht (Wunsch Simon 13.11.: Einfach ~90, Mittel ~150, Schnell ~269 km/h).
// Ohne Blaulicht langsamer: in der Schweiz darf nur mit Blaulicht UND Wechselklanghorn von Geschwindigkeitsvorschriften
// abgewichen werden (Art. 100 Ziff. 4 SVG, ASTRA-Merkblatt Blaulicht). Ohne Blaulicht 70 / 120 / 200 km/h [Entscheid Claude].
const VMAX: Record<Difficulty, number> = { entdecken: 90 / 3.6, rettung: 150 / 3.6, profi: 269 / 3.6 };
const VMAX_RUHIG: Record<Difficulty, number> = { entdecken: 70 / 3.6, rettung: 120 / 3.6, profi: 200 / 3.6 };
const ACC: Record<Difficulty, number> = { entdecken: 16, rettung: 24, profi: 36 };

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

/** Rettungswagen im Kastenaufbau-Stil (Fahrerkabine + Wechselkoffer), ohne Logos.
 *  14zi (Simon: «Skins komplett anders, darf ein ganz anderes Fahrzeug sein»): kind = standard | feuerwehr | glace | monster */
export function buildAmbulance(kind = 'standard') {
  const FW = kind === 'feuerwehr', GL = kind === 'glace', MO = kind === 'monster';
  if (!FW && !GL && !MO) return buildLuksRtw(); // P-A Lauf 1: Standard = Rettungswagen nach Vorbild Rettungsdienst LUKS
  const root = new THREE.Group();
  const body = new THREE.Group(); // wird für Wackeln/Neigen bewegt
  root.add(body);
  const white = toon(FW ? '#D7262E' : GL ? '#FFB3D1' : '#F7F7F4'), yellow = toon(FW ? '#F2F2EE' : GL ? '#9EE6CF' : MO ? '#7CFC6A' : '#E3EE3A'), red = toon(FW ? '#F2F2EE' : GL ? '#FFE37A' : MO ? '#A040E0' : '#D8343A'), dark = toon('#2E3440'), glass = toon('#4F6F8C'), grey = toon('#9AA0A6');
  const WR = MO ? 1.05 : 0.45, lift = MO ? 0.85 : 0; // Monster: grosse Räder, Aufbau höher
  body.position.y = lift;
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
  const wheelG = new THREE.CylinderGeometry(WR, WR, MO ? 0.8 : 0.35, 14); wheelG.rotateZ(Math.PI / 2);
  const wheels: THREE.Mesh[] = [];
  const steerPivots: THREE.Group[] = [];
  for (const [x, z] of [[-1.05, 2.4], [1.05, 2.4], [-1.05, -2.0], [1.05, -2.0]]) {
    // Lenkgelenk: Pivot dreht um y, das Rad darin nur um seine Achse → kein Eiern
    const pivot = new THREE.Group(); pivot.position.set(MO ? x * 1.45 : x, WR - lift, z); body.add(pivot);
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
  if (!FW && !GL) for (const s of [-1, 1]) { // Kreuz nur bei Ambulanzen
    add(new THREE.BoxGeometry(0.04, 0.8, 0.8), toon('#0E73BA'), s * 1.17, 2.25, -1.4, false);
    add(new THREE.BoxGeometry(0.05, 0.55, 0.16), white, s * 1.18, 2.25, -1.4, false);
    add(new THREE.BoxGeometry(0.05, 0.16, 0.55), white, s * 1.18, 2.25, -1.4, false);
  }
  // Hecktüren mit Fenstern und Warnwinkeln (Comic-Textur)
  const rear = document.createElement('canvas'); rear.width = 128; rear.height = 128;
  const rg = rear.getContext('2d')!;
  rg.fillStyle = FW ? '#D7262E' : GL ? '#FFB3D1' : '#F7F7F4'; rg.fillRect(0, 0, 128, 128);
  rg.fillStyle = '#4F6F8C'; rg.fillRect(12, 12, 46, 34); rg.fillRect(70, 12, 46, 34);
  rg.fillStyle = 'rgba(255,255,255,.5)'; rg.fillRect(18, 16, 8, 26); rg.fillRect(76, 16, 8, 26);
  rg.save(); rg.beginPath(); rg.rect(0, 74, 128, 54); rg.clip();
  for (let x = -128; x < 256; x += 22) { rg.fillStyle = (x / 22) % 2 ? (FW ? '#F2F2EE' : GL ? '#FF8FB8' : '#D8343A') : (FW ? '#D7262E' : GL ? '#9EE6CF' : '#E3EE3A'); rg.beginPath(); rg.moveTo(x, 128); rg.lineTo(x + 11, 128); rg.lineTo(x + 11 + 54, 74); rg.lineTo(x + 54, 74); rg.fill(); }
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
  sg.fillStyle = FW ? '#FFFFFF' : GL ? '#C2185B' : '#0E73BA'; sg.font = 'bold 44px system-ui, sans-serif'; sg.fillText(FW ? '118' : GL ? 'GLACE' : '144', 20, 48);
  const sideTex = new THREE.CanvasTexture(side); sideTex.colorSpace = THREE.SRGBColorSpace;
  for (const sgn of [-1, 1]) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 2.05), new THREE.MeshBasicMaterial({ map: sideTex, transparent: true }));
    pl.position.set(sgn * 1.162, 2.45, -1.05); pl.rotation.y = sgn * Math.PI / 2;
    body.add(pl);
  }
  // 14zi: Aufbauten je Fahrzeug
  if (FW) { // Feuerwehr: silberne Leiter auf dem Dach, Rollläden seitlich
    const alu = toon('#C9CDD2');
    for (const sx of [-0.45, 0.45]) add(new THREE.BoxGeometry(0.1, 0.12, 5.6), alu, sx, 3.15, -0.2);
    for (let i = 0; i < 12; i++) add(new THREE.BoxGeometry(0.9, 0.06, 0.08), alu, 0, 3.15, -2.9 + i * 0.48, false);
    add(new THREE.BoxGeometry(0.5, 0.25, 0.5), alu, 0, 3.05, -2.8);
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.05, 1.3, 1.1), toon('#B8BCC2'), sd * 1.17, 2.0, -2.5 + k * 1.3, false);
  }
  if (GL) { // Glace-Wagen: riesiges Cornet auf dem Dach
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 12), toon('#D9A35B')); cone.rotation.x = Math.PI; cone.position.set(0, 3.8, -1.2); body.add(cone, outline(cone));
    for (const [c, y, dx] of [['#FFF4E0', 4.6, -0.15], ['#FF8FB8', 4.95, 0.12], ['#7B4A2E', 5.3, 0]] as [string, number, number][]) { const sc = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), toon(c)); sc.position.set(dx, y, -1.2); body.add(sc, outline(sc)); }
    const ch = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), toon('#E3262E')); ch.position.set(0, 5.95, -1.2); body.add(ch);
  }
  if (MO) { // Monster-Ambulanz: Überrollbügel und dicke Stossstangen
    for (const z of [3.7, -3.4]) add(new THREE.BoxGeometry(2.6, 0.4, 0.35), dark, 0, 0.85, z);
    add(new THREE.BoxGeometry(2.2, 0.12, 0.12), dark, 0, 3.25, 0.8, false);
  }
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

/** P-A: Rettungswagen nach Vorbild Rettungsdienst LUKS.
 *  Referenz Aussehen: 3 Fotos von Simon, 14.11.2026 (vorne rechts, hinten links, vorne vor dem KKL) – nicht im Repo.
 *  Belegt (LUKS-Medienmitteilung 27.09.2017): Mercedes Sprinter 519 CDI mit WAS-Wechselkoffer; WAS 500: Radstand 3665 mm.
 *  Lauf 4: Beschriftung nach den Fotos (weiss, rot-oranges Gürtelband mit blauem Streifen, rote Bögen/Dachkontur, blaues Schriftband
 *  «Ambulance», blaue «144», Star of Life, rote Haube mit Spiegelschrift). Bewusst weggelassen: Teddybär-Grafik, «BABY», LUKS-Logo,
 *  Mercedes-Stern. Doppelbereifung hinten [Annahme, auf den Fotos nicht eindeutig].
 *  Front zeigt nach +z, Radaufstand y = 0 (wie bisher). Physik/Hitbox liegen in Vehicle und bleiben unverändert. */
function buildLuksRtw() {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const white = toon('#F7F7F4'), yellow = toon('#E3EE3A'), red = toon('#D8343A'), dark = toon('#2E3440'), glass = toon('#4F6F8C'), grey = toon('#9AA0A6');
  const black = toon('#1E2228'), chrome = toon('#C9CDD2');
  const WR = 0.45;
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, line = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); body.add(m); if (line) body.add(outline(m)); return m;
  };
  // --- Masse (m): Koffer z −3.25..1.15, Kabine z 1.15..3.5, Koffer-Unterkante 0.72, Dach 3.05
  const KZ0 = -3.25, KZ1 = 1.15, KY0 = 0.72, KY1 = 3.05, KW = 2.3;
  // Koffer: Querschnitt mit gerundeten Dachkanten, entlang z extrudiert
  {
    const s = new THREE.Shape(), r = 0.2, hw = KW / 2;
    s.moveTo(-hw, KY0); s.lineTo(hw, KY0); s.lineTo(hw, KY1 - r); s.quadraticCurveTo(hw, KY1, hw - r, KY1);
    s.lineTo(-hw + r, KY1); s.quadraticCurveTo(-hw, KY1, -hw, KY1 - r); s.lineTo(-hw, KY0);
    const g = new THREE.ExtrudeGeometry(s, { depth: KZ1 - KZ0, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, KZ0);
    add(g, white, 0, 0, 0);
  }
  // Alkoven (Koffer-Vorbau über dem Kabinendach) mit integrierter Warnanlage
  { // Lauf 5: Kofferbug mit zwei Fasen-Segmenten (Fotos: weich gerundet)
    const s = new THREE.Shape(), A = [[KZ1, 2.51], [KZ1 + 0.41, 2.51], [KZ1 + 0.41, 2.86], [KZ1 + 0.33, 2.99], [KZ1 + 0.18, KY1], [KZ1, KY1]];
    s.moveTo(A[0][0], A[0][1]); for (const q of A.slice(1)) s.lineTo(q[0], q[1]);
    const g = new THREE.ExtrudeGeometry(s, { depth: KW, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(KW / 2, 0, 0);
    add(g, white, 0, 0, 0);
  }
  // Kabine Sprinter: Seitenprofil (z, y) entlang x extrudiert – Stossstange, Haube, schräge Frontscheibe, Dach
  {
    const s = new THREE.Shape();
    const P = [[3.45, 0.42], [3.52, 0.95], [3.44, 1.33], [2.78, 1.6], [2.08, 2.42], [1.95, 2.5], [1.15, 2.5], [1.15, 0.42]];
    s.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) s.lineTo(P[i][0], P[i][1]);
    const g = new THREE.ExtrudeGeometry(s, { depth: 2.02, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(1.01, 0, 0);
    add(g, white, 0, 0, 0);
  }
  // Frontscheibe (folgt der Schräge), Kühlergrill, Stossstange, Spiegel
  { const ws = add(new THREE.BoxGeometry(1.86, 1.02, 0.04), glass, 0, 2.0, 2.45, false); ws.rotation.x = -Math.atan2(2.78 - 2.08, 2.42 - 1.6); }
  add(new THREE.BoxGeometry(1.44, 0.46, 0.04), chrome, 0, 1.1, 3.49, false); // Lauf 5: silberner Grillrahmen (ohne Markenstern)
  add(new THREE.BoxGeometry(1.3, 0.34, 0.05), black, 0, 1.1, 3.5, false);
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(1.2, 0.03, 0.06), chrome, 0, 1.0 + i * 0.1, 3.51, false);
  add(new THREE.BoxGeometry(2.06, 0.32, 0.22), white, 0, 0.6, 3.46, false);  // Stossfänger weiss (Fotos)
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.08, 0.32, 0.22), black, sx * 1.12, 2.0, 2.55, false);
    add(new THREE.BoxGeometry(0.14, 0.04, 0.04), black, sx * 1.05, 2.0, 2.5, false);
  }
  // Fahrgestell, Kotflügel/Radläufe (dunkel), Trittstufe rechts (Seiteneinstieg)
  add(new THREE.BoxGeometry(1.9, 0.3, 6.3), dark, 0, 0.6, 0.15, false);
  add(new THREE.BoxGeometry(2.2, 0.16, 0.42), black, 0, 0.6, KZ0 - 0.2, false); // Heck-Trittstufe/Stossfänger schwarz (Fotos)
  add(new THREE.BoxGeometry(0.9, 0.12, 0.45), grey, 1.0, 0.5, 0.45, false);
  // Dach: Klimagerät + Dachluke
  add(new THREE.BoxGeometry(0.9, 0.22, 1.0), grey, 0, KY1 + 0.11, -1.6);
  add(new THREE.BoxGeometry(0.6, 0.08, 0.6), grey, 0, KY1 + 0.04, 0.1, false);
  // Räder: vorne einfach, hinten Zwillingsbereifung; Radstand 3.65 m (WAS 500: 3665 mm)
  const wheelG = new THREE.CylinderGeometry(WR, WR, 0.3, 14); wheelG.rotateZ(Math.PI / 2);
  const twinG = new THREE.CylinderGeometry(WR, WR, 0.52, 14); twinG.rotateZ(Math.PI / 2);
  const hubG = new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8).rotateZ(Math.PI / 2), hubTG = new THREE.CylinderGeometry(0.22, 0.22, 0.54, 8).rotateZ(Math.PI / 2);
  const wheels: THREE.Mesh[] = [], steerPivots: THREE.Group[] = [];
  for (const [x, z] of [[-1.0, 2.25], [1.0, 2.25], [-0.92, -1.4], [0.92, -1.4]]) {
    const front = z > 0, pivot = new THREE.Group(); pivot.position.set(x, WR, z); body.add(pivot);
    const w = new THREE.Mesh(front ? wheelG : twinG, black); pivot.add(w); wheels.push(w);
    pivot.add(new THREE.Mesh(front ? hubG : hubTG, grey));
    if (front) steerPivots.push(pivot);
  }
  // Scheinwerfer, Blinker, Rückleuchten
  const headM = new THREE.MeshBasicMaterial({ color: '#FFF4C2' }), tailM = new THREE.MeshBasicMaterial({ color: '#C0392B' }), amberM = new THREE.MeshBasicMaterial({ color: '#F5A524' });
  for (const s of [-1, 1]) {
    const hl = add(new THREE.BoxGeometry(0.42, 0.2, 0.06), headM, s * 0.78, 1.24, 3.46, false); hl.rotation.x = -0.25;
    add(new THREE.BoxGeometry(0.1, 0.12, 0.06), amberM, s * 0.98, 1.2, 3.44, false);
    add(new THREE.BoxGeometry(0.3, 0.2, 0.05), tailM, s * 0.95, 0.86, KZ0 - 0.02, false);  // Rückleuchten unten (Fotos)
    add(new THREE.BoxGeometry(0.16, 0.08, 0.04), tailM, s * 0.9, KY1 - 0.08, KZ0 - 0.02, false); // obere Begrenzungsleuchten
  }
  // Warnanlage: Lichtbalken im Alkoven (vorne), Blitzer im Grill, Heck oben links/rechts; Reihenfolge = Wechseltakt
  const blueOn = new THREE.MeshBasicMaterial({ color: '#3fa9ff' });
  const blueOff = new THREE.MeshBasicMaterial({ color: '#1d4f86' });
  const barM = toon('#2C6FD6'); add(new THREE.BoxGeometry(2.16, 0.17, 0.07), barM, 0, 2.77, KZ1 + 0.44, false); // Lauf 5: durchgehend blauer Lichtbalken (nicht blinkend)
  const lights: THREE.Mesh[] = [];
  for (const [x, y, z, w, h] of [[-0.62, 2.77, KZ1 + 0.47, 0.7, 0.14], [0.62, 2.77, KZ1 + 0.47, 0.7, 0.14], [0.3, 1.1, 3.54, 0.16, 0.1], [-0.3, 1.1, 3.54, 0.16, 0.1],
    [-0.98, KY1 - 0.24, KZ0 - 0.03, 0.26, 0.2], [0.98, KY1 - 0.24, KZ0 - 0.03, 0.26, 0.2], [-1.16, KY1 - 0.18, KZ1 - 0.25, 0.04, 0.16], [1.16, KY1 - 0.18, KZ1 - 0.25, 0.04, 0.16]]) {
    lights.push(add(new THREE.BoxGeometry(w, h, x * x > 1.3 ? 0.3 : 0.06), blueOff, x, y, z, false));
  }
  // --- Beschriftung/Markierung nach 3 Fotos von Simon (14.11.2026): EIN Canvas-Atlas (220 px/m) → 1 Zeichenaufruf
  // Weiss; leuchtrot-oranges Gürtelband mit schmalem blauem Mittelstreifen rundum; rote Bögen an Koffer-Vorder- und -Hinterkante,
  // rote Dachkontur; blaues schräges Schriftband «Ambulance»; blaue «144»; Star of Life; Haube rot mit blauer Kante + Spiegelschrift.
  const PX = 220, A = document.createElement('canvas'); A.width = 1024; A.height = 2048;
  const g = A.getContext('2d')!;
  const REG = { sL: [0, 0, 968, 513], sR: [0, 520, 968, 513], cL: [0, 1040, 517, 451], cR: [520, 1040, 517, 451], rear: [0, 1500, 506, 513],
    front: [520, 1500, 506, 115], hood: [520, 1630, 440, 157], star: [520, 1800, 128, 128], nose: [520, 1940, 440, 84] } as Record<string, number[]>;
  const RED = '#E8472B', BLUE = '#1F5FAE', WIN = '#26313B', INK = '#3b302b';
  const BAND = [0.45, 0.82], STRIPE = [0.6, 0.67];           // Gürtelband (m über Koffer-Unterkante) und blauer Streifen
  const starOfLife = (cx: number, cy: number, r: number) => { // sechsarmiger Stern (3 Balken), blau, weiss umrandet
    g.save(); g.translate(cx, cy);
    for (const pass of [0, 1]) for (let k = 0; k < 3; k++) { g.save(); g.rotate(k * Math.PI / 3); g.fillStyle = pass ? BLUE : '#FFFFFF';
      const bw = r * (pass ? 0.36 : 0.5), bl = r * (pass ? 0.92 : 1.0); g.fillRect(-bw / 2, -bl, bw, bl * 2); g.restore(); }
    g.restore();
  };
  const banner = (x0: number, x1: number, yTop: number, hgt: number, slantLeft: boolean, font: number) => { // schräg geschnittenes Schriftband
    const sl = hgt * 0.6; g.fillStyle = BLUE; g.beginPath();
    if (slantLeft) { g.moveTo(x0 + sl, yTop); g.lineTo(x1, yTop); g.lineTo(x1, yTop + hgt); g.lineTo(x0, yTop + hgt); }
    else { g.moveTo(x0, yTop); g.lineTo(x1 - sl, yTop); g.lineTo(x1, yTop + hgt); g.lineTo(x0, yTop + hgt); }
    g.fill(); g.fillStyle = '#FFFFFF'; g.font = `bold ${font}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Ambulance', (x0 + x1) / 2, yTop + hgt * 0.55);
  };
  // Koffer-Seite: s = Meter ab Heck (0..4.4), v = Meter ab Koffer-Unterkante (0..2.33); frontRight = Fahrzeugfront rechts im Bild (linke Seite)
  const kofferSeite = (key: string, frontRight: boolean) => {
    const [ox, oy, w, h] = REG[key]; g.save(); g.translate(ox, oy); g.beginPath(); g.rect(0, 0, w, h); g.clip();
    const X = (s: number) => (frontRight ? s : 4.4 - s) * PX, Y = (v: number) => h - v * PX;
    const rectS = (s0: number, s1: number, v0: number, v1: number) => { const a = X(s0), b = X(s1); g.fillRect(Math.min(a, b), Y(v1), Math.abs(b - a), (v1 - v0) * PX); };
    g.fillStyle = RED; rectS(0, 4.4, BAND[0], BAND[1]); rectS(0, 4.4, 2.2, 2.3);                       // Gürtelband, Dachkontur
    g.beginPath(); g.moveTo(X(0), Y(2.3)); g.quadraticCurveTo(X(0.12), Y(1.05), X(1.2), Y(BAND[1])); g.lineTo(X(1.95), Y(BAND[1])); g.quadraticCurveTo(X(0.5), Y(1.25), X(0.3), Y(2.3)); g.closePath(); g.fill(); // Heck-Bogen (Lauf 5: Bogenstreifen statt Fläche)
    g.strokeStyle = RED; g.lineWidth = 0.15 * PX; g.beginPath(); g.moveTo(X(3.8), Y(BAND[1] - 0.06)); g.quadraticCurveTo(X(4.32), Y(0.9), X(4.33), Y(2.25)); g.stroke(); // Front-Bogen zur Dachkante
    g.fillStyle = BLUE; rectS(0, 4.4, STRIPE[0], STRIPE[1]);
    g.fillStyle = WIN;
    if (frontRight) { // linke Seite (Foto Heck): Fenster Mitte, Klappe hinten unten, Band vorne oben
      rectS(2.05, 2.5, 1.2, 1.95); rectS(2.7, 3.15, 1.2, 1.95);
      g.strokeStyle = INK; g.lineWidth = 3; { const a = X(0.55), b = X(1.25); g.strokeRect(Math.min(a, b), Y(1.25), Math.abs(b - a), 1.1 * PX); }
      const a = X(1.7), b = X(3.95); banner(Math.min(a, b), Math.max(a, b), Y(2.17), 0.27 * PX, false, 46);
      g.fillStyle = BLUE; g.font = 'bold 110px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('144', X(1.15), Y(1.45));
    } else {          // rechte Seite (Foto vorne rechts): Band hinten oben, 144 darunter, 2 Fenster, Seitentür vorne
      rectS(2.2, 2.65, 1.2, 1.95); rectS(2.8, 3.25, 1.2, 1.95);
      g.strokeStyle = INK; g.lineWidth = 3; { const a = X(3.45), b = X(4.25); g.strokeRect(Math.min(a, b), Y(2.1), Math.abs(b - a), 2.05 * PX); }
      g.fillStyle = '#9AA0A6'; rectS(3.5, 3.6, 1.0, 1.1);
      const a = X(0.35), b = X(2.1); banner(Math.min(a, b), Math.max(a, b), Y(2.17), 0.27 * PX, true, 46);
      g.fillStyle = BLUE; g.font = 'bold 110px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('144', X(1.05), Y(1.4));
    }
    g.fillStyle = '#15181C'; g.beginPath(); g.arc(X(1.85), Y(-0.27), 0.6 * PX, Math.PI, 0); g.fill(); // Radlauf hinten
    g.restore();
  };
  kofferSeite('sL', true); kofferSeite('sR', false);
  // Kabinen-Seite: Bereich z 1.15..3.5 (2.35 m), y 0.42..2.47; auf das Kabinenprofil zugeschnitten; Band auf gleicher Höhe wie am Koffer
  const kabine = (key: string, frontRight: boolean) => {
    const [ox, oy, w, h] = REG[key]; g.save(); g.translate(ox, oy);
    const X = (z: number) => (frontRight ? z - 1.15 : 3.5 - z) * PX, Y = (y: number) => h - (y - 0.42) * PX;
    const P = [[3.45, 0.42], [3.52, 0.95], [3.44, 1.33], [2.78, 1.6], [2.08, 2.42], [1.95, 2.5], [1.15, 2.5], [1.15, 0.42]];
    g.beginPath(); P.forEach(([z, y], i) => (i ? g.lineTo(X(z), Y(y)) : g.moveTo(X(z), Y(y)))); g.closePath(); g.clip();
    g.fillStyle = RED; g.fillRect(0, Y(KY0 + BAND[1]), w, (BAND[1] - BAND[0]) * PX);
    g.fillStyle = BLUE; g.fillRect(0, Y(KY0 + STRIPE[1]), w, (STRIPE[1] - STRIPE[0]) * PX);
    g.fillStyle = WIN; g.beginPath(); for (const [i, [z, y]] of ([[1.3, 1.62], [2.62, 1.62], [2.04, 2.33], [1.3, 2.33]] as number[][]).entries()) (i ? g.lineTo(X(z), Y(y)) : g.moveTo(X(z), Y(y))); g.fill();
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(Math.min(X(1.45), X(1.6)), Y(2.25), 0.15 * PX, 0.55 * PX);
    starOfLife(X(1.68), Y(0.93), 0.16 * PX);
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(X(2.7), Y(0.55)); g.lineTo(X(2.7), Y(1.6)); g.moveTo(X(1.25), Y(0.55)); g.lineTo(X(1.25), Y(2.4)); g.stroke(); // Türfugen
    g.fillStyle = '#15181C'; g.beginPath(); g.arc(X(2.25), Y(0.45), 0.58 * PX, Math.PI, 0); g.fill(); // Radlauf vorne
    g.restore();
  };
  kabine('cL', true); kabine('cR', false);
  { // Heck: zwei Flügeltüren mit dunklen Fenstern, Schriftband oben, «144» rechte Tür, rote Bögen unten; Gürtelband läuft durch
    const [ox, oy, w, h] = REG.rear; g.save(); g.translate(ox, oy); g.beginPath(); g.rect(0, 0, w, h); g.clip();
    const Yv = (v: number) => h - v * PX;
    g.fillStyle = RED; g.fillRect(0, 0, w, 0.08 * PX); g.fillRect(0, Yv(BAND[1]), w, (BAND[1] - BAND[0]) * PX);
    for (const x0 of [0.05, 1.18]) { g.strokeStyle = RED; g.lineWidth = 0.13 * PX; g.beginPath(); g.moveTo(x0 * PX, Yv(0.12)); g.quadraticCurveTo((x0 + 0.15) * PX, Yv(BAND[0] - 0.02), (x0 + 1.05) * PX, Yv(BAND[0] - 0.05)); g.stroke(); }
    g.fillStyle = BLUE; g.fillRect(0, Yv(STRIPE[1]), w, (STRIPE[1] - STRIPE[0]) * PX);
    banner(0.2 * PX, 2.1 * PX, 0.11 * PX, 0.3 * PX, true, 56); // Lauf 5: grösser für die Spielkamera
    g.fillStyle = WIN; g.fillRect(0.28 * PX, 0.52 * PX, 0.55 * PX, 0.48 * PX); g.fillRect(w - 0.83 * PX, 0.52 * PX, 0.55 * PX, 0.48 * PX);
    g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, 0.1 * PX); g.lineTo(w / 2, h); g.stroke(); g.strokeRect(2, 0.1 * PX, w - 4, h - 0.1 * PX - 2);
    g.fillStyle = '#9AA0A6'; g.fillRect(w / 2 - 22, 1.15 * PX, 10, 26); g.fillRect(w / 2 + 12, 1.15 * PX, 10, 26);
    g.fillStyle = BLUE; g.font = 'bold 104px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('144', w * 0.76, 1.47 * PX);
    g.restore();
  }
  { // Alkoven-Front: rote Kontur an den Koffer-Vorderkanten (Fortsetzung der Dachkontur)
    const [ox, oy, w, h] = REG.front; g.fillStyle = RED; g.fillRect(ox, oy, 0.08 * PX, h); g.fillRect(ox + w - 0.08 * PX, oy, 0.08 * PX, h);
  }
  { // Motorhaube (Schräge): hinten weiss mit blauer Spiegelschrift «Ambulance», vorne rot
    const [ox, oy, w, h] = REG.hood; g.fillStyle = RED; g.fillRect(ox, oy + h * 0.3, w, h * 0.7); // Lauf 5: rot bis knapp unter die Scheibe (KKL-Foto)
    g.save(); g.translate(ox + w, oy); g.scale(-1, 1); g.fillStyle = BLUE; g.font = 'bold 40px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Ambulance', w / 2, h * 0.15); g.restore();
  }
  { // Haubenvorderkante (oberer Teil der Front): rot, unten blaue Kante
    const [ox, oy, w, h] = REG.nose; g.fillStyle = RED; g.fillRect(ox, oy, w, h * 0.75); g.fillStyle = BLUE; g.fillRect(ox, oy + h * 0.75, w, h * 0.2);
  }
  { const [ox, oy, w] = REG.star; starOfLife(ox + w / 2, oy + w / 2, w * 0.46); } // Star of Life (Frontscheibe oben)
  const atlasTex = new THREE.CanvasTexture(A); atlasTex.colorSpace = THREE.SRGBColorSpace; atlasTex.anisotropy = 4;
  const decalM = toon('#ffffff', { map: atlasTex, transparent: true, alphaTest: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const decal = (key: string, w: number, h: number, ry: number, x: number, y: number, z: number, rx = 0) => {
    const [rx0, rY, rw, rh] = REG[key], q = new THREE.PlaneGeometry(w, h), uv = q.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (rx0 + uv.getX(i) * rw) / A.width, 1 - (rY + (1 - uv.getY(i)) * rh) / A.height);
    if (rx) q.rotateX(rx); q.rotateY(ry); q.translate(x, y, z); return q;
  };
  const KH = KY1 - KY0, KL = KZ1 - KZ0;
  const hoodA = Math.atan2(1.6 - 1.33, 3.44 - 2.78), noseA = Math.atan2(3.52 - 3.44, 1.33 - 0.95), wsA = Math.atan2(2.78 - 2.08, 2.42 - 1.6);
  body.add(new THREE.Mesh(mergeGeometries([
    decal('sL', KL, KH, -Math.PI / 2, -KW / 2 - 0.006, KY0 + KH / 2, KZ0 + KL / 2),
    decal('sR', KL, KH, Math.PI / 2, KW / 2 + 0.006, KY0 + KH / 2, KZ0 + KL / 2),
    decal('cL', 2.35, 2.05, -Math.PI / 2, -1.016, 0.42 + 2.05 / 2, 1.15 + 2.35 / 2),
    decal('cR', 2.35, 2.05, Math.PI / 2, 1.016, 0.42 + 2.05 / 2, 1.15 + 2.35 / 2),
    decal('rear', KW, KH, Math.PI, 0, KY0 + KH / 2, KZ0 - 0.006),
    decal('front', KW, 0.35, 0, 0, 2.685, KZ1 + 0.416),
    decal('hood', 2.0, Math.hypot(0.66, 0.27), 0, 0, (1.33 + 1.6) / 2 + 0.008, (3.44 + 2.78) / 2 + 0.003, -Math.PI / 2 + hoodA),
    decal('nose', 2.0, 0.2, 0, 0, 1.235, 3.462 + 0.008, -noseA),
    decal('star', 0.36, 0.36, 0, 0, 2.0 + 0.36 * Math.cos(wsA) + 0.025 * Math.sin(wsA), 2.45 - 0.36 * Math.sin(wsA) + 0.025 * Math.cos(wsA), -wsA),
  ], false)!, decalM));
  // Schwindel-Sternchen (bei Remplern)
  const dizzy = new THREE.Group();
  for (let i = 0; i < 5; i++) dizzy.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: '#FFD447' })));
  dizzy.position.y = 3.8; dizzy.visible = false; root.add(dizzy);
  // Feste Teile nach Material zusammenfassen (Konturen in ein Liniennetz)
  {
    const keep = new Set<THREE.Material>([white, yellow, red, dark, glass, grey, black, chrome, headM, tailM, amberM, barM]);
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
  return { root, body, lights, blueOn, blueOff, dizzy, wheels, steerPivots, mats: { white, yellow, red, rear: decalM as THREE.Material } };
}

export class Vehicle {
  x = 0; z = 0; y = 0; heading = 0; pitch = 0; roll = 0; speed = 0; steerAngle = 0;
  siren = false;
  bumps = 0; // Zähler für Sterne
  wobble = 0; // Sekunden Schwindel-Effekt
  model = buildAmbulance();
  skin = 'standard'; private skinT = 0;
  /** 14zi: Fahrzeug (freigespielt mit Luksi-Herzen): ganzes Modell austauschen */
  setSkin(name: string) {
    if (!['standard', 'feuerwehr', 'glace', 'monster'].includes(name)) name = 'standard'; // alte Lackierungen (Regenbogen, Luksi, Gold) → Standard
    if (name === this.skin) return;
    this.skin = name; const old = this.model, parent = old.root.parent;
    this.model = buildAmbulance(name); this.model.root.rotation.order = 'YXZ';
    this.model.root.position.copy(old.root.position); this.model.root.rotation.copy(old.root.rotation);
    if (parent) { parent.remove(old.root); parent.add(this.model.root); }
    old.root.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); });
  }
  animateSkin(dt: number) { this.skinT += dt; }
  private t = 0;
  constructor(public mask: Mask, public terrain: Terrain) { this.model.root.rotation.order = 'YXZ'; }

  get fx() { return Math.sin(this.heading); }
  get fz() { return Math.cos(this.heading); }

  blocked(x: number, z: number, h: number) {
    const fx = Math.sin(h), fz = Math.cos(h), rx = fz, rz = -fx;
    // 14zg: im Tunnel (unter dem Gelände) zählen nur die Tunnelwände, nicht Häuser/Wasser oben auf dem Hügel
    const T = this.terrain;
    if (T.anyTun && this.y < T.ground(this.x, this.z) - 2) {
      for (const [a, b] of [[3.2, 1.0], [3.2, -1.0], [-3.1, 1.0], [-3.1, -1.0], [0, 1.1], [0, -1.1]]) {
        const px = x + fx * a + rx * b, pz = z + fz * a + rz * b;
        if (isNaN(T.tunnelAt(px, pz)) && T.ground(px, pz) > this.y + 2) return 1;
      }
      return 0;
    }
    for (const [a, b] of [[3.2, 1.0], [3.2, -1.0], [-3.1, 1.0], [-3.1, -1.0], [0, 1.1], [0, -1.1], [1.6, 1.1], [1.6, -1.1], [-1.6, 1.1], [-1.6, -1.1]]) {
      const v = this.mask.at(x + fx * a + rx * b, z + fz * a + rz * b);
      if (v !== 0) return v;
    }
    return 0;
  }

  /** Rückgabe: true, wenn es in diesem Schritt einen Rempler gab */
  update(dt: number, c: Controls, diff: Difficulty, onBump: (hard: boolean) => void) {
    const n = Math.min(12, Math.max(1, Math.ceil(Math.abs(this.speed) * dt / 0.7))); // Teilschritte: nie mehr als 0.7 m pro Schritt (keine Wände durchfahren)
    for (let i = 0; i < n; i++) this.step(dt / n, c, diff, onBump, i === n - 1);
  }

  /** Tempo-Deckel in m/s (Infinity = keiner); von main.ts gesetzt, solange die Nachbargegend voraus noch nicht geladen ist */
  vcap = Infinity;
  private step(dt: number, c: Controls, diff: Difficulty, onBump: (hard: boolean) => void, render: boolean) {
    this.t += dt;
    const vmax = Math.min(this.siren ? VMAX[diff] : VMAX_RUHIG[diff], this.vcap);
    // 15a Baustellen-Bremse: nähert sich die Ambulanz einer Gegend, die noch gebaut wird, rollt sie sanft aus (kein Scheitern, kein Stopp-Schild)
    if (this.speed > this.vcap) this.speed = Math.max(this.vcap, this.speed - 22 * dt);
    // Längsdynamik
    if (c.throttle > 0) {
      if (this.speed < -0.3) this.speed += 20 * dt * c.throttle; // aus Rückwärts bremsen
      else this.speed += ACC[diff] * c.throttle * dt * Math.max(0, 1 - Math.max(0, this.speed) / vmax) + (this.speed > vmax ? -6 * dt : 0);
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
    const Y = this.y; // 14zg: Ebene wählen (Tunnel oder Gelände darüber) nach der bisherigen Höhe
    const hf = T.height(this.x + fx * 2.6, this.z + fz * 2.6, Y), hb = T.height(this.x - fx * 2.6, this.z - fz * 2.6, Y);
    const hl = T.height(this.x + rx * 1.1, this.z + rz * 1.1, Y), hr = T.height(this.x - rx * 1.1, this.z - rz * 1.1, Y);
    const ty = Math.max((hf + hb) / 2, T.height(this.x, this.z, Y));
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
