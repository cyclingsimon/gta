// P-A Lauf 10: Testszene OSM-Bausteine auf welligem Gelände (Linien folgen dem Boden). ?v=ueber|strom|fussball|tennis|basket|spiel|bahn|masten
import * as THREE from 'three';
import { toon } from '../../src/world';
import { tris } from '../../src/real/geo';
import { buildPowerLines, pylonGeometry, buildPitches, buildPlaygrounds, playgroundGeometry, buildLevelCrossings, levelCrossingGeometry, buildMasts, mastGeometry } from '../../src/real/osmprops';

const v = new URLSearchParams(location.search).get('v') || 'ueber';
const gy = (x: number, z: number) => 2.5 * Math.sin(x / 45) + 1.5 * Math.cos(z / 33);
const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor('#A9DDF3', 1);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight('#ffffff', '#c9b994', 1.15)); const sun = new THREE.DirectionalLight('#fff3dc', 2.45); sun.position.set(-400, 700, 300); scene.add(sun);
{ const g = new THREE.PlaneGeometry(700, 700, 140, 140).rotateX(-Math.PI / 2); const p = g.getAttribute('position'); for (let i = 0; i < p.count; i++) p.setY(i, gy(p.getX(i), p.getZ(i))); g.computeVertexNormals(); scene.add(new THREE.Mesh(g, toon('#8DBF73'))); }
const S: Record<string, number> = {};
const add = (g: THREE.Group, k: string) => { scene.add(g); S[k] = (g as any).userData.dreiecke || 0; };
// 3) Strom: zwei Leitungen, Masten an den Knoten
const l1 = [[-260, -160], [-170, -150], [-80, -165], [10, -150], [100, -170], [200, -160]], l2 = l1.map(([x, z]) => [x + 10, z + 45]);
const pl = buildPowerLines([...l1, ...l2], [l1, l2], gy); add(pl, 'strom_gruppe'); S['strom_seilsegmente'] = (pl as any).userData.seilSegmente;
S['einzeln_mast'] = tris(pylonGeometry());
// 2) Sportplätze
const rectP = (cx: number, cz: number, L: number, Wd: number, a: number) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, w]) => [cx + Math.cos(a) * u * L / 2 - Math.sin(a) * w * Wd / 2, cz + Math.sin(a) * u * L / 2 + Math.cos(a) * w * Wd / 2]);
const one = (sport: 'soccer' | 'tennis' | 'basketball', p: number[][]) => (buildPitches([{ sport, p }], gy) as any).userData.dreiecke;
S['einzeln_fussball_105x68'] = one('soccer', rectP(0, 0, 107, 70, 0.3)); S['einzeln_fussball_120x80'] = one('soccer', rectP(0, 0, 120, 80, 0)); S['einzeln_fussball_klein_40x25'] = one('soccer', rectP(0, 0, 40, 25, 0));
S['einzeln_tennis'] = one('tennis', rectP(0, 0, 36, 18, 0)); S['einzeln_basketball'] = one('basketball', rectP(0, 0, 30, 16, 0));
add(buildPitches([{ sport: 'soccer', p: rectP(0, 0, 107, 70, 0.3) }, { sport: 'tennis', p: rectP(95, 25, 36, 18, -0.2) }, { sport: 'basketball', p: rectP(95, -30, 30, 16, 0.5) }, { sport: 'soccer', p: rectP(-40, 90, 40, 25, 0.1) }], gy), 'plaetze_gruppe');
// 1) Spielplätze
add(buildPlaygrounds([[-100, 40], [-120, 45], [-110, 62]], gy), 'spiel_gruppe'); S['einzeln_spielplatz'] = tris(playgroundGeometry());
// 4) Bahnübergänge
add(buildLevelCrossings([[160, 60, 0], [180, 90, 0.7]], gy), 'bahn_gruppe'); S['einzeln_bahnuebergang'] = tris(levelCrossingGeometry());
scene.add(new THREE.Mesh(new THREE.BoxGeometry(60, 0.3, 1.6).rotateY(Math.PI / 2).translate(160, gy(160, 60) + 0.1, 60), toon('#5A5048')));
scene.add(new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 6).translate(160, gy(160, 60) + 0.05, 60), toon('#6E6E70')));
// 5) Masten
add(buildMasts([[200, 0, 'chimney', 45], [215, 10, 'communications_tower'], [230, -5, 'mast', 25]], gy), 'masten_gruppe');
S['einzeln_kamin'] = tris(mastGeometry('chimney', 45)); S['einzeln_funkmast'] = tris(mastGeometry('mast', 30));
const V: Record<string, number[]> = { ueber: [-150, 120, 200, 0, 0, -40], strom: [-150, 20, -60, -40, 18, -150], fussball: [-70, 30, 70, 0, 0, 0], tennis: [70, 12, 50, 95, 0, 25], basket: [70, 10, -5, 95, 1, -30],
  spiel: [-95, 7, 62, -112, 1, 48], bahn: [148, 5, 72, 162, 1.5, 62], masten: [180, 12, 60, 215, 18, 0] };
const cam = new THREE.PerspectiveCamera(50, W / H, 0.5, 3000); const c = V[v] || V.ueber; cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]);
renderer.render(scene, cam);
(window as any).__stats = { ...S, aufrufe: renderer.info.render.calls, bild_dreiecke: renderer.info.render.triangles }; (window as any).__ready = true;
document.getElementById('info')!.textContent = `${v}: ${renderer.info.render.calls} Aufrufe · ${renderer.info.render.triangles} Dreiecke`;
