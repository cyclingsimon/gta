// P-A Testszene: zeigt nur die Realismus-Bausteine auf einer Fläche (kein Weltladen, schnell im Software-Rendering).
// Ansicht über ?v=amb|amb2|bus|bus2|baum|moebel|autos|total ; window.__ready = true nach dem ersten Bild; window.__stats = Dreiecke je Baustein.
import * as THREE from 'three';
import { buildAmbulance } from '../../src/vehicle';
import { Buses, type BusLine } from '../../src/bus';
import { toon, NIGHT } from '../../src/world';
import { tris } from '../../src/real/geo';
import { TREE_SPECIES, treeGeometry, treeTris, buildRealTrees, type TreeSpecies } from '../../src/real/trees';
import { FURNITURE, furnitureAll, buildFurniture, type FurnitureKind } from '../../src/real/furniture';
import { buildStops, buildLamps, realBenchGeometry } from '../../src/real/props';
import { CAR_TYPES, carGeometry, carColor, veloGeometry, veloRiderGeometry, realCarMeshes, buildParkedCars, buildParkedVelos, type CarType } from '../../src/real/cars';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor('#A9DDF3', 1); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight('#ffffff', '#c9b994', 1.15));
const sun = new THREE.DirectionalLight('#fff3dc', 2.45); sun.position.set(-400, 700, 300); scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), toon('#9CC88A')); scene.add(ground);
const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 12).rotateX(-Math.PI / 2).translate(0, 0.01, 0), toon('#6E6E70')); scene.add(road);
const stats: Record<string, number> = {};
const countObj = (o: THREE.Object3D) => { let n = 0; o.traverse((c: any) => { if (c.isMesh && c.geometry) n += tris(c.geometry); }); return n; };

// Ambulanzen (z = 0, x −12..12)
const kinds = ['standard', 'feuerwehr', 'glace', 'monster'];
kinds.forEach((k, i) => { const a = buildAmbulance(k); a.root.position.set(-12 + i * 8, 0.3, 0); scene.add(a.root); stats['amb_' + k] = countObj(a.root);
  if (k === 'standard') { a.lights.forEach((l, j) => (l.material = j % 2 ? a.blueOff : a.blueOn)); (window as any).__amb = a; } });

// Busse (z = 20): VBL Trolley Doppelgelenk, VBL Gelenk, VBL Solo, PostAuto, AAGS, ZVB, AAGR, ARAG
const T: any = { height: () => 0, tunnelAt: () => NaN, ground: () => 0 };
const line = (ref: string, op: string, kind: BusLine['kind'], trolley: boolean): BusLine => ({ ref, op, to: 'Bahnhof', kind, trolley, len: 1000, pts: [[0, 0], [0, 1000]], stops: [] });
const lines = [line('1', 'VBL', 'double', true), line('2', 'VBL', 'artic', true), line('14', 'VBL', 'rigid', false), line('20', 'VBL', 'artic', false), line('70', 'PAG', 'rigid', false), line('62', 'AAGS', 'artic', false), line('5', 'ZVB', 'rigid', false), line('50', 'AAGR', 'rigid', false), line('80', 'ARAG', 'rigid', false)];
const B = new Buses(lines, T); scene.add(B.group);
lines.forEach((l, i) => { const b = (B as any).makeBus(i); let sz = 0;
  b.segs.forEach((s: THREE.Object3D) => { s.position.set(-36 + i * 9, 0, 30 - sz); sz += b.segL + b.gap; });
  stats['bus_' + l.op + '_' + l.kind + (l.trolley ? '_trolley' : '')] = countObj(b.group); });

// Bäume (z = −30)
TREE_SPECIES.forEach((s: TreeSpecies, i: number) => { const g = treeGeometry(s); const m = new THREE.Mesh(g, toon('#ffffff', { vertexColors: true })); m.position.set(-45 + i * 13, 0, -45); scene.add(m); stats['baum_' + s] = tris(g); });
// Strassenmöbel (z = −8)
FURNITURE.forEach((f: FurnitureKind, i: number) => { for (const im of buildFurniture(f, [[-22 + i * 5, -20, 0]], () => 0, toon('#ffffff', { vertexColors: true }))) scene.add(im); stats['moebel_' + f] = tris(furnitureAll(f)); });
// Autos (z = 10) und Velos
CAR_TYPES.forEach((c: CarType, i: number) => { const { body, fixed } = carGeometry(c);
  const mb = new THREE.Mesh(body, toon('#ffffff', { vertexColors: true })); (mb.material as any).color = new THREE.Color(carColor(i * 0.23 + 0.05));
  const mf = new THREE.Mesh(fixed, toon('#ffffff', { vertexColors: true })); const gr = new THREE.Group(); gr.add(mb, mf); gr.position.set(-14 + i * 6, 0, 10); gr.rotation.y = 0.5; scene.add(gr);
  stats['auto_' + c] = tris(body) + tris(fixed); });
{ const r = new THREE.Mesh(veloRiderGeometry(), toon('#ffffff', { vertexColors: true })); r.position.set(16, 0, 10); r.rotation.y = 1.2; scene.add(r); stats['velo_fahrer'] = tris(veloRiderGeometry()); }
{ const g = veloGeometry(); for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(g, toon('#ffffff', { vertexColors: true })); m.position.set(12 + i * 1.2, 0, 10); m.rotation.y = 1.2; scene.add(m); } stats['velo'] = tris(g); }

const VIEWS: Record<string, number[]> = { // Kamera x,y,z → Ziel x,y,z
  amb: [-7.5, 3.2, 9, -12, 1.6, 0], amb2: [-17.5, 4.2, -8, -12, 1.6, -1], amb3: [-4, 6, 14, -1, 1.5, 0], ambL: [-22, 2.2, 3, -12, 1.6, -0.5], ambF: [-12, 2.4, 9, -12, 1.6, 0],
  bus: [-42, 5, 50, -26, 2, 28], bus2: [-5, 7, 52, -10, 1.5, 25], bus3: [-36, 9, 0, -30, 2, 24],
  baum: [-15, 12, -8, -15, 8, -45], moebel: [-6, 4.5, -10, -4, 1, -20], moebel2: [-16, 3, -13, -16, 1, -20], autos: [-2, 4.5, 20, -4, 0.8, 10], total: [-20, 45, 60, -5, 0, 0], strasse: [70, 14, 30, 100, 0, 62], strasse2: [92, 4, 48, 80, 1.5, 57], baum2: [70, 14, 120, 90, 4, 92], halle: [86, 3, 68, 82, 1.5, 55], kand: [92, 3.5, 47, 95, 3, 40],
};
const v = new URLSearchParams(location.search).get('v') || 'amb';
const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000); const V = VIEWS[v] || VIEWS.amb;
cam.position.set(V[0], V[1], V[2]); cam.lookAt(V[3], V[4], V[5]);
renderer.render(scene, cam);
Object.entries(treeTris('lite')).forEach(([k, n]) => (stats['baum_lite_' + k] = n));
Object.entries(treeTris('min')).forEach(([k, n]) => (stats['baum_min_' + k] = n));

// --- Lauf 2: Strassenstück (x 50..150, z 20..100) mit Ein-Zeilen-Bausteinen und Schein-Maske
const isRoad = (x: number, z: number) => (x > 50 && x < 150 && Math.abs(z - 60) < 4) || (z > 20 && z < 100 && Math.abs(x - 100) < 4);
const mask = { at: (x: number, z: number) => (x > 118 && x < 132 && z > 70 && z < 84 ? 2 : 0), isRoad };
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(100, 8).rotateX(-Math.PI / 2).translate(100, 0.02, 60), toon('#6E6E70')), new THREE.Mesh(new THREE.PlaneGeometry(8, 80).rotateX(-Math.PI / 2).translate(100, 0.02, 60), toon('#6E6E70')));
scene.add(new THREE.Mesh(new THREE.BoxGeometry(14, 9, 14).translate(125, 4.5, 77), toon('#E9AE8F')));
const roads = [{ p: [[50, 60], [150, 60]], c: 'residential', w: 8 }, { p: [[100, 20], [100, 100]], c: 'residential', w: 8 }];
const flat = () => 0;
const street: THREE.Object3D[] = [
  ...buildStops([[80, 55.5, 'A'], [88, 55.5, 'B']], mask, flat, [], true, 1), ...buildStops([[120, 64.5, 'C'], [128, 64.5, 'D']], mask, flat, []),
  ...buildLamps([[70, 55.3], [110, 55.3, 1], [140, 64.7, 1], [95, 40.0], [105, 85, 0]], mask, flat, true, [90, 30, 110, 90]),
  ...buildParkedCars(roads, mask, flat, 60, true, [[70, 55.3], [110, 55.3], [140, 64.7], [95, 40], [105, 85], [80, 55.5], [88, 55.5], [120, 64.5], [128, 64.5], [62, 52], [66, 52]]),
  ...buildParkedVelos([[62, 52, 0], [66, 52, 0]], flat),
];
street.forEach((o) => scene.add(o)); stats['strasse_objekte'] = street.length;
stats['strasse_dreiecke'] = street.reduce((a, o: any) => a + (o.isInstancedMesh ? tris(o.geometry) * o.count : 0), 0);
{ const b = realBenchGeometry(); if (b) { const m = new THREE.Mesh(b, toon('#ffffff', { vertexColors: true })); m.position.set(74, 0, 53); scene.add(m); } }
// Bäume in Sparform (min) über buildRealTrees + Budget-Hochrechnung 3500 Bäume (Artmix wie Park/Strasse)
{ const T: number[][] = []; for (let i = 0; i < 24; i++) T.push([60 + (i % 8) * 10, 90 + Math.floor(i / 8) * 12, 1.2]);
  const osm = [[60, 90, 1, 0], [70, 90, 0, 2], [80, 90, 0, 3]];
  const g = buildRealTrees(T, osm, mask, flat); scene.add(g);
  let n = 0; g.traverse((o: any) => { if (o.isInstancedMesh) n += tris(o.geometry) * o.count; }); stats['baeume24_min_dreiecke'] = n; stats['hochrechnung_3500_min'] = Math.round(n / 24 * 3500);
  const ga = buildRealTrees(T, osm, mask, flat, 'alt'); let na = 0; ga.traverse((o: any) => { if (o.isInstancedMesh) na += tris(o.geometry) * o.count; }); stats['hochrechnung_3500_alt'] = Math.round(na / 24 * 3500); }
// Verkehrsauto-Proxy wie in traffic.ts (36 Autos), 8 Stück sichtbar gesetzt
{ const old = new THREE.BoxGeometry(1.8, 0.85, 4.1), oc = new THREE.BoxGeometry(1.58, 0.68, 2.0); const { body, cabin } = realCarMeshes(36, old, oc);
  const m = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < 36; i++) { const on = i < 8; m.makeRotationY(Math.PI / 2); m.setPosition(58 + i * 5.5, 0, 62); body.setMatrixAt(i, on ? m : zero); cabin.setMatrixAt(i, on ? m : zero); }
  body.instanceMatrix.needsUpdate = true; cabin.instanceMatrix.needsUpdate = true; scene.add(body, cabin);
  stats['verkehr_proxy_netze'] = body.children.length + cabin.children.length; }
if (new URLSearchParams(location.search).get('nacht')) NIGHT.value = 1;
(window as any).__stats = stats; (window as any).__ready = true;
if (NIGHT.value) { renderer.setClearColor('#2B3060', 1); scene.children.forEach((c: any) => { if (c.isHemisphereLight) c.intensity = 0.5; if (c.isDirectionalLight) c.intensity = 0.4; }); renderer.render(scene, cam); }
renderer.render(scene, cam);
document.getElementById('info')!.textContent = v + ' · ' + renderer.info.render.calls + ' Aufrufe · ' + renderer.info.render.triangles + ' Dreiecke';
setInterval(() => renderer.render(scene, cam), 500);
