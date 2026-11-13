// 13i Schnellreise (Wunsch Simon 13.11.): Karte der Spielwelt, Ziel wählen, kurzer Zeitraffer, Ankunft.
// Regionen werden weiterhin einzeln geladen; Reise in eine andere Region = Neuladen mit Zielort.

import { REGIONS_A } from './regionsA';

export type RegionId = 'luzern' | 'nord' | 'ost' | 'west' | 'sued';
export interface TravelRegion { id: RegionId | string; name: string; b: [number, number, number, number]; ready: boolean }
export interface TravelDest { id: string; name: string; sub: string; icon: string; region: string; to: 'hosp' | [number, number]; ready: boolean }

/** Spielfelder (Spiel-Meter, x = Ost, z = Süd, Ursprung Kapellbrücke). ready = Daten im Spiel. */
export const REGIONS: TravelRegion[] = [
  { id: 'luzern', name: 'Luzern', b: [-3800, -1100, 2700, 6300], ready: true },
  { id: 'nord', name: 'Emmen · Ebikon', b: [-3800, -3900, 4600, -550], ready: true },
  { id: 'ost', name: 'Meggen', b: [2500, -2000, 7500, 2500], ready: true },
  { id: 'west', name: 'Littau', b: [-8500, -1300, -3600, 3000], ready: true },
  { id: 'sued', name: 'Nidwalden', b: [-3000, 6100, 4600, 11000], ready: true },
  ...Object.entries(REGIONS_A).map(([id, r]) => ({ id, name: r.name, b: r.b, ready: true })),
];

/** Ziele: Spitäler und Ortszentren. 'hosp' = Übergabeplatz des Spitals/Rettungspostens der Region. */
export const DESTS: TravelDest[] = [
  { id: 'kispi', name: 'Kinderspital Zentralschweiz', sub: 'LUKS Luzern', icon: '🏥', region: 'luzern', to: 'hosp', ready: true },
  { id: 'bhf', name: 'Bahnhof Luzern', sub: 'Torbogen und Europaplatz', icon: '🚉', region: 'luzern', to: [200, 190], ready: true },
  { id: 'stans', name: 'Spital Nidwalden', sub: 'Stans · LUKS Gruppe', icon: '🏥', region: 'sued', to: 'hosp', ready: true },
  { id: 'emmen', name: 'Bahnhof Emmenbrücke', sub: 'Emmen und Ebikon', icon: '🚉', region: 'nord', to: [-1929, -2086], ready: true },
  { id: 'meggen', name: 'Bahnhof Meggen', sub: 'Meggen', icon: '🚉', region: 'ost', to: 'hosp', ready: true },
  { id: 'littau', name: 'Bahnhof Littau', sub: 'Littau', icon: '🚉', region: 'west', to: 'hosp', ready: true },
  // Gebiet A (13i): Spitäler (LUKS Sursee, LUKS Wolhusen) und Rettungsposten der gebauten Regionen
  ...Object.entries(REGIONS_A).map(([id, r]) => ({ id, name: r.hosp.label, sub: r.name, icon: r.hosp.kind === 'spital' ? '🏥' : r.hosp.label.startsWith('Bahnhof') ? '🚉' : '🚏', region: id, to: 'hosp' as const, ready: true })),
  // noch nicht gebaut: grau mit «kommt bald»
  ...(Object.values(REGIONS_A).some((r) => /Wolhusen/.test(r.hosp.label)) ? [] : [{ id: 'wolhusen', name: 'LUKS Wolhusen', sub: 'kommt bald', icon: '🏥', region: 'a-wolhusen', to: 'hosp' as const, ready: false }]),
  ...(Object.values(REGIONS_A).some((r) => /Sursee/.test(r.hosp.label)) ? [] : [{ id: 'sursee', name: 'LUKS Sursee', sub: 'kommt bald', icon: '🏥', region: 'a-sursee', to: 'hosp' as const, ready: false }]),
];
/** Lage der noch nicht gebauten Ziele auf der Karte (ungefähr, Annahme ±1 km) */
const SOON_AT: Record<string, [number, number]> = { wolhusen: [-17700, -800], sursee: [-15550, -13550] };

export interface TravelHost {
  region: string; carX: () => number; carZ: () => number; hosp: [number, number];
  /** false + Grund, wenn gerade nicht gereist werden kann */
  canGo: () => string | null;
  /** Reise in derselben Region */
  teleport: (to: 'hosp' | [number, number]) => void;
  /** Reise in andere Region (Seite lädt neu) */
  switchTo: (region: string, to: 'hosp' | [number, number], name: string) => void;
  sfx?: () => void; onClose: () => void;
}

const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const destAt = (d: TravelDest, h: TravelHost): [number, number] => {
  if (!d.ready) return SOON_AT[d.id] || [0, 0];
  if (d.to !== 'hosp') return d.to;
  if (d.region === h.region) return h.hosp;
  const r = REGIONS.find((q) => q.id === d.region);
  // grobe Lage der Spitäler anderer Regionen für die Karte (Annahme, nur Anzeige)
  const HOSP_GUESS: Record<string, [number, number]> = { luzern: [-547, -840], sued: [3753, 10146], ost: [5715, 171], west: [-3835, -145], nord: [-547, -840] };
  if (REGIONS_A[d.region]) return [REGIONS_A[d.region].hosp.x, REGIONS_A[d.region].hosp.z];
  return HOSP_GUESS[d.region] || (r ? [(r.b[0] + r.b[2]) / 2, (r.b[1] + r.b[3]) / 2] : [0, 0]);
};

/** Öffnet die Schnellreise-Karte. Gibt das Overlay zurück (Klasse .mg, mit _confirm/_cancel/_nav für Tastatur/Gamepad). */
export function openTravel(ui: HTMLElement, h: TravelHost): HTMLElement {
  const all = [...REGIONS];
  const pts = DESTS.map((d) => destAt(d, h));
  const xs = [...all.flatMap((r) => [r.b[0], r.b[2]]), ...pts.map((p) => p[0])], zs = [...all.flatMap((r) => [r.b[1], r.b[3]]), ...pts.map((p) => p[1])];
  const pad = 1200, x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, z0 = Math.min(...zs) - pad, z1 = Math.max(...zs) + pad;
  const W = 600, H = Math.round(W * (z1 - z0) / (x1 - x0));
  const px = (x: number) => ((x - x0) / (x1 - x0) * W).toFixed(1), pz = (z: number) => ((z - z0) / (z1 - z0) * H).toFixed(1);
  const here: [number, number] = [h.carX(), h.carZ()];
  // 14o: Beschriftung ohne Überlappung (16 Gegenden): kurze Namen, gierig platziert (Spitäler zuerst), sonst nur beim Anwählen sichtbar
  const short = (n: string) => n.replace(/^(Bahnhof|Haltestelle) /, '').replace(/ Station$/, '').split(/,| und /)[0].trim();
  const boxes: [number, number, number, number][] = [];
  const hit = (b: [number, number, number, number]) => boxes.some((q) => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]);
  const lab: { x: number; y: number; hid: boolean }[] = DESTS.map(() => ({ x: 0, y: 0, hid: true }));
  DESTS.forEach((_, i) => boxes.push([+px(pts[i][0]) - 9, +pz(pts[i][1]) - 9, +px(pts[i][0]) + 9, +pz(pts[i][1]) + 9]));
  const prio = DESTS.map((d, i) => i).sort((a, b) => (DESTS[a].icon === '🏥' ? 0 : 1) - (DESTS[b].icon === '🏥' ? 0 : 1) || a - b);
  for (const i of prio) {
    const cx = +px(pts[i][0]), cy = +pz(pts[i][1]), w = short(DESTS[i].name).length * 6.6 + 4;
    for (const [dx, dy] of [[0, -14], [0, 22], [w / 2 + 12, 4], [-w / 2 - 12, 4]]) {
      const b: [number, number, number, number] = [cx + dx - w / 2, cy + dy - 11, cx + dx + w / 2, cy + dy + 2];
      if (b[0] < 2 || b[2] > W - 2 || b[1] < 2 || b[3] > H - 2 || hit(b)) continue;
      boxes.push(b); lab[i] = { x: cx + dx, y: cy + dy, hid: false }; break;
    }
    if (lab[i].hid) lab[i] = { x: Math.min(Math.max(cx, w / 2 + 2), W - w / 2 - 2), y: cy > 20 ? cy - 14 : cy + 22, hid: true };
  }
  const svg = `<svg class="tr-map" viewBox="0 0 ${W} ${H}" role="img" aria-label="Karte der Spielwelt">
    ${all.map((r) => `<rect class="tr-reg${r.id === h.region ? ' here' : ''}" x="${px(r.b[0])}" y="${pz(r.b[1])}" width="${(+px(r.b[2]) - +px(r.b[0])).toFixed(1)}" height="${(+pz(r.b[3]) - +pz(r.b[1])).toFixed(1)}"><title>${r.name}</title></rect>`).join('')}
    ${DESTS.map((d, i) => `<g class="tr-pin${d.ready ? '' : ' soon'}" data-i="${i}"><circle cx="${px(pts[i][0])}" cy="${pz(pts[i][1])}" r="${d.icon === '🏥' ? 9 : 7}"/><text class="${lab[i].hid ? 'hid' : ''}" x="${lab[i].x.toFixed(1)}" y="${lab[i].y.toFixed(1)}">${short(d.name)}</text></g>`).join('')}
    <g class="tr-me"><circle cx="${px(here[0])}" cy="${pz(here[1])}" r="7"/></g>
    <g class="tr-amb" style="display:none"><circle r="10"/><text y="5">🚑</text></g>
  </svg>`;
  // Liste: Kinderspital zuerst, dann nach Entfernung; «kommt bald» ans Ende
  const order = DESTS.map((_, i) => i).sort((a, b) => (DESTS[a].id === 'kispi' ? -1 : 0) - (DESTS[b].id === 'kispi' ? -1 : 0) || (DESTS[a].ready ? 0 : 1) - (DESTS[b].ready ? 0 : 1) || dist(here, pts[a]) - dist(here, pts[b]));
  const ov = document.createElement('div'); ov.className = 'mg tr';
  ov.innerHTML = `<div class="mg-card tr-card"><h2>🗺️ Schnellreise</h2><p class="mg-hint">Wohin soll Luksi fahren?</p>
    <div class="tr-body">${svg}<div class="tr-list">${order.map((i) => DESTS[i]).map((d, k) => { const i = order[k]; return `<button data-i="${i}" class="${d.ready ? '' : 'off'}"><span class="tr-ic">${d.icon}</span><b>${d.name}</b><small>${d.sub}</small><em>${!d.ready ? '' : dist(here, pts[i]) < 400 ? 'hier' : Math.max(1, Math.round(dist(here, pts[i]) / 1000)) + ' km'}</em></button>`; }).join('')}</div></div>
    <p class="tr-msg" aria-live="polite"></p>
    <div class="mg-buttons"><button id="tr-close">Zurück <kbd>Esc</kbd></button></div></div>`;
  ui.appendChild(ov);
  const btns = [...ov.querySelectorAll<HTMLButtonElement>('.tr-list button')];
  const msg = ov.querySelector('.tr-msg') as HTMLElement;
  let focus = order.find((i) => DESTS[i].ready && DESTS[i].region !== h.region) ?? order[0], busy = false;
  const show = () => { btns.forEach((b) => b.classList.toggle('focus', +b.dataset.i! === focus)); ov.querySelectorAll('.tr-pin').forEach((g) => g.classList.toggle('focus', +(g as SVGElement).dataset.i! === focus)); btns.find((b) => +b.dataset.i! === focus)?.scrollIntoView?.({ block: 'nearest' }); };
  const close = () => { if (busy) return; ov.remove(); h.onClose(); };
  const go = (i: number) => {
    if (busy) return;
    const d = DESTS[i]; focus = i; show();
    if (!d.ready) { msg.textContent = `${d.name}: Diese Gegend wird gerade gebaut – bald kann Luksi hinfahren!`; return; }
    const why = h.canGo(); if (why) { msg.textContent = why; return; }
    busy = true; h.sfx?.();
    const to = pts[i], km = dist(here, to) / 1000;
    msg.textContent = `Tatü-tata! ${km < 1 ? 'Gleich da' : `${Math.round(km)} km im Zeitraffer`} …`;
    // Zeitraffer: Ambulanz fährt auf der Karte vom aktuellen Ort zum Ziel (1.8 s)
    const amb = ov.querySelector('.tr-amb') as SVGGElement; amb.style.display = '';
    const t0 = performance.now(), T = 1800;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / T), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      amb.setAttribute('transform', `translate(${px(here[0] + (to[0] - here[0]) * e)},${pz(here[1] + (to[1] - here[1]) * e)})`);
      if (k < 1) { requestAnimationFrame(step); return; }
      if (d.region === h.region) { busy = false; ov.remove(); h.teleport(d.to); h.onClose(); }
      else { msg.textContent = `Angekommen! ${d.name} wird geladen …`; h.switchTo(d.region, d.to, d.name); }
    };
    requestAnimationFrame(step);
  };
  btns.forEach((b) => { const i = +b.dataset.i!; b.onclick = () => go(i); b.onmouseenter = () => { focus = i; show(); }; });
  ov.querySelectorAll<SVGGElement>('.tr-pin').forEach((g) => { g.onclick = () => go(+g.dataset.i!); });
  (ov.querySelector('#tr-close') as HTMLButtonElement).onclick = close;
  (ov as any)._confirm = () => go(focus);
  (ov as any)._cancel = close;
  (ov as any)._nav = (dir: 'up' | 'down' | 'left' | 'right') => { if (busy) return; const k = order.indexOf(focus); focus = order[(k + (dir === 'up' || dir === 'left' ? -1 : 1) + order.length) % order.length]; show(); };
  show();
  return ov;
}
