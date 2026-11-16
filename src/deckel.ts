import * as THREE from 'three';
import type { CityData } from './world';

/** 17a: Schachtdeckel (rund, Gusseisen) in der Fahrbahn und Einlaufroste am Strassenrand – wie auf jeder Schweizer Strasse.
 *  Flache Abziehbilder, ein Netz, eine kleine Textur. yOf = Fahrbahnhöhe. */
export function buildSchachtdeckel(roads: CityData['roads'], yOf: (x: number, z: number) => number): THREE.Mesh | null {
  const CAR = new Set(['primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street']);
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const g = cv.getContext('2d')!;
  // links: runder Deckel
  g.fillStyle = '#3E4144'; g.beginPath(); g.arc(32, 32, 29, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#26282A'; g.lineWidth = 3; g.stroke();
  g.strokeStyle = '#55595D'; g.lineWidth = 2; g.beginPath(); g.arc(32, 32, 20, 0, Math.PI * 2); g.stroke(); for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(32 + Math.cos(a * Math.PI / 4) * 6, 32 + Math.sin(a * Math.PI / 4) * 6); g.lineTo(32 + Math.cos(a * Math.PI / 4) * 19, 32 + Math.sin(a * Math.PI / 4) * 19); g.stroke(); }
  // rechts: Einlaufrost
  g.fillStyle = '#4A4D50'; g.fillRect(68, 8, 56, 48); g.strokeStyle = '#2A2C2E'; g.lineWidth = 3; g.strokeRect(68, 8, 56, 48); g.fillStyle = '#17181A'; for (let k = 0; k < 6; k++) g.fillRect(74 + k * 8, 13, 4, 38);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const pos: number[] = [], uv: number[] = []; let n = 0;
  const put = (x: number, z: number, ux: number, uz: number, hw: number, hl: number, u0: number, u1: number) => { const nx = -uz, nz = ux;
    const P = [[x - nx * hw - ux * hl, z - nz * hw - uz * hl, u0, 0], [x + nx * hw - ux * hl, z + nz * hw - uz * hl, u1, 0], [x + nx * hw + ux * hl, z + nz * hw + uz * hl, u1, 1], [x - nx * hw + ux * hl, z - nz * hw + uz * hl, u0, 1]];
    for (const q of [0, 1, 2, 0, 2, 3]) { const [px, pz, u, v] = P[q]; pos.push(px, yOf(px, pz) + 0.39, pz); uv.push(u, v); } n++; };
  const h = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
  roads.forEach((r, ri) => { if (!CAR.has(r.c) || (r as any).tu || r.p.length < 2 || r.w < 4) return;
    let accD = 12 + h(ri, 1) * 30, accR = 20 + h(ri, 2) * 30;
    for (let i = 0; i + 1 < r.p.length; i++) { const A = r.p[i], B = r.p[i + 1], sl = Math.hypot(B[0] - A[0], B[1] - A[1]); if (sl < 0.5) continue; const ux = (B[0] - A[0]) / sl, uz = (B[1] - A[1]) / sl;
      while (accD <= sl) { const o = (h(ri, accD) - 0.5) * r.w * 0.5; put(A[0] + ux * accD - uz * o, A[1] + uz * accD + ux * o, ux, uz, 0.33, 0.33, 0, 0.5); accD += 38 + h(ri + 7, accD) * 30; } accD -= sl;
      while (accR <= sl) { const sd = h(ri, accR + 3) > 0.5 ? 1 : -1, o = sd * (r.w / 2 - 0.32); put(A[0] + ux * accR - uz * o, A[1] + uz * accR + ux * o, ux, uz, 0.22, 0.3, 0.5, 1); accR += 45 + h(ri + 3, accR) * 25; } accR -= sl; } });
  if (!n) return null;
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide }));
  m.name = 'schachtdeckel'; console.log('[bau] Schachtdeckel/Roste', n, 'Dreiecke', n * 2); return m;
}
