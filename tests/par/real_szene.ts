// P-A Testszene: zeigt nur die Realismus-Bausteine auf einer Fläche (kein Weltladen, schnell im Software-Rendering).
// Ansicht über ?v=amb|amb2|bus|bus2|baum|moebel|autos|total ; window.__ready = true nach dem ersten Bild; window.__stats = Dreiecke je Baustein.
import * as THREE from 'three';
import { buildAmbulance } from '../../src/vehicle';
import { Buses, type BusLine } from '../../src/bus';
import { toon } from '../../src/world';
import { tris } from '../../src/real/geo';
import { TREE_SPECIES, treeGeometry, type TreeSpecies } from '../../src/real/trees';
import { FURNITURE, furnitureGeometry, type FurnitureKind } from '../../src/real/furniture';
import { CAR_TYPES, carGeometry, carColor, veloGeometry, type CarType } from '../../src/real/cars';

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
FURNITURE.forEach((f: FurnitureKind, i: number) => { const g = furnitureGeometry(f); const m = new THREE.Mesh(g, toon('#ffffff', { vertexColors: true })); m.position.set(-22 + i * 5, 0, -20); scene.add(m); stats['moebel_' + f] = tris(g); });
// Autos (z = 10) und Velos
CAR_TYPES.forEach((c: CarType, i: number) => { const { body, fixed } = carGeometry(c);
  const mb = new THREE.Mesh(body, toon('#ffffff', { vertexColors: true })); (mb.material as any).color = new THREE.Color(carColor(i * 0.23 + 0.05));
  const mf = new THREE.Mesh(fixed, toon('#ffffff', { vertexColors: true })); const gr = new THREE.Group(); gr.add(mb, mf); gr.position.set(-14 + i * 6, 0, 10); gr.rotation.y = 0.5; scene.add(gr);
  stats['auto_' + c] = tris(body) + tris(fixed); });
{ const g = veloGeometry(); for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(g, toon('#ffffff', { vertexColors: true })); m.position.set(12 + i * 1.2, 0, 10); m.rotation.y = 1.2; scene.add(m); } stats['velo'] = tris(g); }

const VIEWS: Record<string, number[]> = { // Kamera x,y,z → Ziel x,y,z
  amb: [-7.5, 3.2, 9, -12, 1.6, 0], amb2: [-17.5, 4.2, -8, -12, 1.6, -1], amb3: [-4, 6, 14, -1, 1.5, 0],
  bus: [-42, 5, 50, -26, 2, 28], bus2: [-5, 7, 52, -10, 1.5, 25], bus3: [-36, 9, 0, -30, 2, 24],
  baum: [-15, 12, -8, -15, 8, -45], moebel: [-6, 4.5, -10, -4, 1, -20], moebel2: [-16, 3, -13, -16, 1, -20], autos: [-2, 4.5, 20, -4, 0.8, 10], total: [-20, 45, 60, -5, 0, 0],
};
const v = new URLSearchParams(location.search).get('v') || 'amb';
const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000); const V = VIEWS[v] || VIEWS.amb;
cam.position.set(V[0], V[1], V[2]); cam.lookAt(V[3], V[4], V[5]);
renderer.render(scene, cam);
(window as any).__stats = stats; (window as any).__ready = true;
document.getElementById('info')!.textContent = v + ' · ' + renderer.info.render.calls + ' Aufrufe · ' + renderer.info.render.triangles + ' Dreiecke';
setInterval(() => renderer.render(scene, cam), 500);
