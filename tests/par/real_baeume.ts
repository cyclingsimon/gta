// P-A Lauf 6: Bäume in Zellen vs. instanziert – 3500 Bäume auf 4 × 4 km (gehäuft wie eine Stadt), Kamera auf Strassenhöhe.
// ?modus=zellen|inst|alt  ?v=strasse|hoch ; window.__stats = Dreiecke/Aufrufe nach dem Zeichnen (mit Frustum-Culling)
import * as THREE from 'three';
import { toon } from '../../src/world';
import { buildRealTrees, buildTreeInstances, realTreeList } from '../../src/real/trees';
import { hash2 } from '../../src/real/geo';

const q = new URLSearchParams(location.search), modus = q.get('modus') || 'zellen', v = q.get('v') || 'strasse';
const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor('#A9DDF3', 1);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight('#ffffff', '#c9b994', 1.15)); const sun = new THREE.DirectionalLight('#fff3dc', 2.45); sun.position.set(-400, 700, 300); scene.add(sun);
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), toon('#9CC88A')));
// Bäume: 12 Häufungen (Parks, Quais, Alleen) + Streuung; Hang im Osten (y > 270 ab x > 1500) für Nadelbäume
const T: number[][] = [], osm: number[][] = [];
for (let i = 0; i < 3500; i++) {
  const c = Math.floor(hash2(i, 1) * 12), cx = (hash2(c, 2) - 0.5) * 3600, cz = (hash2(c, 3) - 0.5) * 3600;
  const x = i % 4 === 0 ? (hash2(i, 4) - 0.5) * 4000 : cx + (hash2(i, 5) - 0.5) * 300, z = i % 4 === 0 ? (hash2(i, 6) - 0.5) * 4000 : cz + (hash2(i, 7) - 0.5) * 300;
  T.push([x, z, 0.9 + hash2(i, 8) * 0.5]); if (i % 40 === 0) osm.push([x, z, 0, 2]);
}
const hy = (x: number) => (x > 1500 ? (x - 1500) * 0.6 : 0);
const mask = { at: (x: number, z: number) => (Math.abs(z + 300) < 40 && x < -500 ? 1 : 0), isRoad: (x: number, z: number) => Math.abs(((x % 120) + 120) % 120 - 60) < 4 || Math.abs(((z % 120) + 120) % 120 - 60) < 4 };
const t0 = performance.now();
const grp = modus === 'inst' ? buildTreeInstances(realTreeList(T, osm, mask, (x) => hy(x)), (x) => hy(x) - 0.05, toon('#ffffff', { vertexColors: true }), 'min') // Stand Lauf 3–5
  : buildRealTrees(T, osm, mask, (x) => hy(x), modus === 'alt' ? 'alt' : 'min');
scene.add(grp);
const bauMs = Math.round(performance.now() - t0);
const cam = new THREE.PerspectiveCamera(50, W / H, 0.5, 3000);
if (v === 'hoch') { cam.position.set(0, 120, 300); cam.lookAt(0, 0, -400); } else { cam.position.set(-200, 3, 60); cam.lookAt(400, 2, 60); }
renderer.render(scene, cam);
const arten: Record<string, number> = {}; grp.traverse((o: any) => { if (o.isMesh) arten[o.name] = (arten[o.name] || 0) + 1; });
(window as any).__stats = { modus, v, dreiecke: renderer.info.render.triangles, aufrufe: renderer.info.render.calls, netze: grp.children.length, bauMs, arten };
(window as any).__ready = true;
document.getElementById('info')!.textContent = `${modus} ${v}: ${renderer.info.render.calls} Aufrufe · ${renderer.info.render.triangles} Dreiecke · ${grp.children.length} Netze · Bau ${bauMs} ms`;
