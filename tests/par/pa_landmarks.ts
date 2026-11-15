// P-A Lauf 8: Testszene Wahrzeichen (Torbogen, KKL-Dach über Schein-Baukörper, Wasserturm + Kapellbrücke-Aufsatz, Bushof-Dächer).
// ?v=ueber|torbogen|kkl|turm|bushof ; ?nacht=1 ; window.__stats = Dreiecke je Baustein + Summe
import * as THREE from 'three';
import { toon, NIGHT } from '../../src/world';
import { torbogenSpar, kklDachSpar, wasserturmSpar, kapellbrueckeAufsatz, bushofDachSpar } from '../../src/real/landmarks';

const q = new URLSearchParams(location.search), v = q.get('v') || 'ueber';
if (q.get('nacht')) NIGHT.value = 1;
const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(NIGHT.value ? '#2B3060' : '#A9DDF3', 1);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight('#ffffff', '#c9b994', NIGHT.value ? 0.5 : 1.15)); const sun = new THREE.DirectionalLight('#fff3dc', NIGHT.value ? 0.4 : 2.45); sun.position.set(-400, 700, 300); scene.add(sun);
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), toon('#B9B3A6')));
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(300, 200).rotateX(-Math.PI / 2).translate(150, 0.02, -150), toon('#5BB4E5')));
const S: Record<string, number> = {};
const add = (g: THREE.Group) => { scene.add(g); S[g.name] = (g as any).userData.dreiecke; };
add(torbogenSpar({ x: 0, z: 0, rot: 0.3 }));
// KKL: Schein-Baukörper 90 × 80 × 21 m, Dach 113 × 107 m darüber, zum See (+x) hin weiter auskragend
scene.add(new THREE.Mesh(new THREE.BoxGeometry(90, 21, 80).translate(-120 - 10, 10.5, 0), toon('#9AA6B2')));
add(kklDachSpar({ x: -120, z: 0, rot: 0 }));
add(wasserturmSpar({ x: 150, z: -120, y0: 0 }));
const br: number[][] = [[60, -60], [100, -95], [140, -118], [170, -125], [210, -130]];
add(kapellbrueckeAufsatz(br, () => 1.5));
scene.add(new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 1).translate(0, 0, 0), toon('#9C6B43'))); // (nur Bezug)
for (const [x0, z0, x1, z1] of [[60, -60, 100, -95], [100, -95, 140, -118], [140, -118, 170, -125], [170, -125, 210, -130]]) { const L = Math.hypot(x1 - x0, z1 - z0); const d = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.5, L), toon('#9C6B43')); d.position.set((x0 + x1) / 2, 1.25, (z0 + z1) / 2); d.rotation.y = Math.atan2(x1 - x0, z1 - z0); scene.add(d); }
add(bushofDachSpar({ x: 40, z: 40, rot: 0 })); const b2 = bushofDachSpar({ x: 40, z: 55, rot: 0 }, 32); scene.add(b2); S['bushof-dach-spar-2'] = (b2 as any).userData.dreiecke;
const sum = Object.values(S).reduce((a, b) => a + b, 0); S['summe'] = sum;
const V: Record<string, number[]> = { ueber: [-60, 90, 160, 20, 0, -40], torbogen: [14, 6, 30, 0, 9, 0], kkl: [-30, 12, 110, -120, 18, 0], turm: [110, 12, -60, 160, 12, -122], bushof: [20, 7, 75, 40, 2, 45] };
const cam = new THREE.PerspectiveCamera(50, W / H, 0.5, 3000); const c = V[v] || V.ueber; cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]);
renderer.render(scene, cam);
(window as any).__stats = { ...S, aufrufe: renderer.info.render.calls, bild_dreiecke: renderer.info.render.triangles }; (window as any).__ready = true;
document.getElementById('info')!.textContent = `${v}: Bausteine ${sum} Dreiecke · Bild ${renderer.info.render.triangles} · ${renderer.info.render.calls} Aufrufe`;
