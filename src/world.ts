import { SIGN_PLACES } from './signPlaces';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Terrain, drape } from './terrain';

export interface CityData {
  meta: { bounds: [number, number, number, number]; credits: string };
  buildings: { p: number[][]; h: number; n: string; t: string; roof: string; holes?: number[][][] }[];
  roads: { p: number[][]; c: string; w: number; n: string; b: number; o?: number; tr?: number; tf?: string[][]; tb?: string[][]; df?: string[]; db?: string[]; L?: number; sw?: number[]; cy?: number[]; bu?: number[]; v?: number; ref?: string }[];
  water: { p: number[][]; holes: number[][][] }[];
  green: { p: number[][]; k: string }[];
  rail: number[][][];
  pois: Record<string, [number, number]>;
  plazas?: { p: number[][]; h: number[][][]; n: string }[];
  rbs?: number[][]; places?: [string, number, number, number][]; // 13j: Kreisel [x, z, r], Ortsnamen [Name, x, z, Rang]
  gapFill?: number[][][]; busIslands?: number[][][]; bhfFill?: { p: number[][]; h: number[][][] }[]; shelters?: { p: number[][]; h: number }[]; wagenbach?: number[][] | null;
}

// ---------- Toon-Material ----------
function toonGradient() {
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
export const GRADIENT = toonGradient();
export function toon(color: THREE.ColorRepresentation, extra: Partial<THREE.MeshToonMaterialParameters> = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: GRADIENT, ...extra });
}

const FACADES = ['#F3E3C3', '#EBC98A', '#E9AE8F', '#C8D3B0', '#CBD8DF', '#F4EFE6', '#F2DA94', '#E7C3A8', '#DCCFE0'];
// Plätze mit bemalten Fassaden (Referenzfotos Weinmarkt, Hirschenplatz, Kornmarkt): x, z, Radius
export const ERKER: number[][] = [];
/** Zwiebelhauben (Jesuitenkirche): x, z, Traufhöhe, Radius, Spitze – ersetzt spitze swissBUILDINGS3D-Turmdächer */
export const ONIONS: number[][] = [];
const MUSEGG: [number, number][] = [[-245, -293], [-160, -335], [-342, -256], [-20, -386], [-522, -199], [-91, -366], [-421, -239], [-619, -168], [92, -368]];
const PAINTED_SQUARES: [number, number, number][] = [[-224, -33, 38], [-265, -51, 34], [-174, -7, 30], [-61, -24, 22], [-413, -69, 30]];
const ROOFS = ['#B5553C', '#A04A36', '#8A5A44', '#C0674A'];
const FLAT_ROOF = '#8E8A86';

function hash(x: number, z: number) {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function signedArea(p: number[][]) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

function centroid(p: number[][]) {
  let x = 0, z = 0;
  for (const q of p) { x += q[0]; z += q[1]; }
  return [x / p.length, z / p.length];
}

/** Fassadentextur: weiss mit Fensterraster (wird mit Vertexfarbe multipliziert) */
function windowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#5d6d7e'; g.fillRect(20, 16, 24, 30);
  g.fillStyle = '#8fb3cf'; g.fillRect(23, 19, 18, 24);
  g.fillStyle = '#5d6d7e'; g.fillRect(31, 19, 2, 24);
  g.fillStyle = '#d9d0c0'; g.fillRect(18, 46, 28, 3);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}


/** Comic-Fassaden: weisse Grundfläche (wird mit Hausfarbe multipliziert), dunkle Konturen */
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function noise(g: CanvasRenderingContext2D, w: number, h: number, n: number, a: number, dark = true) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h;
    g.fillStyle = dark ? `rgba(60,45,35,${a * Math.random()})` : `rgba(255,255,255,${a * Math.random()})`;
    g.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}
function glass(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  gr.addColorStop(0, '#9CC6E4'); gr.addColorStop(0.55, '#5F87A8'); gr.addColorStop(1, '#46698A');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  // Comic-Glanz: zwei schräge Streifen
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = 'rgba(255,255,255,.55)';
  g.beginPath(); g.moveTo(x + w * 0.15, y + h); g.lineTo(x + w * 0.35, y + h); g.lineTo(x + w * 0.85, y); g.lineTo(x + w * 0.65, y); g.fill();
  g.fillStyle = 'rgba(255,255,255,.3)';
  g.beginPath(); g.moveTo(x + w * 0.45, y + h); g.lineTo(x + w * 0.52, y + h); g.lineTo(x + w * 1.02, y); g.lineTo(x + w * 0.95, y); g.fill();
  g.restore();
}
function facadeTextures() {
  const ink = '#3b302b';
  const old = (shutter: string) => canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    noise(g, 128, 128, 500, 0.08);
    // Gurtgesims (Stockwerkband)
    g.fillStyle = '#e4dccd'; g.fillRect(0, 120, 128, 8);
    g.fillStyle = 'rgba(59,48,43,.35)'; g.fillRect(0, 119, 128, 1.5);
    // Fensterläden
    for (const sx of [24, 86]) {
      g.fillStyle = shutter; g.fillRect(sx, 28, 18, 62);
      g.strokeStyle = ink; g.lineWidth = 2.5; g.strokeRect(sx, 28, 18, 62);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5;
      for (let y = 34; y < 88; y += 6) { g.beginPath(); g.moveTo(sx + 3, y); g.lineTo(sx + 15, y); g.stroke(); }
    }
    // Fensterrahmen + Glas
    g.fillStyle = '#FAF7F0'; g.fillRect(42, 24, 44, 70);
    glass(g, 47, 29, 34, 58);
    g.fillStyle = '#FAF7F0'; g.fillRect(62, 29, 4, 58); g.fillRect(47, 52, 34, 3);
    g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(42, 24, 44, 70);
    // Fensterbank
    g.fillStyle = '#d8cbb5'; g.fillRect(38, 94, 52, 6); g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(38, 94, 52, 6);
    // Blumenkiste (nur manchmal sichtbar wirkt zufällig, hier immer, aber dezent)
    g.fillStyle = '#9b5b3a'; g.fillRect(48, 100, 32, 6);
    g.fillStyle = '#E2463F'; for (const fx of [52, 60, 68, 76]) { g.beginPath(); g.arc(fx, 100, 3, 0, 7); g.fill(); }
  });
  const modern = canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    noise(g, 128, 128, 300, 0.05);
    g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, 128, 16);
    glass(g, 0, 26, 128, 70);
    g.fillStyle = '#BFC5CB'; for (const x of [0, 62]) g.fillRect(x, 26, 5, 70);
    g.fillStyle = '#BFC5CB'; g.fillRect(0, 58, 128, 3);
    g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 26); g.lineTo(128, 26); g.moveTo(0, 96); g.lineTo(128, 96); g.stroke();
    g.fillStyle = '#e8e4dc'; g.fillRect(0, 96, 128, 32);
    g.fillStyle = 'rgba(59,48,43,.25)'; g.fillRect(0, 97, 128, 2);
  });
  const stone = canvasTex(128, 256, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 256);
    g.strokeStyle = 'rgba(80,65,50,.18)'; g.lineWidth = 2;
    for (let y = 0; y < 256; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); for (let x = (y / 16) % 2 ? 0 : 20; x < 128; x += 40) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); } }
    // hohes Rundbogenfenster
    g.fillStyle = '#FAF7F0'; g.beginPath(); g.moveTo(40, 220); g.lineTo(40, 90); g.arc(64, 90, 24, Math.PI, 0); g.lineTo(88, 220); g.closePath(); g.fill();
    g.save(); g.beginPath(); g.moveTo(46, 214); g.lineTo(46, 92); g.arc(64, 92, 18, Math.PI, 0); g.lineTo(82, 214); g.closePath(); g.clip(); glass(g, 46, 70, 36, 150); g.restore();
    g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 220); g.lineTo(40, 90); g.arc(64, 90, 24, Math.PI, 0); g.lineTo(88, 220); g.closePath(); g.stroke();
  });
  const tiles = canvasTex(64, 64, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) {
      g.fillStyle = 'rgba(70,30,20,.28)'; g.fillRect(0, y + 6, 64, 2);
      for (let x = (y / 8) % 2 ? 0 : 8; x < 64; x += 16) { g.fillStyle = 'rgba(70,30,20,.22)'; g.fillRect(x, y, 1.5, 7); }
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, y, 64, 1.5);
    }
    noise(g, 64, 64, 120, 0.12);
  });
  const gravel = canvasTex(64, 64, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); noise(g, 64, 64, 400, 0.18); });
  // Altstadt: glatter Putz, hohes Fenster mit Steineinfassung, ohne Läden
  const altFenster = (g: CanvasRenderingContext2D) => {
    g.fillStyle = '#E9E1D2'; g.fillRect(40, 18, 48, 84); // Steingewände
    g.strokeStyle = ink; g.lineWidth = 2.5; g.strokeRect(40, 18, 48, 84);
    glass(g, 47, 25, 34, 66);
    g.fillStyle = '#F4F1EA'; g.fillRect(62, 25, 4, 66); g.fillRect(47, 48, 34, 3); g.fillRect(47, 70, 34, 3);
    g.fillStyle = '#D9CFBD'; g.fillRect(36, 102, 56, 6); g.strokeRect(36, 102, 56, 6); // Fensterbank
    g.fillStyle = '#D9CFBD'; g.fillRect(36, 12, 56, 6); g.strokeRect(36, 12, 56, 6); // Verdachung
  };
  const altstadt = canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, 600, 0.07);
    // R7: Fensterläden wie in der Altstadt (Referenz Kramgasse/Weinmarkt)
    for (const sx of [27, 89]) {
      g.fillStyle = '#4F7A4E'; g.fillRect(sx, 22, 12, 78); g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(sx, 22, 12, 78);
      g.strokeStyle = 'rgba(30,50,30,.55)'; g.lineWidth = 1.2; for (let y = 28; y < 98; y += 6) { g.beginPath(); g.moveTo(sx + 2, y); g.lineTo(sx + 10, y); g.stroke(); }
    }
    altFenster(g);
    g.fillStyle = 'rgba(59,48,43,.18)'; g.fillRect(0, 124, 128, 4);
  });
  // Bemalte Altstadtfassade (Comic-Fresko: Ornamentband, Rankenbogen über dem Fenster)
  const painted = canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, 500, 0.06);
    // Ornamentband
    g.fillStyle = '#B7553C'; g.fillRect(0, 112, 128, 12);
    g.fillStyle = '#E8C46A'; for (let x = 4; x < 128; x += 16) { g.beginPath(); g.moveTo(x, 118); g.lineTo(x + 6, 113); g.lineTo(x + 12, 118); g.lineTo(x + 6, 123); g.closePath(); g.fill(); }
    // Ranken beidseits
    g.strokeStyle = '#4E7D52'; g.lineWidth = 3;
    for (const sx of [14, 114]) { g.beginPath(); g.moveTo(sx, 100); g.bezierCurveTo(sx - 10, 70, sx + 10, 50, sx, 20); g.stroke(); g.fillStyle = '#C0473A'; g.beginPath(); g.arc(sx, 18, 4, 0, 7); g.fill(); }
    altFenster(g);
    // Bogen-Fresko
    g.strokeStyle = '#3F6EA0'; g.lineWidth = 4; g.beginPath(); g.arc(64, 14, 28, Math.PI, 0); g.stroke();
  });
  // Neustadt (Gründerzeit): Sandsteingewände, Gesims, Balkonbrüstung
  const gruenderzeit = canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, 500, 0.08);
    g.fillStyle = '#E3D9C6'; g.fillRect(0, 0, 128, 10); g.fillStyle = 'rgba(59,48,43,.3)'; g.fillRect(0, 10, 128, 2); // Gesims
    g.fillStyle = '#D6C7A8'; g.fillRect(36, 20, 56, 86); g.strokeStyle = ink; g.lineWidth = 2.5; g.strokeRect(36, 20, 56, 86);
    glass(g, 43, 27, 42, 72);
    g.fillStyle = '#F4F1EA'; g.fillRect(62, 27, 4, 72); g.fillRect(43, 50, 42, 3);
    // Balkonbrüstung (Schmiedeeisen)
    g.strokeStyle = '#3b302b'; g.lineWidth = 2; g.strokeRect(30, 92, 68, 14);
    for (let x = 34; x < 98; x += 6) { g.beginPath(); g.moveTo(x, 92); g.lineTo(x, 106); g.stroke(); }
    g.fillStyle = '#CDBF9F'; g.fillRect(26, 106, 76, 5);
  });
  // Hotel am Quai: weiss, breite Fenster, durchgehende Balkone
  const hotel = canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, 300, 0.05);
    g.fillStyle = '#EDE6D8'; g.fillRect(28, 16, 72, 84); g.strokeStyle = ink; g.lineWidth = 2.5; g.strokeRect(28, 16, 72, 84);
    glass(g, 34, 22, 60, 72); g.fillStyle = '#F7F4EE'; g.fillRect(62, 22, 4, 72);
    g.fillStyle = '#D8D0C0'; g.fillRect(0, 100, 128, 6); g.strokeStyle = '#3b302b'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 88); g.lineTo(128, 88); g.stroke(); for (let x = 2; x < 128; x += 8) { g.beginPath(); g.moveTo(x, 88); g.lineTo(x, 100); g.stroke(); }
  });
  // Sockel mit Quaderung (Erdgeschoss Neustadt) – als eigene Textur nicht nötig: Farbstreifen im Vertex-Shading
  // R7: Ladengeschoss (Erdgeschoss) – Schaufenster wie in Altstadt/Neustadt
  const shop = (arch: boolean, band: string) => canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, 400, 0.08);
    g.fillStyle = band; g.fillRect(0, 4, 128, 14); g.fillStyle = 'rgba(255,255,255,.75)'; for (let x = 10; x < 118; x += 9) g.fillRect(x, 9, 5, 4);
    g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(-2, 4, 132, 14);
    g.fillStyle = '#4A3F38';
    if (arch) { g.beginPath(); g.moveTo(14, 128); g.lineTo(14, 52); g.arc(64, 52, 50, Math.PI, 0); g.lineTo(114, 128); g.closePath(); g.fill();
      g.save(); g.beginPath(); g.moveTo(20, 124); g.lineTo(20, 54); g.arc(64, 54, 44, Math.PI, 0); g.lineTo(108, 124); g.closePath(); g.clip(); glass(g, 20, 10, 88, 114); g.restore(); }
    else { g.fillRect(10, 26, 108, 102); glass(g, 16, 32, 96, 92); g.fillStyle = '#4A3F38'; g.fillRect(62, 32, 4, 92); }
    g.fillStyle = '#E9E1D2'; g.fillRect(0, 122, 128, 6);
  });
  const shopAlt = shop(true, '#7A4A2E'), shopNeu = shop(false, '#2F5E7A');
  // Wohnblock (1950–2000): Verputz, zwei Einzelfenster mit Rahmen je Achse, Balkonplatte mit Geländer
  const block = canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    noise(g, 128, 128, 260, 0.05);
    for (const x of [14, 74]) { g.fillStyle = '#7C8C99'; g.fillRect(x - 3, 30, 46, 64); glass(g, x, 33, 40, 58); g.fillStyle = '#E9E5DC'; g.fillRect(x + 18, 33, 4, 58); g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(x - 3, 30, 46, 64); }
    g.fillStyle = '#C9C3B8'; g.fillRect(0, 100, 128, 7);                       // Balkonplatte
    g.fillStyle = 'rgba(59,48,43,.35)'; g.fillRect(0, 107, 128, 3);
    g.strokeStyle = '#8A8F94'; g.lineWidth = 2; for (let x = 4; x < 128; x += 9) { g.beginPath(); g.moveTo(x, 82); g.lineTo(x, 100); g.stroke(); }
    g.fillStyle = '#8A8F94'; g.fillRect(0, 80, 128, 3);                        // Handlauf
  });
  // LUKS Kinderspital/Frauenklinik (Haus 36, eröffnet Herbst 2026): weisses Betonskelett im 1.25-m-Raster, Fensterfaschen in Rot, Orange, Gelb
  // (Projektbeschrieb «Les Terrasses», Bollhalder Eberle + Burkard Meyer). Kachel = 2.5 m breit × 1 Geschoss
  const luks = canvasTex(128, 128, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, 300, 0.05);
    const cols = ['#D9412B', '#F08A1C', '#F5C02A', '#E35E22'];
    for (let k = 0; k < 2; k++) { const x = 8 + k * 64; g.fillStyle = cols[k * 2 % 4]; g.fillRect(x, 18, 48, 84); g.fillStyle = cols[(k * 2 + 1) % 4]; g.fillRect(x + 4, 22, 6, 76);
      glass(g, x + 12, 24, 32, 74); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x + 27, 24, 2, 74); }
    g.fillStyle = '#F4F2EC'; g.fillRect(0, 108, 128, 20); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 108, 128, 2); });
  // Haus 31 Spitalzentrum (1970er-Hochhaus, 67 m): Sichtbeton, durchgehende Fensterbänder
  const luksTurm = canvasTex(128, 128, (g) => { g.fillStyle = '#E3E1DC'; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, 900, 0.1);
    g.fillStyle = '#2E3A44'; g.fillRect(0, 40, 128, 50); for (let x = 0; x < 128; x += 32) { g.fillStyle = '#C9C6BF'; g.fillRect(x, 40, 4, 50); }
    glass(g, 4, 44, 124, 42); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, 44, 128, 6); });
  // Scheune (Gebiet A): senkrechte Holzschalung, Lüftungsschlitze, grosses Tor unten (Kachel 4 m × 1 Geschoss)
  const barn = canvasTex(128, 128, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, 700, 0.12);
    for (let x = 0; x < 128; x += 8) { g.fillStyle = 'rgba(40,25,15,.28)'; g.fillRect(x, 0, 1.5, 128); g.fillStyle = 'rgba(255,240,220,.12)'; g.fillRect(x + 2, 0, 1, 128); }
    g.fillStyle = 'rgba(30,20,12,.55)'; for (const x of [22, 58, 94]) g.fillRect(x, 30, 10, 3), g.fillRect(x, 40, 10, 3);
    g.fillStyle = 'rgba(40,25,15,.35)'; g.fillRect(0, 124, 128, 4); });
  // Halle (Gewerbe/Landwirtschaft gross): Trapezblech hell, Fensterband oben, Sockel
  const hall = canvasTex(128, 128, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 6) { g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(x, 0, 2, 128); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 3, 0, 1, 128); }
    g.fillStyle = '#6F7880'; g.fillRect(0, 14, 128, 22); glass(g, 2, 17, 124, 16); for (let x = 0; x < 128; x += 32) { g.fillStyle = '#B8BEC2'; g.fillRect(x, 14, 3, 22); }
    g.fillStyle = 'rgba(80,80,80,.45)'; g.fillRect(0, 112, 128, 16); });
  return { block, shopAlt, shopNeu, oldGreen: old('#5E8C5A'), oldRed: old('#A9483B'), modern, stone, tiles, gravel, altstadt, painted, gruenderzeit, hotel, luks, luksTurm, barn, hall };
}

/** Walmdach über dem kleinsten umschliessenden Rechteck (nur bei rechteckähnlichen Grundrissen) */
function hipRoof(buf: { pos: number[]; nor: number[]; col: number[]; uv: number[] }, lpos: number[], p: number[][], h: number, color: THREE.Color, pitch = 0.9, maxArea = 1400) {
  const area = Math.abs(signedArea(p));
  if (area < 25 || area > maxArea) return;
  let best: { a: number; minA: number; maxA: number; minB: number; maxB: number; area: number } | null = null;
  for (let i = 0; i < p.length; i++) {
    const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length];
    const ang = Math.atan2(z2 - z1, x2 - x1);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
    for (const [x, z] of p) { const a = x * ca + z * sa, b = -x * sa + z * ca; minA = Math.min(minA, a); maxA = Math.max(maxA, a); minB = Math.min(minB, b); maxB = Math.max(maxB, b); }
    const ar = (maxA - minA) * (maxB - minB);
    if (!best || ar < best.area) best = { a: ang, minA, maxA, minB, maxB, area: ar };
  }
  if (!best || area / best.area < 0.72) return;
  let { a, minA, maxA, minB, maxB } = best;
  // Firstrichtung entlang der längeren Seite
  if (maxB - minB > maxA - minA) { a += Math.PI / 2; const t = [minA, maxA]; [minA, maxA] = [minB, maxB]; [minB, maxB] = [-t[1], -t[0]]; }
  const ca = Math.cos(a), sa = Math.sin(a);
  const toW = (A: number, Bv: number) => [A * ca - Bv * sa, A * sa + Bv * ca];
  const o = 0.6;
  const hl = (maxA - minA) / 2 + o, hw = (maxB - minB) / 2 + o;
  const cA = (minA + maxA) / 2, cB = (minB + maxB) / 2;
  const rh = Math.min(9, hw * pitch);
  const ridge = Math.max(0, hl - hw * 0.7);
  const P = (A: number, Bv: number, y: number) => { const [x, z] = toW(cA + A, cB + Bv); return [x, h + y - 0.05, z]; };
  const c1 = P(-hl, -hw, 0), c2 = P(hl, -hw, 0), c3 = P(hl, hw, 0), c4 = P(-hl, hw, 0);
  const r1 = P(-ridge, 0, rh), r2 = P(ridge, 0, rh);
  const faces = [[c1, c2, r2, r1], [c3, c4, r1, r2], [c2, c3, r2], [c4, c1, r1]];
  const shadeBy = [1, 0.88, 0.94, 0.94];
  faces.forEach((f, fi) => {
    const tris = f.length === 4 ? [[f[0], f[1], f[2]], [f[0], f[2], f[3]]] : [f];
    for (let [A, Bp, C] of tris) {
      let ux = Bp[0] - A[0], uy = Bp[1] - A[1], uz = Bp[2] - A[2];
      let vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (ny < 0) { [Bp, C] = [C, Bp]; nx = -nx; ny = -ny; nz = -nz; }
      const l = Math.hypot(nx, ny, nz) || 1;
      for (const v of [A, Bp, C]) {
        buf.pos.push(v[0], v[1], v[2]);
        buf.nor.push(nx / l, ny / l, nz / l);
        const s = shadeBy[fi];
        buf.col.push(color.r * s, color.g * s, color.b * s);
        // UV: entlang Traufe und Dachneigung
        buf.uv.push((v[0] * ca + v[2] * sa) / 2.2 + (v[0] * -sa + v[2] * ca) / 2.2 * 0.0, (v[1] - h) / 1.4 + ((v[0] * -sa + v[2] * ca) / 2.2) * (fi >= 2 ? 1 : 0));
      }
    }
  });
  // Konturen: First + Grate + Traufe
  for (const [A, Bv] of [[c1, c2], [c2, c3], [c3, c4], [c4, c1], [r1, r2], [c1, r1], [c4, r1], [c2, r2], [c3, r2]]) lpos.push(...A, ...Bv);
}

// Flache Fläche aus Polygon (+Löcher) triangulieren, Normale nach oben
function addFlat(pos: number[], col: number[], p: number[][], holes: number[][][], y: number, color: THREE.Color, uv?: number[]) {
  const contour = p.map(([x, z]) => new THREE.Vector2(x, z));
  const hs = (holes || []).map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
  let faces: number[][];
  try { faces = THREE.ShapeUtils.triangulateShape(contour, hs); } catch { return; }
  const all = [...contour, ...hs.flat()];
  for (const [a, b, c] of faces) {
    const A = all[a], B = all[b], C = all[c];
    // Normale y-Komponente: (C-A) x (B-A) ...
    const ny = (C.x - A.x) * (B.y - A.y) - (B.x - A.x) * (C.y - A.y);
    const tri = ny >= 0 ? [A, B, C] : [A, C, B];
    for (const v of tri) {
      pos.push(v.x, y, v.y);
      col.push(color.r, color.g, color.b);
      if (uv) uv.push(0.05, 0.05);
    }
  }
}

/** Schummerung für die Karten: Hänge von Nordwesten beleuchtet */
function hillshade(c: HTMLCanvasElement, t: Terrain, X0: number, Z0: number) {
  const g = c.getContext('2d')!;
  const img = g.getImageData(0, 0, c.width, c.height);
  const L = [-0.5, 0.75, -0.45]; const ll = Math.hypot(...L);
  // Schattierung in 3×3-Blöcken rechnen (9× weniger Höhenabfragen; auf dem PC dauerte das Kartenzeichnen sonst ~10 s)
  const B = 3;
  for (let jb = 0; jb < c.height; jb += B) for (let ib = 0; ib < c.width; ib += B) {
    const x = X0 + (ib + 1) * MINI_RES, z = Z0 + (jb + 1) * MINI_RES;
    const dx = t.ground(x + 3, z) - t.ground(x - 3, z), dz = t.ground(x, z + 3) - t.ground(x, z - 3);
    const nx = -dx / 6, nz = -dz / 6, ny = 1; const nl = Math.hypot(nx, ny, nz);
    const sh = (nx * L[0] + ny * L[1] + nz * L[2]) / (nl * ll);
    const f = Math.max(0.6, Math.min(1.15, 0.45 + sh * 0.75));
    for (let j = jb; j < Math.min(c.height, jb + B); j++) for (let i = ib; i < Math.min(c.width, ib + B); i++) {
      const k = (j * c.width + i) * 4;
      img.data[k] = Math.min(255, img.data[k] * f); img.data[k + 1] = Math.min(255, img.data[k + 1] * f); img.data[k + 2] = Math.min(255, img.data[k + 2] * f);
    }
  }
  g.putImageData(img, 0, 0);
}

/** Geländegitter (Weltkoordinaten-UV). Jeder Punkt nimmt das Minimum der Umgebung,
 *  damit der Boden nie über Strassen/Wasser ragt. hole: Bereich auslassen (für das Umland). */
function gridMesh(t: Terrain, x0: number, z0: number, x1: number, z1: number, step: number, yOff: number, uvScale: number, hole?: number[]) {
  const nx = Math.ceil((x1 - x0) / step) + 1, nz = Math.ceil((z1 - z0) / step) + 1;
  const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
  const r = step / 2;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = Math.min(x1, x0 + i * step), z = Math.min(z1, z0 + j * step), k = j * nx + i;
    let h = t.ground(x, z);
    for (const [a, b] of [[-r, 0], [r, 0], [0, -r], [0, r], [-r, -r], [r, r], [-r, r], [r, -r]]) h = Math.min(h, t.ground(x + a, z + b));
    pos[k * 3] = x; pos[k * 3 + 1] = h + yOff; pos[k * 3 + 2] = z;
    uv[k * 2] = x / uvScale; uv[k * 2 + 1] = z / uvScale;
  }
  const idx: number[] = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    if (hole) {
      const cx0 = x0 + i * step, cz0 = z0 + j * step;
      if (cx0 >= hole[0] && cx0 + step <= hole[2] && cz0 >= hole[1] && cz0 + step <= hole[3]) continue;
    }
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  (g as any).sampler = (x: number, z: number) => {
    // exakt wie die Dreiecke (a,c,b) / (b,c,d) interpolieren
    const fx = (x - x0) / step, fz = (z - z0) / step;
    const i = Math.max(0, Math.min(nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(nz - 2, Math.floor(fz)));
    const tx = fx - i, tz = fz - j;
    const ya = pos[(j * nx + i) * 3 + 1], yb = pos[(j * nx + i + 1) * 3 + 1], yc = pos[((j + 1) * nx + i) * 3 + 1], yd = pos[((j + 1) * nx + i + 1) * 3 + 1];
    if (tx + tz <= 1) return ya + (yb - ya) * tx + (yc - ya) * tz;
    return yd + (yc - yd) * (1 - tx) + (yb - yd) * (1 - tz);
  };
  return g;
}

/** UV aus Weltkoordinaten (für Böden, Strassen, Wasser) */
function worldUV(g: THREE.BufferGeometry, scale: number) {
  const p = g.getAttribute('position');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / scale; uv[i * 2 + 1] = p.getZ(i) / scale; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function flatMesh(pos: number[], col: number[], mat: THREE.Material) {
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -4;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

// ---------- Kollisions- und Kartenraster ----------
export const STYLE_COUNT: Record<string, number> = {};
export let MASK_RES = 1.25; // Meter pro Zelle (Touch-Geräte bei grossem Feld 1.5 m: Canvas-Grenze 16.7 Mpx auf Handys)
export class Mask {
  w: number; h: number; x0: number; z0: number; data: Uint8Array; road: Uint8Array;
  constructor(public bounds: number[]) {
    this.x0 = bounds[0]; this.z0 = bounds[1];
    const area = (bounds[2] - bounds[0]) * (bounds[3] - bounds[1]);
    MASK_RES = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && area / (1.25 * 1.25) > 16e6) ? Math.ceil(Math.sqrt(area / 16e6) * 20) / 20 : 1.25;
    this.w = Math.ceil((bounds[2] - bounds[0]) / MASK_RES);
    this.h = Math.ceil((bounds[3] - bounds[1]) / MASK_RES);
    this.data = new Uint8Array(this.w * this.h);
    this.road = new Uint8Array(this.w * this.h);
  }
  isRoad(x: number, z: number) {
    const i = Math.floor((x - this.x0) / MASK_RES), j = Math.floor((z - this.z0) / MASK_RES);
    if (i < 0 || j < 0 || i >= this.w || j >= this.h) return false;
    return this.road[j * this.w + i] === 1;
  }
  /** 0 frei, 1 Wasser, 2 Gebäude/Hindernis, 3 ausserhalb */
  at(x: number, z: number) {
    const i = Math.floor((x - this.x0) / MASK_RES), j = Math.floor((z - this.z0) / MASK_RES);
    if (i < 1 || j < 1 || i >= this.w - 1 || j >= this.h - 1) return 3;
    return this.data[j * this.w + i];
  }
}

export interface World {
  group: THREE.Group;
  mask: Mask;
  minimap: HTMLCanvasElement; // 1 px = MINI_RES m
  bounds: number[];
  pois: Record<string, [number, number]>;
  hospital: { x: number; z: number; name: string };
  landmarks: { name: string; x: number; z: number }[];
  water: THREE.Mesh[];
  roadsByName: Map<string, number[][][]>;
  groundAt: (x: number, z: number) => number;
}
export const MINI_RES = 2;

const ROAD_COL: Record<string, string> = {
  motorway: '#5c6064', trunk: '#5c6064', primary: '#606367', secondary: '#64676b', tertiary: '#6a6d71', // Kantonsstrassen: dunkler Belag (Luftbild/Fotos)
  primary_link: '#606367', secondary_link: '#64676b', tertiary_link: '#6a6d71',
  unclassified: '#6d7074', residential: '#6f7276', living_street: '#bdb5a8', service: '#7a7d80', // gleicher Belag wie Hauptstrassen (Knoten ohne Farbsprung)
  pedestrian: '#bcb8b0', footway: '#a9a7a1', path: '#d9c79f', cycleway: '#86888b', // Fuss- und Velowege in Luzern meist Asphalt (Fotos) steps: '#cdbfa6', track: '#c9b48c',
};
const ROAD_LAYER: Record<string, number> = { footway: 0.3, path: 0.3, steps: 0.3, cycleway: 0.31, track: 0.3, pedestrian: 0.32, service: 0.33, living_street: 0.33 };

export interface B3D { meta: { buildings: number[][] }; pos: ArrayLike<number>; idx: Uint16Array; edges?: Uint16Array; roof?: string[] }

export interface Props { hedges?: number[][][]; piers: { p: number[][]; w: number; f: number; a: number; s: string }[]; lamps: number[][]; trees: number[][]; signals: number[][]; stops: any[][]; fountains: number[][]; beaches?: number[][][]; benches?: number[][]; crossings?: number[][]; isl?: number[][] }

export interface GroundMesh { pos: ArrayLike<number>; idx: Uint32Array }

export async function buildWorld(d: CityData, terrain: Terrain, onProgress0: (s: string) => void, b3d?: B3D, groundMesh?: GroundMesh, props?: Props, opts: { trees?: number; freeCPU?: boolean; forestStep?: number; aerial?: THREE.Texture; aerialHr?: THREE.Texture; coarse?: boolean; forestMask?: ForestMask } = {}): Promise<World> {
  RURAL_HOUSES = !b3d && d.buildings.some((b) => b.t === 'barn');
  let tLast = performance.now();
  const onProgress = (s: string) => { const t = performance.now(); console.log(`[bau] ${(t - tLast).toFixed(0)} ms bis: ${s}`); tLast = t; onProgress0(s); return new Promise<void>((r) => setTimeout(r, 0)); };
  const group = new THREE.Group();
  const [X0, Z0, X1, Z1] = d.meta.bounds;
  const W = X1 - X0, H = Z1 - Z0;

  await onProgress('Karte wird gezeichnet …');
  let tq = performance.now(); const lap = (n: string) => { const t = performance.now(); console.log(`[bau]   ${n} ${(t - tq).toFixed(0)} ms`); tq = t; };
  const { mask, minimap } = rasterize(d, b3d); lap('Maske');
  {
    // keine Bäume vor dem Löwen: Felsbereich in der Maske sperren
    for (let dz = -16; dz <= 16; dz += 1) for (let dx = -16; dx <= 16; dx += 1) {
      if (dx * dx + dz * dz > 256) continue;
      const i = Math.floor((240.5 + dx - mask.x0) / MASK_RES), j = Math.floor((-758 + dz - mask.z0) / MASK_RES);
      if (i > 0 && j > 0 && i < mask.w && j < mask.h && mask.data[j * mask.w + i] === 0 && !mask.road[j * mask.w + i]) mask.data[j * mask.w + i] = 2;
    }
  }
  hillshade(minimap, terrain, X0, Z0); lap('Schummerung');
  // ---- Boden ----
  const groundTex = canvasTex(128, 128, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, 900, 0.1); noise(g, 128, 128, 300, 0.25, false); });
  groundTex.repeat.set(1, 1);
  let groundGeo: THREE.BufferGeometry;
  if (groundMesh) {
    // vorberechnetes, vereinfachtes 2-m-Netz (max. 0.3 m Abweichung) → 0.28 m tiefer legen
    const n = groundMesh.pos.length / 3;
    const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const x = groundMesh.pos[i * 3] / 10, y = groundMesh.pos[i * 3 + 1] / 10 - 0.28, z = groundMesh.pos[i * 3 + 2] / 10;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; uv[i * 2] = x / 12; uv[i * 2 + 1] = z / 12;
    }
    groundGeo = new THREE.BufferGeometry();
    groundGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    groundGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    groundGeo.setIndex(new THREE.BufferAttribute(groundMesh.idx, 1));
    groundGeo.computeVertexNormals();
    // konservative Obergrenze der Netzhöhe (Gelände − 0.28 + 0.30 Fehler)
    (groundGeo as any).sampler = (x: number, z: number) => terrain.ground(x, z) + 0.02;
  } else groundGeo = gridMesh(terrain, X0, Z0, X1, Z1, opts.coarse ? 8 : 5, -0.12, 12);
  lap('Bodennetz');
  // Luftbild (SWISSIMAGE 2 m, leicht stilisiert) als Bodenfarbe: Wiesen, Wald, Plätze wie in echt
  if (opts.aerial) setAerialUV(groundGeo);
  lap('Luftbild-UV');
  const groundMat = opts.aerial ? withDetail(toon('#ffffff', { map: opts.aerial }), groundTex, opts.aerialHr) : toon('#BDB9B0', { map: groundTex });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.name = 'ground';
  if (groundMesh) {
    // in 400-m-Kacheln aufteilen (gleiche Vertices, eigener Index + Hüllkugel) → nur Sichtbares wird gezeichnet
    const idx = groundMesh.idx, P = (groundGeo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    // zwei Durchgänge mit Typed Arrays statt Millionen von push/Vector3 (vorher ~9 s Software)
    const tileKey = new Int32Array(idx.length / 3), counts = new Map<number, number>();
    const TX = 64;
    for (let t = 0, n = 0; t < idx.length; t += 3, n++) {
      const a = idx[t] * 3, k = (Math.floor(P[a] / 400) + 32) * TX + (Math.floor(P[a + 2] / 400) + 32);
      tileKey[n] = k; counts.set(k, (counts.get(k) || 0) + 3);
    }
    const arrs = new Map<number, { ix: Uint32Array; n: number; mn: number[]; mx: number[] }>();
    for (const [k, c] of counts) arrs.set(k, { ix: new Uint32Array(c), n: 0, mn: [1e9, 1e9, 1e9], mx: [-1e9, -1e9, -1e9] });
    for (let t = 0, n = 0; t < idx.length; t += 3, n++) {
      const A = arrs.get(tileKey[n])!;
      for (let q = 0; q < 3; q++) { const i = idx[t + q]; A.ix[A.n++] = i; for (let d = 0; d < 3; d++) { const v = P[i * 3 + d]; if (v < A.mn[d]) A.mn[d] = v; if (v > A.mx[d]) A.mx[d] = v; } }
    }
    lap('Bodenkacheln');
    const sampler = (groundGeo as any).sampler;
    for (const [kk, A] of arrs) {
      const key = `${Math.floor(kk / TX) - 32},${(kk % TX) - 32}`;
      const g = new THREE.BufferGeometry();
      for (const n of ['position', 'uv', 'normal']) g.setAttribute(n, groundGeo.getAttribute(n));
      g.setIndex(new THREE.BufferAttribute(A.ix, 1));
      const box = new THREE.Box3(new THREE.Vector3(...A.mn), new THREE.Vector3(...A.mx));
      g.boundingBox = box; g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      (g as any).sampler = sampler;
      const m = new THREE.Mesh(g, groundMat); m.name = 'ground';
      // Detailstufe: ab 650 m ein 10-m-Raster (Kachel 400 m → 3200 statt bis zu 60'000 Dreiecke)
      const [tx, tz] = key.split(',').map((v) => +v * 400);
      const cg = gridMesh(terrain, Math.max(X0, tx), Math.max(Z0, tz), Math.min(X1, tx + 400), Math.min(Z1, tz + 400), 10, -0.45, 12); if (opts.aerial) setAerialUV(cg);
      const coarse = new THREE.Mesh(cg, groundMat); coarse.name = 'ground-far';
      // LOD misst den Abstand zur Objektposition: LOD in die Kachelmitte setzen, Kinder zurückschieben (Geometrie bleibt in Weltkoordinaten).
      // Vorher stand jede LOD im Ursprung → ab 650 m von der Kapellbrücke lag überall das grobe, nach unten gezogene Gitter (Bäume/Strassen «schwebten»).
      const cxm = tx + 200, czm = tz + 200;
      const lod = new THREE.LOD(); lod.position.set(cxm, 0, czm); m.position.set(-cxm, 0, -czm); coarse.position.set(-cxm, 0, -czm);
      lod.addLevel(m, 0); lod.addLevel(coarse, 650 + 283); lod.name = 'ground-lod'; group.add(lod);
    }
    lap('Boden-LOD');
  } else group.add(ground);
  // Umland: grobes Gitter mit Randhöhen, damit am Spielfeldrand keine Klippe entsteht
  const apronTex = groundTex.clone(); apronTex.needsUpdate = true;
  const apronG = gridMesh(terrain, X0 - 2520, Z0 - 2500, X1 + 2480, Z1 + 2500, 60, -0.6, 12, [X0 + 1, Z0 + 1, X1 - 1, Z1 - 1]);
  if (RURAL_HOUSES) { // Gebiet A: Umland als Flickenteppich aus Wiesen, Äckern und Waldstücken (statt einfarbig, wirkte aus der Luft wie Wüste)
    const P = apronG.getAttribute('position'), col = new Float32Array(P.count * 3), c = new THREE.Color();
    const meadow = new THREE.Color('#86AE5C'), meadow2 = new THREE.Color('#9CBB66'), field = new THREE.Color('#BDB878'), forest = new THREE.Color('#4E7040');
    const vn = (x: number, z: number, s: number) => { const i = Math.floor(x / s), j = Math.floor(z / s), fx = x / s - i, fz = z / s - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
      const a = hash(i, j), b = hash(i + 1, j), cc = hash(i, j + 1), dd = hash(i + 1, j + 1); return a + (b - a) * u + (cc - a) * v + (a - b - cc + dd) * u * v; };
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i);
      const f = vn(x, z, 700) * 0.6 + vn(x + 333, z - 777, 260) * 0.4, pf = hash(Math.floor(x / 180), Math.floor(z / 140));
      if (f > 0.62) c.copy(forest); else c.copy(pf < 0.25 ? field : pf < 0.6 ? meadow : meadow2);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    apronG.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const apron = new THREE.Mesh(apronG, RURAL_HOUSES ? toon('#ffffff', { map: apronTex, vertexColors: true }) : toon('#B9C995', { map: apronTex }));
  group.add(apron);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), toon('#A9C285', { fog: true }));
  // tief: sonst deckt sie das Reussbett unterhalb des Nadelwehrs (Wasser < Seespiegel); Region Nord: Rotsee/Reuss bis 17 m unter Seespiegel
  let lowest = -9; { const [bx0, bz0, bx1, bz1] = d.meta.bounds; for (let x = bx0; x < bx1; x += 50) for (let z = bz0; z < bz1; z += 50) lowest = Math.min(lowest, terrain.ground(x, z)); }
  outer.rotation.x = -Math.PI / 2; outer.position.y = Math.min(-12, lowest - 3);
  group.add(outer);

  // ---- Wasser ----
  const waterMeshes: THREE.Mesh[] = [];
  const waterTex = canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.lineCap = 'round';
    const fill = g.createLinearGradient(0, 0, 128, 128); fill.addColorStop(0, '#f2fbff'); fill.addColorStop(1, '#dff1fb');
    g.fillStyle = fill; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,1)';
    for (const [x, y] of [[10, 20], [70, 45], [30, 80], [90, 105], [100, 12]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 6, x + 16, y); g.quadraticCurveTo(x + 24, y + 6, x + 32, y); g.stroke(); }
    g.fillStyle = 'rgba(30,90,140,.18)'; for (let i = 0; i < 60; i++) g.fillRect(Math.random() * 128, Math.random() * 128, 6, 1.5);
  });
  {
    const pos: number[] = [], col: number[] = [];
    const c = new THREE.Color('#2F86A0'); // Referenz SWISSIMAGE + Fotos Kapellbrücke/Seebrücke: tiefes Blaugrün, hell nur durch Himmelsspiegelung
    // Seeflächen auf Seehöhe brauchen kein feines Netz (spart viel Speicher), Flüsse/Bäche werden aufs Gelände gelegt
    const fpos: number[] = [], fcol: number[] = [];
    for (const w of d.water) { const flat = (w as any).f === 1 || w.p.every(([x, z]) => Math.abs(terrain.ground(x, z)) < 0.6); addFlat(flat ? fpos : pos, flat ? fcol : col, w.p, w.holes, 0.06, c); }
    const dw = drape(pos, col, terrain, opts.coarse ? 12 : 6);
    const wmat = withWater(toon('#ffffff', { vertexColors: true, map: waterTex }));
    const m = flatMesh(dw.pos, dw.col!, wmat);
    worldUV(m.geometry, 14);
    m.name = 'water';
    waterMeshes.push(m);
    group.add(m);
    // See auf Seespiegel: flach, Uferlinie entsteht dort, wo das Gelände (swissALTI3D) über den Seespiegel steigt
    if (fpos.length) { const lk = flatMesh(fpos, fcol, wmat); worldUV(lk.geometry, 14); lk.name = 'water-lake'; waterMeshes.push(lk); group.add(lk); }
    // Seefläche ausserhalb des Spielfelds Richtung Osten/Süden (Vierwaldstättersee)
    const lakeTex = waterTex.clone(); lakeTex.repeat.set(6000 / 14, 6000 / 14); lakeTex.needsUpdate = true;
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), withWater(toon('#2F86A0', { map: lakeTex })));
    waterMeshes.push(lake);
    lake.rotation.x = -Math.PI / 2; lake.position.set(X1 + 3000 - 1, -0.1, 1500);
    if (!RURAL_HOUSES) group.add(lake); // Gebiet A liegt weit vom Vierwaldstättersee
  }

  // ---- Geländer an Quais und Flussufern (wo eine Strasse/ein Weg am Wasser liegt) ----
  {
    const posts: number[][] = [], rails: number[][] = [];
    for (const w of d.water) for (const ring of [w.p, ...(w.holes || [])]) for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 2) continue;
      const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
      for (let t = 1; t < L; t += 2.2) {
        const x = a[0] + dx * t, z = a[1] + dz * t;
        // Landseite: die Seite, auf der kein Wasser ist
        let nx = -dz, nz = dx; if (mask.at(x + nx * 2, z + nz * 2) === 1) { nx = -nx; nz = -nz; }
        if (mask.at(x + nx * 2, z + nz * 2) === 1) continue; // beidseitig Wasser (Brücke/Steg)
        const px = x + nx * 0.6, pz = z + nz * 0.6;
        if (mask.at(px, pz) === 2 || mask.isRoad(px, pz) || mask.isRoad(px + nx * 0.8, pz + nz * 0.8) || mask.isRoad(x, z)) continue; // nicht auf Fahrbahn/Brücke
        let road = false; for (const r of [1.5, 3, 5]) if (mask.isRoad(px + nx * r, pz + nz * r)) { road = true; break; }
        if (!road) continue;
        posts.push([px, pz]); rails.push([px, pz, Math.atan2(dx, dz)]);
      }
    }
    if (posts.length) {
      const postG = new THREE.BoxGeometry(0.09, 1.05, 0.09); postG.translate(0, 0.52, 0);
      const railG = new THREE.BoxGeometry(0.07, 0.07, 2.25); railG.translate(0, 1.02, 0);
      const midG = new THREE.BoxGeometry(0.04, 0.04, 2.25); midG.translate(0, 0.55, 0);
      const mat = toon('#3E474F');
      const pm = new THREE.InstancedMesh(postG, mat, posts.length), rm = new THREE.InstancedMesh(railG, mat, rails.length), mm = new THREE.InstancedMesh(midG, mat, rails.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
      posts.forEach(([x, z], i) => { const y = terrain.height(x, z); m4.compose(v.set(x, y, z), q.identity(), one); pm.setMatrixAt(i, m4); e.set(0, rails[i][2], 0); q.setFromEuler(e); m4.compose(v.set(x, y, z), q, one); rm.setMatrixAt(i, m4); mm.setMatrixAt(i, m4); });
      for (const im of [pm, rm, mm]) { im.computeBoundingSphere(); im.name = 'railings'; group.add(chunkInstanced(im, 1000)); }
    }
  }

  // ---- Grün ----
  const trees: number[][] = [];
  {
    const pos: number[] = [], col: number[] = [];
    for (const g of d.green) {
      const c = new THREE.Color(g.k === 'forest' ? '#56804A' : g.k === 'pitch' ? '#8FC07A' : g.k === 'playground' ? '#C9D98E' : '#9CC88A');
      addFlat(pos, col, g.p, [], 0.22, c);
      // Bäume streuen
      const xs = g.p.map((q) => q[0]), zs = g.p.map((q) => q[1]);
      const minx = Math.min(...xs), maxx = Math.max(...xs), minz = Math.min(...zs), maxz = Math.max(...zs);
      const area = Math.abs(signedArea(g.p));
      const n = g.k === 'forest' ? 0 : Math.min(60, Math.floor(area / 260));
      for (let i = 0; i < n * 3 && trees.length < (opts.trees ?? 3500); i++) {
        const x = minx + hash(i, area) * (maxx - minx), z = minz + hash(area, i + 0.5) * (maxz - minz);
        if (pointInPoly(x, z, g.p) && treeOk(mask, x, z)) trees.push([x, z, 0.8 + hash(x, z) * 0.6]);
        if (i > n * 3) break;
      }
    }
    // R9: echte Einzelbäume und Alleen aus OSM (vor den gestreuten, damit sie Vorrang haben)
    if (props) for (const t of props.trees) { const x = t[0], z = t[1];
      if (mask.isRoad(x, z) || mask.at(x, z) === 2) continue;
      // 14q: Hochstamm-Obstbäume (t[3] = 2, OSM landuse=orchard) kleiner und runder, Baumreihen (3) normal
      trees.unshift([x, z, t[3] === 2 ? 0.58 + hash(x, z) * 0.16 : 1.05 + hash(x, z) * 0.45]);
    }
    if (!opts.aerial) group.add(flatMesh(pos, col, toon('#ffffff', { vertexColors: true }))); // mit Luftbild kommt das Grün aus dem Bild
  }

  await onProgress('Strassen werden gebaut …');
  // ---- Strassen ----
  const roadsByName = new Map<string, number[][][]>();
  {
    const asph = { pos: [] as number[], col: [] as number[] }, cobble = { pos: [] as number[], col: [] as number[] }, asphIsl = { pos: [] as number[], col: [] as number[] };
    const dashes: number[] = [];
    // Plätze als Pflasterfläche (OSM-Fussgängerflächen): statt Luftbild mit Dächern/Schatten liegt auf Kapellplatz, Weinmarkt, Europaplatz … Pflaster
    { const pc = new THREE.Color('#D3CBBE'), gr = new THREE.Color('#C6C4BE'); for (const pl of d.plazas || []) { const [px, pz] = centroid(pl.p); const bhf = REGION_IS_LUZERN(d) && px > 120 && px < 650 && pz > -60 && pz < 400; addFlat(cobble.pos, cobble.col, pl.p, pl.h || [], 0.29, pl.n === 'Europaplatz' || pl.n === 'Bahnhof Fussgänger' || bhf ? gr : pc); } } // Bahnhof, KKL, Europaplatz: heller Granit (Foto KKL); Altstadt-Plätze: Pflaster
    { const c = new THREE.Color('#5d6064'); for (const f of d.bhfFill || []) addFlat(asph.pos, asph.col, f.p, f.h, 0.31, c); for (const f of d.gapFill || []) addFlat(asph.pos, asph.col, f, [], 0.32, c); } // tools/geo/gaps.py // Bahnhofplatz-Belag unter den Fahrbahnen
    // Bus-Perrons am Bahnhofplatz (OSM highway=platform): 18 cm hohe Inseln, Randstein hell (Foto Bahnhofplatz)
    { const top = new THREE.Color('#A3A29E'), curb = new THREE.Color('#C9C5BB');
      for (const q of d.busIslands || []) { addFlat(asphIsl.pos, asphIsl.col, q, [], 0.53, top);
        for (let i = 0; i < q.length; i++) { const A = q[i], B = q[(i + 1) % q.length];
          asphIsl.pos.push(A[0], 0.35, A[1], B[0], 0.35, B[1], B[0], 0.53, B[1], A[0], 0.35, A[1], B[0], 0.53, B[1], A[0], 0.53, A[1]); for (let k = 0; k < 6; k++) asphIsl.col.push(curb.r, curb.g, curb.b); } } }
    // Brücken, die in OSM aus mehreren Wegstücken bestehen, als Kette behandeln: das Deck verläuft gerade zwischen den Kettenenden
    // (sonst sackt es an einer Stückgrenze mitten über dem Fluss auf Talhöhe ab)
    const brs = d.roads.filter((r) => r.b || r.n === 'Kapellbrücke' || r.n === 'Spreuerbrücke');
    const bkey = (q: number[]) => Math.round(q[0] * 2) + ',' + Math.round(q[1] * 2), blen = (p: number[][]) => { let l = 0; for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return l; };
    const ends = new Map<string, [number, number][]>();
    brs.forEach((r, i) => { if (r.n === 'Kapellbrücke' || r.n === 'Spreuerbrücke') return; for (const e of [0, 1]) { const k = bkey(e ? r.p[r.p.length - 1] : r.p[0]); if (!ends.has(k)) ends.set(k, []); ends.get(k)!.push([i, e]); } });
    const walk = (i: number, e: number): [number, number[]] => { let len = 0, cur = i, ce = e; const seen = new Set([i]);
      for (;;) { const pt = ce ? brs[cur].p[brs[cur].p.length - 1] : brs[cur].p[0]; const nb = ends.get(bkey(pt))!.filter(([j]) => j !== cur);
        if (nb.length !== 1 || seen.has(nb[0][0])) return [len, pt]; const [j, je] = nb[0]; seen.add(j); len += blen(brs[j].p); cur = j; ce = 1 - je; } };
    const holz = (r: any) => r.n === 'Kapellbrücke' || r.n === 'Spreuerbrücke';
    brs.forEach((r, i) => { if (holz(r)) { terrain.addBridge(r.p, Math.max(r.w, 4.6), r.c === 'footway' ? 0.4 : 0.6); return; } // Holzbrücken wie bisher
      const [lA, pA] = walk(i, 0), [lB, pB] = walk(i, 1), L = blen(r.p), tot = lA + L + lB || 1;
      const HA = terrain.ground(pA[0], pA[1]), HB = terrain.ground(pB[0], pB[1]);
      terrain.addBridge(r.p, Math.max(r.w, 4.6), r.n.endsWith('brücke') && r.c === 'footway' ? 0.4 : 0.6, HA + (HB - HA) * lA / tot, HA + (HB - HA) * (lA + L) / tot); });
    // Knoten: Wegenden, an denen sich mindestens drei Fahrstrassen treffen (dort keine Längsmarkierung, wie in der Realität)
    const nodeCnt = new Map<string, number>(); const nk = (q: number[]) => Math.round(q[0]) + ',' + Math.round(q[1]);
    for (const r of d.roads) { if (['footway', 'path', 'steps', 'cycleway', 'track', 'pedestrian'].includes(r.c)) continue; for (const q of [r.p[0], r.p[r.p.length - 1]]) nodeCnt.set(nk(q), (nodeCnt.get(nk(q)) || 0) + 1);
      for (let i = 1; i < r.p.length - 1; i++) nodeCnt.set(nk(r.p[i]), (nodeCnt.get(nk(r.p[i])) || 0) + 2); }
    // Wartelinien (SSV 6.13, unterbrochen 0.5 m / 0.25 m): wo eine Neben- auf eine Hauptstrasse (mit OSM-Streifen) trifft und keine Ampel steht
    const mainHalf = new Map<string, number>(); for (const r of d.roads) if (r.L && !r.b) for (const q of r.p) mainHalf.set(nk(q), Math.max(mainHalf.get(nk(q)) || 0, r.w / 2));
    const wartel: number[] = [];
    for (const r of d.roads) { if (r.L || r.b || !['residential', 'unclassified', 'living_street', 'tertiary_link'].includes(r.c) || r.p.length < 2) continue;
      for (const end of [0, 1]) { const q = end ? r.p[r.p.length - 1] : r.p[0]; const mh = mainHalf.get(nk(q)); if (!mh) continue;
        if (props?.signals?.some((sg) => Math.hypot(sg[0] - q[0], sg[1] - q[1]) < 25)) continue;
        const pp = end ? r.p : r.p.slice().reverse(); const A = pp[pp.length - 2], B = pp[pp.length - 1]; const sl = Math.hypot(B[0] - A[0], B[1] - A[1]); if (sl < mh + 2) continue;
        const ux = (B[0] - A[0]) / sl, uz = (B[1] - A[1]) / sl, nx = -uz, nz = ux, back = mh + 0.6, cx = B[0] - ux * back, cz = B[1] - uz * back, hw = r.w / 2 - 0.2;
        strokeLine(wartel, [[cx - nx * hw, cz - nz * hw], [cx + nx * hw, cz + nz * hw]], 0.36, 0.4, 0.5, 0.25); } }
    // Höchstgeschwindigkeit (SSV 2.30): Signal 12 m nach einem Punkt, an dem das Tempo laut OSM wechselt, rechts in Fahrtrichtung
    const vAt = new Map<string, Set<number>>(); for (const r of d.roads) if (r.L && r.v && !r.b) for (const q of [r.p[0], r.p[r.p.length - 1]]) { const k = nk(q); if (!vAt.has(k)) vAt.set(k, new Set()); vAt.get(k)!.add(r.v); }
    const vSigns: number[][] = [];
    for (const r of d.roads) { if (!r.L || !r.v || r.b || r.p.length < 2) continue;
      for (const st of [0, 1]) { if (st === 1 && r.o) continue; const q = st ? r.p[r.p.length - 1] : r.p[0]; const vs = vAt.get(nk(q)); if (!vs || vs.size < 2) continue;
        const pp = st ? r.p.slice().reverse() : r.p; const A = pp[0], B = pp[1]; const sl = Math.hypot(B[0] - A[0], B[1] - A[1]); if (sl < 14) continue;
        const ux = (B[0] - A[0]) / sl, uz = (B[1] - A[1]) / sl, o = r.w / 2 + 1.0; vSigns.push([A[0] + ux * 12 - uz * o, A[1] + uz * 12 + ux * o, Math.atan2(ux, uz), r.v]); } }
    // 14zc: Raster der Kantonsstrassen-Achsen (alle 4 m ein Punkt), um Begleitwege zu erkennen
    const mainPts = new Map<string, number[][]>(); const mk = (x: number, z: number) => `${Math.floor(x / 20)},${Math.floor(z / 20)}`;
    for (const r of d.roads) if (r.L && !r.b) for (let i = 1; i < r.p.length; i++) { const A = r.p[i - 1], B = r.p[i], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      for (let s = 0; s <= L; s += 4) { const x = A[0] + (B[0] - A[0]) * s / Math.max(L, 1e-6), z = A[1] + (B[1] - A[1]) * s / Math.max(L, 1e-6), k = mk(x, z); if (!mainPts.has(k)) mainPts.set(k, []); mainPts.get(k)!.push([x, z, r.w / 2]); } }
    const sidePath = new Map<string, number[][]>(); // Begleitwege: dort keine Leitpfosten (stünden auf dem Weg)
    const nearMain = (x: number, z: number) => { const gx = Math.floor(x / 20), gz = Math.floor(z / 20);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const q of mainPts.get(`${gx + a},${gz + b}`) || []) if (Math.hypot(q[0] - x, q[1] - z) < q[2] + 7) return true; return false; };
    const alongMain = (p: number[][]) => { let n = 0, hit = 0; for (let i = 1; i < p.length; i++) { const A = p[i - 1], B = p[i], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      for (let s = 0; s < L; s += 6) { n++; if (nearMain(A[0] + (B[0] - A[0]) * s / L, A[1] + (B[1] - A[1]) * s / L)) hit++; } } return n >= 3 && hit / n > 0.7; };
    const wegweiser: any[][] = [], arrows: number[][] = [], hsSigns: number[][] = [], leitpf: number[][] = [], yellow: number[] = [], sideW = asphIsl, decals: number[][] = [];
    for (const r of d.roads) {
      if (r.n) { if (!roadsByName.has(r.n)) roadsByName.set(r.n, []); roadsByName.get(r.n)!.push(r.p); }
      if (r.tr) { // Trottoir neben der Fahrbahn (tools/geo/roadtags.py): 12 cm erhöht, grauer Belag, Randstein beidseitig
        const y = 0.47, c = new THREE.Color('#97968F'), curb = new THREE.Color('#BDB9AF'), w = Math.max(1.8, r.w);
        ribbon(asphIsl.pos, asphIsl.col, r.p, w, y, c, true);
        for (const sd of [-1, 1]) { const e = offsetLine(r.p, sd * w / 2);
          for (let i = 0; i < e.length - 1; i++) { const A = e[i], B = e[i + 1]; asphIsl.pos.push(A[0], 0.33, A[1], B[0], 0.33, B[1], B[0], y, B[1], A[0], 0.33, A[1], B[0], y, B[1], A[0], y, A[1]); for (let k = 0; k < 6; k++) asphIsl.col.push(curb.r, curb.g, curb.b); } }
        continue;
      }
      if (r.L && !r.b && r.n !== 'Kapellbrücke') { // Kantons- und Hauptstrassen mit OSM-Details: Markierung nach Schweizer Norm, Trottoirs mit Randstein
        const c = new THREE.Color(ROAD_COL[r.c] || '#777'); const y = 0.36; // Hauptstrassen 1 cm über Nebenstrassen: an Knoten kein Flimmern
        ribbon(asph.pos, asph.col, r.p, r.w, y, c, true); const last = r.p[r.p.length - 1]; capEnd(asph.pos, asph.col, last[0], last[1], r.w / 2, y, c);
        const j0 = (nodeCnt.get(nk(r.p[0])) || 0) >= 3, j1 = (nodeCnt.get(nk(last)) || 0) >= 3;
        mainMarkings(r, y + 0.012, dashes, yellow, sideW, decals, j0, j1, leitpf);
        // Signal «Hauptstrasse» (SSV 3.03, gelber Rhombus) auf Kantonsstrassen vor Knoten, rechts in Fahrtrichtung, 12 m vor dem Knoten
        if ((r.c === 'primary' || r.c === 'secondary') && (!r.v || r.v <= 60)) for (const end of [0, 1]) { if (!(end ? j1 : j0) || (end === 0 && r.o)) continue;
          const pp = end ? r.p : r.p.slice().reverse(); const B = pp[pp.length - 1], A = pp[pp.length - 2]; const sl = Math.hypot(B[0] - A[0], B[1] - A[1]); if (sl < 14) continue;
          const ux = (B[0] - A[0]) / sl, uz = (B[1] - A[1]) / sl, o = r.w / 2 + (r.sw ? 1.0 : 0.6);
          hsSigns.push([B[0] - ux * 12 - uz * o, B[1] - uz * 12 + ux * o, Math.atan2(ux, uz)]); }
        // Richtungspfeile (SSV 6.16, OSM turn:lanes) 12 m und 32 m vor dem Wegende, je Fahrstreifen
        for (const end of [0, 1]) { const tl = end ? r.tf : r.tb; if (!tl || !(end ? j1 : j0)) continue;
          const pp = end ? r.p : r.p.slice().reverse(); const L = Math.max(1, r.L || 2), nb = r.o ? 0 : Math.floor(L / 2), cyL = r.cy?.[0] ? 1 : 0, cyR = r.cy?.[1] ? 1 : 0, lw = (r.w - 1.5 * (cyL + cyR)) / L;
          const n = Math.min(tl.length, L); const base = r.w / 2 - (end ? cyR : cyL) * 1.5 - n * lw; void nb; // rechte n Streifen in Fahrtrichtung
          for (const back of [12, 32]) { let acc = 0, k = pp.length - 1; while (k > 0 && acc + Math.hypot(pp[k][0] - pp[k - 1][0], pp[k][1] - pp[k - 1][1]) < back) { acc += Math.hypot(pp[k][0] - pp[k - 1][0], pp[k][1] - pp[k - 1][1]); k--; }
            if (k < 1) break; const A = pp[k - 1], B = pp[k], sl = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, ux = (B[0] - A[0]) / sl, uz = (B[1] - A[1]) / sl, t = sl - (back - acc); if (t < 0) break;
            const cx = A[0] + ux * t, cz = A[1] + uz * t;
            tl.slice(-n).forEach((dirs, i) => { const has = (d: string) => dirs.includes(d), th = has('through'), lf = has('left'), rt = has('right'); const kind = th && lf ? 3 : th && rt ? 4 : lf && rt ? 5 : lf ? 1 : rt ? 2 : th ? 0 : -1; if (kind < 0) return;
              const o = base + (i + 0.5) * lw; arrows.push([kind, cx - uz * o, cz + ux * o, ux, uz]); }); } }
        // Vorwegweiser (blau, weisse Schrift; Ziele aus OSM destination) 35 m vor dem Knoten am rechten Rand
        for (const end of [0, 1]) { const ds = end ? r.df : r.db; if (!ds || !(end ? j1 : j0)) continue;
          const pp = end ? r.p : r.p.slice().reverse(); let acc = 0, k = pp.length - 1; while (k > 0 && acc + Math.hypot(pp[k][0] - pp[k - 1][0], pp[k][1] - pp[k - 1][1]) < 35) { acc += Math.hypot(pp[k][0] - pp[k - 1][0], pp[k][1] - pp[k - 1][1]); k--; }
          if (k < 1) continue; const A = pp[k - 1], B = pp[k], sl = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, ux = (B[0] - A[0]) / sl, uz = (B[1] - A[1]) / sl, t = Math.max(0, sl - (35 - acc));
          const o = r.w / 2 + 1.4; wegweiser.push([A[0] + ux * t - uz * o, A[1] + uz * t + ux * o, Math.atan2(ux, uz), ds.join('|')] as any); }
        // Haltelinie (SSV 6.10, 0.5 m breit) 3 m vor einer Ampel am Wegende, über die ankommenden Streifen
        if (props?.signals?.length) for (const end of [0, 1]) { const q = end ? last : r.p[0]; if (!props.signals.some((sg) => Math.hypot(sg[0] - q[0], sg[1] - q[1]) < 22)) continue;
          const pp = end ? r.p : r.p.slice().reverse(); let acc = 0, k = pp.length - 1; while (k > 0 && acc + Math.hypot(pp[k][0] - pp[k - 1][0], pp[k][1] - pp[k - 1][1]) < 4) { acc += Math.hypot(pp[k][0] - pp[k - 1][0], pp[k][1] - pp[k - 1][1]); k--; }
          if (k < 1) continue; const A = pp[k - 1], B = pp[k], sl = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, ux = (B[0] - A[0]) / sl, uz = (B[1] - A[1]) / sl, t = Math.max(0, sl - (4 - acc));
          const cx = A[0] + ux * t, cz = A[1] + uz * t, nx = -uz, nz = ux, L = Math.max(1, r.L || 2), nb = r.o ? 0 : Math.floor(L / 2), lw = (r.w - 1.5 * ((r.cy?.[0] ? 1 : 0) + (r.cy?.[1] ? 1 : 0))) / L;
          const o0 = end ? -r.w / 2 + (r.cy?.[0] ? 1.5 : 0) + nb * lw : -r.w / 2 + (r.cy?.[0] ? 1.5 : 0), o1 = end ? r.w / 2 : -r.w / 2 + (r.cy?.[0] ? 1.5 : 0) + nb * lw; // end=1: Vorwärtsstreifen rechts; Start: Rückwärtsstreifen (Punktfolge umgekehrt → wieder rechts)
          const a0 = end ? o0 : -o1, a1 = end ? o1 : -o0; if (a1 - a0 < 1) continue;
          strokeLine(dashes, [[cx + nx * a0, cz + nz * a0], [cx + nx * a1, cz + nz * a1]], y + 0.012, 0.5);
          // vor der Haltelinie 5 m ununterbrochene Längslinie zwischen den Streifen derselben Richtung (Normalien Stadt Bern 2.10.2, SSV 6.12)
          const nl = Math.round((a1 - a0) / lw); for (let k2 = 1; k2 < nl; k2++) { const o = a0 + k2 * lw; strokeLine(dashes, [[cx + nx * o, cz + nz * o], [cx - ux * 5 + nx * o, cz - uz * 5 + nz * o]], y + 0.012, 0.15); } }
        continue;
      }
      if (r.n === 'Kapellbrücke' || r.n === 'Spreuerbrücke') continue; // eigene Holzbrücke
      const c = new THREE.Color(ROAD_COL[r.c] || '#999');
      const y = (ROAD_LAYER[r.c] ?? 0.35) + (r.b ? 0.04 : 0);
      // 14zc: Weg (path) direkt neben einer Kantonsstrasse = Rad-/Gehweg mit Asphalt (Fotos Surental, Willisau), nicht Kies/Pflaster
      const besideMain = r.c === 'path' && alongMain(r.p);
      if (besideMain) { c.set(ROAD_COL.cycleway); for (let i = 1; i < r.p.length; i++) { const A = r.p[i - 1], B = r.p[i], L = Math.hypot(B[0] - A[0], B[1] - A[1]); for (let q = 0; q <= L; q += 2) { const x = A[0] + (B[0] - A[0]) * q / Math.max(L, 1e-6), z = A[1] + (B[1] - A[1]) * q / Math.max(L, 1e-6), k = mk(x, z); if (!sidePath.has(k)) sidePath.set(k, []); sidePath.get(k)!.push([x, z, r.w / 2 + 0.6]); } } }
      const soft = !besideMain && ['pedestrian', 'living_street', 'path', 'steps', 'track'].includes(r.c); // Fuss- und Velowege (footway, cycleway): Asphalt-Textur
      const t = soft ? cobble : asph;
      ribbon(t.pos, t.col, r.p, r.w, y, c, true);
      const last = r.p[r.p.length - 1];
      capEnd(t.pos, t.col, last[0], last[1], r.w / 2, y, c);
      if (['primary', 'secondary', 'tertiary', 'trunk'].includes(r.c)) dashLine(dashes, r.p, y + 0.01);
      if (['primary', 'secondary', 'trunk'].includes(r.c) && r.w >= 6.5 && !r.b) edgeLines(dashes, trimLine(r.p, 7), r.w / 2 - 0.45, y + 0.01); // durchgezogene Randlinien (Hauptstrassen), an Weg-Enden (meist Kreuzungen) 7 m frei
    }
    // Belag: feines Korn, dunklere Flicken und Bitumen-Fugen (Fotos Luzerner Kantonsstrassen); 512 px auf 16 m
    const asphTex = canvasTex(512, 512, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 512);
      const rnd = (() => { let a = 7; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
      for (let k = 0; k < 5; k++) { g.fillStyle = `rgba(0,0,0,${0.05 + rnd() * 0.06})`; const x = rnd() * 512, y = rnd() * 512, w = 40 + rnd() * 120, h = 30 + rnd() * 90; g.fillRect(x, y, w, h); g.fillRect(x - 512, y, w, h); g.fillRect(x, y - 512, w, h); }
      g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 1.5;
      for (let k = 0; k < 7; k++) { let x = rnd() * 512, y = rnd() * 512; g.beginPath(); g.moveTo(x, y); for (let q = 0; q < 6; q++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.3) * 50; g.lineTo(x, y); } g.stroke(); }
      noise(g, 512, 512, 22000, 0.14); noise(g, 512, 512, 9000, 0.22, false); });
    const cobTex = canvasTex(128, 128, (g) => {
      g.fillStyle = '#e9e2d6'; g.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y += 16) for (let x = ((y / 16) % 2) * 8 - 8; x < 128; x += 16) {
        g.fillStyle = `rgb(${245 + Math.random() * 10},${242 + Math.random() * 10},${235 + Math.random() * 10})`;
        g.beginPath(); g.roundRect(x + 1.5, y + 1.5, 13, 13, 4); g.fill();
        g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x + 4, y + 3.5, 6, 2);
      }
    });
    for (let i = 0; i < sideW.pos.length; i++) asph.pos.push(sideW.pos[i]); for (let i = 0; i < sideW.col.length; i++) asph.col.push(sideW.col[i]);
    for (const [t, tex, sc] of [[asph, asphTex, 16], [cobble, cobTex, 2.4]] as const) {
      const dr = drape(t.pos, t.col, terrain, opts.coarse ? 14 : 8, true);
      const m = flatMesh(dr.pos, dr.col!, toon('#ffffff', { vertexColors: true, map: tex, side: THREE.DoubleSide })); // beidseitig: Randsteine, Inseln und Bankette haben gemischte Umlaufrichtung
      m.name = tex === asphTex ? 'roads-asphalt' : 'roads-cobble';
      worldUV(m.geometry, sc);
      group.add(m);
    }
    // Fussgängerstreifen (OSM highway=crossing, markiert): in der Schweiz gelb, Balken 0.5 m breit, 0.5 m Abstand, 3 m lang in Fahrtrichtung
    const zebra: number[] = [], zebraSigns: number[][] = [];
    if (props?.crossings?.length) {
      const car = d.roads.filter((r) => ['primary', 'secondary', 'tertiary', 'trunk', 'residential', 'unclassified', 'living_street', 'service'].includes(r.c) && !r.b);
      const cell = new Map<string, [number[][], number, number][]>(); // Segment-Gitter 50 m
      for (const r of car) for (let i = 1; i < r.p.length; i++) { const k = Math.floor(r.p[i][0] / 50) + ',' + Math.floor(r.p[i][1] / 50); if (!cell.has(k)) cell.set(k, []); cell.get(k)!.push([r.p, i, r.L ? -r.w : r.w]); } // negative Breite = Hauptstrasse
      for (const [cx, cz] of props.crossings) {
        let best: [number, number, number, number, number] | null = null; // d, dirx, dirz, w, t
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const [p, i, w] of cell.get((Math.floor(cx / 50) + a) + ',' + (Math.floor(cz / 50) + b)) || []) {
          const [x1, z1] = p[i - 1], [x2, z2] = p[i]; const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz; if (L2 < 1) continue;
          const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cz - z1) * dz) / L2)); const dd2 = Math.hypot(x1 + dx * t - cx, z1 + dz * t - cz);
          if (dd2 < 4 && (!best || dd2 < best[0])) { const L = Math.sqrt(L2); best = [dd2, dx / L, dz / L, w, 0]; }
        }
        if (!best) continue;
        const [, ux, uz, w0] = best, w = Math.abs(w0), vx = -uz, vz = ux; const half = Math.max(2.5, w / 2) - 0.3, len = 1.5;
        if (w0 < 0) for (const sd of [-1, 1]) zebraSigns.push([cx + vx * sd * (w / 2 + 0.9), cz + vz * sd * (w / 2 + 0.9), Math.atan2(ux, uz) + (sd > 0 ? 0 : Math.PI)]); // SSV 4.11 beidseitig
        for (let o = -half; o + 0.5 <= half; o += 1.0) { // Balken quer über die Fahrbahn verteilt, jeder 3 m lang entlang der Strasse
          const bx = cx + vx * (o + 0.25), bz = cz + vz * (o + 0.25);
          const q = [[bx - ux * len - vx * 0.25, bz - uz * len - vz * 0.25], [bx + ux * len - vx * 0.25, bz + uz * len - vz * 0.25], [bx + ux * len + vx * 0.25, bz + uz * len + vz * 0.25], [bx - ux * len + vx * 0.25, bz - uz * len + vz * 0.25]];
          for (const k of [0, 2, 1, 0, 3, 2]) zebra.push(q[k][0], 0.43, q[k][1]);
        }
      }
    }
    if (zebraSigns.length) { // Signal «Standort eines Fussgängerstreifens» (SSV 4.11): blaues Quadrat, weisses Dreieck, schwarze Figur
      const tx = canvasTex(64, 64, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1F5AA6'; g.fillRect(3, 3, 58, 58); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(32, 8); g.lineTo(58, 56); g.lineTo(6, 56); g.closePath(); g.fill();
        g.fillStyle = '#1d1e1b'; g.beginPath(); g.arc(33, 24, 4, 0, 7); g.fill(); g.lineWidth = 4; g.strokeStyle = '#1d1e1b'; g.beginPath(); g.moveTo(32, 29); g.lineTo(30, 41); g.lineTo(24, 51); g.moveTo(30, 41); g.lineTo(37, 51); g.moveTo(26, 34); g.lineTo(38, 35); g.stroke();
        for (let i = 0; i < 4; i++) { g.fillStyle = '#1d1e1b'; g.fillRect(14 + i * 10, 52, 6, 3); } }, false);
      const pl: THREE.BufferGeometry[] = [], po: THREE.BufferGeometry[] = [];
      for (const [x, z, h] of zebraSigns) { const y = terrain.height(x, z); const g = new THREE.PlaneGeometry(0.6, 0.6); g.rotateY(h); g.translate(x, y + 2.25, z); pl.push(g); const c = new THREE.CylinderGeometry(0.04, 0.04, 2.25, 6); c.translate(x, y + 1.12, z); po.push(c); }
      const sm = new THREE.Mesh(mergeGeometries(pl)!, new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })); sm.name = 'fgsSignal'; group.add(sm);
      group.add(new THREE.Mesh(mergeGeometries(po)!, toon('#8A8F94'))); console.log('[bau] Fussgängerstreifen-Signale', zebraSigns.length); }
    if (zebra.length) { const zd = drape(zebra, null, terrain, 3, true); const zg = new THREE.BufferGeometry(); zg.setAttribute('position', new THREE.Float32BufferAttribute(zd.pos, 3)); zg.computeVertexNormals();
      const zm = new THREE.Mesh(zg, new THREE.MeshBasicMaterial({ color: '#F2C21B', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); zm.name = 'zebra'; group.add(zm); }
    // Bushaltestellen am Fahrbahnrand (OSM bus_stop neben einer Hauptstrasse): gelbe unterbrochene Umrandung 20 × 2.6 m und «BUS»
    if (props?.stops?.length) { const mains = d.roads.filter((r) => r.L && !r.b && r.p.length > 1);
      const grid = new Map<string, number[]>(); mains.forEach((r, i) => { for (const q of r.p) { const k = Math.floor(q[0] / 60) + ',' + Math.floor(q[1] / 60); if (!grid.has(k)) grid.set(k, []); const a = grid.get(k)!; if (a[a.length - 1] !== i) a.push(i); } });
      const done: number[][] = [];
      for (const st of props.stops) { const [sx, sz] = st as number[]; if (done.some((q) => Math.hypot(q[0] - sx, q[1] - sz) < 30)) continue;
        let best: [number, number, number, number, number, CityData['roads'][0]] | null = null; // dist, ux, uz, px, pz, road
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const i of grid.get((Math.floor(sx / 60) + a) + ',' + (Math.floor(sz / 60) + b)) || []) { const r = mains[i];
          for (let k = 1; k < r.p.length; k++) { const [x1, z1] = r.p[k - 1], [x2, z2] = r.p[k]; const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz; if (L2 < 1) continue;
            const t = Math.max(0, Math.min(1, ((sx - x1) * dx + (sz - z1) * dz) / L2)), px = x1 + dx * t, pz = z1 + dz * t, dd = Math.hypot(sx - px, sz - pz);
            if (dd < r.w / 2 + 5 && (!best || dd < best[0])) { const L = Math.sqrt(L2); best = [dd, dx / L, dz / L, px, pz, r]; } } }
        if (!best) continue; const [, ux, uz, px, pz, r] = best; const nx = -uz, nz = ux; const sd = (sx - px) * nx + (sz - pz) * nz >= 0 ? 1 : -1;
        if ((sd > 0 ? r.bu?.[1] : r.bu?.[0]) || (sd > 0 ? r.cy?.[1] : r.cy?.[0])) continue;
        const o1 = sd * (r.w / 2 - 0.15), o2 = sd * (r.w / 2 - 2.75); const P = (s0: number, o: number) => [px + ux * s0 + nx * o, pz + uz * s0 + nz * o];
        strokeLine(yellow, [P(-10, o2), P(10, o2)], 0.372, 0.15, 1, 1); strokeLine(yellow, [P(-10, o1), P(-10, o2)], 0.372, 0.15); strokeLine(yellow, [P(10, o1), P(10, o2)], 0.372, 0.15);
        const c = P(0, (o1 + o2) / 2); decals.push([1, c[0], c[1], sd > 0 ? ux : -ux, sd > 0 ? uz : -uz]); done.push([sx, sz]); } }
    for (let i = 0; i < wartel.length; i++) dashes.push(wartel[i]);
    const dd = drape(dashes, null, terrain, 5, true);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dd.pos, 3));
    dg.computeVertexNormals();
    group.add(new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ color: '#F5F1E6', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    if (yellow.length) { const yd = drape(yellow, null, terrain, 5, true); const yg = new THREE.BufferGeometry(); yg.setAttribute('position', new THREE.Float32BufferAttribute(yd.pos, 3)); yg.computeVertexNormals();
      const ym = new THREE.Mesh(yg, new THREE.MeshBasicMaterial({ color: '#F2C21B', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); ym.name = 'yellowLines'; group.add(ym); }
    if (decals.length) group.add(roadDecals(decals, terrain));
    if (arrows.length) group.add(roadDecals(arrows, terrain, true));
    if (vSigns.length) { const texs = new Map<number, THREE.Texture>(); const pole: THREE.BufferGeometry[] = []; const byV = new Map<number, THREE.BufferGeometry[]>();
      for (const [x, z, h, v] of vSigns) { let tx = texs.get(v); if (!tx) { tx = canvasTex(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill(); g.fillStyle = '#D52B1E'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 22, 0, 7); g.fill(); g.fillStyle = '#1d1e1b'; g.font = 'bold 24px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(v), 32, 34); }, false); texs.set(v, tx); }
        const y = terrain.height(x, z); const pgm = new THREE.PlaneGeometry(0.64, 0.64); pgm.rotateY(h + Math.PI); pgm.translate(x, y + 2.3, z); if (!byV.has(v)) byV.set(v, []); byV.get(v)!.push(pgm);
        const pg = new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6); pg.translate(x, y + 1.15, z); pole.push(pg); }
      for (const [v, gs] of byV) { const m = new THREE.Mesh(mergeGeometries(gs)!, new THREE.MeshBasicMaterial({ map: texs.get(v)!, transparent: true, side: THREE.DoubleSide })); m.name = 'tempo'; group.add(m); }
      group.add(new THREE.Mesh(mergeGeometries(pole)!, toon('#8A8F94'))); console.log('[bau] Tempo-Signale', vSigns.length); }
    if (wegweiser.length) { // je Schild eine kleine Canvas-Textur (Luzern ~30 Schilder)
      const steel = toon('#8A8F94'); const posts: THREE.BufferGeometry[] = [];
      for (const [x, z, h, txt] of wegweiser) { const lines = String(txt).split('|'); const H = 0.42 * lines.length + 0.2;
        const tex = canvasTex(256, Math.round(256 * H / 2.6), (g) => { const cw = 256, ch = Math.round(256 * H / 2.6); g.fillStyle = '#1F4E9C'; g.fillRect(0, 0, cw, ch); g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(4, 4, cw - 8, ch - 8);
          g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText('↑ ' + l, 16, (i + 0.5) * (ch - 8) / lines.length + 4)); }, false);
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, H), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
        const y = terrain.height(x, z); pl.position.set(x, y + 2.3 + H / 2, z); pl.rotation.y = h + Math.PI; pl.name = 'wegweiser'; group.add(pl);
        for (const sx of [-1, 1]) { const pg = new THREE.CylinderGeometry(0.05, 0.05, 2.3 + H, 6); pg.translate(Math.cos(h + Math.PI) * sx * 1.0, y + (2.3 + H) / 2, -Math.sin(h + Math.PI) * sx * 1.0); pg.translate(x, 0, z); posts.push(pg); } }
      if (posts.length) group.add(new THREE.Mesh(mergeGeometries(posts)!, steel)); }
    if (hsSigns.length) { // Hauptstrassen-Signale: Stange + Rhombus (Textur gelb mit weissem Rand, Rückseite grau)
      const tex = canvasTex(64, 64, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1d1e1b'; g.fillRect(3, 3, 58, 58); g.fillStyle = '#fff'; g.fillRect(6, 6, 52, 52); g.fillStyle = '#F2C21B'; g.fillRect(15, 15, 34, 34); }, false);
      const sg = new THREE.PlaneGeometry(0.62, 0.62); sg.rotateZ(Math.PI / 4); sg.translate(0, 2.35, 0);
      const pg = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6); pg.translate(0, 1.2, 0);
      const ms = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }), hsSigns.length), mp = new THREE.InstancedMesh(pg, toon('#8A8F94'), hsSigns.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
      hsSigns.forEach(([x, z, h], k) => { q.setFromEuler(e.set(0, h + Math.PI, 0)); m4.compose(v.set(x, terrain.height(x, z), z), q, one); ms.setMatrixAt(k, m4); mp.setMatrixAt(k, m4); });
      for (const im of [ms, mp]) { im.computeBoundingSphere(); im.name = 'hauptstrasse'; group.add(chunkInstanced(im, 1000)); } }
    // Leitplanken ausserorts, wo das Gelände neben der Fahrbahn mehr als 2.5 m abfällt (Böschung, Hang): verzinkte Planke 0.6–0.9 m, Pfosten alle 4 m
    { const beam: number[] = [], posts: number[][] = [];
      for (const r of d.roads) { if (!r.L || r.b || (r.v || 50) <= 50) continue;
        for (const sd of [-1, 1]) { const e = offsetLine(r.p, sd * (r.w / 2 + 0.9)); let run: number[][] = [];
          const flush = () => { if (run.length >= 2) { for (let i = 0; i < run.length - 1; i++) { const A = run[i], B = run[i + 1];
              beam.push(A[0], A[2] + 0.6, A[1], B[0], B[2] + 0.6, B[1], B[0], B[2] + 0.9, B[1], A[0], A[2] + 0.6, A[1], B[0], B[2] + 0.9, B[1], A[0], A[2] + 0.9, A[1]); } } run = []; };
          for (let i = 0; i < e.length - 1; i++) { const L = Math.hypot(e[i + 1][0] - e[i][0], e[i + 1][1] - e[i][1]), n = Math.max(1, Math.ceil(L / 4));
            for (let k = 0; k < n; k++) { const t = k / n, x = e[i][0] + (e[i + 1][0] - e[i][0]) * t, z = e[i][1] + (e[i + 1][1] - e[i][1]) * t;
              const q = r.p[i], qq = r.p[i + 1], rx = q[0] + (qq[0] - q[0]) * t, rz = q[1] + (qq[1] - q[1]) * t; const hr = terrain.height(rx, rz), hg = terrain.ground(x + (x - rx) * 0.8, z + (z - rz) * 0.8);
              if (hr - hg > 2.5) { const y = Math.max(terrain.height(x, z), hr - 0.3); run.push([x, z, y]); posts.push([x, z, y]); } else flush(); } }
          flush(); } }
      if (beam.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(beam, 3)); g.computeVertexNormals();
        const m = new THREE.Mesh(g, toon('#B9BEC3', { side: THREE.DoubleSide })); m.name = 'leitplanken'; group.add(m);
        const pg = new THREE.BoxGeometry(0.1, 1.6, 0.1); pg.translate(0, 0.1, 0); const im = new THREE.InstancedMesh(pg, toon('#8E9399'), posts.length); const m4 = new THREE.Matrix4();
        posts.forEach(([x, z, y], k) => { m4.makeTranslation(x, y, z); im.setMatrixAt(k, m4); }); im.computeBoundingSphere(); im.name = 'leitplanken'; group.add(chunkInstanced(im, 1000)); }
      console.log('[bau] Leitplanken-Pfosten', posts.length); }
    kantonsPaket(d, props, terrain, group, vAt, nk);
    { const onPath = ([x, z]: number[]) => { const gx = Math.floor(x / 20), gz = Math.floor(z / 20); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const q of sidePath.get(`${gx + a},${gz + b}`) || []) if (Math.hypot(q[0] - x, q[1] - z) < q[2]) return true; return false; };
      if (sidePath.size) { const keep = leitpf.filter((p) => !onPath(p)); leitpf.length = 0; leitpf.push(...keep); } }
    if (leitpf.length) { const g = new THREE.BoxGeometry(0.12, 1.0, 0.16, 1, 10, 1).toNonIndexed(); g.translate(0, 0.5, 0); const ca = new Float32Array(g.getAttribute('position').count * 3);
      const pa = g.getAttribute('position'); for (let k = 0; k < pa.count; k++) { const yy = pa.getY(k); const dark = yy > 0.72 && yy < 0.92; ca[k * 3] = ca[k * 3 + 1] = ca[k * 3 + 2] = dark ? 0.08 : 0.95; } g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
      const im = new THREE.InstancedMesh(g, toon('#ffffff', { vertexColors: true }), leitpf.length); const m4 = new THREE.Matrix4();
      leitpf.forEach(([x, z], k) => { m4.makeTranslation(x, terrain.height(x, z), z); im.setMatrixAt(k, m4); }); im.computeBoundingSphere(); im.name = 'leitpfosten'; group.add(chunkInstanced(im, 1000)); }
  }
  // ---- Bahn ----
  {
    const pos: number[] = [], col: number[] = [];
    const c = new THREE.Color('#8E847C');
    for (const r of d.rail) ribbon(pos, col, r, 2.6, 0.25, c, false);
    const drl = drape(pos, col, terrain, 12);
    group.add(flatMesh(drl.pos, drl.col!, toon('#ffffff', { vertexColors: true })));
  }

  if (d.shelters?.length || d.wagenbach) group.add(bahnhofExtras(d, terrain));
  await onProgress('Häuser werden gebaut …');
  // ---- Gebäude ----
  let hospital = { x: -900, z: -700, name: 'Kinderspital' };
  const landmarks: { name: string; x: number; z: number }[] = [];
  const special: { b: CityData['buildings'][0]; kind: string }[] = [];
  {
    // Getrennte Puffer je Fassadentyp → je ein Material mit eigener Textur
    type Buf = { pos: number[]; nor: number[]; col: number[]; uv: number[] };
    const mk = (): Buf => ({ pos: [], nor: [], col: [], uv: [] });
    const B: Record<string, Buf> = { oldGreen: mk(), oldRed: mk(), modern: mk(), block: mk(), stone: mk(), flatRoof: mk(), tiles: mk(), altstadt: mk(), painted: mk(), gruenderzeit: mk(), hotel: mk(), slate: mk(), luks: mk(), luksTurm: mk(), blockShop: mk(), modernShop: mk(), barn: mk(), hall: mk() };
    const lpos: number[] = [];
    const styles: { p: number[][]; facade: THREE.Color; roofC: THREE.Color; style: string; flat: boolean; kind: string }[] = [];
    for (const b of d.buildings) {
      let kind = '';
      if (b.n === 'Wasserturm') kind = 'wasserturm';
      if (b.n.startsWith('KKL')) kind = 'kkl';
      if (b.n === 'Jesuitenkirche') kind = 'jesuiten';
      if (b.n.startsWith('Haus 36')) kind = 'kispi';
      if (b.n === 'Altes Bahnhofstor') kind = 'tor';
      if (b.n.includes('Hofkirche')) kind = 'hofkirche';
      if (b.t === 'ship') kind = 'ship';
      if (kind === 'ship') { special.push({ b, kind }); continue; }
      if (kind === 'wasserturm') { // Foto-Referenz (Commons): Bruchstein ocker-braun, kaum Fenster, rotbraunes Achteckdach
        special.push({ b, kind });
        if (b3d) styles.push({ p: b.p, facade: new THREE.Color('#9C7A58'), roofC: new THREE.Color('#8C3B26'), style: 'stone', flat: false, kind });
        continue; }
      if (kind === 'tor') { special.push({ b, kind }); // swissBUILDINGS3D enthält den Bogen (echte Form): nur Sandstein-Stil; ohne 3D-Daten eigenes Modell
        if (b3d) styles.push({ p: b.p, facade: new THREE.Color('#D4C9B1'), roofC: new THREE.Color('#B9AD94'), style: 'stone', flat: false, kind }); continue; }
      if (kind) special.push({ b, kind });

      const [cx, cz] = centroid(b.p);
      const r = hash(cx, cz);
      let h = b.h;
      let facade = new THREE.Color(FACADES[Math.floor(r * FACADES.length)]);
      const modernType = ['industrial', 'office', 'hospital', 'train_station', 'garage', 'garages', 'roof', 'school', 'university', 'parking', 'warehouse'].includes(b.t) || (['commercial', 'retail'].includes(b.t) && h > 20);
      const flat = h > 27 || modernType || b.t === 'hall';
      let roofC = new THREE.Color(flat ? FLAT_ROOF : ROOFS[Math.floor(hash(cz, cx) * ROOFS.length)]);
      let style: string = flat ? (modernType ? 'modern' : 'block') : hash(cx + 1, cz) > 0.5 ? 'oldGreen' : 'oldRed';
      if (['church', 'cathedral', 'chapel'].includes(b.t)) style = 'stone';
      if (kind === 'kkl') { h = Math.max(h, 24); facade = new THREE.Color('#9AA6B2'); roofC = new THREE.Color('#5E6670'); style = 'modern'; }
      if (kind === 'jesuiten') { h = Math.max(h, 26); facade = new THREE.Color('#F6F1E8'); roofC = new THREE.Color('#5F8F86'); style = 'stone'; }
      if (kind === 'hofkirche') { h = Math.max(h, 22); facade = new THREE.Color('#E8E0CF'); roofC = new THREE.Color('#7B6A5B'); style = 'stone'; }
      if (kind === 'kispi') { facade = new THREE.Color('#FFFFFF'); roofC = new THREE.Color('#D8D6D0'); hospital = { x: cx, z: cz, name: 'Kinderspital' }; style = 'luks'; }
      if (b.n === 'Bahnhof Luzern') { kind = 'bahnhof'; facade = new THREE.Color('#B8CBD4'); roofC = new THREE.Color('#7D8790'); style = 'modern'; } // Glasfront Bahnhofhalle (1991)
      if (b.n.startsWith('Haus 31')) { kind = 'luksturm'; facade = new THREE.Color('#FFFFFF'); roofC = new THREE.Color('#9A9A96'); style = 'luksTurm'; }
      if (kind === 'tor') { h = Math.max(h, 11); facade = new THREE.Color('#E9E2D2'); style = 'stone'; }
      if (b.t === 'roof') { facade = new THREE.Color('#BFB8AC'); }
      if (b.t === 'barn' && !kind) { style = 'barn'; facade = new THREE.Color(['#9A6E4C', '#8B6446', '#A87C57', '#7E5B40', '#B08A62'][Math.floor(r * 5)]); roofC = new THREE.Color(['#7A766F', '#6E6A64', '#8A5A44', '#A04A36'][Math.floor(hash(cz, cx) * 4)]); }
      if (b.t === 'hall' && !kind) { style = 'hall'; facade = new THREE.Color(['#D9DCD6', '#C9CFC9', '#E2DED2', '#B9C3C6', '#D6CDB8'][Math.floor(r * 5)]); roofC = new THREE.Color('#8E8A86'); }
      if (b.t === 'house' && !kind && RURAL_HOUSES && hash(cx + 3, cz) < 0.35) facade = new THREE.Color(['#F4EFE6', '#F3E3C3', '#EFE9DF', '#E9DCC8'][Math.floor(r * 4)]); // Land: mehr weisse/helle Putzfassaden
      if (style === 'modern' && !kind) facade = new THREE.Color(['#E6E2DA', '#D7DCE0', '#EADFC9', '#CFD6CC', '#E3D3C3'][Math.floor(r * 5)]);
      if (style === 'block' && !kind) facade = new THREE.Color(['#F1ECE2', '#EDE3CF', '#E6E8E3', '#F2E6D6', '#E9DFD0', '#DDE3E6', '#F0E2C8'][Math.floor(r * 7)]);
      if (kind && kind !== 'kispi') landmarks.push({ name: b.n, x: cx, z: cz });
      if (b.n === 'Luftfahrt / Raumfahrt') landmarks.push({ name: 'Verkehrshaus', x: cx, z: cz });
      if (b3d) { styles.push({ p: b.p, facade, roofC, style, flat, kind }); continue; }
      const gys = b.p.map(([x, z]) => terrain.ground(x, z));
      const gMin = Math.min(...gys), gMax = Math.max(...gys);
      const base = gMin - 0.4;
      const top = gMin + h + (gMax - gMin) * 0.6;
      const buf = B[style];
      const tile = style === 'modern' || style === 'block' ? 3.6 : style === 'stone' ? 6 : style === 'barn' || style === 'hall' ? 4 : 3.3;
      const floorH = style === 'stone' ? 7 : style === 'barn' ? 6.5 : style === 'hall' ? 8 : 3.1;

      const rings = [b.p, ...(b.holes || [])];
      for (let ri = 0; ri < rings.length; ri++) {
        const p = rings[ri];
        const ringCcw = signedArea(p) > 0;
        let u0 = 0;
        for (let i = 0; i < p.length; i++) {
          const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length];
          const len = Math.hypot(x2 - x1, z2 - z1);
          if (len < 0.05) continue;
          let nx = (z2 - z1) / len, nz = -(x2 - x1) / len;
          if (!ringCcw) { nx = -nx; nz = -nz; }
          if (ri > 0) { nx = -nx; nz = -nz; }
          // ganze Fensterachsen pro Wand, damit keine halben Fenster an den Ecken entstehen
          const reps = Math.max(1, Math.round(len / tile));
          const u1 = reps;
          const v1 = Math.max(1, Math.round(h / floorH));
          const quad = [[x1, base, z1, 0, 0], [x2, base, z2, u1, 0], [x2, top, z2, u1, v1], [x1, base, z1, 0, 0], [x2, top, z2, u1, v1], [x1, top, z1, 0, v1]];
          const ex = x2 - x1, ez = z2 - z1;
          const flip = -ez * nx + ex * nz < 0;
          const order = flip ? [0, 2, 1, 3, 5, 4] : [0, 1, 2, 3, 4, 5];
          // Licht: Südfassaden etwas heller (Comic-Schattierung zusätzlich zum Toon-Shader)
          for (const k of order) {
            const q = quad[k];
            buf.pos.push(q[0], q[1], q[2]); buf.uv.push(q[3], q[4]); buf.nor.push(nx, 0, nz);
            const shade = q[1] > base ? 1 : 0.86;
            buf.col.push(facade.r * shade, facade.g * shade, facade.b * shade);
          }
          u0 = 0;
          lpos.push(x1, base, z1, x1, top, z1, x1, top, z1, x2, top, z2);
        }
      }
      // Dach: Walmdach für kleinere, rechteckige Altbauten, sonst Flachdach
      const fr = B.flatRoof;
      const before = fr.pos.length;
      addFlat(fr.pos, fr.col, b.p, b.holes || [], top, flat ? roofC : roofC.clone().multiplyScalar(0.82), fr.uv);
      for (let i = before; i < fr.pos.length; i += 3) fr.nor.push(0, 1, 0);
      if (!flat && style === 'barn') hipRoof(B.tiles, lpos, b.p, top, roofC, 0.62, 3200); // flacheres, weit ausladendes Scheunendach
      else if (!flat && style !== 'stone') hipRoof(B.tiles, lpos, b.p, top, roofC);
      else if (style === 'stone' && kind !== 'jesuiten') hipRoof(B.tiles, lpos, b.p, top, roofC, 0.75);
    }
    const b3dTiles = new Map<string, { B: Record<string, Buf>; l: number[] }>();
    ERKER.length = 0; ONIONS.length = 0;
    { // Läden im Erdgeschoss an Kantonsstrassen innerorts (Wohn-/Geschäftsblöcke, Bürobauten): Gebäudemitte ≤ 24 m von der Strassenachse
      const g = new Map<string, number[][]>();
      for (const r of d.roads) { if (!r.L || r.b || (r.v || 50) > 50) continue;
        for (let i = 1; i < r.p.length; i++) { const [x1, z1] = r.p[i - 1], [x2, z2] = r.p[i]; const L = Math.hypot(x2 - x1, z2 - z1);
          for (let t = 0; t <= L; t += 5) { const x = x1 + (x2 - x1) * t / (L || 1), z = z1 + (z2 - z1) * t / (L || 1); const k = Math.floor(x / 25) + ',' + Math.floor(z / 25); if (!g.has(k)) g.set(k, []); g.get(k)!.push([x, z]); } } }
      SHOP_NEAR = (x, z) => { const i = Math.floor(x / 25), j = Math.floor(z / 25); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const q of g.get((i + a) + ',' + (j + b)) || []) if (Math.hypot(q[0] - x, q[1] - z) < 24) return true; return false; }; }
    if (b3d) await buildB3D(b3d, styles, b3dTiles, lpos, (p) => onProgress(p), terrain);
    await onProgress('Materialien …');
    const tex = facadeTextures();
    if (ERKER.length) { // Erker als Instanzen: Kasten mit Fenstern + kleines Kupferdach
      const body = new THREE.BoxGeometry(2.6, 1, 1.1); body.translate(0, 0.5, 0);
      const cap = new THREE.ConeGeometry(1.95, 1.4, 4); cap.rotateY(Math.PI / 4); cap.scale(1, 1, 0.6); cap.translate(0, 0.7, 0);
      const bm = new THREE.InstancedMesh(body, withNight(toon('#ffffff', { map: tex.altstadt })), ERKER.length), cm = new THREE.InstancedMesh(cap, toon('#5E8C78'), ERKER.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
      ERKER.forEach(([x, z, y, hh, rot, cr, cg, cb], i) => {
        e.set(0, rot, 0); q.setFromEuler(e);
        m4.compose(v.set(x, y, z), q, sc.set(1, hh, 1)); bm.setMatrixAt(i, m4); bm.setColorAt(i, col.setRGB(cr, cg, cb));
        m4.compose(v.set(x, y + hh, z), q, sc.set(1, 1, 1)); cm.setMatrixAt(i, m4); cm.setColorAt(i, col.set(hash(x, z) < 0.6 ? '#5E8C78' : '#8A5A44'));
      });
      for (const im of [bm, cm]) { im.computeBoundingSphere(); im.name = 'erker'; group.add(im); }
    }
    for (const [x, z, y, r, top] of ONIONS) { // Zwiebelhauben mit Laterne und goldener Spitze
      const H = Math.max(top - y, r * 2.2) + 1.5, R = r * 1.02;
      const prof = [[0.92, 0], [0.92, 0.07], [1.08, 0.2], [1.12, 0.33], [0.98, 0.46], [0.6, 0.58], [0.26, 0.66], [0.2, 0.72], [0.34, 0.77], [0.3, 0.82], [0.14, 0.87], [0.07, 0.9], [0, 0.9]].map(([a, b]) => new THREE.Vector2(a * R, b * H));
      const dome = new THREE.Mesh(new THREE.LatheGeometry(prof, 12), toon('#5F8F86'));
      dome.position.set(x, y, z); dome.name = 'zwiebel';
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18 * R, 0.14 * H, 6), toon('#D9B44A'));
      tip.position.set(x, y + 0.97 * H, z);
      group.add(dome, outline(dome), tip);
    }
    const mats: Record<string, THREE.Material> = {
      oldGreen: toon('#ffffff', { vertexColors: true, map: tex.oldGreen }),
      oldRed: toon('#ffffff', { vertexColors: true, map: tex.oldRed }),
      modern: toon('#ffffff', { vertexColors: true, map: tex.modern }),
      block: toon('#ffffff', { vertexColors: true, map: tex.block }),
      stone: toon('#ffffff', { vertexColors: true, map: tex.stone }),
      flatRoof: toon('#ffffff', { vertexColors: true, map: tex.gravel }),
      tiles: toon('#ffffff', { vertexColors: true, map: tex.tiles }),
      slate: toon('#ffffff', { vertexColors: true, map: tex.tiles }),
      altstadt: withRows(withShop(toon('#ffffff', { vertexColors: true, map: tex.altstadt }), tex.shopAlt), 0.85),
      painted: withRows(withShop(toon('#ffffff', { vertexColors: true, map: tex.painted }), tex.shopAlt), 0.8),
      gruenderzeit: withShop(toon('#ffffff', { vertexColors: true, map: tex.gruenderzeit }), tex.shopNeu),
      hotel: withShop(toon('#ffffff', { vertexColors: true, map: tex.hotel }), tex.shopNeu),
      luks: toon('#ffffff', { vertexColors: true, map: tex.luks }),
      luksTurm: toon('#ffffff', { vertexColors: true, map: tex.luksTurm }),
      blockShop: withShop(toon('#ffffff', { vertexColors: true, map: tex.block }), tex.shopNeu),
      modernShop: withShop(toon('#ffffff', { vertexColors: true, map: tex.modern }), tex.shopNeu),
      barn: toon('#ffffff', { vertexColors: true, map: tex.barn }),
      hall: toon('#ffffff', { vertexColors: true, map: tex.hall }),
    };
    for (const k of ['oldGreen', 'oldRed', 'modern', 'block', 'stone', 'altstadt', 'painted', 'gruenderzeit', 'hotel', 'luks', 'luksTurm', 'blockShop', 'modernShop']) withNight(mats[k] as THREE.MeshToonMaterial);
    const groups: [string, Record<string, Buf>, number[]][] = [['', B, lpos], ...[...b3dTiles].map(([k, t]) => [k, t.B, t.l] as [string, Record<string, Buf>, number[]])];
    for (const [tk, BB] of groups) for (const [k, buf] of Object.entries(BB)) {
      if (!buf.pos.length) continue;
      void tk;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(buf.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(buf.col, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
      buf.pos = []; buf.nor = []; buf.col = []; buf.uv = []; // JS-Arrays sofort freigeben (Speicherspitze beim Laden)
      const mesh = new THREE.Mesh(g, mats[k]);
      mesh.name = 'buildings-' + k;
      group.add(mesh);

    }
    await onProgress('Konturen …');
    const lmat = new THREE.LineBasicMaterial({ color: '#3b302b', transparent: true, opacity: 0.6 });
    for (const gr of groups) {
      const L = gr[2]; if (!L.length) continue;
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(L, 3)); gr[2] = [];
      const lines = new THREE.LineSegments(lg, lmat);
      lines.name = 'edges-buildings';
      group.add(lines);
    }
    b3dTiles.clear(); lpos.length = 0;
  }

  await onProgress('Wahrzeichen …');
  // ---- Wahrzeichen ----
  for (const s of special) {
    const [cx, cz] = centroid(s.b.p);
    if (s.kind === 'tor') { if (!b3d) group.add(torbogen(s.b.p, terrain)); landmarks.push({ name: 'Bahnhofstor', x: cx, z: cz }); continue; }
    if (b3d && ['wasserturm', 'kkl', 'jesuiten', 'hofkirche', 'tor', 'kispi'].includes(s.kind)) { if (s.kind === 'wasserturm') landmarks.push({ name: 'Wasserturm', x: cx, z: cz }); continue; }
    const G = new THREE.Group(); G.position.y = Math.min(...s.b.p.map(([x, z]) => terrain.ground(x, z))); group.add(G);
    if (s.kind === 'wasserturm') {
      const area = Math.abs(signedArea(s.b.p));
      const r = Math.max(5, Math.sqrt(area / 2.83) * 0.98); // Achteck-Fläche ≈ 2.83 r²
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, 26, 8), toon('#B4664C'));
      tower.position.set(cx, 13, cz); tower.rotation.y = Math.PI / 8;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r, 3, 8), toon('#9C5640'));
      top.position.set(cx, 27.5, cz); top.rotation.y = Math.PI / 8;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.1, 9, 8), toon('#7A3F2E'));
      roof.position.set(cx, 33.5, cz); roof.rotation.y = Math.PI / 8;
      G.add(tower, top, roof);
      for (const m of [tower, top, roof]) G.add(outline(m));
      landmarks.push({ name: 'Wasserturm', x: cx, z: cz });
    }
    if (s.kind === 'ship') {
      G.position.y = 0; // Seespiegel
      G.add(steamship(s.b.p));
      landmarks.push({ name: s.b.n || 'Dampfschiff', x: cx, z: cz });
    }
    if (s.kind === 'kkl') {
      const xs = s.b.p.map((q) => q[0]), zs = s.b.p.map((q) => q[1]);
      const minx = Math.min(...xs), maxx = Math.max(...xs), minz = Math.min(...zs), maxz = Math.max(...zs);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(maxx - minx + 30, 1.2, maxz - minz + 16), toon('#4E5660'));
      roof.position.set((minx + maxx) / 2 + 10, Math.max(s.b.h, 24) + 1.5, (minz + maxz) / 2);
      G.add(roof, outline(roof));
    }
    if (s.kind === 'jesuiten') {
      // Zwei Zwiebeltürme an der Front (Richtung Reuss = Norden)
      const xs = s.b.p.map((q) => q[0]); const zs = s.b.p.map((q) => q[1]);
      const minz = Math.min(...zs);
      const minx = Math.min(...xs), maxx = Math.max(...xs);
      for (const tx of [minx + 3, maxx - 3]) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(5, 34, 5), toon('#F6F1E8'));
        t.position.set(tx, 17, minz + 3);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(3.2, 10, 8), toon('#5F8F86'));
        dome.position.set(tx, 36, minz + 3); dome.scale.y = 1.3;
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.8, 5, 6), toon('#D9B44A'));
        spire.position.set(tx, 41, minz + 3);
        G.add(t, dome, spire, outline(t));
      }
    }
    if (s.kind === 'hofkirche') {
      const zs = s.b.p.map((q) => q[1]); const xs = s.b.p.map((q) => q[0]);
      const maxz = Math.max(...zs); const minx = Math.min(...xs), maxx = Math.max(...xs);
      for (const tx of [minx + 3, maxx - 3]) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(5, 50, 5), toon('#E8E0CF'));
        t.position.set(tx, 25, maxz - 3);
        const sp = new THREE.Mesh(new THREE.ConeGeometry(3.6, 16, 4), toon('#4F6E68'));
        sp.position.set(tx, 58, maxz - 3); sp.rotation.y = Math.PI / 4;
        G.add(t, sp, outline(t));
      }
    }
  }

  // Holzbrücken
  for (const name of ['Kapellbrücke', 'Spreuerbrücke']) {
    const parts = roadsByName.get(name) || [];
    for (const p of parts) group.add(mergeGroup(coveredBridge(p, name === 'Kapellbrücke' ? 4.6 : 4.2, terrain, name === 'Kapellbrücke')));
    if (parts.length) {
      const mid = parts[0][Math.floor(parts[0].length / 2)];
      landmarks.push({ name, x: mid[0], z: mid[1] });
    }
  }

  // Fahnen auf der Seebrücke (abwechselnd Schweiz und Kanton Luzern: blau über weiss)
  {
    const parts = d.roads.filter((r) => r.n === 'Seebrücke' && r.b).map((r) => r.p);
    const distTo = (x: number, z: number, q: number[][]) => { let m = 1e9; for (let i = 1; i < q.length; i++) { const [ax, az] = q[i - 1], [bx, bz] = q[i]; const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1; const u = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2)); m = Math.min(m, Math.hypot(x - ax - u * vx, z - az - u * vz)); } return m; };
    const flagTex = (draw: (g: CanvasRenderingContext2D) => void) => { const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d')!); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const ch = flagTex((g) => { g.fillStyle = '#D52B1E'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.fillRect(26, 12, 12, 40); g.fillRect(12, 26, 40, 12); });
    const lu = flagTex((g) => { g.fillStyle = '#2F6FB5'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#fff'; g.fillRect(0, 32, 64, 32); });
    const fg = new THREE.PlaneGeometry(1.6, 1.6, 4, 1); const fp = fg.getAttribute('position');
    for (let i = 0; i < fp.count; i++) { const x = fp.getX(i); fp.setX(i, x + 0.8); fp.setZ(i, Math.sin((x + 0.8) * 2.6) * 0.12); }
    fg.computeVertexNormals();
    const mCH = new THREE.MeshBasicMaterial({ map: ch, side: THREE.DoubleSide }), mLU = new THREE.MeshBasicMaterial({ map: lu, side: THREE.DoubleSide }), poleM = toon('#E9E6E0');
    const poles: THREE.Matrix4[] = []; let n = 0; const fl = new THREE.Group(); fl.name = 'flags'; const gCH: THREE.BufferGeometry[] = [], gLU: THREE.BufferGeometry[] = [];
    for (const p of parts) {
      let acc = 0;
      for (let i = 1; i < p.length; i++) {
        const [x1, z1] = p[i - 1], [x2, z2] = p[i]; const L = Math.hypot(x2 - x1, z2 - z1); if (L < 0.1) continue;
        const ux = (x2 - x1) / L, uz = (z2 - z1) / L;
        for (let t = (22 - acc) % 22; t < L; t += 22) {
          for (const sd of [-1, 1]) {
            const x = x1 + ux * t - uz * sd * 7.6, z = z1 + uz * t + ux * sd * 7.6, y = terrain.height(x1 + ux * t, z1 + uz * t);
            if (parts.some((q) => q !== p && distTo(x, z, q) < 7.4)) continue;
            poles.push(new THREE.Matrix4().makeTranslation(x, y + 3.5, z));
            const f = new THREE.Mesh(fg, n++ % 2 ? mLU : mCH); f.position.set(x, y + 5.9, z); f.rotation.y = Math.atan2(-ux, -uz) + Math.PI / 2 + sd * 0.25; f.updateMatrix(); (f.material === mLU ? gLU : gCH).push(fg.clone().applyMatrix4(f.matrix));
          }
        }
        acc = (acc + L) % 22;
      }
    }
    for (const [gs, mt] of [[gCH, mCH], [gLU, mLU]] as [THREE.BufferGeometry[], THREE.Material][]) if (gs.length) fl.add(new THREE.Mesh(mergeGeometries(gs, false)!, mt));
    if (poles.length) {
      const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 7, 6), poleM, poles.length);
      poles.forEach((m, i) => pm.setMatrixAt(i, m)); pm.computeBoundingSphere(); fl.add(pm); group.add(fl);
    }
  }

  // Restaurant-Terrassen mit Sonnenschirmen an den Altstadt-Quais (Rathausquai, Unter der Egg) und am Schwanenplatz
  {
    const spots: [number, number][] = [];
    for (const name of ['Rathausquai', 'Unter der Egg', 'Kornmarkt', 'Kapellplatz', 'Nationalquai', 'Schwanenplatz']) {
      for (const r of d.roads) {
        if (r.n !== name) continue;
        for (let i = 1; i < r.p.length; i++) {
          const [x1, z1] = r.p[i - 1], [x2, z2] = r.p[i]; const L = Math.hypot(x2 - x1, z2 - z1); if (L < 1) continue;
          const ux = (x2 - x1) / L, uz = (z2 - z1) / L;
          for (let t = 2; t < L; t += 4.2) for (const sd of [-1, 1]) for (const off of [r.w / 2 + 1.6, r.w / 2 + 3.2]) {
            const x = x1 + ux * t - uz * sd * off, z = z1 + uz * t + ux * sd * off;
            if (mask.at(x, z) !== 0 || mask.isRoad(x, z) || mask.isRoad(x - uz * sd * 1.2, z + ux * sd * 1.2)) continue;
            if (mask.at(x - uz * sd * 1.4, z + ux * sd * 1.4) === 2) continue;
            if (spots.some(([a, c]) => Math.hypot(a - x, c - z) < 3.6)) continue;
            spots.push([x, z]); break;
          }
        }
      }
    }
    if (spots.length) {
      const n = spots.length, m4 = new THREE.Matrix4(), col = new THREE.Color();
      const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 5), toon('#EFEFEF'), n);
      const top = new THREE.InstancedMesh(new THREE.ConeGeometry(1.5, 0.55, 8), toon('#ffffff'), n);
      const table = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 10), toon('#F4F1EA'), n);
      const cols = ['#FFFFFF', '#D23B2E', '#F3E6C4', '#2F6E4E', '#F2F2F2', '#B23A48'];
      spots.forEach(([x, z], i) => {
        const y = terrain.height(x, z);
        pole.setMatrixAt(i, m4.makeTranslation(x, y + 1.2, z)); top.setMatrixAt(i, m4.makeTranslation(x, y + 2.45, z));
        table.setMatrixAt(i, m4.makeTranslation(x, y + 0.74, z)); top.setColorAt(i, col.set(cols[Math.floor(hash(x, z) * cols.length)]));
      });
      const tg = new THREE.Group(); tg.name = 'terraces';
      for (const im of [pole, top, table]) { im.computeBoundingSphere(); tg.add(chunkInstanced(im, 300)); }
      group.add(tg);
    }
  }

  // Verkehrshaus: Schaustücke im Hof (Flugzeug auf Stelzen, rote Lok auf einem Gleisstück)
  if (X1 > 2200) {
    const free = (x: number, z: number, r: number) => { for (let a = 0; a < 6.283; a += 0.5) for (const rr of [0, r * 0.5, r]) { const q = mask.at(x + Math.cos(a) * rr, z + Math.sin(a) * rr); if (q !== 0) return false; } return true; };
    const find = (x: number, z: number, r: number): [number, number] | null => { for (let d0 = 0; d0 < 60; d0 += 4) for (let a = 0; a < 6.283; a += 0.4) { const px = x + Math.cos(a) * d0, pz = z + Math.sin(a) * d0; if (free(px, pz, r)) return [px, pz]; if (d0 === 0) break; } return null; };
    const V = new THREE.Group(); V.name = 'verkehrshaus';
    const white = toon('#F4F4F2'), red = toon('#D7262E'), dark = toon('#2E3A48'), grey = toon('#8D949B'), black = toon('#2B2B2B');
    const pp = find(2195, -100, 13);
    if (pp) {
      const pl = new THREE.Group(); const y0 = terrain.height(pp[0], pp[1]);
      const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 18, 12), white); fus.rotation.x = Math.PI / 2; pl.add(fus);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), white); nose.rotation.x = Math.PI / 2; nose.position.z = 9; pl.add(nose);
      const tailc = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4, 12), white); tailc.rotation.x = -Math.PI / 2; tailc.position.z = -11; pl.add(tailc);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 3), red); fin.position.set(0, 2.6, -11.2); pl.add(fin);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(24, 0.35, 3.4), white); wing.position.set(0, -0.4, 0.5); pl.add(wing);
      const stab = new THREE.Mesh(new THREE.BoxGeometry(8, 0.25, 2), white); stab.position.set(0, 0.3, -11.5); pl.add(stab);
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 16, 12, 1, true, Math.PI * 0.35, Math.PI * 0.3), red); stripe.rotation.x = Math.PI / 2; pl.add(stripe);
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.4, 13), dark); win.position.set(0, 0.45, 0.5); pl.add(win);
      for (const sx of [-6, 6]) { const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 3, 10), grey); eng.rotation.x = Math.PI / 2; eng.position.set(sx, -1.0, 1.4); pl.add(eng); }
      for (const [sx, sz] of [[0, 6], [-4, -1], [4, -1]]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 4.2, 6), grey); st.position.set(sx, -3.2, sz); pl.add(st); }
      pl.position.set(pp[0], y0 + 5.3, pp[1]); pl.rotation.y = 0.6; V.add(pl);
    }
    const lp = find(2200, -160, 9);
    if (lp) {
      const lo = new THREE.Group(); const y0 = terrain.height(lp[0], lp[1]);
      for (const sx of [-0.72, 0.72]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 20), grey); rail.position.set(sx, 0.08, 0); lo.add(rail); }
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.9, 3.0, 15), red); body.position.y = 2.6; lo.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 14), grey); roof.position.y = 4.3; lo.add(roof);
      for (const sz of [-7.52, 7.52]) { const w = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 0.05), dark); w.position.set(0, 3.3, sz); lo.add(w); }
      const band = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.25, 15.05), white); band.position.y = 1.6; lo.add(band);
      for (const sz of [-5.5, -3.2, 3.2, 5.5]) for (const sx of [-1.2, 1.2]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 12), black); wh.rotation.z = Math.PI / 2; wh.position.set(sx, 0.7, sz); lo.add(wh); }
      for (const sz of [-4, 4]) { const pan = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), black); pan.position.set(0, 5.3, sz); lo.add(pan); const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), black); arm.position.set(0, 4.8, sz); arm.rotation.x = 0.5; lo.add(arm); }
      lo.position.set(lp[0], y0, lp[1]); lo.rotation.y = 0.4; V.add(lo);
    }
    if (V.children.length) group.add(mergeGroup(V));
  }

  // Spielplätze (OSM leisure=playground): Rutschbahn und Schaukel in der Mitte
  {
    const spots: [number, number, number][] = [];
    for (const g of d.green) {
      if (g.k !== 'playground') continue;
      const [cx, cz] = centroid(g.p);
      if (!pointInPoly(cx, cz, g.p) || mask.at(cx, cz) !== 0 || mask.isRoad(cx, cz)) continue;
      if (Math.abs(signedArea(g.p)) < 60) continue;
      spots.push([cx, cz, hash(cx, cz) * Math.PI * 2]);
    }
    if (spots.length) {
      const P = new THREE.Group(); P.name = 'spielplaetze';
      const slideM = toon('#F2B705'), frameM = toon('#D9472B'), woodM = toon('#9A6A3E'), seatM = toon('#2F7FC1');
      for (const [x, z, a] of spots) {
        const y = terrain.height(x, z), o = new THREE.Group(); o.position.set(x, y, z); o.rotation.y = a;
        const tower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 1.6), woodM); tower.position.set(0, 1.6, 0); o.add(tower);
        for (const [px, pz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), woodM); leg.position.set(px, 1.3, pz); o.add(leg); }
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.9, 4), frameM); roof.position.set(0, 3.0, 0); roof.rotation.y = Math.PI / 4; o.add(roof);
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 3.4), slideM); slide.position.set(0, 0.85, 2.3); slide.rotation.x = 0.5; o.add(slide);
        for (const sx of [-1.4, 1.4]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), frameM); f.position.set(3.2 + sx * 0.0, 1.2, sx); f.rotation.x = sx > 0 ? -0.25 : 0.25; o.add(f); }
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.0), frameM); bar.position.set(3.2, 2.35, 0); o.add(bar);
        for (const sz of [-0.6, 0.6]) { const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.3), seatM); seat.position.set(3.2, 0.55, sz); o.add(seat); for (const k of [-0.2, 0.2]) { const rope = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.8, 0.03), woodM); rope.position.set(3.2 + k, 1.45, sz); o.add(rope); } }
        P.add(o);
      }
      group.add(mergeGroup(P));
    }
  }

  // Zytturm (Museggmauer, swisstopo-Gebäude 190660948): Zifferblätter auf Stadt- und Seeseite, älteste Uhr Luzerns
  if (X0 < -243) {
    const face = canvasTex(128, 128, (g) => {
      g.fillStyle = '#1E2A44'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
      g.strokeStyle = '#E8C04A'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.stroke();
      g.fillStyle = '#E8C04A'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillRect(64 + Math.sin(a) * 46 - 3, 64 - Math.cos(a) * 46 - 3, 6, 6); }
      g.strokeStyle = '#E8C04A'; g.lineCap = 'round'; g.lineWidth = 7; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 26, 64 - 10); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 - 6, 64 - 40); g.stroke();
    });
    const cm = new THREE.MeshBasicMaterial({ map: face, transparent: true, alphaTest: 0.3 });
    for (const [x, z, nx, nz] of [[-241.95, -293.2, 0.345, 0.939], [-244.5, -299.9, -0.345, -0.939]]) {
      const c = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24), cm); c.position.set(x + nx * 0.2, 64, z + nz * 0.2); c.rotation.y = Math.atan2(nx, nz); c.name = 'zytturm-uhr'; group.add(c);
    }
    landmarks.push({ name: 'Museggmauer', x: -245, z: -293 });
    // Museggmauer (OSM barrier=city_wall): Natursteinmauer mit Zinnen, Lücken wo Strassen durchführen
    const lines = [[[162, -422], [140, -404], [125, -393], [104, -373], [89, -364], [70, -356], [-16, -381], [-26, -384], [-72, -368], [-94, -361], [-120, -348], [-150, -334], [-162, -329], [-218, -302], [-243, -290]],
      [[-243, -290], [-248, -288], [-290, -271], [-296, -269], [-336, -254], [-346, -250], [-347, -254], [-391, -243], [-416, -237], [-424, -234], [-460, -219], [-516, -198], [-525, -195], [-609, -168], [-612, -167]]];
    const pieces: number[][] = [];
    const carRd = d.roads.filter((r) => !['footway', 'path', 'steps', 'cycleway', 'track', 'pedestrian'].includes(r.c) && r.p.some(([x, z]) => x > -650 && x < 200 && z > -460 && z < -130));
    const onCarRoad = (x: number, z: number) => carRd.some((r) => { for (let i = 1; i < r.p.length; i++) { const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i]; const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1; const u = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2)); if (Math.hypot(x - ax - u * vx, z - az - u * vz) < r.w / 2 + 1.2) return true; } return false; });
    for (const L of lines) for (let i = 1; i < L.length; i++) {
      const [x1, z1] = L[i - 1], [x2, z2] = L[i]; const len = Math.hypot(x2 - x1, z2 - z1); const n = Math.max(1, Math.round(len / 2));
      for (let k = 0; k < n; k++) { const x = x1 + (x2 - x1) * (k + 0.5) / n, z = z1 + (z2 - z1) * (k + 0.5) / n; if (onCarRoad(x, z)) continue; if (MUSEGG.some(([mx, mz]) => Math.hypot(mx - x, mz - z) < 5)) continue; pieces.push([x, z, len / n, Math.atan2(x2 - x1, z2 - z1)]); }
    }
    if (pieces.length) {
      const wall = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 1, 1), toon('#BFAE8E'), pieces.length), mer = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.9, 0.9), toon('#B3A283'), pieces.length);
      const o = new THREE.Object3D();
      pieces.forEach(([x, z, l, a], i) => {
        const g = terrain.height(x, z), top = g + 8;
        o.position.set(x, (g - 1 + top) / 2, z); o.rotation.set(0, a, 0); o.scale.set(1, top - g + 1, l + 0.05); o.updateMatrix(); wall.setMatrixAt(i, o.matrix);
        o.position.set(x, top + 0.45, z); o.scale.set(1, 1, 1); o.updateMatrix(); mer.setMatrixAt(i, o.matrix);
        const mi = Math.floor((x - mask.x0) / MASK_RES), mj = Math.floor((z - mask.z0) / MASK_RES);
        if (mi > 0 && mj > 0 && mi < mask.w && mj < mask.h) mask.data[mj * mask.w + mi] = 2;
      });
      wall.computeBoundingSphere(); mer.computeBoundingSphere(); wall.name = mer.name = 'museggmauer'; group.add(wall, mer);
    }
  }

  // Nadelwehr in der Reuss (OSM-Weg 27549263): Holznadeln dicht an dicht unter einem schmalen Steg
  if (X0 < -340) {
    const line = [[-342, 79], [-338, 60], [-337, 56]];
    const pts: [number, number][] = [];
    for (let i = 1; i < line.length; i++) { const [x1, z1] = line[i - 1], [x2, z2] = line[i]; const L = Math.hypot(x2 - x1, z2 - z1); for (let t = 0; t < L; t += 0.22) pts.push([x1 + (x2 - x1) * t / L, z1 + (z2 - z1) * t / L]); }
    const ang = Math.atan2(line[2][0] - line[0][0], line[2][1] - line[0][1]);
    const nd = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 2.0, 0.16), toon('#7A5232'), pts.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang), one = new THREE.Vector3(1, 1, 1);
    pts.forEach(([x, z], i) => nd.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0.45, z), q, one))); nd.computeBoundingSphere();
    const W = new THREE.Group(); W.name = 'nadelwehr'; W.add(nd);
    const deckM = toon('#8E959C'), railM = toon('#4E5A63');
    for (let i = 1; i < line.length; i++) {
      const [x1, z1] = line[i - 1], [x2, z2] = line[i]; const L = Math.hypot(x2 - x1, z2 - z1), a = Math.atan2(x2 - x1, z2 - z1);
      const dk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, L + 0.2), deckM); dk.position.set((x1 + x2) / 2, 1.55, (z1 + z2) / 2); dk.rotation.y = a; W.add(dk);
      for (const sd of [-0.75, 0.75]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, L), railM); rl.position.set((x1 + x2) / 2 + Math.cos(a) * sd, 2.6, (z1 + z2) / 2 - Math.sin(a) * sd); rl.rotation.y = a; W.add(rl); }
    }
    group.add(W);
  }

  // Löwendenkmal (in den Fels gehauener Löwe über dem Teich, Denkmalstrasse). Kinderfreundlich: der Löwe schläft.
  if (X0 < 236 && X1 > 236 && Z0 < -757 && Z1 > -757) {
    const L = new THREE.Group(); L.name = 'loewendenkmal';
    const stoneM = toon('#D9C89E'), maneM = toon('#C4AE7E'), nicheM = toon('#8F7D5C');
    const cx = 240.5, cz = -758, ny = 5.4 + 7.5; // Felswand verläuft von (238,-780) nach (252,-738)
    const dirX = 0.316, dirZ = 0.949, nX = -0.949, nZ = 0.316; // Wandrichtung, Normale zum Teich
    const niche = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 1.2), nicheM); niche.position.set(cx - nX * 0.4, ny + 0.5, cz - nZ * 0.4); niche.rotation.y = Math.atan2(dirX, dirZ) + Math.PI / 2; L.add(niche);
    const lion = new THREE.Group(); lion.position.set(cx + nX * 1.6, ny - 2.2, cz + nZ * 1.6); lion.rotation.y = Math.atan2(nX, nZ);
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), stoneM); body.scale.set(2.3, 1.5, 4.6); body.position.set(0, 1.4, -0.6); lion.add(body);
    const mane = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), maneM); mane.position.set(0.9, 2.0, 3.1); lion.add(mane);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.35, 10, 8), stoneM); head.position.set(1.6, 1.4, 3.9); head.scale.set(1, 0.85, 1); lion.add(head);
    for (const e of [-0.5, 0.5]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), maneM); ear.position.set(1.0 + e * 0.6, 2.6, 3.9 + e * 0.9); lion.add(ear); }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), nicheM); nose.position.set(2.85, 1.2, 4.1); lion.add(nose);
    for (const k of [-1, 1]) { const paw = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 2.6), stoneM); paw.position.set(1.6, 0.3, 4.6 + k * 0.2 - 0.6); paw.rotation.y = k * 0.15; lion.add(paw); }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 4.2, 6), stoneM); tail.position.set(1.2, 0.5, -4.6); tail.rotation.x = Math.PI / 2; lion.add(tail);
    L.add(lion);
    group.add(mergeGroup(L));
    landmarks.push({ name: 'Löwendenkmal', x: cx, z: cz });
  }

  await onProgress('Bäume …');
  // ---- Bäume (instanziert) ----
  {
    const trunkG = new THREE.CylinderGeometry(0.35, 0.45, 3, 6); trunkG.translate(0, 1.5, 0);
    const crownG = new THREE.IcosahedronGeometry(2.6, 0); crownG.translate(0, 4.6, 0);
    const trunk = new THREE.InstancedMesh(trunkG, toon('#7A5638'), trees.length);
    const crown = new THREE.InstancedMesh(crownG, toon('#5E9B4F'), trees.length);
    const m = new THREE.Matrix4();
    trees.forEach(([x, z, s], i) => {
      m.makeScale(s, s, s); m.setPosition(x, terrain.ground(x, z) - 0.2, z);
      trunk.setMatrixAt(i, m); crown.setMatrixAt(i, m);
      crown.setColorAt(i, new THREE.Color().setHSL(0.27 + hash(x, z) * 0.06, 0.38, 0.42 + hash(z, x) * 0.1));
    });
    group.add(trunk, crown);
  }
  // 14q: Hecken (OSM barrier=hedge): Reihe aus Büschen (alle 1.6 m, 1.3–2.1 m hoch), nicht auf Strassen, Wasser oder in Häusern
  if (props?.hedges?.length) {
    const bp: number[][] = [];
    for (const h of props.hedges) { let acc = 0;
      for (let i = 1; i < h.length; i++) { const A = h[i - 1], B = h[i], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
        while (acc < L) { const t = acc / L, x = A[0] + (B[0] - A[0]) * t, z = A[1] + (B[1] - A[1]) * t;
          if (!mask.isRoad(x, z) && mask.at(x, z) === 0) bp.push([x, z]); acc += 1.6; }
        acc -= L; } }
    const bg = new THREE.IcosahedronGeometry(1, 0); bg.translate(0, 0.75, 0);
    const bm = new THREE.InstancedMesh(bg, toon('#ffffff'), Math.max(1, bp.length)); bm.count = bp.length;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
    bp.forEach(([x, z], i) => { const r = hash(x, z), r2 = hash(z, x);
      e.set(0, r * 6.28, 0); q.setFromEuler(e); sc.set(1.0 + r2 * 0.35, 1.1 + r * 0.7, 1.0 + r * 0.35);
      m.compose(v.set(x, terrain.ground(x, z) - 0.25, z), q, sc); bm.setMatrixAt(i, m); bm.setColorAt(i, c.setHSL(0.27 + r2 * 0.06, 0.5, 0.2 + r * 0.08)); });
    bm.computeBoundingSphere(); bm.name = 'hecken'; group.add(chunkInstanced(bm, 1500));
    console.log('[bau] Hecken-Büsche', bp.length);
  }

  await onProgress('Wald …');
  group.add(buildForest(d.green.filter((g) => g.k === 'forest').map((g) => g.p), terrain, mask, opts.forestStep ?? 8, opts.forestMask, opts.coarse ? 700 : 1000));

  if (props) { // Kantonsstrassen innerorts ohne erfasste Laternen: alle 32 m eine Laterne am rechten Rand (Annahme; OSM kennt nur einen Teil der Laternen)
    const cell = new Map<string, number[][]>(); const ck = (x: number, z: number) => Math.floor(x / 40) + ',' + Math.floor(z / 40);
    for (const l of props.lamps) { const k = ck(l[0], l[1]); if (!cell.has(k)) cell.set(k, []); cell.get(k)!.push(l); }
    const near = (x: number, z: number) => { const i = Math.floor(x / 40), j = Math.floor(z / 40); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const l of cell.get((i + a) + ',' + (j + b)) || []) if (Math.hypot(l[0] - x, l[1] - z) < 26) return true; return false; };
    let add = 0;
    for (const r of d.roads) { if (!r.L || r.b || (r.v || 50) > 50 || !['primary', 'secondary', 'tertiary'].includes(r.c)) continue;
      const e = offsetLine(r.p, r.w / 2 + (r.sw?.[1] ? 1.6 : 0.5)); let acc = 16;
      for (let i = 1; i < e.length; i++) { const L = Math.hypot(e[i][0] - e[i - 1][0], e[i][1] - e[i - 1][1]);
        while (acc < L) { const t = acc / L, x = e[i - 1][0] + (e[i][0] - e[i - 1][0]) * t, z = e[i - 1][1] + (e[i][1] - e[i - 1][1]) * t;
          if (!near(x, z) && mask.at(x, z) !== 2) { props.lamps.push([x, z, 1]); const k = ck(x, z); if (!cell.has(k)) cell.set(k, []); cell.get(k)!.push([x, z]); add++; } acc += 32; }
        acc -= L; } }
    console.log('[bau] Laternen ergänzt', add);
    await onProgress('Stege und Laternen …'); group.add(buildProps(props, terrain, mask)); }

  // ---- Berge am Horizont (Pilatus im SW, Rigi im O) ----
  if (!terrain.hz) group.add(mountains());

  // Bäume sind Hindernisse (Stamm)
  for (const [x, z] of trees) {
    const i = Math.floor((x - mask.x0) / MASK_RES), j = Math.floor((z - mask.z0) / MASK_RES);
    if (i > 0 && j > 0 && i < mask.w && j < mask.h && mask.data[j * mask.w + i] === 0) mask.data[j * mask.w + i] = 2;
  }

  // grosse Flächennetze (Wasser, Strassen, Wege …) in 400-m-Kacheln teilen → Frustum Culling + Sichtweite greifen
  for (const c of [...group.children]) {
    const m = c as THREE.Mesh;
    if (!(m as any).isMesh || (m as any).isInstancedMesh || !m.geometry || Array.isArray(m.material) || (m.geometry as THREE.BufferGeometry).groups.length > 1) continue;
    const g = m.geometry as THREE.BufferGeometry; const tris = g.index ? g.index.count / 3 : g.getAttribute('position').count / 3;
    if (!g.boundingSphere) g.computeBoundingSphere();
    if (tris < 30000 || g.boundingSphere!.radius < 500) continue;
    const parts = splitTiles(m, 400); if (parts.length < 2) continue;
    group.remove(m); for (const p of parts) group.add(p);
  }

  // Speicher: CPU-Kopien der Geometrie nach dem Hochladen auf die Grafikkarte freigeben (Boden bleibt für Höhenabfragen)
  if (opts.freeCPU) {
    const free = function (this: any) { this.array = null; };
    group.traverse((o: any) => {
      const g = o.geometry as THREE.BufferGeometry | undefined;
      if (!g || o.isInstancedMesh || o.name === 'ground') return;
      if (!g.boundingSphere) g.computeBoundingSphere(); if (!g.boundingBox) g.computeBoundingBox();
      for (const a of Object.values(g.attributes) as THREE.BufferAttribute[]) if (a.isBufferAttribute && !(a as any).isInstancedBufferAttribute) a.onUpload(free);
      if (g.index) g.index.onUpload(free);
    });
  }

  return { group, mask, minimap, bounds: d.meta.bounds, pois: d.pois, hospital, landmarks, water: waterMeshes, roadsByName, groundAt: (ground.geometry as any).sampler };
}

/** Mesh nach Dreiecks-Schwerpunkt in Kacheln aufteilen (Attribute bleiben geteilt bzw. werden kopiert) */
function splitTiles(m: THREE.Mesh, size: number): THREE.Mesh[] {
  const g = m.geometry as THREE.BufferGeometry, P = g.getAttribute('position'), I = g.index;
  const nT = I ? I.count / 3 : P.count / 3, ox = m.position.x, oz = m.position.z;
  const buckets = new Map<string, number[]>();
  for (let t = 0; t < nT; t++) {
    let sx = 0, sz = 0; for (let k = 0; k < 3; k++) { const v = I ? I.getX(t * 3 + k) : t * 3 + k; sx += P.getX(v); sz += P.getZ(v); }
    const key = Math.floor((sx / 3 + ox) / size) + ',' + Math.floor((sz / 3 + oz) / size);
    let L = buckets.get(key); if (!L) buckets.set(key, (L = [])); L.push(t);
  }
  const out: THREE.Mesh[] = [];
  for (const L of buckets.values()) {
    const ng = new THREE.BufferGeometry();
    if (I) { for (const [n, a] of Object.entries(g.attributes)) ng.setAttribute(n, a); const ix = new Uint32Array(L.length * 3); L.forEach((t, j) => { ix[j * 3] = I.getX(t * 3); ix[j * 3 + 1] = I.getX(t * 3 + 1); ix[j * 3 + 2] = I.getX(t * 3 + 2); }); ng.setIndex(new THREE.BufferAttribute(ix, 1)); }
    else for (const [n, a0] of Object.entries(g.attributes)) { const a = a0 as THREE.BufferAttribute, isz = a.itemSize, src = a.array as any, arr = new (src.constructor)(L.length * 3 * isz);
      L.forEach((t, j) => { for (let k = 0; k < 3 * isz; k++) arr[j * 3 * isz + k] = src[t * 3 * isz + k]; }); ng.setAttribute(n, new THREE.BufferAttribute(arr, isz, a.normalized)); }
    // Hüllkugel nur aus den eigenen Dreiecken
    const box = new THREE.Box3(), v = new THREE.Vector3();
    for (const t of L) for (let k = 0; k < 3; k++) { const vi = I ? I.getX(t * 3 + k) : t * 3 + k; box.expandByPoint(v.set(P.getX(vi), P.getY(vi), P.getZ(vi))); }
    ng.boundingBox = box; ng.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    if ((g as any).sampler) (ng as any).sampler = (g as any).sampler;
    const nm = new THREE.Mesh(ng, m.material); nm.name = m.name; nm.position.copy(m.position); nm.rotation.copy(m.rotation); nm.scale.copy(m.scale);
    nm.renderOrder = m.renderOrder; nm.userData = m.userData; nm.onBeforeRender = m.onBeforeRender; out.push(nm);
  }
  return out;
}

/** Wald: dichte, hohe Bäume (Nadel/Laub gemischt) in 400-m-Kacheln, ab 1.1 km ausgeblendet (Nebel) */
export interface ForestMask { w: number; h: number; x0: number; z0: number; step: number; data: Uint8Array }
function buildForest(polys: number[][][], terrain: Terrain, mask: Mask, step: number, fm?: ForestMask, lodDist = 1000) {
  const out = new THREE.Group(); out.name = 'forest';
  const tiles = new Map<string, number[][]>();
  const put = (x: number, z: number) => {
    if (mask.isRoad(x, z) || mask.at(x, z) !== 0 || mask.isRoad(x + 3, z) || mask.isRoad(x - 3, z) || mask.isRoad(x, z + 3) || mask.isRoad(x, z - 3)) return;
    const k = Math.floor(x / 400) + ',' + Math.floor(z / 400); let L = tiles.get(k); if (!L) tiles.set(k, (L = []));
    const r = hash(x * 1.3, z * 0.7); L.push([x, z, 1.1 + r * 0.9, hash(z, x * 2) < 0.6 ? 1 : 0]);
    const i = Math.floor((x - mask.x0) / MASK_RES), j = Math.floor((z - mask.z0) / MASK_RES); mask.data[j * mask.w + i] = 2; // Stamm = Hindernis
  };
  // Wald aus dem Luftbild (SWISSIMAGE, dunkelgrün + Struktur, kleine Flecken entfernt)
  if (fm) for (let gz = fm.z0 + step / 2; gz < fm.z0 + fm.h * fm.step; gz += step) for (let gx = fm.x0 + step / 2; gx < fm.x0 + fm.w * fm.step; gx += step) {
    const x = gx + (hash(gx, gz) - 0.5) * step * 0.9, z = gz + (hash(gz, gx + 1) - 0.5) * step * 0.9;
    const i = Math.floor((x - fm.x0) / fm.step), j = Math.floor((z - fm.z0) / fm.step);
    if (i < 0 || j < 0 || i >= fm.w || j >= fm.h || !fm.data[j * fm.w + i]) continue;
    // Abstand zu Strassen und Häusern (Luftbild-Wald enthält auch Alleen/Gartenbäume): keine Hindernisse an Fahrbahnrändern
    let near = false; for (const [a, b] of [[6, 0], [-6, 0], [0, 6], [0, -6], [4.5, 4.5], [-4.5, 4.5], [4.5, -4.5], [-4.5, -4.5]]) { if (mask.isRoad(x + a, z + b) || mask.at(x + a, z + b) === 2) { near = true; break; } }
    if (near) continue;
    put(x, z);
  }
  for (const p of fm ? [] : polys) {
    const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    for (let gx = x0; gx < x1; gx += step) for (let gz = z0; gz < z1; gz += step) {
      const x = gx + (hash(gx, gz) - 0.5) * step * 0.9, z = gz + (hash(gz, gx + 1) - 0.5) * step * 0.9;
      if (pointInPoly(x, z, p)) put(x, z);
    }
  }
  const trunkG = new THREE.CylinderGeometry(0.28, 0.4, 4, 5); trunkG.translate(0, 2, 0);
  const coneG = new THREE.ConeGeometry(2.5, 9.5, 7); coneG.translate(0, 8, 0);
  const leafG = new THREE.IcosahedronGeometry(3.6, 0); leafG.scale(1, 1.15, 1); leafG.translate(0, 7, 0);
  const trunkM = toon('#6B4A30'), coneM = toon('#ffffff'), leafM = toon('#ffffff');
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  for (const L of tiles.values()) {
    const nC = L.filter((t) => t[3] === 1).length, nL = L.length - nC;
    const trunk = new THREE.InstancedMesh(trunkG, trunkM, L.length), cone = new THREE.InstancedMesh(coneG, coneM, Math.max(1, nC)), leaf = new THREE.InstancedMesh(leafG, leafM, Math.max(1, nL));
    cone.count = nC; leaf.count = nL; let ic = 0, il = 0;
    L.forEach(([x, z, s, t], i) => {
      e.set(0, hash(x, z) * 6.28, 0); q.setFromEuler(e); sc.set(s, s * (0.9 + hash(z, x) * 0.3), s);
      m.compose(v.set(x, terrain.ground(x, z) - 0.3, z), q, sc); trunk.setMatrixAt(i, m);
      if (t === 1) { cone.setMatrixAt(ic, m); cone.setColorAt(ic++, col.setHSL(0.36 + hash(x, z) * 0.04, 0.42, 0.22 + hash(z, x) * 0.07)); }
      else { leaf.setMatrixAt(il, m); leaf.setColorAt(il++, col.setHSL(0.25 + hash(x, z) * 0.07, 0.45, 0.3 + hash(z, x) * 0.1)); }
    });
    const g = new THREE.Group();
    for (const im of [trunk, cone, leaf]) { im.computeBoundingSphere(); im.name = 'forest-trees'; g.add(im); }
    // LOD misst ab seiner Position → Kachelmitte; Inhalt zurückverschieben
    let cx = 0, cz = 0; for (const t of L) { cx += t[0]; cz += t[1]; } cx /= L.length; cz /= L.length;
    const lod = new THREE.LOD(); lod.position.set(cx, terrain.ground(cx, cz), cz); g.position.set(-cx, -terrain.ground(cx, cz), -cz);
    lod.addLevel(g, 0); lod.addLevel(new THREE.Object3D(), lodDist);
    out.add(lod);
  }
  (out as any).count = [...tiles.values()].reduce((a, L) => a + L.length, 0);
  return out;
}

/** UV ins Luftbild: lokale Meter → WGS84 → LV95 (swisstopo-Näherungsformeln), Bildausschnitt E 2662190–2668910, N 1205150–1212690 */
export const AERIAL = { E0: 2662190, E1: 2668910, N0: 1205150, N1: 1212690 };
export function lv95(x: number, z: number): [number, number] {
  const LAT0 = 47.0517, LON0 = 8.3077, KX = Math.cos(LAT0 * Math.PI / 180) * 111320, KZ = 110574;
  const lon = LON0 + x / KX, lat = LAT0 - z / KZ, p = (lat * 3600 - 169028.66) / 10000, l = (lon * 3600 - 26782.5) / 10000;
  return [2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3,
    1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3];
}
function setAerialUV(g: THREE.BufferGeometry) {
  const P = g.getAttribute('position'), uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) { const [E, N] = lv95(P.getX(i), P.getZ(i)); uv[i * 2] = (E - AERIAL.E0) / (AERIAL.E1 - AERIAL.E0); uv[i * 2 + 1] = (N - AERIAL.N0) / (AERIAL.N1 - AERIAL.N0); }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function treeOk(mask: Mask, x: number, z: number) {
  for (const [a, b] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, -2], [2, -2], [-2, 2]]) {
    if (mask.isRoad(x + a, z + b) || mask.at(x + a, z + b) !== 0) return false;
  }
  return true;
}

export function pointInPoly(x: number, z: number, p: number[][]) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function ribbon(pos: number[], col: number[], p: number[][], w: number, y: number, c: THREE.Color, joints: boolean) {
  const hw = w / 2;
  for (let i = 0; i < p.length - 1; i++) {
    const [x1, z1] = p[i], [x2, z2] = p[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.01) continue;
    const nx = -(z2 - z1) / len * hw, nz = (x2 - x1) / len * hw;
    const a = [x1 + nx, z1 + nz], b = [x1 - nx, z1 - nz], cc = [x2 - nx, z2 - nz], dd = [x2 + nx, z2 + nz];
    for (const v of [a, cc, b, a, dd, cc]) { pos.push(v[0], y, v[1]); col.push(c.r, c.g, c.b); }
    if (joints && i > 0) {
      // runde Gelenke nur bei echten Knicken (spart Dreiecke)
      const [x0, z0] = p[i - 1];
      const a1 = Math.atan2(z1 - z0, x1 - x0), a2 = Math.atan2(z2 - z1, x2 - x1);
      let da = Math.abs(a2 - a1); if (da > Math.PI) da = 2 * Math.PI - da;
      if (da > 0.25) {
        const seg = 6;
        for (let k = 0; k < seg; k++) {
          const t1 = (k / seg) * Math.PI * 2, t2 = ((k + 1) / seg) * Math.PI * 2;
          pos.push(x1, y, z1, x1 + Math.cos(t2) * hw, y, z1 + Math.sin(t2) * hw, x1 + Math.cos(t1) * hw, y, z1 + Math.sin(t1) * hw);
          for (let q = 0; q < 3; q++) col.push(c.r, c.g, c.b);
        }
      }
    }
  }
}

function capEnd(pos: number[], col: number[], x1: number, z1: number, hw: number, y: number, c: THREE.Color) {
  const seg = 6;
  for (let k = 0; k < seg; k++) {
    const t1 = (k / seg) * Math.PI * 2, t2 = ((k + 1) / seg) * Math.PI * 2;
    pos.push(x1, y, z1, x1 + Math.cos(t2) * hw, y, z1 + Math.sin(t2) * hw, x1 + Math.cos(t1) * hw, y, z1 + Math.sin(t1) * hw);
    for (let q = 0; q < 3; q++) col.push(c.r, c.g, c.b);
  }
}

function trimLine(p: number[][], d: number): number[][] {
  const cut = (q: number[][]) => { let left = d; const r = [q[0]]; let i = 0;
    while (i < q.length - 1) { const L = Math.hypot(q[i + 1][0] - q[i][0], q[i + 1][1] - q[i][1]); if (L > left) { const t = left / L; r[0] = [q[i][0] + (q[i + 1][0] - q[i][0]) * t, q[i][1] + (q[i + 1][1] - q[i][1]) * t]; return [r[0], ...q.slice(i + 1)]; } left -= L; i++; }
    return []; };
  const a = cut(p); if (a.length < 2) return []; const b = cut(a.slice().reverse()); return b.length < 2 ? [] : b.reverse();
}
function edgeLines(out: number[], p: number[][], off: number, y: number) {
  // durchgehender Streifen mit Gehrung: Normale je Punkt = Mittel der angrenzenden Segmentnormalen (begrenzt)
  const n = p.length; if (n < 2) return;
  const N: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)], c = p[i];
    const d1 = i > 0 ? [c[0] - a[0], c[1] - a[1]] : [b[0] - c[0], b[1] - c[1]], d2 = i < n - 1 ? [b[0] - c[0], b[1] - c[1]] : d1;
    const l1 = Math.hypot(d1[0], d1[1]) || 1, l2 = Math.hypot(d2[0], d2[1]) || 1;
    const n1 = [-d1[1] / l1, d1[0] / l1], n2 = [-d2[1] / l2, d2[0] / l2];
    let mx = n1[0] + n2[0], mz = n1[1] + n2[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    const k = Math.min(1.6, 1 / Math.max(0.3, mx * n1[0] + mz * n1[1])); N.push([mx * k, mz * k]);
  }
  const hw = 0.08;
  for (const sgn of [-1, 1]) for (let i = 0; i < n - 1; i++) {
    const o1 = sgn * off, A = p[i], B = p[i + 1], NA = N[i], NB = N[i + 1];
    const q = [[A[0] + NA[0] * (o1 - hw), A[1] + NA[1] * (o1 - hw)], [B[0] + NB[0] * (o1 - hw), B[1] + NB[1] * (o1 - hw)], [B[0] + NB[0] * (o1 + hw), B[1] + NB[1] * (o1 + hw)], [A[0] + NA[0] * (o1 + hw), A[1] + NA[1] * (o1 + hw)]];
    for (const k of [0, 2, 1, 0, 3, 2]) out.push(q[k][0], y, q[k][1]);
  }
}

/** Luzerner Datensatz (enthält die Altstadt): erkennbar am Spielfeld-Ursprung innerhalb der Grenzen */
const REGION_IS_LUZERN = (d: CityData) => { const [x0, z0, x1, z1] = d.meta.bounds; return x0 < 0 && x1 > 0 && z0 < 0 && z1 > 0; };
/** Bahnhofplatz: Wartehallen (OSM building=roof: Glasdach auf Stahlstützen) und Wagenbachbrunnen (Becken mit Wasserspielen) */
function bahnhofExtras(d: CityData, terrain: Terrain) {
  const G = new THREE.Group(); G.name = 'bahnhofplatz';
  const steel = toon('#5B6168'), glass = new THREE.MeshLambertMaterial({ color: '#BFD6E2', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const posts: THREE.BufferGeometry[] = [], roofs: THREE.BufferGeometry[] = [], frames: THREE.BufferGeometry[] = [];
  for (const sh of d.shelters || []) {
    const y0 = Math.min(...sh.p.map(([x, z]) => terrain.height(x, z))), H = Math.min(Math.max(sh.h, 3.2), 8);
    const shape = new THREE.Shape(sh.p.map(([x, z]) => new THREE.Vector2(x, -z)));
    const rg = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false }); rg.rotateX(-Math.PI / 2); rg.translate(0, y0 + H, 0); roofs.push(rg);
    // Stützen alle ~8 m entlang des Umrisses, 0.6 m eingerückt
    const [cx, cz] = centroid(sh.p);
    for (let i = 0; i < sh.p.length; i++) { const A = sh.p[i], B = sh.p[(i + 1) % sh.p.length]; const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      for (let t = 0; t < L; t += 8) { const x = A[0] + (B[0] - A[0]) * t / L, z = A[1] + (B[1] - A[1]) * t / L; const k = 0.6 / Math.max(1, Math.hypot(cx - x, cz - z));
        const g = new THREE.CylinderGeometry(0.09, 0.09, H, 6); g.translate(x + (cx - x) * k, y0 + H / 2, z + (cz - z) * k); posts.push(g); } }
    const eg = new THREE.EdgesGeometry(rg); frames.push(eg);
  }
  if (roofs.length) { G.add(new THREE.Mesh(mergeGeometries(roofs)!, glass)); G.add(new THREE.Mesh(mergeGeometries(posts)!, steel)); G.add(new THREE.LineSegments(mergeGeometries(frames)!, new THREE.LineBasicMaterial({ color: '#4A5058' }))); }
  if (d.wagenbach) { // Wagenbachbrunnen auf dem Europaplatz: flaches Becken, Steinrand, Fontänen
    const p = d.wagenbach, y0 = Math.min(...p.map(([x, z]) => terrain.height(x, z)));
    const rim = new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
    const rg = new THREE.ExtrudeGeometry(rim, { depth: 0.55, bevelEnabled: false }); rg.rotateX(-Math.PI / 2); rg.translate(0, y0, 0);
    const rm = new THREE.Mesh(rg, toon('#B9B3A6')); G.add(rm, outline(rm));
    const [cx, cz] = centroid(p); const inner = p.map(([x, z]) => new THREE.Vector2(cx + (x - cx) * 0.9, -(cz + (z - cz) * 0.9)));
    const wg = new THREE.ShapeGeometry(new THREE.Shape(inner)); wg.rotateX(-Math.PI / 2); wg.translate(0, y0 + 0.58, 0);
    G.add(new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ color: '#4FA3C7' })));
    const jet = new THREE.MeshLambertMaterial({ color: '#E8F6FF', transparent: true, opacity: 0.7 });
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; const j = new THREE.Mesh(new THREE.ConeGeometry(0.22, 2.2 + (k % 3) * 0.6, 6), jet);
      j.position.set(cx + Math.cos(a) * 3, y0 + 1.6, cz + Math.sin(a) * 3); G.add(j); }
  }
  return G;
}
/** Altes Bahnhofstor Luzern (Rest des 1971 abgebrannten Bahnhofs, Neubarock, Sandstein; Figurengruppe «Zeitgeist» von R. Kissling oben).
 *  Grundriss aus OSM (20.5 × 5.2 m), Masse geschätzt nach Foto (Commons «Torbogen Lucerne»): Bogen 7 m breit, Scheitel 11 m, Gesims 13 m, Attika bis 16 m. */
function torbogen(p: number[][], terrain: Terrain) {
  const G = new THREE.Group(); G.name = 'torbogen';
  // Längsachse = längste Kante
  let best = 0, ax = 1, az = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > best) { best = L; ax = (b[0] - a[0]) / L; az = (b[1] - a[1]) / L; } }
  const [cx, cz] = centroid(p); const W = Math.min(22, best), D = 5.2;
  const y0 = Math.min(...p.map(([x, z]) => terrain.ground(x, z)));
  G.position.set(cx, y0, cz); G.rotation.y = -Math.atan2(az, ax);
  const stone = toon('#CFC4AC'), dark = toon('#B5A98F'), bronze = toon('#4E6B5A');
  const sh = new THREE.Shape(); sh.moveTo(-W / 2, 0); sh.lineTo(W / 2, 0); sh.lineTo(W / 2, 13); sh.lineTo(-W / 2, 13); sh.lineTo(-W / 2, 0);
  const hole = new THREE.Path(); hole.moveTo(-3.5, 0); hole.lineTo(-3.5, 7.5); hole.absarc(0, 7.5, 3.5, Math.PI, 0, true); hole.lineTo(3.5, 0); hole.lineTo(-3.5, 0); sh.holes.push(hole);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 16 }), stone); body.position.z = -D / 2; G.add(body, outline(body));
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); G.add(b); return b; };
  G.add(outline(box(W + 1, 0.9, D + 1, 0, 13.45, 0, dark)));            // Hauptgesims
  G.add(outline(box(W - 4, 2.6, D - 0.6, 0, 15.2, 0, stone)));          // Attika
  box(W - 3.4, 0.5, D - 0.2, 0, 16.7, 0, dark);
  box(W + 0.4, 1.2, D + 0.4, 0, 0.6, 0, dark);                           // Sockel
  for (const sz of [-1, 1]) for (const x of [-6.2, -4.6, 4.6, 6.2]) {     // Säulen vor beiden Seiten
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 10.6, 12), stone); c.position.set(x, 6.5, sz * (D / 2 + 0.45)); G.add(c);
    box(1.2, 0.6, 1.2, x, 12.1, sz * (D / 2 + 0.45), dark); box(1.2, 1.0, 1.2, x, 1.2, sz * (D / 2 + 0.45), dark); }
  box(1.4, 1.6, 0.5, 0, 10.6, D / 2 + 0.1, dark); box(1.4, 1.6, 0.5, 0, 10.6, -D / 2 - 0.1, dark); // Schlussstein
  // Figurengruppe (vereinfacht): Sockel, Wagen und Figuren in Bronze-Grün
  box(5, 1.2, 3, 0, 17.6, 0, dark);
  const fig = new THREE.Mesh(new THREE.ConeGeometry(1.3, 4.2, 7), bronze); fig.position.set(0, 20.3, 0); G.add(fig);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), bronze); head.position.set(0, 22.7, 0); G.add(head);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.6, 0.35), bronze); arm.position.set(0.9, 22.8, 0); arm.rotation.z = -0.5; G.add(arm);
  for (const sx of [-1.8, 1.8]) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.6, 6), bronze); f.position.set(sx, 19.5, 0.4); G.add(f); }
  G.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return G;
}
/** Versetzte Linie (Gehrung, begrenzt) einer Polylinie; off > 0 = rechts in Punktfolge (x Ost, z Süd) */
function offsetLine(p: number[][], off: number): number[][] {
  const n = p.length, out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)], c = p[i];
    const d1 = i > 0 ? [c[0] - a[0], c[1] - a[1]] : [b[0] - c[0], b[1] - c[1]], d2 = i < n - 1 ? [b[0] - c[0], b[1] - c[1]] : d1;
    const l1 = Math.hypot(d1[0], d1[1]) || 1, l2 = Math.hypot(d2[0], d2[1]) || 1;
    const n1 = [-d1[1] / l1, d1[0] / l1], n2 = [-d2[1] / l2, d2[0] / l2];
    let mx = n1[0] + n2[0], mz = n1[1] + n2[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    const k = Math.min(1.6, 1 / Math.max(0.3, mx * n1[0] + mz * n1[1])); out.push([c[0] + mx * k * off, c[1] + mz * k * off]);
  }
  return out;
}
/** Linie (durchgezogen: gap = 0, sonst Strich/Lücke in m) als Dreiecke in out */
function strokeLine(out: number[], p: number[][], y: number, width: number, dash = 0, gap = 0) {
  const hw = width / 2; let s0 = 0;
  for (let i = 0; i < p.length - 1; i++) {
    const [x1, z1] = p[i], [x2, z2] = p[i + 1]; const len = Math.hypot(x2 - x1, z2 - z1); if (len < 0.01) continue;
    const ux = (x2 - x1) / len, uz = (z2 - z1) / len, nx = -uz * hw, nz = ux * hw;
    const quad = (a: number, b: number) => { const ax = x1 + ux * a, az = z1 + uz * a, bx = x1 + ux * b, bz = z1 + uz * b;
      out.push(ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz, ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz); };
    if (!gap) { quad(0, len); continue; }
    const per = dash + gap; let t = 0;
    while (t < len) { const ph = (s0 + t) % per; if (ph < dash) { const e = Math.min(len, t + dash - ph); quad(t, e); t = e; } else t += per - ph; }
    s0 += len;
  }
}
/** Kantonsstrasse nach SN 640 850 / SSV: Leitlinien weiss 3/6 m innerorts (ausserorts 6/12 m, Annahme), Sicherheitslinie bei ≥ 4 Streifen,
 *  Rad- und Busstreifen gelb mit Velo-/BUS-Zeichen, Randlinien nur ausserorts (Tempo > 50), Trottoir 2 m mit Randstein 12 cm. */
function mainMarkings(r: CityData['roads'][0], y: number, white: number[], yellow: number[], walk: { pos: number[]; col: number[] }, decals: number[][], j0: boolean, j1: boolean, posts: number[][] = []) {
  const W = r.w, L = Math.max(1, r.L || 2), cyL = r.cy?.[0] ? 1 : 0, cyR = r.cy?.[1] ? 1 : 0, out = (r.v || 50) > 50;
  const lw = (W - 1.5 * (cyL + cyR)) / L, nb = r.o ? 0 : Math.floor(L / 2);
  // an Knoten 6 m frei lassen
  let p = r.p; { const tr = (q: number[][]) => { const t = trimLine(q.concat([q[q.length - 1]]), 6); return t.length >= 2 ? t : []; };
    if (j0 && j1) p = trimLine(p, 6); else if (j0) { const t = tr(p.slice().reverse()); p = t.length ? t.reverse() : []; } else if (j1) p = tr(p); }
  const dash = out ? 6 : 3, gap = out ? 12 : 6;
  if (p.length >= 2) {
    let x = -W / 2;
    if (cyL) { x += 1.5; strokeLine(yellow, offsetLine(p, x), y, 0.15); }
    for (let k = 1; k < L; k++) { const o = x + lw * k;
      const busEdge = (r.bu?.[0] && k === 1) || (r.bu?.[1] && k === L - 1);
      if (busEdge) strokeLine(yellow, offsetLine(p, o), y, 0.15);
      else if (k === nb && nb > 0) { if (L >= 4) { strokeLine(white, offsetLine(p, o - 0.13), y, 0.15); strokeLine(white, offsetLine(p, o + 0.13), y, 0.15); } else strokeLine(white, offsetLine(p, o), y, 0.15, dash, gap); }
      else strokeLine(white, offsetLine(p, o), y, 0.15, dash, gap); }
    if (cyR) strokeLine(yellow, offsetLine(p, W / 2 - 1.5), y, 0.15);
    if (out) { if (!cyL) strokeLine(white, offsetLine(p, -W / 2 + 0.3), y, 0.15); if (!cyR) strokeLine(white, offsetLine(p, W / 2 - 0.3), y, 0.15);
      // Leitpfosten ausserorts (SN 640 822): weiss mit schwarzem Band, beidseitig etwa alle 50 m, 0.8 m neben dem Fahrbahnrand
      for (const sd of [-1, 1]) { const e = offsetLine(p, sd * (W / 2 + 0.8)); let acc = 25;
        for (let i = 1; i < e.length; i++) { const L = Math.hypot(e[i][0] - e[i - 1][0], e[i][1] - e[i - 1][1]); while (acc < L) { const t = acc / L; posts.push([e[i - 1][0] + (e[i][0] - e[i - 1][0]) * t, e[i - 1][1] + (e[i][1] - e[i - 1][1]) * t]); acc += 50; } acc -= L; } } }
    // Zeichen: Velo in Radstreifen, BUS im Busstreifen, alle 45 m
    let len = 0; for (let i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    for (let s = 12; s < len - 8; s += 45) { let acc = 0;
      for (let i = 1; i < p.length; i++) { const sl = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); if (acc + sl < s) { acc += sl; continue; }
        const t = (s - acc) / sl, ux = (p[i][0] - p[i - 1][0]) / sl, uz = (p[i][1] - p[i - 1][1]) / sl, cx = p[i - 1][0] + ux * sl * t, cz = p[i - 1][1] + uz * sl * t, nx = -uz, nz = ux;
        if (cyR) decals.push([0, cx + nx * (W / 2 - 0.75), cz + nz * (W / 2 - 0.75), ux, uz]);
        if (cyL) decals.push([0, cx - nx * (W / 2 - 0.75), cz - nz * (W / 2 - 0.75), -ux, -uz]);
        if (r.bu?.[1]) { const o = W / 2 - 1.5 * cyR - lw / 2; decals.push([1, cx + nx * o, cz + nz * o, ux, uz]); }
        if (r.bu?.[0]) { const o = W / 2 - 1.5 * cyL - lw / 2; decals.push([1, cx - nx * o, cz - nz * o, -ux, -uz]); }
        break; } }
  }
  // Bankett ausserorts (ohne Trottoir): 0.7 m Kies-/Grasrand neben der Fahrbahn statt hartem Übergang zum Luftbild
  if ((r.v || 50) > 50) { const kc = new THREE.Color('#8C8576');
    for (const [sd, on] of [[-1, r.sw?.[0]], [1, r.sw?.[1]]] as [number, number | undefined][]) { if (on) continue;
      const e = offsetLine(r.p, sd * W / 2), o = offsetLine(r.p, sd * (W / 2 + 0.7));
      for (let i = 0; i < r.p.length - 1; i++) { walk.pos.push(e[i][0], y - 0.02, e[i][1], o[i + 1][0], y - 0.02, o[i + 1][1], e[i + 1][0], y - 0.02, e[i + 1][1], e[i][0], y - 0.02, e[i][1], o[i][0], y - 0.02, o[i][1], o[i + 1][0], y - 0.02, o[i + 1][1]); for (let k = 0; k < 6; k++) walk.col.push(kc.r, kc.g, kc.b); } } }
  // Trottoirs: 2 m, 12 cm höher, Randstein hellgrau
  const curbC = new THREE.Color('#B9B6AE'), swC = new THREE.Color('#8F9093');
  for (const [sd, on] of [[-1, r.sw?.[0]], [1, r.sw?.[1]]] as [number, number | undefined][]) { if (!on) continue;
    const e = offsetLine(r.p, sd * W / 2), e2 = offsetLine(r.p, sd * (W / 2 + 0.18)), o = offsetLine(r.p, sd * (W / 2 + 2.2));
    for (let i = 0; i < r.p.length - 1; i++) {
      const tri = (A: number[], B: number[], C: number[], ya: number, yb: number, yc: number, c: THREE.Color) => { walk.pos.push(A[0], ya, A[1], B[0], yb, B[1], C[0], yc, C[1]); for (let q = 0; q < 3; q++) walk.col.push(c.r, c.g, c.b); };
      const yh = y + 0.12;
      tri(e[i], e[i + 1], e[i + 1], y, y, yh, curbC); tri(e[i], e[i + 1], e[i], y, yh, yh, curbC); // Randstein-Stirnseite
      tri(e[i], e2[i + 1], e[i + 1], yh, yh, yh, curbC); tri(e[i], e2[i], e2[i + 1], yh, yh, yh, curbC); // Randstein oben
      tri(e2[i], o[i + 1], e2[i + 1], yh, yh, yh, swC); tri(e2[i], o[i], o[i + 1], yh, yh, yh, swC); // Trottoir
    }
  }
}
/** Gelbe Bodenzeichen (Velo, BUS) als flache Rechtecke 1.2 × 2.4 m bzw. 1.8 × 4 m, Textur aus Canvas */
function arrowTex() { // 6 Pfeile nebeneinander (je 64 × 256 px, Spitze oben = Fahrtrichtung): geradeaus, links, rechts, geradeaus+links, geradeaus+rechts, links+rechts
  return canvasTex(384, 256, (g) => { g.clearRect(0, 0, 384, 256); g.fillStyle = '#F5F1E6'; g.strokeStyle = '#F5F1E6'; g.lineWidth = 12; g.lineCap = 'butt';
    const head = (x: number, y: number, ang: number) => { g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, -30); g.lineTo(-20, 8); g.lineTo(20, 8); g.closePath(); g.fill(); g.restore(); };
    const th = (c: number) => { g.beginPath(); g.moveTo(c, 250); g.lineTo(c, 40); g.stroke(); head(c, 40, 0); };
    const turn = (c: number, sd: number) => { g.beginPath(); g.moveTo(c, 250); g.lineTo(c, 130); g.quadraticCurveTo(c, 100, c + sd * 18, 100); g.stroke(); head(c + sd * 20, 100, sd * Math.PI / 2); };
    th(32); turn(96, -1); turn(160, 1); th(224); turn(224, -1); th(288); turn(288, 1); turn(352, -1); turn(352, 1); }, false);
}
function roadDecals(list: number[][], terrain: Terrain, arrows = false) {
  if (arrows) { const tex = arrowTex(); const pos: number[] = [], uv: number[] = [];
    for (const [k, x, z, ux, uz] of list) { const hw = 0.6, hl = 2.5, nx = -uz, nz = ux, u0 = k / 6, u1 = (k + 1) / 6;
      const P = [[x - nx * hw - ux * hl, z - nz * hw - uz * hl, u0, 0], [x + nx * hw - ux * hl, z + nz * hw - uz * hl, u1, 0], [x + nx * hw + ux * hl, z + nz * hw + uz * hl, u1, 1], [x - nx * hw + ux * hl, z - nz * hw + uz * hl, u0, 1]];
      for (const q of [0, 1, 2, 0, 2, 3]) { const [px, pz, u, v] = P[q]; pos.push(px, terrain.height(px, pz) + 0.385, pz); uv.push(u, v); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); m.name = 'arrows'; return m; }
  const tex = canvasTex(256, 128, (g) => {
    g.clearRect(0, 0, 256, 128); g.strokeStyle = g.fillStyle = '#F2C21B'; g.lineWidth = 7; g.lineCap = 'round';
    // Velo (Blick von oben, Fahrtrichtung = Bild-oben), in Feld 0..128
    g.beginPath(); g.arc(64, 30, 18, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(64, 98, 18, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(64, 30); g.lineTo(52, 66); g.lineTo(76, 66); g.lineTo(64, 98); g.moveTo(52, 66); g.lineTo(64, 30); g.moveTo(40, 34); g.lineTo(88, 34); g.stroke();
    g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(192, 64); g.rotate(-Math.PI / 2); g.scale(1.6, 1); g.fillText('BUS', 0, 4); g.restore();
  }, false);
  const pos: number[] = [], uv: number[] = [];
  for (const [k, x, z, ux, uz] of list) {
    const hw = k ? 1.0 : 0.6, hl = k ? 2.4 : 1.2, nx = -uz, nz = ux, u0 = k ? 0.5 : 0, u1 = k ? 1 : 0.5;
    const P = [[x - nx * hw - ux * hl, z - nz * hw - uz * hl, u0, 0], [x + nx * hw - ux * hl, z + nz * hw - uz * hl, u1, 0], [x + nx * hw + ux * hl, z + nz * hw + uz * hl, u1, 1], [x - nx * hw + ux * hl, z - nz * hw + uz * hl, u0, 1]];
    for (const q of [0, 1, 2, 0, 2, 3]) { const [px, pz, u, v] = P[q]; pos.push(px, terrain.height(px, pz) + 0.385, pz); uv.push(u, v); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  m.name = 'roadDecals'; return m;
}
function dashLine(out: number[], p: number[][], y: number) {
  let carry = 0;
  for (let i = 0; i < p.length - 1; i++) {
    const [x1, z1] = p[i], [x2, z2] = p[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ux = (x2 - x1) / len, uz = (z2 - z1) / len;
    const nx = -uz * 0.12, nz = ux * 0.12;
    for (let s = carry; s < len - 2.5; s += 7) {
      const ax = x1 + ux * s, az = z1 + uz * s, bx = ax + ux * 2.5, bz = az + uz * 2.5;
      out.push(ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz, ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz);
    }
    carry = 0;
  }
}

export function outline(m: THREE.Mesh) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), new THREE.LineBasicMaterial({ color: '#3b302b' }));
  e.position.copy(m.position); e.rotation.copy(m.rotation); e.scale.copy(m.scale);
  return e;
}

/** Gedeckte Holzbrücke entlang einer Linie (Kapellbrücke, Spreuerbrücke) */
function coveredBridge(p: number[][], width: number, terrain: Terrain, flowers = false) {
  const g = new THREE.Group();
  const wood = toon('#A87445'), roofM = toon('#8B3A2B'), deckM = toon('#9C6B43'), leafM = toon('#3F8A3A'), bloomM = toon('#E8322E');
  const lightM = toon('#FFF2B8', { emissive: new THREE.Color('#5A4E20') }); lightM.name = 'lampHead';
  leafM.userData.noEdges = bloomM.userData.noEdges = lightM.userData.noEdges = true;
  const hw = width / 2;
  for (let i = 0; i < p.length - 1; i++) {
    const [x1, z1] = p[i], [x2, z2] = p[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.3) continue;
    const ang = Math.atan2(x2 - x1, z2 - z1);
    const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    const seg = new THREE.Group(); seg.position.set(mx, terrain.height(mx, mz) - 0.3, mz); seg.rotation.y = ang;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.5, len + 0.4), deckM); deck.position.y = -0.1;
    seg.add(deck);
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.1, len + 0.3), wood); rail.position.set(s * (hw + 0.1), 0.55, 0);
      seg.add(rail);
      if (flowers) { // Blumenkisten mit roten Geranien aussen am Geländer (Wahrzeichen der Kapellbrücke)
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, len + 0.2), wood); box.position.set(s * (hw + 0.45), 1.0, 0); seg.add(box);
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, len + 0.1), leafM); leaf.position.set(s * (hw + 0.5), 1.28, 0); seg.add(leaf);
        const nB = Math.max(1, Math.round(len / 0.9));
        for (let k = 0; k < nB; k++) { const bl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), bloomM); bl.position.set(s * (hw + 0.55 + (k % 2) * 0.08), 1.48, -len / 2 + (k + 0.5) * len / nB); seg.add(bl); }
      }
      const nPosts = Math.max(1, Math.round(len / 3));
      for (let k = 0; k <= nPosts; k++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.4, 0.25), wood);
        post.position.set(s * (hw + 0.1), 1.7, -len / 2 + (k * len) / nPosts);
        seg.add(post);
      }
      // Dachfläche
      const roof = new THREE.Mesh(new THREE.BoxGeometry(hw + 1.1, 0.2, len + 0.5), roofM);
      roof.position.set(s * (hw / 2 + 0.25), 3.9, 0);
      roof.rotation.z = -s * 0.42;
      seg.add(roof);
    }
    // Laternen unter dem Dachfirst (leuchten am Abend)
    for (let k = 0; k < Math.max(1, Math.round(len / 6)); k++) { const lt = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), lightM); lt.position.set(0, 3.55, -len / 2 + (k + 0.5) * len / Math.max(1, Math.round(len / 6))); seg.add(lt); }
    // Pfähle im Wasser
    const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.2, 6), wood); pile.position.set(0, -1.2, 0);
    seg.add(pile);
    g.add(seg);
  }
  return g;
}

/** Dreiecke der 3D-Gebäude von oben (Grundriss für Kollision und Karte) */
function drawB3DFootprints(g: CanvasRenderingContext2D, b: B3D, fx: (x: number) => number, fz: (z: number) => number, minY: number) {
  const P = b.pos, I = b.idx;
  for (const m of b.meta.buildings) {
    const [, vS, , iS, iC] = m;
    g.beginPath();
    for (let t = iS; t < iS + iC; t += 3) {
      const a = vS + I[t], c = vS + I[t + 1], e = vS + I[t + 2];
      // nur Dachflächen (Normale nach oben) – Wände haben keine Fläche von oben
      const ax = P[a * 3] / 10, az = P[a * 3 + 2] / 10, bx = P[c * 3] / 10, bz = P[c * 3 + 2] / 10, cx = P[e * 3] / 10, cz = P[e * 3 + 2] / 10;
      const area = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      if (Math.abs(area) < 0.05) continue;
      g.moveTo(fx(ax), fz(az)); g.lineTo(fx(bx), fz(bz)); g.lineTo(fx(cx), fz(cz)); g.closePath();
    }
    g.fill('nonzero');
  }
  void minY;
}

/** Grobe Quartiere Luzerns (Spielkoordinaten, Annahme aus Stadtplan; Vertrauen mittel) */
function quarter(x: number, z: number): 'altstadt' | 'neustadt' | 'quai' | 'other' {
  // Altstadt rechtes Ufer (zwischen Museggmauer und Reuss) und Kleinstadt links der Reuss
  if (x > -520 && x < 150 && z > -330 && z < 40) return 'altstadt';
  if (x > -520 && x < -120 && z >= 40 && z < 230) return 'altstadt';
  // Hotels Schweizerhofquai/Nationalquai/Haldenstrasse
  if (x >= 150 && x < 900 && z > -420 && z < -120) return 'quai';
  // Bahnhofstrasse/Theater (linkes Reussufer zwischen Altstadt und Bahnhof): Gründerzeit
  if (x > -120 && x < 160 && z >= 40 && z < 230) return 'neustadt';
  // Neustadt / Hirschmatt
  if (x > -400 && x < 420 && z >= 230 && z < 950) return 'neustadt';
  return 'other';
}

/** swissBUILDINGS3D-Gebäude in die Material-Puffer schreiben */
/** Findet die zwei höchsten Turmspitzen eines Gebäudes und die Traufe ihres Dachs (P in dm). */
function findSpires(P: ArrayLike<number>, I: ArrayLike<number>, vS: number, iS: number, iC: number, ymax: number) {
  const pts: number[][] = [];
  for (let t = iS; t < iS + iC; t++) { const k = (vS + I[t]) * 3; const y = P[k + 1] / 10; if (y > ymax - 18) pts.push([P[k] / 10, y, P[k + 2] / 10]); }
  pts.sort((a, b) => b[1] - a[1]);
  const apex: number[][] = [];
  for (const p of pts) { if (apex.every((a) => Math.hypot(a[0] - p[0], a[2] - p[2]) > 8)) apex.push(p); if (apex.length === 2) break; }
  const out: { x: number; z: number; y: number; r: number; top: number }[] = [];
  for (const a of apex) {
    // Dachflächen rund um die Spitze: steile Dreiecke, deren Punkte nahe der Spitze liegen
    let eave = a[1], r = 0;
    for (let t = iS; t < iS + iC; t += 3) {
      const V = [0, 1, 2].map((j) => { const k = (vS + I[t + j]) * 3; return [P[k] / 10, P[k + 1] / 10, P[k + 2] / 10]; });
      if (!V.every((v) => Math.hypot(v[0] - a[0], v[2] - a[2]) < 6)) continue;
      const ux = V[1][0] - V[0][0], uy = V[1][1] - V[0][1], uz = V[1][2] - V[0][2], vx = V[2][0] - V[0][0], vy = V[2][1] - V[0][1], vz = V[2][2] - V[0][2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
      if (l < 1e-6 || Math.abs(ny) / l < 0.25 || !V.some((v) => v[1] > a[1] - 0.5)) continue;
      for (const v of V) { eave = Math.min(eave, v[1]); r = Math.max(r, Math.hypot(v[0] - a[0], v[2] - a[2])); }
    }
    if (r > 1 && a[1] - eave > 2) out.push({ x: a[0], z: a[2], y: eave, r, top: a[1] });
  }
  return out.length === 2 ? out : null;
}

let SHOP_NEAR: (x: number, z: number) => boolean = () => false;
let RURAL_HOUSES = false; // Gebiet A (OSM-Gebäude mit rural.py-Typen)
async function buildB3D(b: B3D, styles: { p: number[][]; facade: THREE.Color; roofC: THREE.Color; style: string; flat: boolean; kind: string }[], tiles: Map<string, { B: Record<string, { pos: number[]; nor: number[]; col: number[]; uv: number[] }>; l: number[] }>, _unused: number[], progress: (s: string) => Promise<void> | void, terrain?: Terrain) {
  // Raster für schnelle Zuordnung Gebäude ↔ OSM-Stil
  const cell = 40, grid = new Map<string, number[]>();
  styles.forEach((st, i) => {
    const xs = st.p.map((q) => q[0]), zs = st.p.map((q) => q[1]);
    for (let gx = Math.floor(Math.min(...xs) / cell); gx <= Math.floor(Math.max(...xs) / cell); gx++)
      for (let gz = Math.floor(Math.min(...zs) / cell); gz <= Math.floor(Math.max(...zs) / cell); gz++) {
        const k = gx + ',' + gz; if (!grid.has(k)) grid.set(k, []); grid.get(k)!.push(i);
      }
  });
  const P = b.pos, I = b.idx;
  let n = 0, bi = -1;
  const hsl = { h: 0, s: 0, l: 0 };
  // Kacheln à 400 m: getrennte Meshes erlauben Frustum Culling (Split Screen, Handy)
  const tileOf = (cx: number, cz: number) => {
    const k = Math.floor(cx / 400) + ',' + Math.floor(cz / 400);
    let t = tiles.get(k);
    if (!t) { const mk = () => ({ pos: [] as number[], nor: [] as number[], col: [] as number[], uv: [] as number[] }); t = { B: { oldGreen: mk(), oldRed: mk(), modern: mk(), block: mk(), stone: mk(), flatRoof: mk(), tiles: mk(), altstadt: mk(), painted: mk(), gruenderzeit: mk(), hotel: mk(), slate: mk(), luks: mk(), luksTurm: mk(), blockShop: mk(), modernShop: mk() }, l: [] }; tiles.set(k, t); }
    return t;
  };
  for (const m of b.meta.buildings) {
    bi++;
    const [, vS, , iS, iC, cx, cz, ymin, ymax] = m;
    const B = tileOf(cx, cz).B;
    if (++n % 250 === 0) await progress(`Häuser werden gebaut … ${n}`);
    let st = (grid.get(Math.floor(cx / cell) + ',' + Math.floor(cz / cell)) || []).map((i) => styles[i]).find((q) => pointInPoly(cx, cz, q.p));
    // Bahnhof Luzern (Neubau 1991): Gebäudeteile der swissBUILDINGS3D liegen teils knapp ausserhalb des OSM-Umrisses → ganzer Bahnhofblock Glas/Metall
    if (!st && cx > 135 && cx < 275 && cz > 140 && cz < 330) st = styles.find((q) => q.kind === 'bahnhof');
    const r = hash(cx, cz);
    const h = ymax - ymin;
    const zone = quarter(cx, cz);
    // Geschossraster ab sichtbarem Boden (Wandfuss liegt oft unter Terrain)
    const base = terrain ? Math.max(ymin, terrain.ground(cx, cz) - 0.2) : ymin;
    let style = st ? st.style : h > 27 ? 'block' : r > 0.5 ? 'oldGreen' : 'oldRed';
    let facade = st ? st.facade : new THREE.Color(FACADES[Math.floor(r * FACADES.length)]);
    let roofTile = st && st.kind === 'kispi' ? new THREE.Color('#D8D6D0') : st && !st.flat ? st.roofC : new THREE.Color(ROOFS[Math.floor(hash(cz, cx) * ROOFS.length)]);
    let slateRoof = false;
    // R7: Flachdach-Bauten ausserhalb der Altstadt sind fast immer Nachkriegsbauten (Referenz Pilatusstrasse)
    if (zone !== 'altstadt' && style !== 'stone' && style !== 'modern' && style !== 'block' && h > 7 && !(st && st.kind)) {
      let fa = 0, ta = 0;
      for (let t = iS; t < iS + iC; t += 3) {
        const a = (vS + I[t]) * 3, b2 = (vS + I[t + 1]) * 3, c2 = (vS + I[t + 2]) * 3;
        const ux = P[b2] - P[a], uy = P[b2 + 1] - P[a + 1], uz = P[b2 + 2] - P[a + 2], vx = P[c2] - P[a], vy = P[c2 + 1] - P[a + 1], vz = P[c2 + 2] - P[a + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
        if (l < 1e-6 || Math.abs(ny) / l < 0.3) continue;
        ta += l; if (Math.abs(ny) / l > 0.96) fa += l;
      }
      if (ta > 0 && fa / ta > 0.6) {
        // grosse Flachbauten (Gewerbe, Schulen) mit Fensterbändern, sonst Wohnblock mit Einzelfenstern und Balkonen
        style = fa / 400 > 1400 ? 'modern' : 'block'; // P in Dezimetern (/100), Dach+Boden zählen doppelt (/2), Kreuzprodukt = 2×Fläche (/2)
        facade = new THREE.Color(style === 'block' ? ['#F1ECE2', '#EDE3CF', '#E6E8E3', '#F2E6D6', '#E9DFD0', '#DDE3E6', '#F0E2C8'][Math.floor(r * 7)] : ['#E6E4DF', '#D9D6CF', '#C9CCD0', '#EDE6D8', '#DCD3C4'][Math.floor(r * 5)]);
      }
    }
    if (style !== 'stone' && style !== 'modern' && style !== 'block' && style !== 'luks' && style !== 'luksTurm') {
      if (zone === 'altstadt') { const plaza = PAINTED_SQUARES.some(([px, pz, pr]) => Math.hypot(cx - px, cz - pz) < pr); style = plaza || r < 0.18 ? 'painted' : 'altstadt'; facade = new THREE.Color(['#F4EEE2', '#EFDDBA', '#E9C9A3', '#E6C8C0', '#DCE3CF', '#F2E2B4', '#E8D9C9'][Math.floor(hash(cz + 3, cx) * 7)]); }
      else if (zone === 'neustadt') { style = 'gruenderzeit'; facade = new THREE.Color(['#DCCFB4', '#D3C6AA', '#E4D9C3', '#CFC0A3', '#E8DCC6'][Math.floor(r * 5)]); slateRoof = hash(cx + 7, cz) < 0.45; }
      else if (zone === 'quai') { style = 'hotel'; facade = new THREE.Color(['#F3F0E8', '#F1E9D8', '#EEE7DA'][Math.floor(r * 3)]); slateRoof = hash(cx + 7, cz) < 0.6; }
    }
    // Museggtürme (OSM-Lage): Naturstein statt Wohnhaus-Fassade
    if (MUSEGG.some(([mx, mz]) => Math.hypot(cx - mx, cz - mz) < 9)) { style = 'stone'; facade = new THREE.Color('#CDBB9C'); roofTile = new THREE.Color('#8B4A36'); }
    if (slateRoof) roofTile = new THREE.Color(['#6F767E', '#7C8188', '#646B73'][Math.floor(hash(cz, cx + 1) * 3)]);
    // Erker: ein Teil der Altstadthäuser bekommt einen Erker an der grössten Fassade (1.–3. Obergeschoss)
    if ((style === 'altstadt' || style === 'painted') && h > 11 && hash(cx + 7, cz - 3) < 0.4) {
      let best = 0, bx = 0, bz = 0, bnx = 0, bnz = 0, by0 = 0, by1 = 0;
      for (let t = iS; t < iS + iC; t += 3) {
        const a = (vS + I[t]) * 3, b2 = (vS + I[t + 1]) * 3, c2 = (vS + I[t + 2]) * 3;
        const ux = P[b2] - P[a], uy = P[b2 + 1] - P[a + 1], uz = P[b2 + 2] - P[a + 2], vx = P[c2] - P[a], vy = P[c2 + 1] - P[a + 1], vz = P[c2 + 2] - P[a + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
        if (l < 1e-6 || Math.abs(ny) / l > 0.1 || l <= best) continue;
        best = l; bx = (P[a] + P[b2] + P[c2]) / 30; bz = (P[a + 2] + P[b2 + 2] + P[c2 + 2]) / 30; bnx = nx / l; bnz = nz / l;
        by0 = Math.min(P[a + 1], P[b2 + 1], P[c2 + 1]) / 10; by1 = Math.max(P[a + 1], P[b2 + 1], P[c2 + 1]) / 10;
      }
      // Normale nach aussen: vom Hauszentrum weg
      if ((bx - cx) * bnx + (bz - cz) * bnz < 0) { bnx = -bnx; bnz = -bnz; }
      const y0 = Math.max(base, by0) + 3.6, top = Math.min(by1, ymax) - 1.2;
      if (best / 200 > 25 && top - y0 > 4) ERKER.push([bx + bnx * 0.55, bz + bnz * 0.55, y0, 3.4, Math.atan2(bnx, bnz), facade.r, facade.g, facade.b]);
    }
    let roofFlat = new THREE.Color(FLAT_ROOF);
    // R8: Dachfarbe aus SWISSIMAGE (comic-verstärkt)
    const aer = b.roof && b.roof[bi];
    if (aer && !(st && (st.kind === 'kispi' || st.kind === 'wasserturm'))) {
      const c = new THREE.Color('#' + aer); c.getHSL(hsl);
      const warm = (hsl.h < 0.17 || hsl.h > 0.94) && hsl.s > 0.06;
      if (warm) { slateRoof = false; roofTile = new THREE.Color().setHSL(hsl.h > 0.5 ? 0.01 : Math.min(hsl.h, 0.11), Math.max(hsl.s, 0.42), Math.min(0.55, Math.max(0.36, hsl.l))); }
      else if (hsl.s < 0.12) { slateRoof = true; roofTile = new THREE.Color().setHSL(0.58, 0.08, Math.min(0.6, Math.max(0.36, hsl.l))); }
      else if (hsl.h > 0.45 && hsl.h < 0.7) { slateRoof = false; roofTile = new THREE.Color().setHSL(hsl.h, Math.max(hsl.s, 0.3), Math.min(0.6, Math.max(0.36, hsl.l))); } // Kupfer/Blech
      // grün = meist Baumkronen über dem Dach → Standardziegel behalten
      const green = hsl.h > 0.17 && hsl.h < 0.45;
      roofFlat = new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * (green ? 1.2 : 0.6), green ? 0.38 : 0.18), Math.min(0.75, Math.max(0.42, hsl.l)));
    }
    STYLE_COUNT[style] = (STYLE_COUNT[style] || 0) + 1;
    const tile = style === 'luks' ? 2.5 : style === 'luksTurm' ? 4 : style === 'modern' || style === 'block' ? 3.6 : style === 'stone' ? 6 : style === 'hotel' ? 4.2 : 3.3, floorH = style === 'luks' ? 3.9 : style === 'stone' ? 7 : style === 'gruenderzeit' || style === 'hotel' || style === 'luksTurm' ? 3.6 : 3.2;
    const shopNear = (style === 'block' || style === 'modern') && !(st && st.kind) && SHOP_NEAR(cx, cz);
    const spires = st && st.kind === 'jesuiten' ? findSpires(P, I, vS, iS, iC, ymax) : null;
    if (spires) for (const q of spires) ONIONS.push([q.x, q.z, q.y, q.r, q.top]);
    for (let t = iS; t < iS + iC; t += 3) {
      const ids = [vS + I[t], vS + I[t + 1], vS + I[t + 2]];
      const V = ids.map((k) => [P[k * 3] / 10, P[k * 3 + 1] / 10, P[k * 3 + 2] / 10]);
      const ux = V[1][0] - V[0][0], uy = V[1][1] - V[0][1], uz = V[1][2] - V[0][2];
      const vx = V[2][0] - V[0][0], vy = V[2][1] - V[0][1], vz = V[2][2] - V[0][2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz); if (l < 1e-6) continue;
      nx /= l; ny /= l; nz /= l;
      if (spires && Math.abs(ny) >= 0.25) { // spitzes Turmdach weglassen, dort sitzt die Zwiebelhaube
        const mx = (V[0][0] + V[1][0] + V[2][0]) / 3, mz = (V[0][2] + V[1][2] + V[2][2]) / 3, my = Math.min(V[0][1], V[1][1], V[2][1]);
        if (spires.some((q) => Math.hypot(mx - q.x, mz - q.z) < q.r + 0.6 && my >= q.y - 0.3)) continue;
      }
      // Daten sind doppelseitig: Normale bei Dächern nach oben, bei Wänden vom Gebäudezentrum weg
      if (Math.abs(ny) >= 0.3) { if (ny < 0) { if (V[0][1] < ymin + 0.8) continue; nx = -nx; ny = -ny; nz = -nz; } }
      else { const mx = (V[0][0] + V[1][0] + V[2][0]) / 3 - cx, mz = (V[0][2] + V[1][2] + V[2][2]) / 3 - cz; if (mx * nx + mz * nz < 0) { nx = -nx; nz = -nz; ny = -ny; } }
      let buf, col: THREE.Color, uvf: (p: number[]) => [number, number];
      if (Math.abs(ny) < 0.3) {
        buf = (style === 'block' || style === 'modern') && shopNear ? B[style + 'Shop'] : B[style]; col = facade;
        const tl = Math.hypot(nx, nz) || 1, tx = -nz / tl, tz = nx / tl;
        uvf = (p) => [(p[0] * tx + p[2] * tz) / tile, (p[1] - base) / floorH];
      } else if (ny > 0.96) {
        buf = B.flatRoof; col = roofFlat; uvf = (p) => [p[0] / 4, p[2] / 4];
      } else {
        buf = slateRoof ? B.slate : B.tiles; col = roofTile;
        const tl = Math.hypot(nx, nz) || 1, ax = -nz / tl, az = nx / tl;
        uvf = (p) => [(p[0] * ax + p[2] * az) / 2.2, p[1] / 1.0];
      }
      // Wicklung an Normale anpassen
      const fnx = uy * vz - uz * vy, fny = uz * vx - ux * vz, fnz = ux * vy - uy * vx;
      const order = fnx * nx + fny * ny + fnz * nz < 0 ? [0, 2, 1] : [0, 1, 2];
      const shadeTop = buf === B.tiles || buf === B.slate ? (nz > 0 ? 1 : 0.9) : 1;
      for (const k of order) {
        const p = V[k];
        buf.pos.push(p[0], p[1], p[2]); buf.nor.push(nx, ny, nz);
        const sh = buf === B.tiles || buf === B.slate ? shadeTop : p[1] < ymin + 0.5 ? 0.78 : 1;
        buf.col.push(col.r * sh, col.g * sh, col.b * sh);
        buf.uv.push(...uvf(p));
      }
    }
  }
  // Konturen aus vorberechneten Kanten
  if (b.edges) {
    const E = b.edges;
    for (const m of b.meta.buildings) {
      const vS = m[1], eS = m[9], eC = m[10], lpos = tileOf(m[5], m[6]).l;
      // nur Kanten an «echten» Flächen (dünne Masten/Antennen aus den Daten erzeugen sonst Striche in den Himmel)
      const iS = m[3], iC = m[4], good = new Set<number>();
      for (let t = iS; t < iS + iC; t += 3) {
        const a = (vS + I[t]) * 3, b2 = (vS + I[t + 1]) * 3, c2 = (vS + I[t + 2]) * 3;
        const ux = P[b2] - P[a], uy = P[b2 + 1] - P[a + 1], uz = P[b2 + 2] - P[a + 2], vx = P[c2] - P[a], vy = P[c2 + 1] - P[a + 1], vz = P[c2 + 2] - P[a + 2];
        const area2 = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx); // in dm²·2
        const lmax = Math.max(Math.hypot(ux, uy, uz), Math.hypot(vx, vy, vz), Math.hypot(P[c2] - P[b2], P[c2 + 1] - P[b2 + 1], P[c2 + 2] - P[b2 + 2]));
        if (area2 > 10 && area2 / (lmax * lmax) > 0.02) { good.add(I[t]); good.add(I[t + 1]); good.add(I[t + 2]); }
      }
      for (let k = eS; k < eS + eC; k += 2) {
        if (!good.has(E[k]) || !good.has(E[k + 1])) continue;
        for (const v of [vS + E[k], vS + E[k + 1]]) lpos.push(P[v * 3] / 10, P[v * 3 + 1] / 10, P[v * 3 + 2] / 10);
      }
    }
  }
}

/** Raddampfer (Salonschiff) über dem kleinsten Rechteck des OSM-Umrisses */
export function steamship(p: number[][]) {
  let best: any = null;
  for (let i = 0; i < p.length; i++) {
    const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length];
    const a = Math.atan2(z2 - z1, x2 - x1), ca = Math.cos(a), sa = Math.sin(a);
    let mnA = Infinity, mxA = -Infinity, mnB = Infinity, mxB = -Infinity;
    for (const [x, z] of p) { const A = x * ca + z * sa, B = -x * sa + z * ca; mnA = Math.min(mnA, A); mxA = Math.max(mxA, A); mnB = Math.min(mnB, B); mxB = Math.max(mxB, B); }
    const ar = (mxA - mnA) * (mxB - mnB);
    if (!best || ar < best.ar) best = { a, mnA, mxA, mnB, mxB, ar };
  }
  let { a, mnA, mxA, mnB, mxB } = best;
  let L = mxA - mnA, Wd = mxB - mnB;
  if (Wd > L) { a += Math.PI / 2; [L, Wd] = [Wd, L]; const cA = (mnA + mxA) / 2, cB = (mnB + mxB) / 2; mnA = cB - L / 2; mxA = cB + L / 2; mnB = -cA - Wd / 2; mxB = -cA + Wd / 2; }
  const cA = (mnA + mxA) / 2, cB = (mnB + mxB) / 2;
  const ca = Math.cos(a), sa = Math.sin(a);
  const g = new THREE.Group();
  g.position.set(cA * ca - cB * sa, 0, cA * sa + cB * ca);
  g.rotation.y = -a; // lokale x-Achse = Schiffslängsachse
  const hullW = Wd * 0.62; // Rumpf schmaler als Radkästen
  const white = toon('#F6F4EE'), dark = toon('#2F3B35'), wood = toon('#B9875A'), yellow = toon('#E8B931'), black = toon('#2B2B2B');
  const hull = new THREE.Mesh(new THREE.BoxGeometry(L * 0.96, 2.2, hullW), dark); hull.position.y = 0.4;
  const hull2 = new THREE.Mesh(new THREE.BoxGeometry(L * 0.96, 1.4, hullW + 0.05), white); hull2.position.y = 2.1;
  const bow = new THREE.Mesh(new THREE.ConeGeometry(hullW / 2, 6, 4), dark); bow.rotation.z = -Math.PI / 2; bow.rotation.x = Math.PI / 4; bow.position.set(L * 0.48 + 2.5, 0.5, 0); bow.scale.set(1, 1, 0.7);
  const deck1 = new THREE.Mesh(new THREE.BoxGeometry(L * 0.7, 2.6, hullW * 0.92), white); deck1.position.set(-L * 0.05, 4.1, 0);
  const deck2 = new THREE.Mesh(new THREE.BoxGeometry(L * 0.45, 2.2, hullW * 0.8), white); deck2.position.set(-L * 0.08, 6.5, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(L * 0.5, 0.25, hullW * 0.95), wood); roof.position.set(-L * 0.08, 7.7, 0);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 5, 12), yellow); funnel.position.set(L * 0.05, 9.5, 0);
  const funnelTop = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.8, 12), black); funnelTop.position.set(L * 0.05, 12.2, 0);
  g.add(hull, hull2, bow, deck1, deck2, roof, funnel, funnelTop);
  // Radkästen beidseitig
  for (const s of [-1, 1]) {
    const box = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, Wd * 0.18, 16, 1, false, 0, Math.PI), white);
    box.rotation.x = Math.PI / 2; box.rotation.z = Math.PI / 2; box.position.set(L * 0.05, 1.4, s * (hullW / 2 + Wd * 0.09));
    g.add(box);
  }
  // Fensterreihen
  const winM = new THREE.MeshBasicMaterial({ color: '#4F6F8C' });
  for (const s of [-1, 1]) for (const [y, w, x] of [[4.3, L * 0.62, -L * 0.05], [6.6, L * 0.4, -L * 0.08]]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, 0.05), winM); win.position.set(x, y, s * ((y < 5 ? hullW * 0.92 : hullW * 0.8) / 2 + 0.03));
    g.add(win);
  }
  const out = new THREE.Group(); out.add(g);
  for (const m of [hull, hull2, deck1, deck2, funnel]) { const o = outline(m); g.add(o); }
  return out;
}

/** Fasst alle Meshes einer Gruppe nach Material zusammen (weniger Draw Calls) */
function mergeGroup(g: THREE.Group) {
  g.updateMatrixWorld(true);
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const geo = m.geometry.clone().applyMatrix4(m.matrixWorld);
    const nonIdx = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(nonIdx.attributes)) if (!['position', 'normal'].includes(k)) nonIdx.deleteAttribute(k);
    const mat = m.material as THREE.Material;
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat)!.push(nonIdx);
  });
  const out = new THREE.Group();
  for (const [mat, geos] of byMat) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    out.add(mesh);
    if (mat.userData.noEdges) continue;
    const el = new THREE.LineSegments(new THREE.EdgesGeometry(merged, 30), new THREE.LineBasicMaterial({ color: '#3b302b', transparent: true, opacity: 0.5 })); el.name = 'edges-bridge'; out.add(el);
  }
  return out;
}

function mountains() {
  const g = new THREE.Group();
  const defs = [
    // [Richtung in Grad (0=Nord, im Uhrzeigersinn), Distanz, Höhe, Radius, Farbe]
    [215, 5200, 1400, 1300, '#7E92A8'], // Pilatus
    [235, 5600, 1100, 1500, '#8899AD'],
    [200, 5000, 900, 1100, '#90A2B5'],
    [80, 6000, 1000, 1700, '#8C9DB0'], // Rigi
    [100, 6500, 800, 1500, '#97A7B8'],
    [140, 6800, 1200, 1400, '#8A9BB0'], // Bürgenstock/Stanserhorn
    [160, 7000, 1500, 1500, '#8193A9'],
    [330, 5000, 300, 1800, '#A3B79A'], // Hügel nördlich
    [20, 5200, 350, 1800, '#A3B79A'],
    [290, 4800, 400, 1600, '#9FB497'],
  ];
  for (const [deg, dist, h, r, c] of defs as any) {
    const a = (deg * Math.PI) / 180;
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), new THREE.MeshToonMaterial({ color: c, gradientMap: GRADIENT, fog: false }));
    m.position.set(Math.sin(a) * dist, h / 2 - 40, -Math.cos(a) * dist);
    m.rotation.y = deg;
    g.add(m);
    if (h > 1000) {
      const snow = new THREE.Mesh(new THREE.ConeGeometry(r * 0.22, h * 0.22, 7), new THREE.MeshToonMaterial({ color: '#F2F5F8', gradientMap: GRADIENT, fog: false }));
      snow.position.set(m.position.x, h - 40 - h * 0.11 + 1, m.position.z); snow.rotation.y = deg;
      g.add(snow);
    }
  }
  return g;
}

/** Zeichnet Kollisionsraster und Minimap per Canvas. */
function rasterize(d: CityData, b3d?: B3D) {
  const [X0, Z0, X1, Z1] = d.meta.bounds;
  const mask = new Mask(d.meta.bounds);
  const c = document.createElement('canvas'); c.width = mask.w; c.height = mask.h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const tx = (x: number) => (x - X0) / MASK_RES, tz = (z: number) => (z - Z0) / MASK_RES;
  const poly = (ctx: CanvasRenderingContext2D, p: number[][], holes: number[][][] | undefined, f: (x: number) => number, h: (z: number) => number) => {
    ctx.beginPath();
    for (const ring of [p, ...(holes || [])]) {
      ring.forEach(([x, z], i) => (i ? ctx.lineTo(f(x), h(z)) : ctx.moveTo(f(x), h(z))));
      ctx.closePath();
    }
    ctx.fill('evenodd');
  };
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#f00';
  for (const w of d.water) poly(g, w.p, w.holes, tx, tz);
  // Brücken öffnen das Wasser
  g.strokeStyle = '#000'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const r of d.roads) {
    if (!r.b && r.n !== 'Kapellbrücke' && r.n !== 'Spreuerbrücke') continue;
    g.lineWidth = Math.max(r.w, 4.2) / MASK_RES;
    g.beginPath(); r.p.forEach(([x, z], i) => (i ? g.lineTo(tx(x), tz(z)) : g.moveTo(tx(x), tz(z)))); g.stroke();
  }
  // Strassenflächen markieren (für Baum-Platzierung)
  g.strokeStyle = '#00f';
  for (const r of d.roads) {
    if (!r.b && r.n !== 'Kapellbrücke' && r.n !== 'Spreuerbrücke' && ['footway', 'path', 'steps'].includes(r.c)) g.lineWidth = r.w / MASK_RES;
    else g.lineWidth = (r.w + 1) / MASK_RES;
    g.beginPath(); r.p.forEach(([x, z], i) => (i ? g.lineTo(tx(x), tz(z)) : g.moveTo(tx(x), tz(z)))); g.stroke();
  }
  g.fillStyle = '#0f0';
  if (b3d) drawB3DFootprints(g, b3d, tx, tz, 0.35); else for (const b of d.buildings) if (b.t !== 'roof' && b.t !== 'carport') poly(g, b.p, b.holes, tx, tz); // Vordächer (Busbahnhof) sind kein Hindernis
  // Fahrstrassen, die in den Daten unter einem Gebäude durchführen (Durchfahrt, Einkaufszentrum, Torbogen), bleiben befahrbar
  g.strokeStyle = '#00f';
  for (const r of d.roads) {
    if (['footway', 'path', 'steps', 'cycleway', 'pedestrian', 'track', 'bridleway'].includes(r.c)) continue;
    g.lineWidth = r.w / MASK_RES;
    g.beginPath(); r.p.forEach(([x, z], i) => (i ? g.lineTo(tx(x), tz(z)) : g.moveTo(tx(x), tz(z)))); g.stroke();
  }
  const img = g.getImageData(0, 0, c.width, c.height).data;
  for (let i = 0, k = 0; i < mask.data.length; i++, k += 4) {
    mask.data[i] = img[k + 1] > 128 ? 2 : img[k] > 128 ? 1 : 0;
    mask.road[i] = img[k + 2] > 128 && img[k + 1] < 128 ? 1 : 0;
  }

  // Minimap (1 px = MINI_RES m)
  const mm = document.createElement('canvas');
  mm.width = Math.ceil((X1 - X0) / MINI_RES); mm.height = Math.ceil((Z1 - Z0) / MINI_RES);
  const m = mm.getContext('2d')!;
  const mx = (x: number) => (x - X0) / MINI_RES, mz = (z: number) => (z - Z0) / MINI_RES;
  m.fillStyle = '#E9E2CC'; m.fillRect(0, 0, mm.width, mm.height);
  m.fillStyle = '#A8D08F'; for (const gr of d.green) poly(m, gr.p, [], mx, mz);
  m.fillStyle = '#7CC0E8'; for (const w of d.water) poly(m, w.p, w.holes, mx, mz);
  m.lineCap = 'round'; m.lineJoin = 'round';
  for (const r of d.roads) {
    const car = !['footway', 'path', 'steps', 'cycleway', 'track'].includes(r.c);
    m.strokeStyle = car ? '#ffffff' : '#F3E9D2';
    m.lineWidth = Math.max(1, (car ? r.w * 1.3 : r.w * 0.8) / MINI_RES);
    m.beginPath(); r.p.forEach(([x, z], i) => (i ? m.lineTo(mx(x), mz(z)) : m.moveTo(mx(x), mz(z)))); m.stroke();
  }
  m.fillStyle = '#C9B9A3'; if (b3d) drawB3DFootprints(m, b3d, mx, mz, 0); else for (const b of d.buildings) poly(m, b.p, b.holes, mx, mz);
  return { mask, minimap: mm };
}

// ---- R9/R11: Stege, Laternen, Ampeln, Brunnen, Haltestellen (OSM) ----
/** Mehrere Geometrien mit je einer Farbe zu einer (Vertex-Farben) zusammenfügen */
function colorMerge(parts: [THREE.BufferGeometry, string][]) {
  const gs = parts.map(([g, col]) => { const q = g.index ? g.toNonIndexed() : g.clone(); q.deleteAttribute('uv'); const c = new THREE.Color(col), n = q.getAttribute('position').count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } q.setAttribute('color', new THREE.BufferAttribute(a, 3)); return q; });
  return mergeGeometries(gs, false)!;
}
/** InstancedMesh räumlich aufteilen (Zellgrösse in m) – bessere Sichtbarkeitsprüfung */
export function chunkInstanced(im: THREE.InstancedMesh, cell: number): THREE.Object3D {
  const m = new THREE.Matrix4(), cells = new Map<string, number[]>();
  for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m); const k = Math.floor(m.elements[12] / cell) + ',' + Math.floor(m.elements[14] / cell); let a = cells.get(k); if (!a) cells.set(k, (a = [])); a.push(i); }
  if (cells.size <= 1) return im;
  const out = new THREE.Group(); out.name = im.name; const col = new THREE.Color();
  for (const idx of cells.values()) {
    const c = new THREE.InstancedMesh(im.geometry, im.material, idx.length); c.name = im.name;
    idx.forEach((i, j) => { im.getMatrixAt(i, m); c.setMatrixAt(j, m); if (im.instanceColor) { im.getColorAt(i, col); c.setColorAt(j, col); } });
    c.computeBoundingSphere(); out.add(c);
  }
  return out;
}

function buildProps(P: Props, terrain: Terrain, mask: Mask) {
  const G = new THREE.Group(); G.name = 'props';
  // Sitzbänke (OSM amenity=bench, Innenstadt): Holzbank auf zwei Füssen, zur nächsten Strasse ausgerichtet
  if (P.benches && P.benches.length) {
    const ok = P.benches.filter(([x, z]) => mask.at(x, z) === 0 && !mask.isRoad(x, z));
    const bench = new THREE.InstancedMesh(colorMerge([[new THREE.BoxGeometry(1.8, 0.08, 0.45).translate(0, 0.45, 0), '#8A5A36'], [new THREE.BoxGeometry(1.8, 0.4, 0.06).translate(0, 0.7, -0.22), '#8A5A36'], [new THREE.BoxGeometry(1.5, 0.42, 0.4).translate(0, 0.21, 0), '#3F4A50']]), toon('#ffffff', { vertexColors: true }), ok.length);
    const o = new THREE.Object3D();
    ok.forEach(([x, z], i) => {
      let a = 0; for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4; if (mask.isRoad(x + Math.sin(t) * 3, z + Math.cos(t) * 3)) { a = t; break; } }
      o.position.set(x, terrain.height(x, z), z); o.rotation.set(0, a, 0); o.updateMatrix(); bench.setMatrixAt(i, o.matrix);
    });
    bench.computeBoundingSphere(); bench.name = 'benches'; G.add(bench);
  }
  // Strände und Badeplätze (Lido, Ufschötti, Tribschen …): bunte Badetücher und Sonnenschirme
  if (P.beaches && P.beaches.length) {
    const spots: [number, number][] = [];
    for (const p of P.beaches) {
      const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
      const n = Math.min(40, Math.floor(Math.abs(signedArea(p)) / 120));
      for (let i = 0; i < n * 4 && spots.length < 400; i++) { const x = x0 + hash(i, x0) * (x1 - x0), z = z0 + hash(z0, i + 0.3) * (z1 - z0); if (pointInPoly(x, z, p) && mask.at(x, z) === 0 && !mask.isRoad(x, z) && !spots.some(([a, c]) => Math.hypot(a - x, c - z) < 4)) spots.push([x, z]); }
    }
    if (spots.length) {
      const towel = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.04, 1.8), toon('#ffffff'), spots.length);
      const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 5), toon('#EEEEEE'), spots.length);
      const top = new THREE.InstancedMesh(new THREE.ConeGeometry(1.2, 0.45, 8), toon('#ffffff'), spots.length);
      const o = new THREE.Object3D(), c = new THREE.Color(); const cols = ['#E94B3C', '#F7C531', '#3FA9F5', '#7ED957', '#FF8FB1', '#FFFFFF'];
      spots.forEach(([x, z], i) => {
        const y = terrain.height(x, z);
        o.position.set(x, y + 0.03, z); o.rotation.set(0, hash(x, z) * 3, 0); o.updateMatrix(); towel.setMatrixAt(i, o.matrix); towel.setColorAt(i, c.set(cols[Math.floor(hash(z, x) * cols.length)]));
        o.position.set(x + 0.9, y + 1.05, z); o.rotation.set(0, 0, 0); o.updateMatrix(); pole.setMatrixAt(i, o.matrix);
        o.position.set(x + 0.9, y + 2.1, z); o.updateMatrix(); top.setMatrixAt(i, o.matrix); top.setColorAt(i, c.set(cols[Math.floor(hash(x + 1, z) * cols.length)]));
      });
      for (const im of [towel, pole, top]) { im.computeBoundingSphere(); im.name = 'beach'; G.add(im); }
    }
  }
  // Stege: Holzbänder knapp über dem Wasser
  {
    const pos: number[] = [], col: number[] = [];
    const wood = new THREE.Color('#A87A4F'), stone = new THREE.Color('#B9B2A6');
    for (const s of P.piers) {
      const y = Math.max(...s.p.map((q) => terrain.ground(q[0], q[1]))) + (s.f ? 0.35 : 0.7);
      const c = s.s === 'wood' ? wood : stone;
      if (s.a) addFlat(pos, col, s.p, [], y, c);
      else ribbon(pos, col, s.p, Math.min(Math.max(s.w, 1.8), 6), y, c, true);
    }
    if (pos.length) { const m = flatMesh(pos, col, toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide })); m.name = 'piers'; G.add(m); }
  }
  const m4 = new THREE.Matrix4();
  // Strassenlaternen
  // Masten, die auf der (breit gezeichneten) Fahrbahn landen, an den nächsten Fahrbahnrand schieben
  const toEdge = (q: any[]) => {
    const [x, z] = q; if (!mask.isRoad(x, z)) return q;
    for (let r = 1; r <= 12; r += 0.75) for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r;
      if (!mask.isRoad(nx, nz) && mask.at(nx, nz) === 0) { const ex = nx + Math.cos(a) * 0.4, ez = nz + Math.sin(a) * 0.4; return [ex, ez, ...q.slice(2)]; }
    }
    return null;
  };
  P.lamps = P.lamps.map(toEdge).filter(Boolean) as number[][];
  P.signals = P.signals.map(toEdge).filter(Boolean) as number[][];
  P.stops = P.stops.map(toEdge).filter(Boolean) as any[][];
  if (P.lamps.length) {
    const poleG = new THREE.CylinderGeometry(0.07, 0.1, 4.6, 5); poleG.translate(0, 2.3, 0);
    const headG = new THREE.BoxGeometry(0.7, 0.22, 0.32); headG.translate(0.25, 4.65, 0);
    const pole = new THREE.InstancedMesh(poleG, toon('#3E4A45'), P.lamps.length);
    const head = new THREE.InstancedMesh(headG, toon('#FFF2B8', { emissive: new THREE.Color('#5A4E20') }), P.lamps.length); head.material.name = 'lampHead';
    // Leuchtenkopf zur Fahrbahn drehen (Richtung mit den meisten Strassen-Zellen im Umkreis 2–6 m); Laternen an Hauptstrassen (3. Wert) 1.6× höher
    const sc = new THREE.Matrix4();
    P.lamps.forEach((l, i) => { const [x, z] = l; let best = hash(x, z) * Math.PI * 2, bn = 0;
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; let n = 0; for (const d of [2, 4, 6]) if (mask.isRoad(x + Math.cos(a) * d, z + Math.sin(a) * d)) n++; if (n > bn) { bn = n; best = a; } }
      m4.makeRotationY(-best); if (l[2]) m4.multiply(sc.makeScale(1, 1.6, 1)); m4.setPosition(x, terrain.height(x, z), z); pole.setMatrixAt(i, m4); head.setMatrixAt(i, m4); });
    pole.name = 'lamps'; G.add(pole, head);
    (G as any).counts = { lamps: P.lamps.length, signals: P.signals.length, stops: P.stops.length };
  }
  // Ampeln
  if (P.signals.length) {
    const poleG = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 5); poleG.translate(0, 1.6, 0);
    const boxG = new THREE.BoxGeometry(0.35, 1.0, 0.3); boxG.translate(0, 3.4, 0);
    const lightG = new THREE.SphereGeometry(0.11, 6, 4); lightG.translate(0, 3.65, 0.17);
    const pole = new THREE.InstancedMesh(poleG, toon('#55595C'), P.signals.length);
    const box = new THREE.InstancedMesh(boxG, toon('#2E3236'), P.signals.length);
    const lamp = new THREE.InstancedMesh(lightG, new THREE.MeshBasicMaterial({ color: '#ffffff' }), P.signals.length);
    P.signals.forEach(([x, z], i) => { m4.makeRotationY(hash(z, x) * Math.PI * 2); m4.setPosition(x, terrain.height(x, z), z); pole.setMatrixAt(i, m4); box.setMatrixAt(i, m4); lamp.setMatrixAt(i, m4); });
    pole.name = 'signals'; G.add(pole, box, lamp);
    (G as any).signalLamp = lamp; (G as any).signalPos = P.signals;
  }
  // Brunnen (instanziert): Steintrog, Wasser, bemalte Säule mit goldener Kugel wie die Altstadtbrunnen
  P.fountains = P.fountains.filter(([x, z]) => Math.hypot(x - 203, z - 104) > 6); // Trinkbrunnen im Torbogen: verdeckt vom Modell
  if (P.fountains.length) {
    const n = P.fountains.length, o = new THREE.Object3D(), c = new THREE.Color();
    const basin = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.6, 1.8, 0.7, 12), toon('#B8B0A2'), n);
    const wg = new THREE.CircleGeometry(1.45, 12); wg.rotateX(-Math.PI / 2); const water = new THREE.InstancedMesh(wg, toon('#5BB4E5'), n);
    const col = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.25, 2.2, 8), toon('#ffffff'), n);
    const ball = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 8, 6), toon('#E3B53B'), n);
    const cols = ['#3B6EA8', '#C8352E', '#2E7D4F', '#A39A8B', '#D9A520', '#A39A8B'];
    P.fountains.forEach(([x, z], k) => {
      const y = terrain.height(x, z);
      o.position.set(x, y + 0.35, z); o.updateMatrix(); basin.setMatrixAt(k, o.matrix);
      o.position.set(x, y + 0.62, z); o.updateMatrix(); water.setMatrixAt(k, o.matrix);
      o.position.set(x, y + 1.1, z); o.updateMatrix(); col.setMatrixAt(k, o.matrix); col.setColorAt(k, c.set(cols[Math.floor(hash(x, z) * cols.length)]));
      o.position.set(x, y + 2.4, z); o.updateMatrix(); ball.setMatrixAt(k, o.matrix);
      const i = Math.floor((x - mask.x0) / MASK_RES), j = Math.floor((z - mask.z0) / MASK_RES);
      if (i > 0 && j > 0 && i < mask.w && j < mask.h) mask.data[j * mask.w + i] = 2;
    });
    for (const im of [basin, water, col, ball]) { im.computeBoundingSphere(); im.name = 'fountains'; G.add(im); }
    // Weinmarktbrunnen: gotischer Stock mit Figurenkranz und Fialen (Annahme: OSM-Brunnen am Weinmarkt)
    const wm = P.fountains.find(([x, z]) => Math.hypot(x + 236, z + 22) < 25);
    if (wm) {
      const [x, z] = wm, y = terrain.height(x, z), W = new THREE.Group(); W.position.set(x, y, z); W.name = 'weinmarktbrunnen';
      const add = (g: THREE.BufferGeometry, c: string, py: number, ol = false) => { const m = new THREE.Mesh(g, toon(c)); m.position.y = py; W.add(m); if (ol) W.add(outline(m)); return m; };
      add(new THREE.CylinderGeometry(2.9, 3.1, 0.9, 8), '#B8AE9C', 0.45, true);
      const wg2 = new THREE.CircleGeometry(2.7, 8); wg2.rotateX(-Math.PI / 2); add(wg2, '#5BB4E5', 0.8);
      add(new THREE.CylinderGeometry(0.45, 0.55, 2.6, 8), '#A39A8B', 1.6, true);
      add(new THREE.CylinderGeometry(1.0, 0.7, 0.5, 8), '#C8352E', 3.1, true);
      for (let k = 0; k < 6; k++) { // Figurenkranz (Krieger, bunt)
        const a = (k / 6) * Math.PI * 2, f = add(new THREE.CapsuleGeometry(0.2, 0.7, 3, 6), ['#3B6EA8', '#C8352E', '#D9A520'][k % 3], 3.85);
        f.position.x = Math.cos(a) * 0.75; f.position.z = Math.sin(a) * 0.75;
      }
      add(new THREE.CylinderGeometry(0.35, 0.45, 1.8, 8), '#3B6EA8', 4.6, true);
      add(new THREE.CylinderGeometry(0.6, 0.35, 0.4, 8), '#D9A520', 5.6);
      add(new THREE.ConeGeometry(0.55, 2.4, 8), '#2E7D4F', 7.0, true);
      add(new THREE.SphereGeometry(0.22, 8, 6), '#E3B53B', 8.3);
      G.add(W);
    }
    // Wagenbachbrunnen (Bahnhofplatz; Annahme: unbenannter OSM-Brunnen bei 47.05076/8.31038) und Fritschibrunnen (Kapellplatz)
    const special = (cx: number, cz: number, r: number) => P.fountains.find(([x, z]) => Math.hypot(x - cx, z - cz) < r);
    const wb = undefined as number[] | undefined; // früher Annahme (203, 104) = Brunnen unter dem Torbogen; der echte Wagenbachbrunnen (OSM-Umriss am Europaplatz) entsteht in bahnhofExtras
    if (wb) {
      const [x, z] = wb, y = terrain.height(x, z), W = new THREE.Group(); W.position.set(x, y, z); W.name = 'wagenbachbrunnen';
      const m = (g: THREE.BufferGeometry, c: string, py: number, ol = true, mat?: THREE.Material) => { const o = new THREE.Mesh(g, mat || toon(c)); o.position.y = py; W.add(o); if (ol) W.add(outline(o)); return o; };
      m(new THREE.CylinderGeometry(5.2, 5.4, 0.8, 24), '#C9BFAE', 0.4);
      const wg3 = new THREE.CircleGeometry(4.9, 24); wg3.rotateX(-Math.PI / 2); m(wg3, '#5BB4E5', 0.72, false);
      m(new THREE.CylinderGeometry(1.4, 1.8, 1.2, 12), '#B5AA97', 1.2);
      m(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 12), '#B5AA97', 1.95);
      const jet = new THREE.MeshBasicMaterial({ color: '#EAF7FF', transparent: true, opacity: 0.75 });
      m(new THREE.CylinderGeometry(0.12, 0.35, 4.5, 8), '', 4.3, false, jet); // Wasserstrahl
      m(new THREE.SphereGeometry(0.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '', 6.4, false, jet);
      G.add(W);
    }
    const fb = special(0, -100, 20);
    if (fb) {
      const [x, z] = fb, y = terrain.height(x, z), W = new THREE.Group(); W.position.set(x, y, z); W.name = 'fritschibrunnen';
      const m = (g: THREE.BufferGeometry, c: string, py: number, ol = true) => { const o = new THREE.Mesh(g, toon(c)); o.position.y = py; W.add(o); if (ol) W.add(outline(o)); return o; };
      m(new THREE.CylinderGeometry(2.0, 2.2, 0.8, 8), '#B8AE9C', 0.4);
      m(new THREE.CylinderGeometry(0.35, 0.45, 3.0, 8), '#A39A8B', 2.1);
      m(new THREE.CylinderGeometry(0.7, 0.4, 0.4, 8), '#D9A520', 3.8);
      m(new THREE.CapsuleGeometry(0.35, 0.8, 3, 8), '#C8352E', 4.6); // Fritschi im Fasnachtsgewand
      m(new THREE.SphereGeometry(0.3, 8, 6), '#F2D2B0', 5.4);
      m(new THREE.ConeGeometry(0.32, 0.6, 8), '#2E7D4F', 5.85);
      G.add(W);
    }
  }
  // Bushaltestellen: blaues Schild
  if (P.stops.length) {
    const poleG = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 4); poleG.translate(0, 1.3, 0);
    const signG = new THREE.BoxGeometry(0.6, 0.45, 0.05); signG.translate(0, 2.55, 0);
    const st = new THREE.InstancedMesh(colorMerge([[poleG, '#8A8F94'], [signG, '#2F6FB8']]), toon('#ffffff', { vertexColors: true }), P.stops.length);
    P.stops.forEach(([x, z], i) => { m4.makeRotationY(hash(x + 1, z) * Math.PI); m4.setPosition(x, terrain.height(x, z), z); st.setMatrixAt(i, m4); });
    st.computeBoundingSphere(); st.name = 'stops'; G.add(st);
  }
  // Instanzen in 500-m-Zellen aufteilen, damit nur sichtbare Zellen gezeichnet werden (Ampeln bleiben am Stück: Index = Ampel)
  const sig = (G as any).signalLamp as THREE.Object3D | undefined;
  for (const c of [...G.children]) {
    const im = c as THREE.InstancedMesh; if (!im.isInstancedMesh || im.count < 120 || im === sig || im.name === 'signals') continue;
    const ch = chunkInstanced(im, 1000); if (ch !== im) { G.remove(im); G.add(ch); }
  }
  return G;
}

/** R14: Horizont aus echten Höhen (Pilatus, Rigi, Bürgenstock …) – eigene Szene ohne Nebel. */
export function horizonMesh(t: Terrain, hole: number[]) {
  const m = t.hzm, nx = m.nx, nz = m.nz;
  const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3);
  const fog = new THREE.Color('#BFE6F6'), c = new THREE.Color();
  const lake = new THREE.Color('#5BA8D8'), meadow = new THREE.Color('#8DB872'), forest = new THREE.Color('#5E8C55'), rock = new THREE.Color('#9A9488'), snow = new THREE.Color('#F4F6F8');
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, x = m.x0 + i * m.step, z = m.z0 + j * m.step;
    const y = t.horizon(x, z);
    const sl = Math.max(Math.abs(t.horizon(x + m.step, z) - t.horizon(x - m.step, z)), Math.abs(t.horizon(x, z + m.step) - t.horizon(x, z - m.step))) / (2 * m.step);
    pos[k * 3] = x; pos[k * 3 + 1] = y - 3; pos[k * 3 + 2] = z;
    if (Math.abs(y) < 0.8 && sl < 0.01) c.copy(lake);
    else if (y > 1650) c.copy(snow);
    else if (y > 1250 || sl > 0.9) c.copy(rock);
    else if (y > 350 || sl > 0.35) c.copy(forest);
    else c.copy(meadow);
    // Dunst: tiefes Land verschwindet im Himmel, Berge treten hervor
    const d = Math.hypot(x, z), haze = Math.min(0.9, 0.12 + d / 45000 + Math.max(0, 1 - y / 450) * 0.45);
    c.lerp(fog, haze);
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  }
  const idx: number[] = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const x0 = m.x0 + i * m.step, z0 = m.z0 + j * m.step;
    if (x0 >= hole[0] && x0 + m.step <= hole[2] && z0 >= hole[1] && z0 + m.step <= hole[3]) continue;
    const a = j * nx + i, b = a + 1, cc = a + nx, dd = cc + 1;
    idx.push(a, cc, b, b, cc, dd);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRADIENT, fog: false }));
  mesh.name = 'horizon';
  return mesh;
}

/** Erdgeschoss (Textur-v < 1, da v = Höhe über Wandfuss / Geschosshöhe) mit eigener Ladentextur zeichnen */
/** Luftbild + feine Körnung aus Weltkoordinaten (2-m-Pixel wirken aus Fahrerhöhe sonst verwaschen) */
/** Scharfes Luftbild der Kernzone (0.625 m statt 2 m): LV95-Ausschnitt; Weltkoordinaten → UV per Ausgleichsebene (Restfehler < 1 m) */
export const AERIAL_HR = { E0: 2664760, E1: 2667320, N0: 1210400, N1: 1212960 };
function hrAffine(): [THREE.Vector3, THREE.Vector3] {
  // kleinste Quadrate auf einem 9×9-Gitter über die Kernzone
  const pts: number[][] = []; for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) pts.push([-1300 + i * 325, -1400 + j * 325]);
  const solve = (f: (E: number, N: number) => number) => {
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], b = [0, 0, 0];
    for (const [x, z] of pts) { const [E, N] = lv95(x, z); const r = [x, z, 1], y = f(E, N); for (let a = 0; a < 3; a++) { b[a] += r[a] * y; for (let c = 0; c < 3; c++) M[a][c] += r[a] * r[c]; } }
    const m = new THREE.Matrix3().set(M[0][0], M[0][1], M[0][2], M[1][0], M[1][1], M[1][2], M[2][0], M[2][1], M[2][2]).invert();
    return new THREE.Vector3(...b).applyMatrix3(m);
  };
  return [solve((E) => (E - AERIAL_HR.E0) / (AERIAL_HR.E1 - AERIAL_HR.E0)), solve((_E, N) => (N - AERIAL_HR.N0) / (AERIAL_HR.N1 - AERIAL_HR.N0))];
}
function withDetail(m: THREE.MeshToonMaterial, detail: THREE.Texture, hr?: THREE.Texture) {
  detail.wrapS = detail.wrapT = THREE.RepeatWrapping;
  const [hA, hB] = hr ? hrAffine() : [new THREE.Vector3(), new THREE.Vector3()];
  m.onBeforeCompile = (sh) => {
    sh.uniforms.detailMap = { value: detail };
    if (hr) { sh.uniforms.hrMap = { value: hr }; sh.uniforms.hrA = { value: hA }; sh.uniforms.hrB = { value: hB }; }
    sh.vertexShader = 'varying vec2 vWXZ;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = (hr ? '#define USE_HR\nuniform sampler2D hrMap;\nuniform vec3 hrA, hrB;\n' : '') + 'uniform sampler2D detailMap;\nvarying vec2 vWXZ;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      `#include <map_fragment>
       #ifdef USE_HR
       vec2 huv = vec2(dot(hrA, vec3(vWXZ, 1.0)), dot(hrB, vec3(vWXZ, 1.0)));
       vec2 he = min(huv, 1.0 - huv);
       float hw = smoothstep(0.0, 0.03, min(he.x, he.y));
       if (hw > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(hrMap, huv).rgb, hw);
       #endif
       float dg = texture2D(detailMap, vWXZ / 9.0).r * 0.6 + texture2D(detailMap, vWXZ / 31.0).r * 0.4;
       diffuseColor.rgb *= mix(0.86, 1.1, dg);`);
  };
  m.customProgramCacheKey = () => 'detail' + detail.uuid + (hr ? 'hr' : '');
  return m;
}

/** Wasser: wandernde Wellen-Normalen, Himmel-Spiegelung bei flachem Blick (Fresnel), Sonnenglitzern als harte Comic-Funken */
export const WATER = { time: { value: 0 }, sun: { value: new THREE.Vector3(-400, 700, 300).normalize() }, sky: { value: new THREE.Color('#CFE9F5') } };
function withWater(m: THREE.MeshToonMaterial) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWT = WATER.time; sh.uniforms.uWSun = WATER.sun; sh.uniforms.uWSky = WATER.sky;
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n  vMapUv += vec2(0.0, 0.0);\n#endif');
    sh.fragmentShader = 'uniform float uWT;\nuniform vec3 uWSun;\nuniform vec3 uWSky;\nvarying vec3 vWP;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec2 p = vWP.xz;
        float t = uWT;
        vec2 g = vec2(0.0);
        g += vec2(0.8, 0.6) * cos(dot(p, vec2(0.8, 0.6)) * 0.55 + t * 1.3) * 0.55;
        g += vec2(-0.5, 0.86) * cos(dot(p, vec2(-0.5, 0.86)) * 0.9 + t * 1.9) * 0.35;
        g += vec2(0.96, -0.28) * cos(dot(p, vec2(0.96, -0.28)) * 1.7 + t * 2.6) * 0.2;
        g += vec2(0.1, 1.0) * cos(dot(p, vec2(0.1, 1.0)) * 3.1 + t * 3.4) * 0.12;
        vec3 n = normalize(vec3(-g.x * 0.18, 1.0, -g.y * 0.18));
        vec3 v = normalize(cameraPosition - vWP);
        float fr = pow(1.0 - max(dot(n, v), 0.0), 5.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, uWSky, fr * 0.45);
        // Glitzern nur als kleine Funken und vor allem bei flachem Blick (von oben sah es sonst wie Schaumflecken aus)
        float sp = pow(max(dot(reflect(-v, n), uWSun), 0.0), 900.0);
        float graze = clamp(1.0 - v.y * 1.15, 0.0, 1.0);
        totalEmissiveRadiance += vec3(1.0, 0.97, 0.88) * smoothstep(0.5, 0.8, sp) * graze * 1.2;
      }`);
  };
  m.customProgramCacheKey = () => 'water';
  return m;
}

/** Abendstimmung: Fenster (bläuliche Glaspixel der Fassadentextur) leuchten zufällig warm auf, gesteuert über NIGHT.value 0..1 */
export const NIGHT = { value: 0 };
export function withNight(m: THREE.MeshToonMaterial) {
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey?.bind(m);
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    sh.uniforms.uNight = NIGHT;
    sh.vertexShader = 'varying vec3 vNightP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vNightP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform float uNight;\nvarying vec3 vNightP;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      #ifdef USE_MAP
      if (uNight > 0.0) {
        float winM = step(0.1, sampledDiffuseColor.b - sampledDiffuseColor.r) * step(0.28, sampledDiffuseColor.b);
        vec2 cell = floor(vNightP.xz / 2.4) + floor(vNightP.y / 3.1) * vec2(7.13, 3.71);
        float rnd = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
        totalEmissiveRadiance += vec3(1.0, 0.74, 0.38) * winM * step(0.42, rnd) * uNight * 1.1;
      }
      #endif`);
  };
  m.customProgramCacheKey = () => 'night' + (prevKey ? prevKey() : '');
  return m;
}

/** Altstadt-Häuserzeilen: lange Fassaden (ein swisstopo-Objekt = ganze Zeile) alle ~8.5 m in einer anderen
 *  Pastellfarbe einfärben, wie die bunten Häuser am Rathausquai, Kornmarkt und Weinmarkt. */
function withRows(m: THREE.MeshToonMaterial, amount: number) {
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey?.bind(m);
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    sh.vertexShader = 'varying vec3 vRowP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vRowP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vRowP;\n' + sh.fragmentShader.replace('#include <color_fragment>', `
      #ifdef USE_MAP
      {
        vec2 hc = vec2(floor(vMapUv.x / 2.6), floor((vRowP.x + vRowP.z) / 350.0));
        float hr = fract(sin(dot(hc, vec2(12.9898, 78.233))) * 43758.5453);
        // Farben aus Fotos von Weinmarkt/Kornmarkt/Rathausquai (Wikimedia Commons, 13.11.2026), linear: Ocker, Terrakotta, Salbeigrau,
        // Altrosa, Steingrau, Sonnengelb, Taubenblau, Crème
        vec3 tint = hr < 0.125 ? vec3(0.69, 0.45, 0.16) : hr < 0.25 ? vec3(0.55, 0.19, 0.10) : hr < 0.375 ? vec3(0.38, 0.43, 0.30)
          : hr < 0.5 ? vec3(0.72, 0.38, 0.35) : hr < 0.625 ? vec3(0.58, 0.56, 0.51) : hr < 0.75 ? vec3(0.80, 0.61, 0.21)
          : hr < 0.875 ? vec3(0.43, 0.51, 0.58) : vec3(0.85, 0.76, 0.58);
        diffuseColor.rgb *= mix(vColor, tint, ${amount.toFixed(2)});
      }
      #else
      #include <color_fragment>
      #endif`);
  };
  m.customProgramCacheKey = () => 'rows' + amount + (prevKey ? prevKey() : '');
  return m;
}

function withShop(m: THREE.MeshToonMaterial, shopTex: THREE.Texture) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.shopMap = { value: shopTex };
    sh.fragmentShader = 'uniform sampler2D shopMap;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      `#ifdef USE_MAP
        vec4 sampledDiffuseColor = vMapUv.y < 1.0 ? texture2D( shopMap, vec2(vMapUv.x, vMapUv.y) ) : texture2D( map, vMapUv );
        diffuseColor *= sampledDiffuseColor;
      #endif`);
  };
  m.customProgramCacheKey = () => 'shop' + shopTex.uuid;
  return m;
}

// ---------------- 13j Kantonsstrassen-Paket: Kreisel, Ortstafeln, Mittelinseln ----------------
/** Schweizer Signale als kleine Canvas-Texturen (SSV): 2.41.1 Kreisverkehr, 3.02 Kein Vortritt, 2.37 Hindernis rechts umfahren, 4.27/4.28 Ortsbeginn/-ende */
function signTex(kind: 'kreisel' | 'vortritt' | 'umfahren') {
  return canvasTex(64, 64, (g) => {
    g.clearRect(0, 0, 64, 64);
    if (kind === 'vortritt') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(2, 6); g.lineTo(62, 6); g.lineTo(32, 60); g.closePath(); g.fill();
      g.fillStyle = '#D52B1E'; g.beginPath(); g.moveTo(5, 8); g.lineTo(59, 8); g.lineTo(32, 56); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(17, 15); g.lineTo(47, 15); g.lineTo(32, 42); g.closePath(); g.fill(); return; }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill(); g.fillStyle = '#1F4E9C'; g.beginPath(); g.arc(32, 32, 29, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 5;
    if (kind === 'umfahren') { g.beginPath(); g.moveTo(20, 18); g.lineTo(42, 40); g.stroke(); g.beginPath(); g.moveTo(46, 46); g.lineTo(46, 30); g.lineTo(30, 46); g.closePath(); g.fill(); return; }
    for (let k = 0; k < 3; k++) { const a0 = k * 2.094 + 0.35; g.beginPath(); g.arc(32, 32, 16, a0, a0 + 1.35); g.stroke();
      const a1 = a0 + 1.35, x = 32 + Math.cos(a1) * 16, y = 32 + Math.sin(a1) * 16, tx = -Math.sin(a1), ty = Math.cos(a1);
      g.beginPath(); g.moveTo(x + tx * 7, y + ty * 7); g.lineTo(x - Math.cos(a1) * 6, y - Math.sin(a1) * 6); g.lineTo(x + Math.cos(a1) * 6, y + Math.sin(a1) * 6); g.closePath(); g.fill(); }
  }, false);
}
/** Wegweiser für Hauptstrassen (SSV 4.31: blau, weisse Schrift, Pfeilform), an Verzweigungen von Hauptstrassen.
 *  Je abgehendem Ast ein Pfeilschild zum nächsten grösseren Ort in dieser Richtung (Ortsliste aller Regionen, SIGN_PLACES).
 *  [Annahme] Ziel = Ort mit kleinster Abweichung (≤ 40°) von der Astrichtung (Mittel über 150 m), 0.5–14 km entfernt, grössere Orte bevorzugt. */
function wegweiser(d: CityData, terrain: Terrain, group: THREE.Group, steel: THREE.Material) {
  const key = (q: number[]) => Math.round(q[0]) + ',' + Math.round(q[1]);
  const at = new Map<string, { r: CityData['roads'][0]; i: number }[]>();
  const CARW = ['primary', 'secondary', 'tertiary', 'trunk', 'unclassified', 'residential'];
  const main = d.roads.filter((r) => !r.b && r.p.length >= 2 && (r.L || (CARW.includes(r.c) && r.w >= 5)));
  for (const r of main) r.p.forEach((q, i) => { const k = key(q); if (!at.has(k)) at.set(k, []); at.get(k)!.push({ r, i }); });
  const rbs = d.rbs || [];
  const along = (r: CityData['roads'][0], i: number, dir: number, len: number) => { let acc = 0, k = i; const [x0, z0] = r.p[i]; let x = x0, z = z0;
    while (acc < len) { const n = k + dir; if (n < 0 || n >= r.p.length) break; acc += Math.hypot(r.p[n][0] - r.p[k][0], r.p[n][1] - r.p[k][1]); k = n; x = r.p[k][0]; z = r.p[k][1]; }
    const L = Math.hypot(x - x0, z - z0); return L > 5 ? [(x - x0) / L, (z - z0) / L] : null; };
  type Panel = { x: number; z: number; ux: number; uz: number; y: number; name: string; km: string };
  const panels: Panel[] = [], poles: number[][] = [], done: number[][] = [];
  for (const [k, list] of at) {
    if (list.length < 2 || !list.some((e) => e.r.L)) continue; // nur Verzweigungen an Hauptstrassen
    const [jx, jz] = k.split(',').map(Number);
    if (done.some(([x, z]) => Math.hypot(x - jx, z - jz) < 180)) continue;
    if (rbs.some(([cx, cz, r]) => Math.hypot(cx - jx, cz - jz) < r + 25)) continue;
    const br: { ux: number; uz: number; w: number; r: CityData['roads'][0] }[] = [];
    for (const { r, i } of list) for (const dir of [-1, 1]) { if (r.o && dir < 0) continue; const u = along(r, i, dir, 150); if (u) br.push({ ux: u[0], uz: u[1], w: r.w, r }); }
    if (br.length < 3) continue;
    const used = new Set<string>(); const signs: { ux: number; uz: number; name: string; km: string }[] = [];
    for (const b of br) { let best: [number, string, number] | null = null;
      for (const [n, px, pz, rk] of SIGN_PLACES) { const dx = px - jx, dz = pz - jz, dist = Math.hypot(dx, dz); if (dist < 500 || dist > 14000 || used.has(n)) continue;
        const ang = Math.acos(Math.max(-1, Math.min(1, (dx * b.ux + dz * b.uz) / dist))) * 180 / Math.PI; if (ang > 40) continue;
        const sc = ang / 40 + dist / 9000 - rk * 0.25; if (!best || sc < best[0]) best = [sc, n, dist]; }
      if (best) { used.add(best[1]); signs.push({ ux: b.ux, uz: b.uz, name: best[1], km: best[2] > 2500 ? String(Math.round(best[2] * 1.25 / 1000)) : '' }); } }
    if (!signs.length) continue;
    // Mast: an der Ecke zwischen dem breitesten Ast und dem rechts davon liegenden
    br.sort((a, b) => b.w - a.w); const m = br[0]; const off = m.w / 2 + 2.2;
    const px = jx + m.ux * 9 - m.uz * off, pz = jz + m.uz * 9 + m.ux * off; const y = terrain.height(px, pz);
    poles.push([px, pz, y, signs.length]); done.push([jx, jz]);
    signs.slice(0, 4).forEach((sg, n) => panels.push({ x: px, z: pz, ux: sg.ux, uz: sg.uz, y: y + 2.3 + n * 0.68, name: sg.name, km: sg.km }));
  }
  if (!panels.length) return 0;
  // Atlas: je Ortsname zwei Zeilen (Pfeil nach rechts / nach links für die Rückseite)
  const names = [...new Set(panels.map((p) => p.name + '|' + p.km))], RH = 64, W = 512;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = THREE.MathUtils.ceilPowerOfTwo(names.length * 2 * RH); const g = cv.getContext('2d')!;
  names.forEach((nk, i) => { const [nm, km] = nk.split('|');
    for (const side of [0, 1]) { const y0 = (i * 2 + side) * RH; g.save(); if (side) { g.translate(W, 0); g.scale(-1, 1); }
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(2, y0 + 4); g.lineTo(W - 52, y0 + 4); g.lineTo(W - 4, y0 + RH / 2); g.lineTo(W - 52, y0 + RH - 4); g.lineTo(2, y0 + RH - 4); g.closePath(); g.fill();
      g.fillStyle = '#1F4E9C'; g.beginPath(); g.moveTo(8, y0 + 9); g.lineTo(W - 55, y0 + 9); g.lineTo(W - 12, y0 + RH / 2); g.lineTo(W - 55, y0 + RH - 9); g.lineTo(8, y0 + RH - 9); g.closePath(); g.fill(); g.restore();
      g.fillStyle = '#fff'; g.textBaseline = 'middle'; let fs = 34; g.font = `bold ${fs}px sans-serif`; while (g.measureText(nm).width > 330 && fs > 18) { fs -= 2; g.font = `bold ${fs}px sans-serif`; }
      const tx = side ? 70 : 22; g.textAlign = 'left'; g.fillText(nm, tx, y0 + RH / 2 + 1);
      if (km) { g.font = 'bold 26px sans-serif'; g.textAlign = 'right'; g.fillText(km, side ? W - 16 : W - 70, y0 + RH / 2 + 1); } } });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const pos: number[] = [], uv: number[] = [], L = 2.4, H = 0.5, V = cv.height;
  for (const p of panels) { const i = names.indexOf(p.name + '|' + p.km);
    const ax = p.x + p.ux * 0.1, az = p.z + p.uz * 0.1, bx = p.x + p.ux * (L + 0.1), bz = p.z + p.uz * (L + 0.1);
    // Vorderseite (Pfeil zeigt in Astrichtung, Text lesbar von rechts der Astrichtung gesehen) und Rückseite (gespiegelter Atlas-Eintrag)
    for (const side of [0, 1]) { const v0 = 1 - ((i * 2 + side) * RH + RH) / V, v1 = 1 - ((i * 2 + side) * RH) / V, nx = -p.uz, nz = p.ux, e = side ? -0.012 : 0.012;
      const A = [ax + nx * e, p.y, az + nz * e], B = [bx + nx * e, p.y, bz + nz * e], C = [bx + nx * e, p.y + H, bz + nz * e], D = [ax + nx * e, p.y + H, az + nz * e];
      const [ua, ub] = side ? [1, 0] : [0, 1];
      const tri = side ? [[A, ua, v0], [C, ub, v1], [B, ub, v0], [A, ua, v0], [D, ua, v1], [C, ub, v1]] : [[A, ua, v0], [B, ub, v0], [C, ub, v1], [A, ua, v0], [C, ub, v1], [D, ua, v1]];
      for (const [P, u, v] of tri as [number[], number, number][]) { pos.push(P[0], P[1], P[2]); uv.push(u, v); } } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.FrontSide })); mesh.name = 'wegweiser'; group.add(mesh);
  const pg: THREE.BufferGeometry[] = []; for (const [x, z, y, n] of poles) { const hh = 2.3 + n * 0.68 + 0.1; const c = new THREE.CylinderGeometry(0.06, 0.06, hh, 6); c.translate(x, y + hh / 2, z); pg.push(c); }
  const pm = new THREE.Mesh(mergeGeometries(pg)!, steel); pm.name = 'wegweiser'; group.add(pm);
  (window as any).__wegweiser = poles.map((q) => [Math.round(q[0]), Math.round(q[1])]);
  return poles.length;
}

function kantonsPaket(d: CityData, props: Props | undefined, terrain: Terrain, group: THREE.Group, vAt: Map<string, Set<number>>, nk: (q: number[]) => string) {
  const CAR = ['primary', 'secondary', 'tertiary', 'trunk', 'residential', 'unclassified', 'living_street', 'primary_link', 'secondary_link', 'tertiary_link', 'trunk_link'];
  const roundSigns: number[][] = [], vortritt: number[][] = [], umfahren: number[][] = [], dashGeo: THREE.BufferGeometry[] = [];
  const islGeo: THREE.BufferGeometry[] = [];
  // --- Kreisel: Mittelinsel (Gras mit Randstein), gepflästerter überfahrbarer Innenring, Skulptur oder Baum; Signale an den Zufahrten ---
  const rbs = d.rbs || [];
  if (rbs.length) {
    const grass: THREE.BufferGeometry[] = [], paving: THREE.BufferGeometry[] = [], curb: THREE.BufferGeometry[] = [], art: THREE.BufferGeometry[] = [], artCol: number[] = [];
    const PAL = ['#E6332A', '#F2C21B', '#2E7DD7', '#FF4FA3', '#3FB27F'];
    for (const [cx, cz, r] of rbs) {
      const ri = Math.max(1.6, r - 4.0), apron = Math.min(2.0, ri * 0.3), h = terrain.height(cx, cz);
      const pv = new THREE.CylinderGeometry(ri, ri, 0.9, 40); pv.translate(cx, h - 0.35, cz); paving.push(pv); // Oberkante 0.10 m über Fahrbahn
      const cb = new THREE.CylinderGeometry(ri - apron, ri - apron, 0.9, 36); cb.translate(cx, h - 0.27, cz); curb.push(cb);
      const gr = new THREE.CylinderGeometry(ri - apron - 0.25, ri - apron - 0.25, 0.9, 36); gr.translate(cx, h - 0.25, cz); grass.push(gr);
      if (ri - apron > 2.5) { // Kunst im Kreisel (in der Schweiz häufig): bunte Stele bzw. bei kleinen Inseln ein Baum
        const k = Math.abs(Math.round(cx * 7 + cz * 13)) % PAL.length;
        if (ri > 6) { const st = new THREE.CylinderGeometry(0.5, 0.9, 4.5, 6); st.translate(cx, h + 2.4, cz); art.push(st); const c = new THREE.Color(PAL[k]); for (let i = 0; i < st.getAttribute('position').count; i++) artCol.push(c.r, c.g, c.b);
          const top = new THREE.SphereGeometry(1.1, 10, 8); top.translate(cx, h + 5.2, cz); art.push(top); const c2 = new THREE.Color(PAL[(k + 2) % PAL.length]); for (let i = 0; i < top.getAttribute('position').count; i++) artCol.push(c2.r, c2.g, c2.b); }
        else { const tr = new THREE.ConeGeometry(1.6, 4.2, 8); tr.translate(cx, h + 2.6, cz); art.push(tr); const c = new THREE.Color('#3E8E41'); for (let i = 0; i < tr.getAttribute('position').count; i++) artCol.push(c.r, c.g, c.b); }
      }
      // Zufahrten: Wegenden nahe am Ring, die selbst nicht Teil des Rings sind → «Kreisverkehr» + «Kein Vortritt» 10 m vor der Einfahrt rechts
      for (const rd of d.roads) { if (!CAR.includes(rd.c) || rd.b || rd.p.length < 2) continue;
        if (rd.p.every((q) => Math.abs(Math.hypot(q[0] - cx, q[1] - cz) - r) < 5)) continue; // Ringstück
        for (const end of [0, 1]) { const pp = end ? rd.p : rd.p.slice().reverse(); const B = pp[pp.length - 1]; if (Math.abs(Math.hypot(B[0] - cx, B[1] - cz) - r) > 4) continue;
          if (end === 0 && rd.o) continue; // Einbahn weg vom Kreisel: keine Zufahrt
          let acc = 0, k = pp.length - 1; while (k > 0 && acc + Math.hypot(pp[k][0] - pp[k - 1][0], pp[k][1] - pp[k - 1][1]) < 10) { acc += Math.hypot(pp[k][0] - pp[k - 1][0], pp[k][1] - pp[k - 1][1]); k--; }
          if (k < 1) continue; const A = pp[k - 1], Bq = pp[k], sl = Math.hypot(Bq[0] - A[0], Bq[1] - A[1]) || 1, ux = (Bq[0] - A[0]) / sl, uz = (Bq[1] - A[1]) / sl, t = Math.max(0, sl - (10 - acc));
          const o = rd.w / 2 + 0.9, x = A[0] + ux * t - uz * o, z = A[1] + uz * t + ux * o; if (Math.hypot(x - cx, z - cz) < r + 2) continue;
          roundSigns.push([x, z, Math.atan2(ux, uz)]); if (rd.L) vortritt.push([x, z, Math.atan2(ux, uz)]);
          // Fahrbahnteiler (Tropfeninsel) bei zweispurigen Zufahrten und Wartelinie (SSV 6.13) über die Einfahrt
          const P1 = pp[pp.length - 2], P2 = pp[pp.length - 1], L1 = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]) || 1, vx = (P2[0] - P1[0]) / L1, vz = (P2[1] - P1[1]) / L1;
          const ex = cx - vx * (r + 0.3), ez = cz - vz * (r + 0.3); // Ringrand auf der Zufahrtsachse
          if (!rd.o && rd.w >= 5.5 && L1 > 10) { const ic = [ex - vx * 5, ez - vz * 5], hh = terrain.height(ic[0], ic[1]);
            const tb = new THREE.BoxGeometry(1.3, 0.6, 7); tb.rotateY(Math.atan2(vx, vz)); tb.translate(ic[0], hh - 0.14, ic[1]); islGeo.push(tb);
            umfahren.push([ex - vx * 8.8, ez - vz * 8.8, Math.atan2(vx, vz)]); }
          const half = rd.o ? rd.w / 2 : rd.w / 2, o0 = rd.o ? -half + 0.3 : 0.9, o1 = half - 0.3; // rechte Hälfte (Einfahrt)
          for (let o = o0; o + 0.5 <= o1; o += 0.75) { const px = ex - vz * (o + 0.25), pz = ez + vx * (o + 0.25); const d1 = new THREE.BoxGeometry(0.5, 0.04, 0.3); d1.rotateY(Math.atan2(vx, vz)); d1.translate(px, terrain.height(px, pz) + 0.42, pz); dashGeo.push(d1); } } }
    }
    const mk = (gs: THREE.BufferGeometry[], col: string, name: string) => { if (!gs.length) return; const m = new THREE.Mesh(mergeGeometries(gs)!, toon(col)); m.name = name; group.add(m); };
    mk(paving, '#A39E94', 'kreisel'); mk(curb, '#C9C5BB', 'kreisel'); mk(grass, '#76A957', 'kreisel');
    if (art.length) { const g = mergeGeometries(art.map((x) => x.toNonIndexed()))!; g.setAttribute('color', new THREE.Float32BufferAttribute(artCol, 3)); const m = new THREE.Mesh(g, toon('#ffffff', { vertexColors: true })); m.name = 'kreisel'; group.add(m); }
  }
  // --- Mittelinseln an Fussgängerstreifen (gepflästert, Randstein) mit Signal «Hindernis rechts umfahren» an beiden Enden ---
  if (props?.isl?.length) {
    const car = d.roads.filter((r) => CAR.includes(r.c) && !r.b && r.w >= 6);
    for (const [ix, iz] of props.isl) { let best: [number, number, number, number, number] | null = null;
      for (const r of car) for (let i = 1; i < r.p.length; i++) { const [x1, z1] = r.p[i - 1], [x2, z2] = r.p[i]; if (Math.abs(x1 - ix) > 80 && Math.abs(x2 - ix) > 80) continue;
        const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz; if (L2 < 1) continue; const t = Math.max(0, Math.min(1, ((ix - x1) * dx + (iz - z1) * dz) / L2)), px = x1 + dx * t, pz = z1 + dz * t, dd = Math.hypot(px - ix, pz - iz);
        if (dd < 3 && (!best || dd < best[0])) { const L = Math.sqrt(L2); best = [dd, dx / L, dz / L, px, pz]; } }
      if (!best) continue; const [, ux, uz, px, pz] = best; const h = terrain.height(px, pz);
      const b = new THREE.BoxGeometry(1.6, 0.6, 7); b.rotateY(Math.atan2(ux, uz)); b.translate(px, h - 0.14, pz); islGeo.push(b);
      for (const sd of [-1, 1]) umfahren.push([px + ux * 3.2 * sd, pz + uz * 3.2 * sd, Math.atan2(ux * sd, uz * sd)]); }
  }
  if (islGeo.length) { const m = new THREE.Mesh(mergeGeometries(islGeo)!, toon('#B8B3A8')); m.name = 'mittelinsel'; group.add(m); }
  if (dashGeo.length) { const m = new THREE.Mesh(mergeGeometries(dashGeo)!, new THREE.MeshBasicMaterial({ color: '#F5F1E6' })); m.name = 'kreisel-wartelinie'; group.add(m); }
  // Signale (Stange + Scheibe), je Art eine Instanz-Gruppe; Mittelinsel-Signal tief (1.0 m)
  const steel = toon('#8A8F94');
  const put = (list: number[][], tex: THREE.Texture, size: number, hgt: number, name: string) => { if (!list.length) return;
    const sg = new THREE.PlaneGeometry(size, size); sg.translate(0, hgt, 0); const pg = new THREE.CylinderGeometry(0.04, 0.04, hgt, 6); pg.translate(0, hgt / 2, 0);
    const ms = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), list.length), mp = new THREE.InstancedMesh(pg, steel, list.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    list.forEach(([x, z, hh], k) => { q.setFromEuler(e.set(0, hh + Math.PI, 0)); m4.compose(v.set(x, terrain.height(x, z), z), q, one); ms.setMatrixAt(k, m4); mp.setMatrixAt(k, m4); });
    for (const im of [ms, mp]) { im.computeBoundingSphere(); im.name = name; group.add(chunkInstanced(im, 1000)); } };
  put(roundSigns, signTex('kreisel'), 0.64, 2.3, 'kreisel-signal');
  put(vortritt.map(([x, z, h]) => [x, z, h]), signTex('vortritt'), 0.7, 1.55, 'kein-vortritt');
  put(umfahren, signTex('umfahren'), 0.5, 1.0, 'umfahren');
  // --- Ortstafeln (SSV 4.27 Ortsbeginn, 4.28 Ortsende): wo eine Hauptstrasse von > 50 auf 50 km/h wechselt (OSM maxspeed) ---
  const places = d.places || [];
  const tafeln: [number, number, number, string, boolean][] = [];
  if (places.length) {
    const nameAt = (x: number, z: number) => { let best: [number, string] | null = null;
      for (const [n, px, pz, rk] of places) { const dd = Math.hypot(px - x, pz - z) - rk * 250; if (dd < 1500 && (!best || dd < best[0])) best = [dd, n]; } return best?.[1]; };
    for (const r of d.roads) { if (!r.L || !r.v || r.b || r.p.length < 2) continue;
      for (const st of [0, 1]) { if (st === 1 && r.o) continue; const q = st ? r.p[r.p.length - 1] : r.p[0]; const vs = vAt.get(nk(q)); if (!vs || vs.size < 2) continue;
        // Grenze innerorts ↔ ausserorts: bei Städten (Rang 3) erst ab 70 km/h, bei Dörfern ab 60 km/h (Annahme: 60er-Zonen sind dort Ortseinfahrten)
        let thr = 60; { let bd = 1e9; for (const [, px, pz, rk] of places) { const dd = Math.hypot(px - q[0], pz - q[1]); if (dd < bd) { bd = dd; thr = rk >= 3 ? 70 : 60; } } }
        const inTown = r.v <= 50; if (!inTown && r.v < thr) continue; const other = [...vs].some((v) => inTown ? v >= thr : v <= 50); if (!other) continue;
        const pp = st ? r.p.slice().reverse() : r.p; const A = pp[0], B = pp[1]; const sl = Math.hypot(B[0] - A[0], B[1] - A[1]); if (sl < 8) continue;
        const ux = (B[0] - A[0]) / sl, uz = (B[1] - A[1]) / sl, o = r.w / 2 + 1.3, x = A[0] + ux * 4 - uz * o, z = A[1] + uz * 4 + ux * o;
        const nm = nameAt(A[0], A[1]); if (!nm || tafeln.some((t) => Math.hypot(t[0] - x, t[1] - z) < 25)) continue;
        tafeln.push([x, z, Math.atan2(ux, uz), nm, !inTown]); } }
    for (const [x, z, h, nm, ende] of tafeln) {
      const tex = canvasTex(256, 96, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#1F4E9C'; g.fillRect(5, 5, 246, 86);
        g.fillStyle = '#fff'; let fs = 40; g.font = `bold ${fs}px sans-serif`; while (g.measureText(nm).width > 226 && fs > 18) { fs -= 2; g.font = `bold ${fs}px sans-serif`; }
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(nm, 128, 50);
        if (ende) { g.strokeStyle = '#D52B1E'; g.lineWidth = 9; g.beginPath(); g.moveTo(14, 84); g.lineTo(242, 12); g.stroke(); } }, false);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.56), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
      const y = terrain.height(x, z); pl.position.set(x, y + 2.1, z); pl.rotation.y = h + Math.PI; pl.name = 'ortstafel'; group.add(pl);
      const pg = new THREE.CylinderGeometry(0.045, 0.045, 2.1, 6); const pm = new THREE.Mesh(pg, steel); pm.position.set(x, y + 1.05, z); group.add(pm); }
  }
  const nWeg = wegweiser(d, terrain, group, steel);
  console.log('[bau] Kreisel', rbs.length, 'Kreisel-Signale', roundSigns.length, 'Mittelinseln', islGeo.length, 'Ortstafeln', tafeln.length, 'Wegweiser', nWeg);
}
