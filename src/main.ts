import { Fun, Animals, Ships, Trains, Gondola, Boats } from './fun';
import { setupLoader, loaderProgress, loaderDone } from './loader';
import * as THREE from 'three';
import './style.css';
import { AERIAL, NIGHT, ERKER, type ForestMask, STYLE_COUNT, buildWorld, horizonMesh, toon, outline, type CityData, type World } from './world';
import { NavGraph, pathLength } from './nav';
import { Traffic } from './traffic';
import { Buses } from './bus';
import { Terrain } from './terrain';
import { Vehicle, textSprite, type Difficulty } from './vehicle';
import { pollInput, readControls, hit, hitP, padJoin, padCount, endFrame, gamepadName } from './input';
import { setupTouch, isTouchDevice, goFullscreen } from './touch';
import { initAudio, updateEngine, setSiren, sfxPlay, setMuted, isMuted, suspendAudio, setMusicMode } from './audio';
import { memoryGame, plasterGame, catGame, waterGame } from './minigames';

export const VERSION = '2026-11-12y';
const TEST = location.search.includes('test');
const memLog = (l: string) => { const w = window as any; if (!TEST || !w.gc) return; w.gc(); (w.__mem ||= []).push(l + ' ' + Math.round((performance as any).memory.usedJSHeapSize / 1e6)); };

// ---------------- Spielstand ----------------
interface Save { region?: 'luzern' | 'nord'; heartsN?: number[]; evening?: boolean; skin?: string; hearts?: number[]; best: Record<string, number>; diff: Difficulty; muted: boolean; cam: number; pos?: [number, number, number]; played: number; quality?: 'echt' | 'leicht' }
const SAVE_KEY = 'luksiRescue.v1';
function loadSave(): Save {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || ''); if (s && s.best) return s; } catch { /* leer */ }
  return { best: {}, diff: 'rettung', muted: false, cam: 0, played: 0 };
}
let save = loadSave();
// Regionen: «luzern» (Stadt, Kriens, Horw, Verkehrshaus) und «nord» (Emmenbrücke, Rotsee, Ebikon, Adligenswil, Etappe 2).
// Gewechselt wird am Nordrand per Neuladen (eigene Daten in data/nord/, Speicher bleibt klein).
const REGION: 'luzern' | 'nord' = /[?&]region=nord/.test(location.search) ? 'nord' : /[?&]region=luzern/.test(location.search) ? 'luzern' : save.region || 'luzern';
const DIR = REGION === 'nord' ? 'data/nord/' : 'data/';
if (REGION === 'nord') Object.assign(AERIAL, { E0: 2662190, E1: 2670670, N0: 1212000, N1: 1215560 });
const MOBILE = isTouchDevice();
const QUALITY: 'echt' | 'leicht' = /[?&]q=leicht/.test(location.search) ? 'leicht' : /[?&]q=echt/.test(location.search) ? 'echt' : save.quality || (MOBILE ? 'leicht' : 'echt');
function writeSave() {
  try { save.pos = [car.x, car.z, car.heading]; save.region = REGION; localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* privat-Modus */ }
}
const totalStars = () => Object.values(save.best).reduce((a, b) => a + b, 0);

// ---------------- DOM ----------------
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const ui = $('#ui');
function toast(text: string, ms = 2200) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
  ui.appendChild(t); setTimeout(() => t.classList.add('out'), ms); setTimeout(() => t.remove(), ms + 500);
}

// ---------------- Three ----------------
const renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MOBILE ? 1 : 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('#app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#A9DDF3');
scene.fog = new THREE.Fog('#BFE6F6', 260, 1500);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 1800); // Nebel endet bei 1500 m: dahinter zeichnet die Fernsicht (farScene)
// Ferne Szene (Horizont) mit eigener Kamera: grosse Sichtweite ohne Tiefenpuffer-Probleme in der Nähe
const farScene = new THREE.Scene();
const farCam = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 50, 45000);
farScene.add(new THREE.HemisphereLight('#ffffff', '#c9b994', 1.35));
{ const s2 = new THREE.DirectionalLight('#fff3dc', 2.1); s2.position.set(-400, 700, 300); farScene.add(s2); }
renderer.autoClear = false;
farScene.background = scene.background; scene.background = null; renderer.setClearColor('#A9DDF3', 1);
function renderView(cam: THREE.PerspectiveCamera) {
  if (farScene.children.length > 2) { farCam.position.copy(cam.position); farCam.quaternion.copy(cam.quaternion); farCam.aspect = cam.aspect; farCam.fov = cam.fov; farCam.updateProjectionMatrix(); renderer.render(farScene, farCam); renderer.clearDepth(); }
  renderer.render(scene, cam);
}
/** Split Screen: Rechtecke [x, y(von oben), w, h] in CSS-Pixeln je Spieler */
function layout(n: number, W: number, H: number): number[][] {
  if (n <= 1) return [[0, 0, W, H]];
  if (n === 2) return W >= H ? [[0, 0, W / 2, H], [W / 2, 0, W / 2, H]] : [[0, 0, W, H / 2], [0, H / 2, W, H / 2]];
  const w = W / 2, h = H / 2;
  if (n === 3) return [[0, 0, w, h], [w, 0, w, h], [0, h, W, h]];
  return [[0, 0, w, h], [w, 0, w, h], [0, h, w, h], [w, h, w, h]];
}
function renderAll() {
  const n = players.length;
  if (n <= 1) { renderer.setScissorTest(false); renderer.setViewport(0, 0, window.innerWidth, window.innerHeight); renderer.clear(); renderView(camera); return; }
  const W = window.innerWidth, H = window.innerHeight, L = layout(n, W, H);
  renderer.setScissorTest(true);
  players.forEach((p, i) => {
    const [x, y, w, h] = L[i]; const yb = H - y - h;
    renderer.setViewport(x, yb, w, h); renderer.setScissor(x, yb, w, h); renderer.clear();
    if (Math.abs(p.cam.aspect - w / h) > 0.001) { p.cam.aspect = w / h; p.cam.updateProjectionMatrix(); }
    renderView(p.cam);
  });
  renderer.setScissorTest(false);
}
const hemi = new THREE.HemisphereLight('#ffffff', '#c9b994', 1.35); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff3dc', 2.1); sun.position.set(-400, 700, 300); scene.add(sun);
/** Tageszeit: Tag oder Abend (Sonnenuntergang über dem Pilatus, Fenster und Laternen leuchten) */
function setEvening(on: boolean) {
  NIGHT.value = on ? 1 : 0;
  hemi.color.set(on ? '#9AA3D6' : '#ffffff'); hemi.groundColor.set(on ? '#4A3A52' : '#c9b994'); hemi.intensity = on ? 0.95 : 1.35;
  sun.color.set(on ? '#FFA866' : '#fff3dc'); sun.intensity = on ? 1.5 : 2.1; sun.position.set(on ? -900 : -400, on ? 160 : 700, on ? 500 : 300);
  for (const l of farScene.children) { if ((l as any).isHemisphereLight) { (l as any).intensity = on ? 0.95 : 1.35; (l as any).color.set(on ? '#9AA3D6' : '#ffffff'); } if ((l as any).isDirectionalLight) { (l as any).color.set(on ? '#FFA866' : '#fff3dc'); (l as any).intensity = on ? 1.4 : 2.1; } }
  const sky = on ? '#F2A877' : '#A9DDF3'; renderer.setClearColor(sky, 1); (farScene.background as THREE.Color).set(on ? '#F2A877' : '#A9DDF3');
  (scene.fog as THREE.Fog).color.set(on ? '#E9B08E' : '#BFE6F6');
  scene.traverse((o: any) => { const m = o.material; if (m && m.name === 'lampHead') m.emissive.set(on ? '#FFD27A' : '#5A4E20'); });
  document.body.classList.toggle('evening', on);
}
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  layoutTags();
});

// ---------------- Spieler (lokaler Mehrspieler, Split Screen) ----------------
const P_COLORS = ['#E63946', '#1D8FE0', '#F4A00C', '#7B4FB8'];
interface Player { idx: number; car: Vehicle; cam: THREE.PerspectiveCamera; camPos: THREE.Vector3; camLook: THREE.Vector3; camMode: number; arrow: THREE.Group; tag: HTMLElement; label: THREE.Sprite | null }
const players: Player[] = [];
function layoutTags() {
  const n = players.length; document.body.classList.toggle('split', n > 1);
  document.querySelectorAll('.split-line').forEach((e) => e.remove());
  const L = layout(n, window.innerWidth, window.innerHeight);
  players.forEach((p, i) => { const [x, y] = L[i]; p.tag.style.display = n > 1 ? '' : 'none'; p.tag.style.left = x + 10 + 'px'; p.tag.style.top = y + (i < 2 ? 56 : 10) + 'px'; });
  if (n > 1) for (const r of L.slice(1)) { const d = document.createElement('div'); d.className = 'split-line'; const [x, y, w, h] = r;
    if (x > 0) Object.assign(d.style, { left: x - 2 + 'px', top: y + 'px', width: '4px', height: h + 'px' }); else Object.assign(d.style, { left: '0', top: y - 2 + 'px', width: w + 'px', height: '4px' }); ui.appendChild(d); }
}

let cityData: CityData | null = null, propsData: any = null, roofData: string[] | undefined;
let buses: Buses | null = null;
let fun: Fun | null = null;
let animals: Animals | null = null;
let ships: Ships | null = null;
let boats: Boats | null = null;
let trains: Trains | null = null;
let gondola: Gondola | null = null;
let aerialTex: THREE.Texture | undefined;
let forestMask: ForestMask | undefined;
/** Waldmaske (aus Luftbild, 4 m) laden: PNG → Bytes */
async function loadForestMask(x0: number, z0: number): Promise<ForestMask | undefined> {
  try { const img = new Image(); img.src = DIR + 'forest.png'; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d')!; g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, c.width, c.height).data, data = new Uint8Array(c.width * c.height);
    for (let i = 0; i < data.length; i++) data[i] = px[i * 4] > 127 ? 1 : 0;
    return { w: c.width, h: c.height, x0, z0, step: 4, data }; } catch { return undefined; }
}
let world: World, nav: NavGraph, car: Vehicle, terrain: Terrain, traffic: Traffic | null = null;
let b3dMeta: { buildings: number[][] } | null = null;
let b3dData: { pos: ArrayLike<number> } | null = null;
const gy = (x: number, z: number) => (terrain ? terrain.height(x, z) : 0);

// ---------------- Einsätze ----------------
interface Mission { id: string; title: string; radio: string; place: string; at: [number, number]; game: (d: () => void) => void; transport: boolean; prop: () => THREE.Object3D; thanks: string }
let missions: Mission[] = [];
type Phase = 'free' | 'offer' | 'toScene' | 'onsite' | 'toHospital' | 'handover';
let phase: Phase = 'free';
let current: Mission | null = null;
let offerTimer = 6;
let phaseTime = 0, bumpsAtStart = 0, parTime = 60;
let route: number[][] | null = null;
let routeTimer = 0;
let target: [number, number] | null = null;
let hospitalBay: [number, number] = [0, 0];
const beacon = new THREE.Group();
let propObj: THREE.Object3D | null = null;
let carrier: Vehicle | null = null; // Ambulanz, die den Patienten fährt
const routeMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#F39204', transparent: true, opacity: 0.85, depthWrite: false }));
routeMesh.renderOrder = 2;
const arrow = new THREE.Group();

function person(shirt: string, sitting = true, scale = 1) {
  const g = new THREE.Group();
  const skin = toon('#F2C7A5');
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.5, 4, 8), toon(shirt)); b.position.y = sitting ? 0.6 : 0.95;
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), skin); h.position.y = sitting ? 1.3 : 1.65;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.31, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon('#6B4A2F')); hair.position.copy(h.position); hair.position.y += 0.03;
  const eyeM = new THREE.MeshBasicMaterial({ color: '#2b2b2b' });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeM); e.position.set(s * 0.1, h.position.y + 0.04, 0.27); g.add(e); }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 4, 10, Math.PI), eyeM); smile.position.set(0, h.position.y - 0.08, 0.27); smile.rotation.z = Math.PI;
  g.add(b, h, hair, smile, outline(b), outline(h));
  if (!sitting) for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 3, 6), toon('#34495e')); l.position.set(s * 0.15, 0.35, 0); g.add(l); }
  g.scale.setScalar(scale * 1.6);
  return g;
}
function propKid() { const g = new THREE.Group(); g.add(person('#E74C3C')); const ice = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 8), toon('#E8C27A')); ice.position.set(1.2, 0.3, 0.6); ice.rotation.z = 2.2; g.add(ice); return g; }
function propBike() {
  const g = new THREE.Group(); g.add(person('#27AE60'));
  const w = toon('#2E3440');
  for (const x of [-1, 1]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 6, 16), w); t.rotation.x = Math.PI / 2; t.position.set(2.4 + x * 1.0, 0.08, 0.5); g.add(t); }
  const f = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.12), toon('#3498DB')); f.position.set(2.4, 0.12, 0.5); g.add(f);
  return g;
}
function propCat() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 6, 7), toon('#7A5638')); trunk.position.y = 3;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 0), toon('#5E9B4F')); crown.position.y = 7.2;
  const cat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, 1.4), toon('#F39204')); cat.position.set(2.2, 6.2, 0);
  const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 4), toon('#F39204')); ear1.position.set(2.0, 6.75, 0.55);
  const ear2 = ear1.clone(); ear2.position.x = 2.4;
  g.add(trunk, crown, cat, ear1, ear2, outline(trunk), outline(crown), outline(cat));
  g.add(person('#8E44AD', false, 0.9).translateX(-2.5));
  return g;
}
function propTourist() { const g = new THREE.Group(); g.add(person('#F1C40F', true, 1.05)); const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 12), toon('#ECF0F1')); hat.position.y = 2.6; g.add(hat); return g; }

function mid(name: string): [number, number] | null {
  const parts = world.roadsByName.get(name);
  if (!parts || !parts.length) return null;
  const longest = parts.reduce((a, b) => (pathLength(b) > pathLength(a) ? b : a));
  const p = longest[Math.floor(longest.length / 2)];
  return [p[0], p[1]];
}
function snap(p: [number, number], carOnly: boolean | 'main' = 'main'): [number, number] {
  let id = nav.nearest(p[0], p[1], carOnly);
  if (id < 0) id = nav.nearest(p[0], p[1], true);
  if (id < 0) id = nav.nearest(p[0], p[1], false);
  return id < 0 ? p : [nav.xs[id], nav.zs[id]];
}

function setupMissions() {
  if (REGION === 'nord') { setupMissionsNord(); return; }
  const P = world.pois;
  const schwanen = snap(P['Schwanenplatz'] || [86, -151]);
  const see = snap(mid('Seebrücke') || [150, -60]);
  const inseli = snap(P['Inseli'] || [480, 160]);
  const kapell = snap(mid('Kapellbrücke') || [0, 0]);
  // Agglomeration: Orte über echte Haltestellen (OpenStreetMap) finden
  const stop = (n: string, fb: [number, number]) => { const s = propsData?.stops?.find((q: any) => q[2] === n); return snap(s ? [s[0], s[1]] : fb); };
  const krZentrum = stop('Zentrum Pilatus', [-2130, 2001]), horw = stop('Horw Zentrum', [216, 3668]), pilBahn = stop('Pilatus-Bahnen', [-2304, 2338]), allmend = stop('Allmend/Messe', [-371, 1840]);
  const badi = stop('Badi', [409, 6257]), schappe = stop('Schappe-Center', [-2600, 1950]), gasshof = stop('Gasshof', [-3544, 288]), horwBhf = stop('Horw Bahnhof', [-6, 3690]);
  // Osterweiterung (Version q): Verkehrshaus, Seeburg, Tribschen/Wartegg, Schönbühl, Kastanienbaum
  const vhs = stop('Verkehrshaus/Lido', [2050, -120]), seeburg = stop('Hotel Seeburg', [2500, -60]), wartegg = stop('Wartegg', [1300, 1500]), schoenbuehl = stop('Schönbühl', [1400, 1000]), kastanien = stop('Kastanienbaum Schiffstation', [2600, 5300]);
  missions = [
    { id: 'm1', title: 'Bauchweh vom Glace', radio: 'Ein Kind am Schwanenplatz hat Bauchweh vom vielen Glace!', place: 'Schwanenplatz', at: schwanen, game: memoryGame, transport: true, prop: propKid, thanks: 'Mit Tee und Wärmeflasche geht es schon besser. Danke!' },
    { id: 'm2', title: 'Velo-Sturz', radio: 'Velo-Sturz auf der Seebrücke – ein Knie ist aufgeschürft.', place: 'Seebrücke', at: see, game: plasterGame, transport: true, prop: propBike, thanks: 'Das Knie ist sauber verarztet. Super gefahren!' },
    { id: 'm3', title: 'Katze auf dem Baum', radio: 'Beim Inseli sitzt eine Katze auf einem Baum fest. Hilfst du?', place: 'Inseli', at: inseli, game: catGame, transport: false, prop: propCat, thanks: 'Die Katze ist wieder unten und schnurrt. Danke!' },
    { id: 'm4', title: 'Schwindel bei der Kapellbrücke', radio: 'Ein Tourist bei der Kapellbrücke ist ganz schwindlig.', place: 'Kapellbrücke', at: kapell, game: waterGame, transport: true, prop: propTourist, thanks: 'Mit Wasser und Schatten geht es wieder. Merci!' },
    { id: 'm5', title: 'Sturz vom Klettergerüst', radio: 'Beim Zentrum Pilatus in Kriens ist ein Kind vom Klettergerüst gerutscht – das Knie blutet ein bisschen.', place: 'Kriens, Zentrum Pilatus', at: krZentrum, game: plasterGame, transport: true, prop: propKid, thanks: 'Pflaster drauf, Tränen weg. Danke, Luksi!' },
    { id: 'm6', title: 'Katze in Horw', radio: 'Im Zentrum von Horw sitzt eine Katze ganz oben im Baum und miaut.', place: 'Horw Zentrum', at: horw, game: catGame, transport: false, prop: propCat, thanks: 'Die Katze ist wieder unten. Horw sagt Merci!' },
    { id: 'm7', title: 'Wanderer bei der Pilatusbahn', radio: 'Ein Wanderer bei der Talstation der Pilatus-Bahnen in Kriens ist ganz schwindlig.', place: 'Kriens, Pilatus-Bahnen', at: pilBahn, game: waterGame, transport: true, prop: propTourist, thanks: 'Mit Wasser und einer Pause geht es wieder. Merci!' },
    { id: 'm9', title: 'Sonnenstich in der Badi', radio: 'In der Badi Horw ist einem Kind vom vielen Sonnenbaden ganz heiss und schwindlig.', place: 'Badi Horw', at: badi, game: waterGame, transport: true, prop: propKid, thanks: 'Schatten, Wasser und eine Pause – schon besser. Merci!' },
    { id: 'm10', title: 'Gestolpert im Schappe-Center', radio: 'Im Schappe-Center in Kriens ist ein Kind auf der Treppe gestolpert. Ein Pflaster bitte!', place: 'Schappe-Center', at: schappe, game: plasterGame, transport: false, prop: propKid, thanks: 'Pflaster drauf – und weiter geht\'s. Danke!' },
    { id: 'm11', title: 'Kätzchen in Littau', radio: 'Beim Gasshof in Littau miaut ein Kätzchen hoch oben im Baum.', place: 'Littau, Gasshof', at: gasshof, game: catGame, transport: false, prop: propCat, thanks: 'Das Kätzchen ist wieder bei seiner Familie!' },
    { id: 'm12', title: 'Bauchweh im Zug', radio: 'Am Bahnhof Horw hat ein Kind nach der Zugfahrt Bauchweh.', place: 'Horw Bahnhof', at: horwBhf, game: memoryGame, transport: true, prop: propKid, thanks: 'Mit Tee geht es wieder. Gute Reise!' },
    { id: 'm13', title: 'Beule im Verkehrshaus', radio: 'Im Verkehrshaus hat sich ein Kind beim Flugzeug den Kopf angeschlagen – eine kleine Beule.', place: 'Verkehrshaus', at: vhs, game: plasterGame, transport: true, prop: propKid, thanks: 'Kühlbeutel drauf – und gleich zurück zu den Lokomotiven. Danke!' },
    { id: 'm14', title: 'Wespenstich am See', radio: 'Bei der Seeburg ist ein Kind beim Picknick von einer Wespe gestochen worden.', place: 'Seeburg', at: seeburg, game: waterGame, transport: false, prop: propKid, thanks: 'Kühlen hilft – der Stich tut schon fast nicht mehr weh. Merci!' },
    { id: 'm15', title: 'Velo-Sturz in Tribschen', radio: 'Beim Schlössli Wartegg ist jemand mit dem Velo gestürzt. Der Ellbogen ist aufgeschürft.', place: 'Wartegg', at: wartegg, game: plasterGame, transport: true, prop: propBike, thanks: 'Sauber verarztet. Gute Fahrt!' },
    { id: 'm16', title: 'Bauchweh im Schönbühl', radio: 'Im Shopping-Center Schönbühl hat ein Kind zu viele Gummibärchen gegessen.', place: 'Schönbühl', at: schoenbuehl, game: memoryGame, transport: true, prop: propKid, thanks: 'Mit Tee geht es wieder. Nächstes Mal ein paar weniger!' },
    { id: 'm17', title: 'Katze in Kastanienbaum', radio: 'Bei der Schiffstation Kastanienbaum sitzt eine Katze im Baum und traut sich nicht runter.', place: 'Kastanienbaum', at: kastanien, game: catGame, transport: false, prop: propCat, thanks: 'Die Katze ist unten und schnurrt. Danke, Luksi!' },
    { id: 'm18', title: 'Müde beim Löwen', radio: 'Beim Löwendenkmal ist eine Touristin vom vielen Treppensteigen ganz schwindlig.', place: 'Löwendenkmal', at: snap([205, -735]), game: waterGame, transport: true, prop: propTourist, thanks: 'Ein Schluck Wasser, und der Löwe schläft weiter. Merci!' },
    { id: 'm8', title: 'Zu viele Würstchen', radio: 'Auf der Allmend hat ein Fussballfan zu viele Würstchen gegessen und hat Bauchweh.', place: 'Allmend', at: allmend, game: memoryGame, transport: true, prop: propKid, thanks: 'Mit Kamillentee geht es schon besser. Hopp Luzern!' },
  ];
}

/** Einsätze der Region Nord (Etappe 2), Orte über echte Haltestellen (OpenStreetMap) */
function setupMissionsNord() {
  const stop = (n: string, fb: [number, number]) => { const s = propsData?.stops?.find((q: any) => q[2] === n); return snap(s ? [s[0], s[1]] : fb); };
  missions = [
    { id: 'n1', title: 'Bauchweh am Bahnhof', radio: 'Am Bahnhof Emmenbrücke hat ein Kind nach der Zugfahrt Bauchweh.', place: 'Emmenbrücke Bahnhof', at: stop('Emmenbrücke Bahnhof', [-1929, -2086]), game: memoryGame, transport: true, prop: propKid, thanks: 'Mit Tee geht es schon besser. Danke, Luksi!' },
    { id: 'n2', title: 'Sonnenstich am Rotsee', radio: 'Am Rotsee hat ein Ruderer zu lange in der Sonne trainiert und ist ganz schwindlig.', place: 'Rotsee', at: stop('Maihofmatte-Rotsee', [325, -1545]), game: waterGame, transport: true, prop: propTourist, thanks: 'Schatten und Wasser – schon besser. Merci!' },
    { id: 'n3', title: 'Velo-Sturz in Ebikon', radio: 'Beim Bahnhof Ebikon ist ein Kind mit dem Velo gestürzt. Das Knie ist aufgeschürft.', place: 'Ebikon Bahnhof', at: stop('Ebikon Bahnhof', [2684, -3626]), game: plasterGame, transport: true, prop: propBike, thanks: 'Sauber verarztet. Gute Fahrt!' },
    { id: 'n4', title: 'Katze in Adligenswil', radio: 'Im Dorf Adligenswil sitzt eine Katze ganz oben im Baum und miaut.', place: 'Adligenswil Dorf', at: stop('Adligenswil Dorf', [4279, -2075]), game: catGame, transport: false, prop: propCat, thanks: 'Die Katze ist wieder unten. Adligenswil sagt Merci!' },
    { id: 'n5', title: 'Gestolpert im Emmen Center', radio: 'Im Emmen Center ist ein Kind auf der Rolltreppe gestolpert. Ein Pflaster bitte!', place: 'Emmen Center', at: stop('Emmen Center', [-1515, -2328]), game: plasterGame, transport: false, prop: propKid, thanks: 'Pflaster drauf – und weiter geht\'s. Danke!' },
    { id: 'n6', title: 'Sonnenstich in der Badi', radio: 'Im Schwimmbad Mooshüsli ist einem Kind vom vielen Sonnenbaden ganz heiss.', place: 'Schwimmbad Mooshüsli', at: stop('Schwimmbad Mooshüsli', [-1524, -3188]), game: waterGame, transport: true, prop: propKid, thanks: 'Schatten, Wasser und eine Pause – schon besser!' },
    { id: 'n7', title: 'Kätzchen in der Viscosistadt', radio: 'In der Viscosistadt miaut ein Kätzchen hoch oben im Baum.', place: 'Viscosistadt', at: stop('Viscosistadt', [-2230, -2329]), game: catGame, transport: false, prop: propCat, thanks: 'Das Kätzchen ist wieder bei seiner Familie!' },
    { id: 'n8', title: 'Zu viel Popcorn', radio: 'Bei den Flugzeugwerken in Emmen hat ein Kind beim Flugzeuge-Schauen zu viel Popcorn gegessen.', place: 'Emmen, Flugzeugwerke', at: stop('Flugzeugwerke', [152, -3854]), game: memoryGame, transport: true, prop: propKid, thanks: 'Mit Kamillentee geht es wieder. Tschüss!' },
  ];
}

/** Comic-Sprechblasen («Boing!», «Hoppla!») über Zusammenstössen */
const COMIC_WORDS = [['Boing!', 'Hoppla!', 'Huch!', 'Wuiii!', 'Hopsala!'], ['Uff!', 'Bumm!', 'Oha!'], ['Plopp!', 'Klonk!', 'Boing!', 'Hui!'], ['Muuuh!', 'Muh!', 'Muuh!'], ['Platsch!', 'Spritz!', 'Blubb!'], ['Tschu-tschu!', 'Uff!', 'Hoppla!']];
const comicTex = new Map<string, THREE.Texture>();
const comics: { sp: THREE.Sprite; t: number }[] = [];
function comic(x: number, z: number, kind: number) {
  const words = COMIC_WORDS[kind] || COMIC_WORDS[0], w = words[Math.floor(Math.random() * words.length)];
  let tex = comicTex.get(w);
  if (!tex) { const sp0 = textSprite(w, '#FFD447', '#3b302b', 256, 110, 'bold 64px system-ui, sans-serif'); tex = (sp0.material as THREE.SpriteMaterial).map!; comicTex.set(w, tex); }
  let c = comics.find((q) => q.t <= 0);
  if (!c) { if (comics.length >= 8) return; c = { sp: new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false })), t: 0 }; c.sp.renderOrder = 10; comics.push(c); scene.add(c.sp); }
  (c.sp.material as THREE.SpriteMaterial).map = tex; (c.sp.material as THREE.SpriteMaterial).needsUpdate = true;
  c.sp.position.set(x, gy(x, z) + 3.4, z); c.sp.scale.set(4.2, 1.8, 1); c.t = 1.3; c.sp.visible = true;
}
function moo(x: number, z: number) { sfxPlay.moo(); const w = COMIC_WORDS[3]; COMIC_WORDS[3] = w; comic(x + 6, z + 6, 3); }
const inPoly = (x: number, z: number, p: number[][]) => { let ins = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins; } return ins; };
function updateComics(dt: number) {
  for (const c of comics) { if (c.t <= 0) continue; c.t -= dt; c.sp.position.y += dt * 1.6; const k = Math.min(1, c.t * 2.5); (c.sp.material as THREE.SpriteMaterial).opacity = k; const pop = 1 + Math.max(0, c.t - 1.1) * 3; c.sp.scale.set(4.2 * pop, 1.8 * pop, 1); if (c.t <= 0) c.sp.visible = false; }
}

/** Spass: Baustellen-Kegel, Abfalleimer an Haltestellen, 40 Luksi-Herzen */
function setupFun(data: CityData) {
  const hsh = (x: number, z: number) => { const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return v - Math.floor(v); };
  const [X0, Z0, X1, Z1] = data.meta.bounds;
  const inField = (x: number, z: number) => x > X0 + 60 && x < X1 - 60 && z > Z0 + 60 && z < Z1 - 60;
  // Baustellen: ruhige Strassen, mind. 350 m Abstand
  const cand = (data.roads as any[]).filter((r) => ['residential', 'tertiary', 'unclassified', 'secondary'].includes(r.c) && !r.b && r.p.length >= 2)
    .map((r) => ({ r, k: hsh(r.p[0][0], r.p[0][1]) })).sort((a, b) => a.k - b.k);
  const sites: number[][] = [];
  for (const { r } of cand) {
    const [a, b] = r.p, L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 25) continue;
    const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, off = r.w / 2 - 0.7;
    const x = a[0] + dx * 4 - dz * off, z = a[1] + dz * 4 + dx * off;
    if (!inField(x, z) || sites.some((s) => Math.hypot(s[0] - x, s[1] - z) < 350)) continue;
    sites.push([x, z, Math.atan2(dx, dz)]); if (sites.length >= 22) break;
  }
  // Abfalleimer neben Haltestellen (je Name einmal)
  const stops: number[][] = []; const seen = new Set<string>();
  for (const st of (propsData?.stops || []) as any[]) { const key = st[2] || st[0] + ',' + st[1]; if (seen.has(key) || !inField(st[0], st[1])) continue; seen.add(key); stops.push([st[0] + 1.3, st[1] + 1.3]); }
  // Herzen: gut verteilt über Haltestellen, Parks und Sehenswürdigkeiten (Farthest-Point-Auswahl), auf Strassen erreichbar
  const pts: number[][] = [];
  for (const st of stops) pts.push([st[0], st[1]]);
  for (const g of data.green as any[]) if (g.k === 'park' || g.k === 'playground') { const cx = g.p.reduce((a: number, q: number[]) => a + q[0], 0) / g.p.length, cz = g.p.reduce((a: number, q: number[]) => a + q[1], 0) / g.p.length; pts.push([cx, cz]); }
  for (const l of world.landmarks) pts.push([l.x, l.z]);
  const chosen: number[][] = [hospitalBay];
  while (chosen.length < 41 && pts.length) {
    let bi = 0, bd = -1; for (let i = 0; i < pts.length; i++) { const d = Math.min(...chosen.map((c) => Math.hypot(c[0] - pts[i][0], c[1] - pts[i][1]))); if (d > bd) { bd = d; bi = i; } }
    chosen.push(pts.splice(bi, 1)[0]);
  }
  const hearts = chosen.slice(1).map((p) => snap([p[0], p[1]]));
  fun = new Fun(terrain, sites, stops, hearts, (REGION === 'nord' ? save.heartsN : save.hearts) || [],
    (x, z) => { sfxPlay.boing(); comic(x, z, 2); },
    (n, tot, first) => { if (REGION === 'nord') save.heartsN = fun!.heartsGot(); else save.hearts = fun!.heartsGot(); writeSave(); sfxPlay.star(0); sfxPlay.star(1);
      const el = $('#hearts'); el.textContent = `♥ ${n}/${tot}`; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      const unlocked = SKIN_NEED.find(([, k]) => k === n); if (unlocked && n > 0) setTimeout(() => toast(`🎉 Neue Lackierung freigeschaltet: ${SKIN_LABEL[unlocked[0]]} – im Pause-Menü wählen!`, 4500), 1600);
      toast(first ? `♥ Ein Luksi-Herz! ${tot} sind ${REGION === 'nord' ? 'in Emmenbrücke, Ebikon und Adligenswil' : 'in Luzern, Kriens und Horw'} versteckt.` : n === tot ? '♥ Alle Luksi-Herzen gefunden – du bist ein Held!' : n % 10 === 0 ? `♥ ${n} von ${tot} – super!` : `♥ ${n}/${tot}`, first || n % 10 === 0 ? 4200 : 1500); });
  $('#hearts').textContent = `♥ ${fun.heartCount}/${fun.heartTotal}`;
  scene.add(fun.group);
  // Tiere: Schwäne auf Wasser nahe Ufer (Stadt + Horwer Bucht), Kühe auf Weiden
  const isW = (x: number, z: number) => world.mask.at(x, z) === 1;
  const swans: number[][] = [];
  for (let k = 0; k < 4000 && swans.length < 46; k++) {
    const city = k % 3 !== 0;
    // Nord: Rotsee und Reuss bei Emmenbrücke; Luzern: Seebecken/Reuss und Horwer Bucht
    const x = REGION === 'nord' ? (city ? -100 + hsh(k, 1) * 1300 : -3000 + hsh(k, 2) * 1500) : city ? -700 + hsh(k, 1) * 1500 : 200 + hsh(k, 2) * 950;
    const z = REGION === 'nord' ? (city ? -2900 + hsh(k, 3) * 1500 : -2400 + hsh(k, 4) * 1300) : city ? -500 + hsh(k, 3) * 1000 : 3600 + hsh(k, 4) * 2600;
    if (!isW(x, z)) continue;
    const shore = [[14, 0], [-14, 0], [0, 14], [0, -14]].some(([a, b]) => !isW(x + a, z + b));
    if (!shore || swans.some((q) => Math.hypot(q[0] - x, q[1] - z) < 9)) continue;
    swans.push([x, z]);
  }
  const cows: number[][] = [];
  for (const g of data.green as any[]) { if (g.k !== 'meadow' || cows.length >= 90) continue;
    const xs = g.p.map((q: number[]) => q[0]), zs = g.p.map((q: number[]) => q[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    if ((x1 - x0) * (z1 - z0) < 6000) continue; let n = 0;
    for (let k = 0; k < 40 && n < 4; k++) { const x = x0 + hsh(k, x0) * (x1 - x0), z = z0 + hsh(z0, k) * (z1 - z0);
      if (world.mask.at(x, z) !== 0 || world.mask.isRoad(x, z) || !inPoly(x, z, g.p)) continue; cows.push([x, z]); n++; } }
  animals = new Animals(terrain, swans, cows, isW);
  scene.add(animals.group);
  // Kursschiffe: Rundfahrt ab Bahnhofquai im Seebecken und in der Horwer Bucht (Wegpunkte auf Wasser geprüft)
  if (REGION === 'nord') return; // Kursschiffe und Pedalos nur im Seebecken
  ships = new Ships([[[380, -110], [800, -250], [1100, 100], [950, 450], [620, 260]], [[600, 4900], [1050, 5350], [900, 6100], [520, 5250]], [[700, -100], [1400, -100], [2000, 350], [2500, 650], [1800, 900], [1100, 400]]]);
  // Pedalos vor Inseli, Ufschötti, Lido und Tribschen (nur auf offenem Wasser, 14 m Abstand zum Ufer)
  { const bs: number[][] = []; const wet = (x: number, z: number) => world.mask.at(x, z) === 1;
    for (const [ax, az] of [[520, 230], [1050, 520], [2250, 380], [1650, 1250], [-60, 4700]]) for (let k = 0, n = 0; k < 60 && n < 4; k++) {
      const x = ax + (hsh(k, ax) - 0.5) * 140, z = az + (hsh(az, k) - 0.5) * 140; let ok = wet(x, z);
      for (let q = 0; q < 8 && ok; q++) ok = wet(x + Math.cos(q * 0.785) * 22, z + Math.sin(q * 0.785) * 22);
      if (ok && !bs.some((b) => Math.hypot(b[0] - x, b[1] - z) < 30)) { bs.push([x, z]); n++; } }
    if (bs.length) { boats = new Boats(bs); scene.add(boats.group); } }
  scene.add(ships.group);
}

function nextMission(): Mission {
  const open = missions.find((m) => !(save.best[m.id] >= 1));
  if (open) return open;
  const choices = missions.filter((m) => m !== current);
  return choices[Math.floor(Math.random() * choices.length)];
}

function setTarget(t: [number, number] | null, color = '#F39204') {
  target = t; route = null; routeTimer = 0;
  beacon.visible = !!t;
  if (t) {
    beacon.position.set(t[0], gy(t[0], t[1]), t[1]);
    (beacon.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.color.set(color);
    (beacon.children[1] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.color.set(color);
  }
  routeMesh.visible = !!t;
}

function startOffer() {
  current = nextMission();
  phase = 'offer';
  sfxPlay.radio();
  const r = $('#radio');
  r.innerHTML = `<b>📻 Funk</b><span>${current.radio}</span><button id="acc">Einsatz annehmen <kbd>E</kbd>/<kbd>X</kbd></button>`;
  r.classList.add('show');
  ($('#acc') as HTMLButtonElement).onclick = acceptOffer;
}
function acceptOffer() {
  if (phase !== 'offer' || !current) return;
  $('#radio').classList.remove('show');
  phase = 'toScene'; phaseTime = 0;
  setTarget(current.at, '#F39204');
  if (propObj) scene.remove(propObj);
  propObj = current.prop();
  propObj.position.set(current.at[0] + 4, gy(current.at[0] + 4, current.at[1] + 4), current.at[1] + 4);
  scene.add(propObj);
  setMusicMode('mission');
  toast(`Einsatz: ${current.title} – fahr zum ${current.place}!`);
  if (!car.siren) toast('Tipp: Leertaste/A schaltet das Blaulicht ein', 3000);
}

function arriveScene() {
  phase = 'onsite';
  (carrier || car).speed = 0;
  setTarget(null);
  setTimeout(() => current!.game(() => afterGame()), 400);
}
function afterGame() {
  if (!current) return;
  if (current.transport) {
    if (propObj) { scene.remove(propObj); propObj = null; }
    toast('Patient ist eingestiegen. Sanft ins Kinderspital fahren!');
    const cv = carrier || car;
    phase = 'toHospital'; phaseTime = 0; bumpsAtStart = cv.bumps;
    setTarget(hospitalBay, '#3FA9FF');
    const r = nav.route(nav.nearest(cv.x, cv.z), nav.nearest(hospitalBay[0], hospitalBay[1]));
    parTime = (r ? pathLength(r) : 800) / 10 + 25;
  } else {
    handover();
  }
}
function handover() {
  if (!current) return;
  phase = 'handover';
  const cv = carrier || car;
  setTarget(null); for (const p of players) { p.car.speed = 0; p.car.siren = false; } setSiren(false);
  let stars = 1;
  const bumps = cv.bumps - bumpsAtStart;
  if (current.transport) {
    if (bumps <= 2) stars++;
    if (phaseTime <= parTime) stars++;
  } else {
    stars += 2;
  }
  const prev = save.best[current.id] || 0;
  save.best[current.id] = Math.max(prev, stars);
  save.played++;
  writeSave();
  const ov = document.createElement('div'); ov.className = 'mg';
  const reasons = current.transport
    ? [`✔ Einsatz erfüllt`, bumps <= 2 ? '✔ Sanft gefahren – der Patient hat nicht gewackelt' : `○ ${bumps} Rempler – nächstes Mal sanfter`, phaseTime <= parTime ? '✔ Zügig im Kinderspital' : `○ ${Math.round(phaseTime)} s – geht noch schneller`]
    : ['✔ Einsatz erfüllt', '✔ Tier gerettet', '✔ Bonus für Tierliebe'];
  ov.innerHTML = `<div class="mg-card"><img class="luksi-img" src="img/${current.transport ? 'luksi-kissen' : 'luksi-winkt'}.png" alt="Luksi"><h2>${current.transport ? 'Übergabe im Kinderspital' : 'Einsatz geschafft!'}</h2>
    <div class="stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${i * 0.35}s">★</span>`).join('')}</div>
    <p>${current.thanks}</p><ul class="reasons">${reasons.map((r) => `<li>${r}</li>`).join('')}</ul>
    <p class="small">Sterne total: <b>${totalStars()}</b></p><button class="big" id="weiter">Weiterfahren <kbd>Enter</kbd>/<kbd>A</kbd></button></div>`;
  ui.appendChild(ov);
  for (let i = 0; i < stars; i++) setTimeout(() => sfxPlay.star(i), 350 * i + 200);
  const close = () => { ov.remove(); phase = 'free'; carrier = null; offerTimer = 12; setMusicMode('free'); updateHud(); };
  ($('#weiter') as HTMLButtonElement).onclick = close;
  (ov as any)._close = close;
}

// ---------------- HUD ----------------
function updateHud() {
  $('#stars').textContent = `★ ${totalStars()}`;
  const m = $('#mission');
  if (!current || phase === 'free' || phase === 'offer') m.textContent = phase === 'offer' ? 'Neuer Funkspruch!' : 'Freie Fahrt durch Luzern';
  else if (phase === 'toScene') m.textContent = `${current.title}: zum ${current.place}`;
  else if (phase === 'onsite') m.textContent = `${current.title}: Hilfe vor Ort`;
  else if (phase === 'toHospital') m.textContent = `${current.title}: ins Kinderspital`;
  else m.textContent = current.title;
}

const mini = document.getElementById('minimap') as HTMLCanvasElement;
const mctx = mini.getContext('2d')!;
function drawMinimap() {
  const S = mini.width, sc = 0.9; // px pro Meter auf der Minimap
  const [X0, Z0] = world.bounds;
  mctx.save();
  mctx.fillStyle = '#A9C285'; mctx.fillRect(0, 0, S, S);
  mctx.translate(S / 2, S / 2);
  mctx.rotate(Math.PI + car.heading); // Fahrtrichtung oben
  mctx.scale(sc, sc);
  mctx.translate(-car.x, -car.z);
  mctx.drawImage(world.minimap, X0, Z0, world.minimap.width * 2, world.minimap.height * 2);
  if (route && route.length > 1) {
    mctx.strokeStyle = '#F39204'; mctx.lineWidth = 6; mctx.lineCap = 'round'; mctx.lineJoin = 'round';
    mctx.beginPath(); route.forEach(([x, z], i) => (i ? mctx.lineTo(x, z) : mctx.moveTo(x, z))); mctx.stroke();
  }
  const dot = (x: number, z: number, c: string, r = 9) => { mctx.fillStyle = c; mctx.strokeStyle = '#3b302b'; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(x, z, r, 0, Math.PI * 2); mctx.fill(); mctx.stroke(); };
  if (fun) for (const [hx, hz] of fun.open()) if (Math.hypot(hx - car.x, hz - car.z) < 280) { mctx.fillStyle = '#E2001A'; mctx.font = 'bold 26px system-ui'; mctx.textAlign = 'center'; mctx.save(); mctx.translate(hx, hz); mctx.rotate(-(Math.PI + car.heading)); mctx.fillText('♥', 0, 9); mctx.restore(); }
  dot(hospitalBay[0], hospitalBay[1], '#3FA9FF', 11);
  if (target) dot(target[0], target[1], '#F39204', 12);
  else if (phase === 'offer' && current) dot(current.at[0], current.at[1], '#FFD447', 10);
  mctx.restore();
  // Auto-Pfeil in der Mitte
  mctx.fillStyle = '#ffffff'; mctx.strokeStyle = '#3b302b'; mctx.lineWidth = 2;
  mctx.beginPath(); mctx.moveTo(S / 2, S / 2 - 10); mctx.lineTo(S / 2 + 7, S / 2 + 8); mctx.lineTo(S / 2, S / 2 + 4); mctx.lineTo(S / 2 - 7, S / 2 + 8); mctx.closePath(); mctx.fill(); mctx.stroke();
  // Norden
  mctx.save(); mctx.translate(S / 2, S / 2); mctx.rotate(Math.PI + car.heading);
  mctx.fillStyle = '#3b302b'; mctx.font = 'bold 14px system-ui'; mctx.textAlign = 'center'; mctx.fillText('N', 0, -S / 2 + 16);
  mctx.restore();
}

function drawBigMap() {
  const c = document.getElementById('bigmap') as HTMLCanvasElement;
  const g = c.getContext('2d')!;
  const [X0, Z0] = world.bounds;
  c.width = world.minimap.width; c.height = world.minimap.height;
  g.drawImage(world.minimap, 0, 0);
  const t = (x: number, z: number) => [(x - X0) / 2, (z - Z0) / 2];
  const K = Math.max(1, c.width / 1100); // Schrift/Symbole mit der Kartengrösse skalieren
  if (route) { g.strokeStyle = '#F39204'; g.lineWidth = 5 * K; g.beginPath(); route.forEach(([x, z], i) => { const [a, b] = t(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke(); }
  const label = (x: number, z: number, text: string, col: string) => {
    const [a, b] = t(x, z); g.fillStyle = col; g.strokeStyle = '#3b302b'; g.lineWidth = 3;
    g.beginPath(); g.arc(a, b, 9 * K, 0, Math.PI * 2); g.fill(); g.stroke();
    g.font = `bold ${20 * K}px system-ui`; g.lineWidth = 5 * K; g.strokeStyle = '#fff'; const tw = g.measureText(text).width, tx = a + 13 * K + tw > g.canvas.width - 4 ? a - 13 * K - tw : a + 13 * K; g.strokeText(text, tx, b + 7 * K); g.fillStyle = '#3b302b'; g.fillText(text, tx, b + 7 * K);
  };
  // Ortsnamen gross (Orientierung für Kinder)
  g.textAlign = 'center';
  for (const [x, z, n] of [[-900, -750, 'LUZERN'], [-2150, 2150, 'KRIENS'], [150, 3950, 'HORW'], [-3200, 150, 'LITTAU'], [-500, 1700, 'Allmend'], [700, 1500, 'Tribschen'], [2250, -480, 'Würzenbach'], [2100, 4300, 'St. Niklausen'], [2450, 5500, 'Kastanienbaum'], [1600, -700, 'Halde']] as [number, number, string][]) {
    let [a, b] = t(x, z); g.font = n === n.toUpperCase() ? `bold ${64 * K}px system-ui` : `bold ${36 * K}px system-ui`; const hw = g.measureText(n).width / 2 + 6; a = Math.max(hw, Math.min(g.canvas.width - hw, a)); g.lineWidth = 8 * K; g.strokeStyle = 'rgba(255,255,255,.85)'; g.strokeText(n, a, b); g.fillStyle = 'rgba(59,48,43,.75)'; g.fillText(n, a, b);
  }
  g.textAlign = 'left';
  for (const l of world.landmarks) label(l.x, l.z, l.name.replace(/ \(.*\)/, ''), '#FFF6DE');
  // offene Einsätze und gefundene/fehlende Herzen
  for (const m of missions) if (!(save.best[m.id] >= 1)) { const [a, b] = t(m.at[0], m.at[1]); g.fillStyle = '#FFD447'; g.strokeStyle = '#3b302b'; g.lineWidth = 3; g.font = `bold ${30 * K}px system-ui`; g.strokeText('★', a - 10 * K, b + 10 * K); g.fillText('★', a - 10 * K, b + 10 * K); }
  if (fun) for (const [hx, hz] of fun.open()) { const [a, b] = t(hx, hz); g.fillStyle = '#E2001A'; g.font = `bold ${26 * K}px system-ui`; g.fillText('♥', a - 8 * K, b + 9 * K); }
  label(hospitalBay[0], hospitalBay[1], 'Kinderspital', '#3FA9FF');
  if (target) label(target[0], target[1], 'Einsatz', '#F39204');
  const [a, b] = t(car.x, car.z);
  g.save(); g.translate(a, b); g.scale(K, K); g.rotate(Math.PI - car.heading + Math.PI);
  g.fillStyle = '#E74C3C'; g.strokeStyle = '#fff'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 16); g.lineTo(11, -10); g.lineTo(0, -4); g.lineTo(-11, -10); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

// ---------------- Route / Navi ----------------
function updateRoute(dt: number) {
  if (!target) { routeMesh.visible = false; arrow.visible = false; $('#dist').textContent = ''; return; }
  routeTimer -= dt;
  if (routeTimer <= 0 || !route) {
    routeTimer = 1.2;
    const a = nav.nearestVisible(car.x, car.z, world.mask, car.heading), b = nav.nearestVisible(target[0], target[1], world.mask);
    const r = nav.route(a, b);
    route = r ? [[car.x, car.z], ...r, target] : [[car.x, car.z], target];
    const showLine = save.diff === 'entdecken';
    routeMesh.visible = showLine;
    if (showLine) {
      const pos: number[] = [];
      const hw = 0.9;
      for (let i = 0; i < route.length - 1; i++) {
        const [ax, az] = route[i], [bx, bz] = route[i + 1];
        const L = Math.hypot(bx - ax, bz - az); if (L < 0.1) continue;
        const nx = (-(bz - az) / L) * hw, nz = ((bx - ax) / L) * hw;
        const n = Math.ceil(L / 4);
        for (let k = 0; k < n; k++) {
          const x1 = ax + ((bx - ax) * k) / n, z1 = az + ((bz - az) * k) / n, x2 = ax + ((bx - ax) * (k + 1)) / n, z2 = az + ((bz - az) * (k + 1)) / n;
          const y1 = gy(x1, z1) + 0.65, y2 = gy(x2, z2) + 0.65;
          pos.push(x1 + nx, y1, z1 + nz, x2 - nx, y2, z2 - nz, x1 - nx, y1, z1 - nz, x1 + nx, y1, z1 + nz, x2 + nx, y2, z2 + nz, x2 - nx, y2, z2 - nz);
        }
      }
      routeMesh.geometry.dispose();
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      routeMesh.geometry = g;
    }
  }
  // Pfeil zeigt auf einen Punkt ca. 25 m voraus auf der Route
  let aim = target as number[];
  if (route) {
    let acc = 0;
    for (let i = 1; i < route.length; i++) {
      acc += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
      if (acc > 22) { aim = route[i]; break; }
    }
  }
  arrow.visible = true;
  arrow.position.set(car.x, car.y + 5.6, car.z);
  // zeigt immer Luftlinie zum Ziel, weich nachgeführt (kein Flackern)
  const want = Math.atan2(target[0] - car.x, target[1] - car.z);
  let dA = want - arrow.rotation.y; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA < -Math.PI) dA += 2 * Math.PI;
  arrow.rotation.y += dA * Math.min(1, dt * 6);
  void aim;
  const dist = Math.hypot(target[0] - car.x, target[1] - car.z);
  $('#dist').textContent = dist > 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist / 10) * 10} m`;
}

let stuckT = 0, revT = 0;
function autopilot(dt: number) {
  // einfacher Bot für automatische Tests
  if (revT > 0) { revT -= dt; return { throttle: 0, brake: 1, steer: revT > 0.6 ? 1 : -1 }; }
  if (Math.abs(car.speed) < 0.8) stuckT += dt; else stuckT = 0;
  if (stuckT > 1.5) { stuckT = 0; revT = 1.4; }
  const look = 6 + Math.abs(car.speed) * 0.5;
  let aim = route![route!.length - 1];
  let acc = 0;
  for (let i = 1; i < route!.length; i++) { acc += Math.hypot(route![i][0] - route![i - 1][0], route![i][1] - route![i - 1][1]); if (acc > look) { aim = route![i]; break; } }
  const want = Math.atan2(aim[0] - car.x, aim[1] - car.z);
  let d = want - car.heading; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  const dist = target ? Math.hypot(target[0] - car.x, target[1] - car.z) : 99;
  const slow = Math.abs(d) > 0.5 || dist < 25;
  return { throttle: slow ? (car.speed < 4 ? 0.6 : 0) : 0.85, brake: (slow && car.speed > 7) || (dist < 12 && car.speed > 3) ? 1 : 0, steer: Math.max(-1, Math.min(1, -d * 2.5)) };
}

// ---------------- Kamera ----------------
const CAMS = ['Hinter dem Auto', 'Von oben', 'Nah dran'];
function updateCamera(dt: number, snapNow = false, p: Player = players[0]) {
  const car = p.car, camPos = p.camPos, camLook = p.camLook, mode = p.idx === 0 ? save.cam : p.camMode;
  const fx = car.fx, fz = car.fz;
  const cy = car.y;
  const look = new THREE.Vector3(car.x + fx * 5, cy + 1.8, car.z + fz * 5);
  let want: THREE.Vector3;
  const back = Math.min(1, Math.abs(car.speed) / 20);
  if (mode === 1) want = new THREE.Vector3(car.x - fx * 20, cy + 75, car.z - fz * 20 + 0.01);
  else if (mode === 2) want = new THREE.Vector3(car.x - fx * 8, cy + 3.6, car.z - fz * 8);
  else want = new THREE.Vector3(car.x - fx * (13 + back * 3), cy + 6 + back, car.z - fz * (13 + back * 3));
  if (mode === 1) look.set(car.x + fx * 10, cy, car.z + fz * 10);
  // Kamera nie unter dem Gelände und Sichtlinie zum Auto frei halten (Hänge)
  for (let k = 1; k <= 5; k++) {
    const t = k / 5, px = car.x + (want.x - car.x) * t, pz = car.z + (want.z - car.z) * t;
    const need = gy(px, pz) + 1.8 - (cy + 1.8) * (1 - t);
    if (need > 0) want.y = Math.max(want.y, (gy(px, pz) + 1.8 - (cy + 1.8) * (1 - t)) / t);
  }
  want.y = Math.max(want.y, gy(want.x, want.z) + 2.5);
  const k = snapNow ? 1 : 1 - Math.exp(-dt * 5);
  camPos.lerp(want, k); camLook.lerp(look, k);
  if (snapNow) { camPos.copy(want); camLook.copy(look); }
  if (p.idx === 0 && (window as any).__cam) { const c = (window as any).__cam; p.cam.position.set(c[0], c[1], c[2]); p.cam.lookAt(c[3], c[4], c[5]); } else { p.cam.position.copy(camPos); p.cam.lookAt(camLook); }
}

// ---------------- Pause-Menü ----------------
let paused = true; // bis zum Start
let menuFocus = 0;
const DIFF_LABEL: Record<Difficulty, string> = { entdecken: 'Entdecken (Navi-Linie, gemütlich)', rettung: 'Rettung (Standard)', profi: 'Profi (schneller)' };
const SKIN_LABEL: Record<string, string> = { standard: 'Standard', regenbogen: 'Regenbogen 🌈', luksi: 'Luksi-Look 🐯', gold: 'Gold ✨' };
const SKIN_NEED: [string, number][] = [['standard', 0], ['regenbogen', 5], ['luksi', 15], ['gold', 30]];
function unlockedSkins() { const n = fun ? fun.heartCount : 0; return SKIN_NEED.filter(([, k]) => n >= k).map(([s]) => s); }
function nextSkinHint() { const n = fun ? fun.heartCount : 0; const nx = SKIN_NEED.find(([, k]) => n < k); return nx ? `${SKIN_LABEL[nx[0]]} ab ${nx[1]} ♥` : ''; }
function menuItems() {
  return [
    { t: '▶ Weiterfahren', f: () => setPause(false) },
    { t: `Modus: ${DIFF_LABEL[save.diff]}`, f: () => { save.diff = save.diff === 'entdecken' ? 'rettung' : save.diff === 'rettung' ? 'profi' : 'entdecken'; routeTimer = 0; writeSave(); } },
    { t: `Kamera: ${CAMS[save.cam]}`, f: () => { save.cam = (save.cam + 1) % 3; writeSave(); } },
    { t: `Ton: ${isMuted() ? 'aus' : 'an'}`, f: () => { save.muted = !isMuted(); setMuted(save.muted); writeSave(); } },
    { t: `Tageszeit: ${save.evening ? 'Abend 🌇' : 'Tag ☀️'}`, f: () => { save.evening = !save.evening; setEvening(!!save.evening); writeSave(); } },
    { t: `Ambulanz: ${SKIN_LABEL[car?.skin] || 'Standard'}${unlockedSkins().length < 4 ? ` (${nextSkinHint()})` : ''}`, f: () => { const u = unlockedSkins(); const i = (u.indexOf(car?.skin) + 1) % u.length; save.skin = u[i]; for (const p of players) p.car.setSkin(u[i]); writeSave(); } },
    { t: 'Zurück zum Kinderspital', f: () => { placeCar(hospitalBay[0], hospitalBay[1]); setPause(false); } },
    { t: `Mitspieler: ${players.length} ${players.length > 1 ? '(letzten entfernen)' : '– Controller 2–4: A drücken'}`, f: () => removePlayer() },
    { t: `Grafik: ${QUALITY === 'echt' ? 'Echt (3D-Häuser swisstopo)' : 'Leicht (Handy, schneller)'} – wechseln lädt neu`, f: () => { save.quality = QUALITY === 'echt' ? 'leicht' : 'echt'; writeSave(); location.reload(); } },
    { t: 'Spielstand als Datei sichern', f: exportSave },
    { t: 'Steuerung & Credits', f: () => $('#credits').classList.toggle('show') },
  ];
}
function renderMenu() {
  const m = $('#menu-items');
  const items = menuItems();
  m.innerHTML = '';
  { // Sammelalbum: was schon gefunden/geschafft ist
    const d = document.createElement('div'); d.className = 'album';
    const nb = fun ? fun.heartCount : 0, tot = fun ? fun.heartTotal : 0;
    const hint = fun && nb < tot ? (() => { const h = fun!.nearestHeart(car.x, car.z); if (!h) return ''; const dist = Math.hypot(h[0] - car.x, h[1] - car.z); const dir = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'][Math.round(((Math.atan2(h[0] - car.x, -(h[1] - car.z)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8]; return `Nächstes Herz: ca. ${dist > 1000 ? (dist / 1000).toFixed(1) + ' km' : Math.round(dist / 50) * 50 + ' m'} Richtung ${dir}`; })() : nb === tot && tot ? 'Alle Herzen gefunden!' : '';
    d.innerHTML = `<span>★ ${totalStars()} Sterne</span><span>♥ ${nb}/${tot} Herzen</span><span>💥 ${fun ? fun.stats.boings + (traffic ? traffic.stats.bumps : 0) : 0} Boings</span>${hint ? `<small>${hint}</small>` : ''}`;
    m.appendChild(d);
  }
  items.forEach((it, i) => {
    const b = document.createElement('button'); b.textContent = it.t; b.className = i === menuFocus ? 'focus' : '';
    b.onclick = () => { menuFocus = i; it.f(); sfxPlay.click(); renderMenu(); };
    m.appendChild(b);
  });
}
function setPause(p: boolean) {
  if (!world || !car) return;
  paused = p;
  $('#pause').classList.toggle('show', p);
  if (p) { renderMenu(); setSiren(false); updateEngine(0, 0); }
  else { $('#credits').classList.remove('show'); setSiren(car.siren); }
}
function exportSave() {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'luksi-rescue-spielstand.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
document.addEventListener('visibilitychange', () => { if (document.hidden && world && !paused) setPause(true); suspendAudio(document.hidden); });

// ---------------- Auto platzieren ----------------
function placeCar(x: number, z: number, heading?: number, car: Vehicle = players[0].car) {
  const id = nav.nearest(x, z, true);
  if (id >= 0) {
    car.x = nav.xs[id]; car.z = nav.zs[id];
    if (heading === undefined) {
      const n = nav.adj[id][0];
      car.heading = n ? Math.atan2(nav.xs[n.to] - car.x, nav.zs[n.to] - car.z) : 0;
    } else car.heading = heading;
  } else { car.x = x; car.z = z; car.heading = heading || 0; }
  // Falls doch eingeklemmt: Richtung drehen, bis frei
  for (let i = 0; i < 16 && car.blocked(car.x, car.z, car.heading); i++) car.heading += Math.PI / 8;
  car.speed = 0;
  car.y = terrain.height(car.x, car.z);
  const pl = players.find((q) => q.car === car); if (pl) updateCamera(0, true, pl);
}

function addPlayer() {
  const i = players.length; if (i >= 4 || !world) return;
  const v = new Vehicle(world.mask, terrain);
  if (save.skin && unlockedSkins().includes(save.skin)) v.setSkin(save.skin);
  scene.add(v.model.root);
  const cam = i === 0 ? camera : new THREE.PerspectiveCamera(60, 1, 0.5, 1800);
  const ar = i === 0 ? arrow : arrow.clone(true); if (i > 0) scene.add(ar);
  const tag = document.createElement('div'); tag.className = 'p-tag'; tag.style.background = P_COLORS[i]; tag.style.color = '#fff'; ui.appendChild(tag);
  const label = textSprite(`P${i + 1}`, '#ffffff', P_COLORS[i], 128, 64, 'bold 44px system-ui, sans-serif'); label.scale.set(2.6, 1.3, 1); scene.add(label);
  const p: Player = { idx: i, car: v, cam, camPos: new THREE.Vector3(), camLook: new THREE.Vector3(), camMode: 0, arrow: ar, tag, label };
  players.push(p);
  if (i > 0) {
    const lead = players[0].car;
    placeCar(lead.x - lead.fx * (9 * i), lead.z - lead.fz * (9 * i), lead.heading, v);
    toast(`Spieler ${i + 1} fährt mit! 🚑`, 2200); sfxPlay.radio();
  }
  layoutTags();
}
function removePlayer() {
  if (players.length <= 1) return;
  const p = players.pop()!;
  scene.remove(p.car.model.root, p.arrow); if (p.label) scene.remove(p.label); p.tag.remove();
  layoutTags();
}

// ---------------- Regionswechsel (Nachladen) ----------------
// Luzern ↔ Nord überlappen sich zwischen z = −1100 und −550 (beide enthalten das Kinderspital). Wer über die Linie fährt,
// fährt nach 1.5 s in der anderen Region weiter: Spielstand und Position bleiben, die Seite lädt die Daten der neuen Region.
const TEST_NOEDGE = /[?&]noedge/.test(location.search) || (TEST && !/[?&]edge/.test(location.search)); // Tests teleportieren frei
let edgeT = 0, edgeWarned = false;
function checkRegionEdge(dt: number) {
  const other = REGION === 'luzern' ? 'nord' : 'luzern';
  const out = REGION === 'luzern' ? car.z < -1000 && car.x > -3700 : car.z > -650;
  if (!out) { edgeT = 0; edgeWarned = false; return; }
  if (phase !== 'free' && phase !== 'offer' || players.length > 1) {
    if (!edgeWarned) toast(players.length > 1 ? 'Zu zweit geht es hier nicht weiter – die Karte endet hier.' : REGION === 'luzern' ? 'Nach Emmenbrücke geht es nach dem Einsatz weiter.' : 'Zurück nach Luzern geht es nach dem Einsatz weiter.', 2600);
    edgeWarned = true; return;
  }
  if (edgeT === 0) toast(REGION === 'luzern' ? '🗺️ Weiter nach Emmenbrücke, Ebikon und Adligenswil …' : '🗺️ Zurück nach Luzern …', 2600);
  edgeT += dt;
  if (edgeT < 1.5) return;
  edgeT = -1e9; // nur einmal
  writeSave();
  save.region = other; save.pos = [car.x, car.z, car.heading];
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); sessionStorage.setItem('luksiRegionSwitch', other); } catch { /* privat */ }
  const u = new URL(location.href); u.searchParams.set('region', other); location.replace(u.toString());
}

// ---------------- Hauptschleife ----------------
let last = performance.now(), fpsShow = false, fpsAcc = 0, fpsN = 0, saveTimer = 60;
let hintTimer = 0, playTime = 0;
function frame(now: number) {
  const dt = Math.min(TEST ? 0.1 : 0.05, (now - last) / 1000); last = now;
  pollInput();
  const overlayOpen = !!document.querySelector('.mg');
  if (hit('fps')) { fpsShow = !fpsShow; $('#fps').classList.toggle('show', fpsShow); }
  if (world && !overlayOpen) {
    if (hit('pause')) setPause(!paused);
    if (paused) {
      const items = menuItems();
      if (hit('up')) { menuFocus = (menuFocus + items.length - 1) % items.length; renderMenu(); }
      if (hit('down')) { menuFocus = (menuFocus + 1) % items.length; renderMenu(); }
      if (hit('confirm')) { items[menuFocus].f(); sfxPlay.click(); renderMenu(); }
    }
  }
  if (overlayOpen && phase === 'handover' && hit('confirm')) (document.querySelector('.mg') as any)._close?.();

  if (world && !paused) {
    const playing = !overlayOpen;
    // Mitspieler: Controller 2–4 drücken A/Start
    if (playing) for (let k = players.length; k < Math.min(4, padCount()); k++) if (padJoin(k)) addPlayer();
    const jh = document.getElementById('join-hint');
    if (padCount() > players.length && players.length < 4) { if (!jh) { const d = document.createElement('div'); d.id = 'join-hint'; ui.appendChild(d); } $('#join-hint').textContent = `🎮 Controller ${players.length + 1}: A drücken zum Mitfahren`; } else jh?.remove();
    let c = playing ? readControls(0) : { throttle: 0, brake: 0, steer: 0 };
    if ((window as any).__autodrive && playing && route && route.length > 1) c = autopilot(dt);
    for (const p of players.slice(1)) {
      const ci = playing ? readControls(p.idx) : { throttle: 0, brake: 0, steer: 0 };
      if (playing) {
        if (hitP(p.idx, 'siren')) p.car.siren = !p.car.siren;
        if (hitP(p.idx, 'horn')) { sfxPlay.horn(); traffic?.honk(p.car.x, p.car.z); if (animals && animals.honk(p.car.x, p.car.z)) moo(p.car.x, p.car.z); }
        if (hitP(p.idx, 'camera')) { p.camMode = (p.camMode + 1) % 3; }
        if (hitP(p.idx, 'reset')) { placeCar(p.car.x, p.car.z, undefined, p.car); sfxPlay.reset(); }
      }
      p.car.update(dt, ci, save.diff, (water) => { if (water) { sfxPlay.splash(); fun?.splash(p.car.x + p.car.fx * 3.5, p.car.z + p.car.fz * 3.5); comic(p.car.x, p.car.z, 4); } else sfxPlay.bump(); });
    }
    // Ambulanzen schubsen sich sanft auseinander
    for (let a = 0; a < players.length; a++) for (let b = a + 1; b < players.length; b++) {
      const A = players[a].car, B = players[b].car, dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz);
      if (d < 3.2 && d > 0.01) { const push = (3.2 - d) / 2, ux = dx / d, uz = dz / d;
        if (!B.blocked(B.x + ux * push, B.z + uz * push, B.heading)) { B.x += ux * push; B.z += uz * push; }
        if (!A.blocked(A.x - ux * push, A.z - uz * push, A.heading)) { A.x -= ux * push; A.z -= uz * push; } }
    }
    if (playing && fullReady && !TEST_NOEDGE) checkRegionEdge(dt);
    if (playing) {
      if (hitP(0, 'siren')) { car.siren = !car.siren; setSiren(car.siren); }
      if (hitP(0, 'horn')) { sfxPlay.horn(); traffic?.honk(car.x, car.z); if (animals && animals.honk(car.x, car.z)) moo(car.x, car.z); if (ships && ships.honk(car.x, car.z)) setTimeout(() => { sfxPlay.toot(); toast('🚢 Tuuuut! Das Schiff grüsst zurück.', 1800); }, 600); }
      if (hitP(0, 'camera')) { save.cam = (save.cam + 1) % 3; toast(`Kamera: ${CAMS[save.cam]}`, 1200); }
      if (hit('mute')) { save.muted = !isMuted(); setMuted(save.muted); toast(save.muted ? 'Ton aus' : 'Ton an', 1000); }
      if (hitP(0, 'reset')) { placeCar(car.x, car.z); sfxPlay.reset(); toast('Luksi hupt – Auto hüpft zurück auf die Strasse!', 1600); }
      if (hit('map')) { const bm = $('#bigmap-wrap'); bm.classList.toggle('show'); if (bm.classList.contains('show')) drawBigMap(); }
      if (hit('accept') && phase === 'offer') acceptOffer();
    }
    car.update(dt, c, save.diff, (water) => {
      if (water) { sfxPlay.splash(); comic(car.x + car.fx * 3, car.z + car.fz * 3, 4); fun?.splash(car.x + car.fx * 3.5, car.z + car.fz * 3.5); if (hintTimer <= 0) { toast('Platsch! Da ist Wasser – nimm eine Brücke.', 1500); hintTimer = 4; } }
      else { sfxPlay.bump(); comic(car.x + car.fx * 3, car.z + car.fz * 3, 1); }
    });
    if (car.mask.at(car.x + car.fx * 4, car.z + car.fz * 4) === 3 && Math.abs(car.speed) > 1) { hintTimer -= dt; if (hintTimer <= 0) { toast('Hier endet Luzern – vorerst!', 1500); hintTimer = 4; } }
    if (traffic) traffic.update(dt, players.map((p) => p.car), (x, z) => { sfxPlay.boing(); comic(x, z, 0); });
    if (buses) { buses.update(dt, players.map((p) => p.car), (x, z) => { sfxPlay.bump(); comic(x, z, 1); }); buses.updateLabels(car.x, car.z); }
    if (fun) fun.update(dt, players.map((p) => p.car), performance.now() / 1000);
    if (animals) animals.update(dt, players.map((p) => p.car), performance.now() / 1000);
    if (ships) ships.update(dt);
    if (boats) boats.update(dt);
    if (trains) trains.update(dt, players.map((p) => p.car));
    if (gondola) gondola.update(dt);
    for (const p of players) p.car.animateSkin(dt);
    updateComics(dt);
    updateEngine(car.speed, c.throttle);
    phaseTime += dt;
    playTime += dt; if (playTime > 90) $('#keys').classList.add('hide');

    // Ablauf
    if (phase === 'free') { offerTimer -= dt; if (offerTimer <= 0) startOffer(); }
    if (target) for (const p of players) {
      const d = Math.hypot(target[0] - p.car.x, target[1] - p.car.z);
      if (d < 16 && Math.abs(p.car.speed) < 7) {
        if (phase === 'toScene') { carrier = p.car; arriveScene(); break; }
        else if (phase === 'toHospital') { handover(); break; }
      }
    }
    updateRoute(dt);
    for (const p of players) {
      updateCamera(dt, false, p);
      if (p.label) { p.label.visible = players.length > 1; p.label.position.set(p.car.x, p.car.y + 7.6, p.car.z); }
      if (p.idx > 0) { p.arrow.visible = !!target; if (target) { p.arrow.position.set(p.car.x, p.car.y + 5.6, p.car.z); const w = Math.atan2(target[0] - p.car.x, target[1] - p.car.z); let dA = w - p.arrow.rotation.y; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA < -Math.PI) dA += 2 * Math.PI; p.arrow.rotation.y += dA * Math.min(1, dt * 6); } }
      if (players.length > 1) { const dd = target ? Math.hypot(target[0] - p.car.x, target[1] - p.car.z) : 0; p.tag.textContent = `P${p.idx + 1} · ${Math.round(Math.abs(p.car.speed) * 3.6)} km/h${target ? ' · ' + (dd > 1000 ? (dd / 1000).toFixed(1) + ' km' : Math.round(dd / 10) * 10 + ' m') : ''}${p.car.siren ? ' 🚨' : ''}`; }
    }
    beacon.rotation.y += dt;
    for (const w of world.water) { const mp = (w.material as THREE.MeshToonMaterial).map; if (mp) { mp.offset.x += dt * 0.012; mp.offset.y += dt * 0.006; } }
    (beacon.children[2] as THREE.Object3D).position.y = 9 + Math.sin(now / 300) * 0.8;
    saveTimer -= dt; if (saveTimer <= 0) { writeSave(); saveTimer = 60; }
    drawMinimap();
    updateHud();
    $('#speed').textContent = `${Math.round(Math.abs(car.speed) * 3.6)} km/h`;
    if ($('#bigmap-wrap').classList.contains('show') && Math.floor(now / 500) !== Math.floor((now - dt * 1000) / 500)) drawBigMap();
  }
  renderAll();
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) {
    const info = renderer.info.render;
    $('#fps').textContent = `${Math.round(fpsN / fpsAcc)} fps · ${info.calls} Draw Calls · ${(info.triangles / 1000).toFixed(0)}k Dreiecke${gamepadName ? ' · 🎮 ' + gamepadName.slice(0, 30) : ''}`;
    fpsAcc = 0; fpsN = 0;
  }
  (window as any).__luksi = { phase, car: car && { x: car.x, z: car.z, speed: car.speed, heading: car.heading }, stars: totalStars(), target, paused };
  endFrame();
  requestAnimationFrame(frame);
}

// ---------------- Start ----------------
// ---------------- Laden (gzip, parallel, in zwei Stufen) ----------------
async function gunzipIf(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const u = new Uint8Array(buf, 0, 2);
  if (u[0] !== 0x1f || u[1] !== 0x8b || typeof DecompressionStream === 'undefined') return buf;
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
/** Holt data/<name>.gz (kleiner), sonst data/<name> */
const GZ = new Set(['b3d.bin', 'ground.bin', 'terrain.bin', 'city.json', 'b3d.json']);
async function getBuf(name: string): Promise<ArrayBuffer> {
  if (GZ.has(name)) try { const r = await fetch(`${DIR}${name}.gz?v=${VERSION}`); if (r.ok) return gunzipIf(await r.arrayBuffer()); } catch { /* weiter */ }
  const r = await fetch(`${DIR}${name}?v=${VERSION}`); if (!r.ok) throw new Error(name + ' ' + r.status);
  return gunzipIf(await r.arrayBuffer());
}
async function getJSON(name: string) { return JSON.parse(new TextDecoder().decode(await getBuf(name))); }
const opt = <T,>(p: Promise<T>) => p.catch((e) => { console.warn('optional', e); return undefined; });
let fullReady = false;
(window as any).__luksiReady = false;

async function boot() {
  const status = $('#load-status');
  if (!/[?&]noaerial/.test(location.search)) { aerialTex = new THREE.TextureLoader().load(QUALITY === 'echt' ? DIR + 'aerial.jpg' : DIR + 'aerial_s.jpg'); aerialTex.colorSpace = THREE.SRGBColorSpace; aerialTex.anisotropy = 8; }
  memLog('boot'); setupLoader($('.start-card') as HTMLElement); loaderProgress(0.05);
  status.textContent = 'Lade Luzern …';
  const echt = QUALITY === 'echt';
  // alles gleichzeitig anfordern; Stufe B (3D-Häuser, feiner Boden) wird erst nach dem Start fertig gebaut
  const pCity = getJSON('city.json'), pTmeta = getJSON('terrain.json'), pTraw = getBuf('terrain.bin');
  const pHor = opt(Promise.all([getJSON('horizon.json'), getBuf('horizon.bin')]));
  const pProps = opt(getJSON('props.json'));
  const pBus = opt(getJSON('bus.json'));
  const pTrains = opt(getJSON('trains.json'));
  const pGondola = opt(getJSON('gondola.json'));
  const pB = echt ? opt(Promise.all([getJSON('b3d.json'), getBuf('b3d.bin'), opt(getJSON('roofcolors.json')), getJSON('ground.json'), getBuf('ground.bin')])) : null;
  const data: CityData = await pCity;
  memLog('city'); status.textContent = 'Lade Gelände …'; loaderProgress(0.25);
  const tmeta = await pTmeta; let traw: ArrayBuffer = await pTraw;
  if (tmeta.enc === 'delta-shuffle') { // Byte-Trennung + zeilenweise Differenzen rückgängig machen
    const b8 = new Uint8Array(traw), n = b8.length >> 1, o = new Int16Array(n), nx = tmeta.nx;
    for (let i = 0; i < n; i++) { const v = b8[i] | (b8[n + i] << 8); o[i] = v > 32767 ? v - 65536 : v; }
    for (let k = 0; k < n; k += nx) for (let i = 1; i < nx; i++) o[k + i] += o[k + i - 1];
    traw = o.buffer;
  }
  terrain = new Terrain(traw, tmeta, data.meta.bounds);
  if (!tmeta.flattened) terrain.flattenRoads(data.roads);
  const hor = await pHor; if (hor) terrain.setHorizon(new Int16Array(hor[1]), hor[0]);
  const props = await pProps;
  memLog('terrain'); loaderProgress(0.5);
  forestMask = await loadForestMask(data.meta.bounds[0], data.meta.bounds[1]);
  cityData = data; propsData = props ? JSON.parse(JSON.stringify(props)) : null;
  // Stufe A: schnelle Stadt aus OpenStreetMap-Grundrissen → sofort spielbar
  world = await buildWorld(data, terrain, (s) => { memLog('A:' + s); status.textContent = s; }, undefined, undefined, props ? JSON.parse(JSON.stringify(props)) : undefined, { trees: echt ? 3500 : 1200, forestStep: 14, forestMask, aerial: aerialTex, coarse: true, freeCPU: !TEST || /[?&]free/.test(location.search) });
  scene.add(world.group);
  if (terrain.hz) { farScene.add(horizonMesh(terrain, [0, 0, 0, 0])); }
  if (pB) stageB(pB, data, props); else { fullReady = true; (window as any).__luksiReady = true; }
  if (TEST) (window as any).__dbgWorld = scene;
  memLog('worldA'); status.textContent = 'Navi wird eingerichtet …'; loaderProgress(0.8);
  await new Promise((r) => setTimeout(r, 30));
  { const t0 = performance.now(); nav = new NavGraph(data, world.mask); console.log('[bau] Navi', (performance.now() - t0).toFixed(0), 'ms'); }
  if (!/[?&]notraffic/.test(location.search)) { traffic = new Traffic(nav, terrain, world.mask, QUALITY === 'echt' ? {} : { cars: 16, peds: 28 }); scene.add(traffic.group); { const pg = world.group.getObjectByName('props') as any; if (pg && pg.signalPos) traffic.setSignals(pg.signalPos, pg.signalLamp); } }
  { const bl = await pBus; if (bl && !/[?&]nobus/.test(location.search)) { buses = new Buses(bl, terrain); scene.add(buses.group); scene.add(buses.buildWires()); if (propsData?.stops) buses.setStops(propsData.stops); const pg = world.group.getObjectByName('props') as any; if (pg && pg.signalPos && traffic) { const tr = traffic; buses.setSignals(pg.signalPos, (i) => tr.sigState(i)); } } }
  hospitalBay = snap([world.hospital.x, world.hospital.z]);
  setupMissions();
  setupFun(data);
  if (save.evening) setEvening(true);
  { const tl = await pTrains; if (tl) { trains = new Trains(terrain, tl, (x, z) => { sfxPlay.bump(); comic(x, z, 5); }, () => sfxPlay.train()); scene.add(trains.group); } }
  { const gd = await pGondola; if (gd) { gondola = new Gondola(terrain, gd); scene.add(gondola.group); } }

  // Zielmarkierung (Lichtsäule + Ring + schwebender Stern)
  const col = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 60, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#F39204', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  col.position.y = 30;
  const ring = new THREE.Mesh(new THREE.RingGeometry(6, 7.5, 32), new THREE.MeshBasicMaterial({ color: '#F39204', side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.4;
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), new THREE.MeshBasicMaterial({ color: '#FFD447' }));
  beacon.add(col, ring, star); beacon.visible = false;
  scene.add(beacon, routeMesh);
  // Navi-Pfeil über dem Auto
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 2.2), toon('#F39204')); shaft.position.z = -0.2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.6, 3), toon('#F39204')); head.rotation.x = Math.PI / 2; head.position.z = 1.6;
  arrow.add(shaft, head, outline(shaft), outline(head)); arrow.visible = false;
  scene.add(arrow);
  addPlayer(); car = players[0].car;
  // Schild über dem Kinderspital
  const sign = textSprite('Kinderspital ♥', '#FFF6DE', '#0E73BA', 420, 110, 'bold 50px system-ui, sans-serif');
  sign.position.set(world.hospital.x, gy(world.hospital.x, world.hospital.z) + 42, world.hospital.z); sign.scale.set(16, 4.2, 1);
  scene.add(sign);
  // Orientierung: schwebende Ortsschilder an bekannten Orten in Kriens, Horw und auf der Allmend (an echten Haltestellen)
  for (const [name, txt] of [['Pilatus-Bahnen', 'Pilatus-Bahnen 🚡'], ['Allmend/Messe', 'Swissporarena ⚽'], ['Horw Zentrum', 'Horw'], ['Zentrum Pilatus', 'Kriens'], ['Badi', 'Badi Horw 🏊'], ['Kastanienbaum Schiffstation', 'Kastanienbaum ⛵'], ['Maihofmatte-Rotsee', 'Rotsee 🚣'], ['Emmenbrücke Bahnhof', 'Emmenbrücke'], ['Ebikon Bahnhof', 'Ebikon'], ['Adligenswil Dorf', 'Adligenswil'], ['Emmen Center', 'Emmen Center 🛍️']] as [string, string][]) {
    const st = propsData?.stops?.find((q: any) => q[2] === name); if (!st) continue;
    const sp = textSprite(txt, '#FFF6DE', '#3b302b', 420, 110, 'bold 50px system-ui, sans-serif');
    sp.position.set(st[0], gy(st[0], st[1]) + 26, st[1]); sp.scale.set(15, 3.9, 1); scene.add(sp);
  }
  // Wegweiser an der Regionsgrenze (Hauptstrassen, die die Wechsel-Linie kreuzen)
  { const zl = REGION === 'luzern' ? -1000 : -650, txt = REGION === 'luzern' ? '⬆ Emmenbrücke · Ebikon' : '⬇ Luzern · Kinderspital', put: number[][] = [];
    for (const r of data.roads as any[]) { if (!['primary', 'secondary', 'tertiary', 'trunk'].includes(r.c)) continue;
      for (let i = 1; i < r.p.length; i++) { const [x1, z1] = r.p[i - 1], [x2, z2] = r.p[i]; if ((z1 - zl) * (z2 - zl) > 0 || z1 === z2) continue;
        const t = (zl - z1) / (z2 - z1), x = x1 + (x2 - x1) * t; if (put.some((q) => Math.abs(q[0] - x) < 300)) continue; put.push([x, zl]);
        const sp = textSprite(txt, '#FFF6DE', '#0E73BA', 520, 110, 'bold 46px system-ui, sans-serif');
        sp.position.set(x, gy(x, zl) + 14, zl); sp.scale.set(17, 3.6, 1); scene.add(sp); } } }
  for (const l of world.landmarks.filter((q) => q.name === 'Löwendenkmal' || q.name === 'Verkehrshaus')) {
    const sp = textSprite(l.name === 'Löwendenkmal' ? 'Löwendenkmal 🦁' : 'Verkehrshaus 🚂', '#FFF6DE', '#3b302b', 420, 110, 'bold 50px system-ui, sans-serif');
    sp.position.set(l.x, gy(l.x, l.z) + (l.name === 'Löwendenkmal' ? 30 : 34), l.z); sp.scale.set(15, 3.9, 1); scene.add(sp);
  }
  // Luksi mit Kissen wartet am Kinderspital
  const lkTex = new THREE.TextureLoader().load('img/luksi-kissen.png'); lkTex.colorSpace = THREE.SRGBColorSpace;
  const lk = new THREE.Sprite(new THREE.SpriteMaterial({ map: lkTex, transparent: true, alphaTest: 0.2 }));
  lk.center.set(0.5, 0.03); lk.scale.set(3.4 * 0.88, 3.4, 1);
  lk.position.set(hospitalBay[0] + 7, gy(hospitalBay[0] + 7, hospitalBay[1]) + 0.2, hospitalBay[1]);
  scene.add(lk);
  const bay = new THREE.Mesh(new THREE.RingGeometry(5, 6.2, 32), new THREE.MeshBasicMaterial({ color: '#3FA9FF', side: THREE.DoubleSide }));
  bay.rotation.x = -Math.PI / 2; bay.position.set(hospitalBay[0], gy(hospitalBay[0], hospitalBay[1]) + 0.6, hospitalBay[1]);
  scene.add(bay);

  if (save.pos) placeCar(save.pos[0], save.pos[1], save.pos[2]); else placeCar(hospitalBay[0], hospitalBay[1]);
  setMuted(save.muted);
  updateHud();
  memLog('navTraffic'); status.textContent = ''; loaderDone();
  $('#start-btn').style.display = '';
  try { if (sessionStorage.getItem('luksiRegionSwitch')) { sessionStorage.removeItem('luksiRegionSwitch'); $('#start-btn').textContent = 'Weiterfahren ▶'; } } catch { /* privat */ }
  $('#start-btn').focus();
}

/** Stufe B: echte 3D-Häuser (swisstopo) und feiner Boden im Hintergrund bauen, dann austauschen */
async function stageB(pB: Promise<any>, data: CityData, props: any) {
  const ind = document.createElement('div'); ind.id = 'lazy-ind'; ind.textContent = '🏗️ Echte Häuser werden geladen …'; ui.appendChild(ind);
  try {
    const r = await pB; memLog('pB');
    if (!r) throw new Error('Daten fehlen');
    const [bm, bb, roof, gm, gb] = r;
    b3dMeta = bm;
    // Positionen: Int16 dm, bei rel=true relativ zum Gebäudemittelpunkt → absolut (dm) als Float32
    const raw16 = new Int16Array(bb, 0, bm.posBytes / 2);
    let pos: ArrayLike<number> = raw16;
    if (bm.rel) { const f = new Float32Array(raw16.length); for (const m of bm.buildings) { const vS = m[1], vC = m[2], cx = m[5] * 10, cz = m[6] * 10; for (let k = vS; k < vS + vC; k++) { f[k * 3] = raw16[k * 3] + cx; f[k * 3 + 1] = raw16[k * 3 + 1]; f[k * 3 + 2] = raw16[k * 3 + 2] + cz; } } pos = f; }
    const b3d = { roof, meta: bm, pos, idx: new Uint16Array(bb, bm.posBytes + bm.pad, bm.idxCount), edges: new Uint16Array(bb, bm.posBytes + bm.pad + bm.idxCount * 2, bm.edgeCount) };
    b3dData = b3d; roofData = roof;
    const g16 = new Int16Array(gb, 0, gm.posBytes / 2);
    let gpos: ArrayLike<number> = g16;
    if (gm.enc === 'grid') { const f = new Float32Array(g16.length); for (let k = 0; k < g16.length; k += 3) { f[k] = (gm.x0 + (g16[k] + 32768) * gm.step) * 10; f[k + 1] = g16[k + 1] - 4000 + 4000; f[k + 2] = (gm.z0 + (g16[k + 2] + 32768) * gm.step) * 10; } gpos = f; }
    const groundMesh = { pos: gpos, idx: new Uint32Array(gb, gm.posBytes + (gm.pad || 0), gm.indices) };
    // warten, bis das Spiel läuft (Startbildschirm nicht blockieren)
    while (document.getElementById('start') && !TEST) await new Promise((res) => setTimeout(res, 300));
    const nw = await buildWorld(data, terrain, (t) => { memLog('B:' + t); ind.textContent = '🏗️ ' + t; }, b3d, groundMesh, props ? JSON.parse(JSON.stringify(props)) : undefined, { aerial: aerialTex, forestMask, forestStep: 9, freeCPU: !TEST || /[?&]free/.test(location.search) });
    memLog('worldB'); swapWorld(nw); memLog('swapped');
    ind.textContent = '✔ Echte Häuser da'; setTimeout(() => ind.remove(), 2500);
  } catch (e) { console.warn('Stufe B fehlgeschlagen, bleibe bei OSM-Häusern', e); ind.remove(); }
  fullReady = true; (window as any).__luksiReady = true;
}
function swapWorld(nw: World) {
  const old = world.group;
  scene.remove(old);
  old.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); });
  world = nw; scene.add(nw.group);
  for (const p of players) { p.car.mask = nw.mask; if (p.car.blocked(p.car.x, p.car.z, p.car.heading)) placeCar(p.car.x, p.car.z, undefined, p.car); }
  if (traffic) { traffic.setMask(nw.mask); const pg = nw.group.getObjectByName('props') as any; if (pg && pg.signalPos) { traffic.setSignals(pg.signalPos, pg.signalLamp); const tr = traffic; buses?.setSignals(pg.signalPos, (i) => tr.sigState(i)); } }
  if (save.evening) setEvening(true);
}

function start() {
  goFullscreen();
  initAudio(); setMuted(save.muted);
  $('#start').classList.add('hide');
  setTimeout(() => $('#start').remove(), 600);
  paused = false;
  toast(REGION === 'nord' ? 'Willkommen in Emmenbrücke, Ebikon und Adligenswil! Das Kinderspital ist ganz im Süden.' : 'Willkommen in Luzern! Fahr los – gleich kommt ein Funkspruch.', 3500);
}
$('#start-btn').onclick = start;
setupTouch();
if (MOBILE) $('#keys').style.display = 'none';
window.addEventListener('keydown', (e) => { if ((e.code === 'Enter' || e.code === 'Space') && document.getElementById('start') && $('#start-btn').style.display !== 'none') { e.preventDefault(); start(); } });
// Gamepad-Start
const startPoll = setInterval(() => {
  const p = Array.from(navigator.getGamepads?.() || []).find((x) => x && x.buttons.some((b) => b.pressed));
  if (p && document.getElementById('start') && $('#start-btn').style.display !== 'none') { start(); clearInterval(startPoll); }
  if (!document.getElementById('start')) clearInterval(startPoll);
}, 200);

/** Realismus-Testkit, Stufe 1: automatische Geometrie-Prüfungen */
function qaReport() {
  const out: any = { version: VERSION, checks: [] as any[] };
  const add = (id: string, name: string, value: number, limit: number, ok: boolean, info: any = {}) => out.checks.push({ id, name, value: Math.round(value * 1000) / 1000, limit, ok, ...info });
  const surf = (meshName: string, step: number, tol: number) => {
    let n = 0, bad = 0; const worst: any[] = [];
    const seen = new Set<any>();
    world.group.traverse((o: any) => {
      if (o.name !== meshName) return;
      const p = o.geometry.getAttribute('position'); if (seen.has(p)) return; seen.add(p);
      for (let i = 0; i < p.count; i += step) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const g = world.groundAt(x, z); n++;
        if (y < g + tol) { bad++; if (worst.length < 8) worst.push([Math.round(x), Math.round(z), Math.round((y - g) * 100) / 100]); }
      }
    });
    return { n, bad, share: n ? bad / n : 0, worst };
  };
  // G3b: See (flach auf Seespiegel) – im Seeinnern (≥ 10 m vom Ufer) darf kein Gelände über die Wasserfläche ragen
  if (REGION === 'luzern') { let n = 0, bad = 0; const ex: number[][] = []; const [bx0, bz0, bx1, bz1] = world.bounds; // Nord: kein flacher See (Rotsee/Reuss liegen aufs Gelände)
    for (let x = bx0 + 10; x < bx1 - 10; x += 10) for (let z = bz0 + 10; z < bz1 - 10; z += 10) {
      if (world.mask.at(x, z) !== 1) continue; let inner = true;
      for (let q = 0; q < 8 && inner; q++) inner = world.mask.at(x + Math.cos(q * 0.785) * 10, z + Math.sin(q * 0.785) * 10) === 1;
      if (!inner || Math.abs(world.groundAt(x, z)) > 3) continue; // Flüsse/Bäche liegen tiefer bzw. höher – die prüft G3
      n++; if (world.groundAt(x, z) > 0.06) { bad++; if (ex.length < 6) ex.push([x, z, Math.round(world.groundAt(x, z) * 100) / 100]); } }
    add('G3b', 'See: Gelände ragt aus dem Wasser (%)', n ? bad / n * 100 : 0, 0.5, n > 0 && bad / n <= 0.005, { punkte: n, beispiele: ex }); }
  for (const [id, name, mesh] of [['G1', 'Asphalt über Boden', 'roads-asphalt'], ['G2', 'Pflaster/Wege über Boden', 'roads-cobble'], ['G3', 'Wasser über Boden', 'water']]) {
    const r = surf(mesh, 5, 0.01);
    add(id, name, r.share, 0.005, r.share <= 0.005, { samples: r.n, beispiele: r.worst });
  }
  // G4: Fahrhöhe (Auto) nie unter sichtbarem Boden
  { let n = 0, bad = 0; const ex: any[] = [];
    for (let i = 0; i < nav.xs.length; i += 3) { const x = nav.xs[i], z = nav.zs[i]; const h = terrain.height(x, z), g = world.groundAt(x, z); n++; if (h < g - 0.05) { bad++; if (ex.length < 8) ex.push([Math.round(x), Math.round(z), Math.round((h - g) * 100) / 100]); } }
    add('G4', 'Fahrhöhe über sichtbarem Boden', bad / n, 0.005, bad / n <= 0.005, { samples: n, beispiele: ex }); }
  // G5: Gebäude schweben nicht / stecken nicht tief im Boden
  if (b3dMeta && b3dData) { let n = 0, fl = 0; const ex: any[] = []; const P = b3dData.pos;
    for (const m of b3dMeta.buildings) { const [, vS, vC, , , cx, cz, ymin] = m; let gap = -1e9;
      for (let v = vS; v < vS + vC; v++) { const y = P[v * 3 + 1] / 10; if (y > ymin + 1) continue; gap = Math.max(gap, y - terrain.ground(P[v * 3] / 10, P[v * 3 + 2] / 10)); }
      n++; if (gap > 1.5) { fl++; if (ex.length < 8) ex.push([cx, cz, Math.round(gap * 10) / 10]); } }
    add('G5', 'Gebäude: Wandfuss > 1.5 m über Gelände', fl / n, 0.02, fl / n <= 0.02, { gebaeude: n, schwebend: fl, beispiele: ex }); }
  // G6: Wahrzeichen vorhanden
  { const need = REGION === 'nord' ? ['Reussport', 'Rothenburgstrasse', 'Seetalplatz', 'Luzernerstrasse'] : ['Kapellbrücke', 'Spreuerbrücke', 'Wasserturm', 'Jesuitenkirche', 'KKL', 'Hofkirche', 'Bahnhofstor', 'Wilhelm Tell'];
    const names = world.landmarks.map((l) => l.name).join('|') + '|' + [...world.roadsByName.keys()].join('|');
    const miss = need.filter((n) => !names.includes(n));
    add('G6', 'Wahrzeichen vorhanden', need.length - miss.length, need.length, miss.length === 0, { fehlend: miss }); }
  // G7: Einsätze erreichbar (beide Richtungen)
  { const r = missions.map((m) => { const a = nav.nearestVisible(hospitalBay[0], hospitalBay[1], world.mask), b = nav.nearestVisible(m.at[0], m.at[1], world.mask); return !!nav.route(a, b) && !!nav.route(b, a); });
    add('G7', 'Einsätze erreichbar', r.filter(Boolean).length, missions.length, r.every(Boolean)); }
  // G8 (R6): Brückendeck auf Uferhöhe – Deck weicht höchstens 1 m von der Linie zwischen den Brückenköpfen ab
  if (cityData) { let n = 0, bad = 0, worst = 0; const ex: any[] = [];
    for (const r of cityData.roads) { if (!r.b || r.p.length < 2) continue;
      const a = r.p[0], b = r.p[r.p.length - 1]; const ha = terrain.height(a[0], a[1]), hb = terrain.height(b[0], b[1]);
      let L = 0; const segs: number[] = [0]; for (let i = 1; i < r.p.length; i++) { L += Math.hypot(r.p[i][0] - r.p[i - 1][0], r.p[i][1] - r.p[i - 1][1]); segs.push(L); }
      if (L < 8) continue; n++;
      let dmax = 0; for (let i = 1; i < r.p.length - 1; i++) { const t = segs[i] / L; const d = Math.abs(terrain.height(r.p[i][0], r.p[i][1]) - (ha + (hb - ha) * t)); dmax = Math.max(dmax, d); }
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; dmax = Math.max(dmax, Math.abs(terrain.height(mid[0], mid[1]) - (ha + hb) / 2) * (L > 30 ? 1 : 0));
      if (dmax > 1) { bad++; if (ex.length < 6) ex.push([r.n || '?', Math.round(dmax * 10) / 10]); } worst = Math.max(worst, dmax); }
    add('G8', 'Brücken: Deck >1 m neben Uferlinie (%)', n ? (bad / n) * 100 : 0, 10, n > 0 && bad / n <= 0.1, { bruecken: n, max: Math.round(worst * 10) / 10, beispiele: ex }); }
  // G9 (R8): Dachfarbe aus Luftbild je Gebäude
  if (b3dMeta) { const nB = b3dMeta.buildings.length, nR = roofData ? roofData.filter(Boolean).length : 0; add('G9', 'Dachfarbe aus SWISSIMAGE (%)', (nR / nB) * 100, 95, nR / nB >= 0.95); }
  // G10 (R11): Möblierung aus OSM gesetzt
  if (propsData) { const g = world.group.getObjectByName('props') as any; const c = g && g.counts || { lamps: 0, signals: 0, stops: 0 };
    const share = (c.lamps + c.signals) / Math.max(1, propsData.lamps.length + propsData.signals.length);
    add('G10', 'Laternen+Ampeln gesetzt (% von OSM)', share * 100, 70, share >= 0.7, { laternen: c.lamps, ampeln: c.signals, haltestellen: c.stops, osmBaeume: propsData.trees.length, stege: propsData.piers.length }); }
  // G11 (R12): Verkehr nur auf erlaubten Kanten, nie in Hauswänden
  if (traffic) { const t = traffic.check(); let wrong = 0; for (const c of traffic.cars) if (c.alive && !nav.adj[c.a].some((e) => e.to === c.b)) wrong++;
    add('G11', 'Verkehr: falsche Richtung / in Wand', wrong + t.off, 0, wrong + t.off === 0 && t.alive > 0, { autos: t.alive, passanten: t.peds }); }
  // G12: Busse auf echten Linien, nicht in Häusern
  if (buses) { let n = 0, bad = 0; for (const b of buses.buses) for (const sg of b.segs) { n++; if (world.mask.at(sg.position.x, sg.position.z) === 2) { bad++; (out as any).g12 = ((out as any).g12 || []).concat([[Math.round(sg.position.x), Math.round(sg.position.z), buses.lines[b.line].ref]]); } }
    const refs = [...new Set(buses.buses.map((b) => buses!.lines[b.line].ref))];
    add('G12', 'Busse: Segmente in Hauswand (%)', n ? (bad / n) * 100 : 0, 5, n > 0 && bad / n <= 0.05, { busse: buses.buses.length, linien: refs.join(','), beispiele: (out as any).g12 || [] }); }
  // G13: Belebung vorhanden (Tiere, Schiffe, Züge, Spass-Objekte, Herzen)
  { const a = animals as any, sh = ships as any, tr = trains as any;
    const n = { schwaene: a ? a.swans.length : 0, kuehe: a ? a.cows.length : 0, schiffe: sh ? sh.ships.length : 0, zuege: tr ? tr.tr.length : 0, kegel: fun ? fun.hops.length : 0, herzen: fun ? fun.heartTotal : 0 };
    const ok = REGION === 'nord' ? n.schwaene > 10 && n.kuehe > 30 && n.kegel > 100 && n.herzen === 40 // Nord: keine Kursschiffe, Züge noch offen
      : n.schwaene > 20 && n.kuehe > 30 && n.schiffe >= 2 && n.zuege >= 4 && n.kegel > 100 && n.herzen === 40;
    add('G13', 'Belebung (Tiere, Schiffe, Züge, Herzen)', ok ? 1 : 0, 1, ok, n); }
  // P1: Leistung
  renderer.info.autoReset = false; renderer.info.reset(); renderAll(); renderer.info.autoReset = true;
  add('P1', 'Dreiecke (Mio.)', renderer.info.render.triangles / 1e6, 2.5, renderer.info.render.triangles < 2.5e6, { drawCalls: renderer.info.render.calls });
  out.ok = out.checks.every((c: any) => c.ok);
  return out;
}

// Test-Schnittstelle (nur mit ?test in der URL)
if (location.search.includes('test')) {
  (window as any).__dbg = {
    offer: () => { offerTimer = 0; },
    accept: () => acceptOffer(),
    tp: (x: number, z: number, h?: number) => placeCar(x, z, h),
    info: () => ({ phase, target, routePts: route, route: route ? route.length : 0, routeLen: route ? Math.round(pathLength(route)) : 0, bay: hospitalBay, missions: missions.map((m) => [m.id, m.at]), fps: $('#fps').textContent }),
    render: (on: boolean) => { world.group.visible = on; },
    quiet: () => { offerTimer = 1e9; $('#ui').style.display = 'none'; },
    drive: (on: boolean) => { (window as any).__autodrive = on; },
    grid: (x: number, z: number, r: number) => { const rows: string[] = []; for (let j = -r; j <= r; j += 2) { let l = ''; for (let i = -r; i <= r; i += 2) { const v = world.mask.at(x + i, z + j); l += Math.abs(i) < 1 && Math.abs(j) < 1 ? 'X' : v === 2 ? '#' : v === 1 ? '~' : world.mask.isRoad(x + i, z + j) ? '.' : ' '; } rows.push(l); } return rows.join('\n'); },
    goHospital: () => { current = missions[0]; phase = 'toHospital'; phaseTime = 0; setTarget(hospitalBay, '#3FA9FF'); },
    tris: () => { const o: Record<string, number> = {}; world.group.traverse((m: any) => { if (m.isMesh || m.isLineSegments) { const g = m.geometry; const n = (g.index ? g.index.count : g.getAttribute('position').count) / (m.isMesh ? 3 : 2) * (m.count || 1); const k = (m.material.map ? 'tex:' : '') + (m.name || m.type) + '/' + (m.material.color ? m.material.color.getHexString() : ''); o[k] = (o[k] || 0) + Math.round(n); } }); return Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 12); },
    reach: () => missions.map((m) => { const a = nav.nearestVisible(hospitalBay[0], hospitalBay[1], world.mask), b = nav.nearestVisible(m.at[0], m.at[1], world.mask); const r1 = nav.route(a, b), r2 = nav.route(b, a); return [m.id, r1 ? Math.round(pathLength(r1)) : null, r2 ? Math.round(pathLength(r2)) : null]; }),
    mem: () => { const o: Record<string, number> = {}; const seen = new Set<any>();
      const add = (k: string, a: any) => { if (!a || seen.has(a.buffer || a)) return; seen.add(a.buffer || a); o[k] = (o[k] || 0) + (a.byteLength || 0) / 1e6; };
      for (const [nm, sc] of [['world', world.group], ['scene', scene], ['far', farScene]] as const) sc.traverse((m: any) => { const g = m.geometry; if (!g) return; const k = nm + ':' + (m.name || m.type); for (const a of Object.values(g.attributes) as any[]) add(k, a.array); if (g.index) add(k, g.index.array); if (m.instanceMatrix) add(k, m.instanceMatrix.array); });
      add('mask', world.mask.data); add('mask', world.mask.road); for (const v of Object.values(terrain as any)) if (v && (v as any).byteLength) add('terrain', v);
      for (const v of Object.values(nav as any)) if (v && (v as any).byteLength) add('nav', v);
      if (b3dData) add('b3dData', (b3dData as any).pos);
      for (const k in o) o[k] = Math.round(o[k]); return o; },
    styles: () => STYLE_COUNT,
    erkerCam: (k = 0) => { const e = ERKER[k]; if (!e) return ERKER.length; const [x, z, y, , rot] = e; (window as any).__cam = [x + Math.sin(rot) * 18 + Math.cos(rot) * 6, y + 1, z + Math.cos(rot) * 18 - Math.sin(rot) * 6, x, y + 2, z]; return [ERKER.length, Math.round(x), Math.round(z)]; },
    qa: () => qaReport(),
    perf: (calls = false) => { const o: Record<string, number> = {}; const meas = () => { renderer.info.autoReset = false; renderer.info.reset(); renderAll(); renderer.info.autoReset = true; return calls ? renderer.info.render.calls * 1000 : renderer.info.render.triangles; };
      const all = meas(); const groups = new Map<string, THREE.Object3D[]>();
      for (const sc of [world.group, scene]) for (const c of sc.children) { if (c === world.group || !c.visible) continue; const k = (c.name || c.type) + (sc === scene ? '*' : ''); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(c); }
      for (const [k, cs] of groups) { cs.forEach((c) => (c.visible = false)); o[k] = Math.round((all - meas()) / 1000); cs.forEach((c) => (c.visible = true)); }
      o.total_k = Math.round(all / 1000); return o; },
    camAt: (x: number, z: number, h: number, up = 4) => { const y = terrain.height(x, z) + 1.8; (window as any).__cam = [x, y, z, x + Math.sin(h) * 50, y + up, z + Math.cos(h) * 50]; },
    players: () => players.map((p) => ({ i: p.idx, x: Math.round(p.car.x), z: Math.round(p.car.z), v: Math.round(p.car.speed * 3.6) })),
    buses: () => buses ? { aktiv: buses.buses.length, linien: [...new Set(buses.buses.map((b) => buses!.lines[b.line].ref + ' → ' + buses!.lines[b.line].to))], ...buses.stats } : null,
    busCam: (k: number | string = 0) => { if (typeof k === 'string' && buses) { const i = buses.buses.findIndex((b) => buses!.lines[b.line].ref === k); if (i < 0) return null; k = i; } if (!buses || !buses.buses[k as number]) return null; const b = buses.buses[k as number], sg = b.segs[0]; const h = sg.rotation.y; (window as any).__cam = [sg.position.x + Math.sin(h) * 14 + Math.cos(h) * 6, sg.position.y + 4, sg.position.z + Math.cos(h) * 14 - Math.sin(h) * 6, sg.position.x, sg.position.y + 1.5, sg.position.z]; return buses.lines[b.line].ref; },
    busRear: (k = 0) => { if (!buses || !buses.buses[k]) return null; const b = buses.buses[k], sg = b.segs[b.segs.length - 1]; const h = sg.rotation.y; (window as any).__cam = [sg.position.x - Math.sin(h) * 13, sg.position.y + 3, sg.position.z - Math.cos(h) * 13, sg.position.x, sg.position.y + 1.6, sg.position.z]; return buses.lines[b.line].ref; },
    traffic: () => traffic ? traffic.check() : null,
    siren: (on: boolean) => { car.siren = on; },
    fun: () => fun ? { kegel: fun.hops.filter((o) => o.kind === 0).length, eimer: fun.hops.filter((o) => o.kind === 1).length, herzen: fun.heartTotal, gefunden: fun.heartCount, boings: fun.stats.boings, fliegen: fun.hops.filter((o) => o.t > 0).length } : null,
    funHit: () => { const o = fun!.hops[0]; const h = o.h0; placeCar(o.x0 - Math.sin(h) * 9, o.z0 - Math.cos(h) * 9, h); car.x = o.x0 - Math.sin(h) * 1.5; car.z = o.z0 - Math.cos(h) * 1.5; car.heading = h; car.speed = 9; return [Math.round(o.x0), Math.round(o.z0)]; },
    animals: () => animals ? (animals as any).swans.length + ' Schwäne, ' + (animals as any).cows.length + ' Kühe' : null,
    swanCam: () => { const s = (animals as any).swans[0]; (window as any).__cam = [s.x + 8, 3, s.z + 8, s.x, 0.5, s.z]; camera.far = 4000; return [Math.round(s.x), Math.round(s.z)]; },
    cowCam: () => { const c = (animals as any).cows[0]; const y = terrain.ground(c.x, c.z); (window as any).__cam = [c.x + 9, y + 4, c.z + 9, c.x, y + 1, c.z]; return [Math.round(c.x), Math.round(c.z)]; },
    shipCam: () => { const o = (ships as any).ships[0].obj; (window as any).__cam = [o.position.x + 40, 14, o.position.z + 50, o.position.x, 3, o.position.z]; camera.far = 4000; return [Math.round(o.position.x), Math.round(o.position.z)]; },
    skin: (n: string) => { for (const p of players) p.car.setSkin(n); return n; },
    trainCam: (k = 0) => { const c = (trains as any).tr[k].cars[0]; (window as any).__cam = [c.position.x + 30, c.position.y + 12, c.position.z + 30, c.position.x, c.position.y, c.position.z]; return [Math.round(c.position.x), Math.round(c.position.z), c.visible]; },
    gondolaCam: () => { (window as any).__cam = [-2150, 160, 2280, -2700, 160, 3200]; camera.far = 4000; return true; },
    evening: (on: boolean) => { setEvening(on); return on; },
    funHeart: () => { const h = fun!.open()[0]; placeCar(h[0], h[1]); return h; },
    quick: () => { const cs = traffic ? (traffic as any).cars.filter((c: any) => c.alive && !c.bus) : [];
      const near = cs.filter((c: any) => Math.hypot(c.x - car.x, c.z - car.z) < 80);
      let minBus = 1e9; if (buses) for (const a of buses.buses) for (const b of buses.buses) if (a !== b) for (const s1 of a.segs) for (const s2 of b.segs) minBus = Math.min(minBus, Math.hypot(s1.position.x - s2.position.x, s1.position.z - s2.position.z));
      return { autos80m: near.length, weichenAus: near.filter((c: any) => c.yieldT > 0).length, fliegen: cs.filter((c: any) => c.fly > 0).length, busse: buses ? buses.buses.length : 0, minBusAbstand: Math.round(minBus * 10) / 10, siren: car.siren }; },
    boing: (back = 2.5, v = 12) => { const cs = (traffic as any).cars.filter((c: any) => c.alive && !c.bus); let best: any = null, bd = 1e9; for (const c of cs) { const d = Math.hypot(c.x - car.x, c.z - car.z); if (d < bd) { bd = d; best = c; } }
      if (!best) return null; const h = Math.atan2(best.x - car.x, best.z - car.z); placeCar(best.x - Math.sin(h) * back, best.z - Math.cos(h) * back, h); car.speed = v; return Math.round(bd); },
    cam: (c: number[] | null) => { (window as any).__cam = c; if (c) camera.far = Math.max(camera.far, 4000), camera.updateProjectionMatrix(); },
    lines: (on: boolean) => { world.group.traverse((o: any) => { if (o.isLineSegments) o.visible = on; }); },
    hide: (name: string) => { world.group.traverse((o: any) => { if (o.name && o.name.includes(name)) o.visible = false; }); },
    rt: () => { const a = nav.nearest(car.x, car.z), b = nav.nearest(hospitalBay[0], hospitalBay[1]); return { a, b, ap: [nav.xs[a], nav.zs[a]], r: nav.route(a, b)?.slice(-8) }; },
  };
}

boot().catch((e) => { $('#load-status').textContent = 'Fehler beim Laden: ' + e; console.error(e); });
requestAnimationFrame(frame);
