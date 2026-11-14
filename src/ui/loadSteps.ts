// P-B: ehrlicher Ladefortschritt (Lauf 1, überarbeitet Lauf 2).
// Der Balken in src/loader.ts kriecht von sich aus weiter (damit er «nie hängt») – das zeigt mehr Fortschritt, als da ist.
// Hier: Fortschritt = abgeschlossene Ladeschritte / alle Schritte, abgelesen an den echten Statusmeldungen (#load-status),
// die main.ts und world.ts setzen. Keine Schätzung der Restzeit. CSS (style.css, Block «P-B») setzt Balken und Läufer auf --ld-honest.
//
// Ablauf laut main.ts (Stand 14.11.):
//   A: «Lade <Gegend> …» → «Lade Gelände …» → 9 Bauschritte aus world.ts → «Navi wird eingerichtet …»
//   B (nur Echt-Modus; startet nach A im Hintergrund, beim ersten Start wird darauf gewartet):
//      «Echte Häuser: <dieselben 9 Bauschritte>» (in A-Gegenden heisst Stufe B «Gelände wird verfeinert», Meldungen trotzdem «Echte Häuser: …»)
//   Ende: Status leer, dann wird der Start-Knopf sichtbar → erst dann 100 %.

import { REGIONS_A } from '../regionsA';

const WORLD: [RegExp, string][] = [
  [/^Karte wird gezeichnet/, 'Die Karte wird gemalt'],
  [/^Strassen/, 'Strassen werden geteert'],
  [/^Häuser werden gebaut/, 'Häuser werden gebaut'],
  [/^Materialien/, 'Häuser bekommen Farbe'],
  [/^Konturen/, 'Ränder werden gezeichnet'],
  [/^Wahrzeichen/, 'Kapellbrücke & Co. kommen dazu'],
  [/^Bäume/, 'Bäume werden gepflanzt'],
  [/^Wald/, 'Der Wald wächst'],
  [/^Stege/, 'Stege und Laternen'],
];
const A: [RegExp, string][] = [
  [/^Lade (?!Gelände)/, 'Karte wird geholt'],
  [/^Lade Gelände/, 'Berge und Täler werden geholt'],
  ...WORLD,
  [/^Navi/, 'Das Navi lernt die Strassen'],
];

let isA = false;
let idx = -1, N = A.length, echt = false, t0 = 0, tStep = 0, done = false, failed = false, timer = 0, label = 'Start';

/** Gleiche Regel wie main.ts (QUALITY_): ?q=leicht / ?q=echt, sonst Spielstand, sonst Handy → leicht */
function predictEcht() {
  const q = location.search;
  if (/[?&]q=leicht/.test(q)) return false;
  if (/[?&]q=echt/.test(q)) return true;
  try { const s = JSON.parse(localStorage.getItem('luksiRescue.v1') || '{}'); if (s.quality) return s.quality === 'echt'; } catch { /* privat */ }
  return !(matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);
}

function fmt(s: number) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

function render() {
  const ld = document.getElementById('loader');
  if (!ld) return;
  ld.classList.add('honest');
  let el = document.getElementById('ld-step');
  if (!el) { el = document.createElement('p'); el.id = 'ld-step'; el.setAttribute('aria-live', 'polite'); ld.appendChild(el); }
  const now = performance.now() / 1000;
  // Abgeschlossene Schritte; vor dem Start-Knopf höchstens (N-1)/N – nie «100 %» ohne Knopf
  const frac = done ? 1 : Math.min(Math.max(0, idx) / N, (N - 1) / N);
  ld.style.setProperty('--ld-honest', (frac * 100).toFixed(1) + '%');
  if (failed) { el.textContent = 'Hoppla, das Laden hat nicht geklappt. Bitte die Seite neu laden.'; return; }
  if (done) { el.textContent = `Fertig! Geladen in ${fmt(now - t0)}`; return; }
  const slow = idx >= 0 && now - tStep > 45 ? ' – dauert auf diesem Gerät etwas länger, es geht weiter' : '';
  el.textContent = `Schritt ${Math.max(1, idx + 1)} von ${N}: ${label} · ${fmt(now - t0)}${slow}`;
}

function setStep(i: number, l: string) { if (i > idx) { idx = i; label = l; tStep = performance.now() / 1000; } }

function onStatus(txt: string) {
  if (done || failed) return;
  if (/^Fehler/.test(txt)) { failed = true; render(); return; }
  const b = /^Echte Häuser: (.*)$/.exec(txt);
  if (b) { // Stufe B: Unterschritt k der 9 Bauschritte
    if (!echt) { echt = true; N = A.length + WORLD.length; } // Vorhersage lag falsch → Gesamtzahl einmalig anpassen
    const k = WORLD.findIndex(([re]) => re.test(b[1]));
    if (k >= 0) setStep(A.length + k, (isA ? 'Feines Gelände: ' : 'Echte Häuser: ') + WORLD[k][1]);
  } else if (/^(Echte Häuser werden gebaut|Gelände wird verfeinert)/.test(txt)) {
    if (idx < A.length) label = /Gelände/.test(txt) ? 'Feines Gelände wird verfeinert' : 'Echte Häuser werden vorbereitet';
  } else {
    for (let i = 0; i < A.length; i++) if (A[i][0].test(txt)) { setStep(i, A[i][1]); break; }
  }
  render();
}

function finish() { if (done) return; done = true; render(); clearInterval(timer); }

export function setupLoadSteps() {
  const st = document.getElementById('load-status'), btn = document.getElementById('start-btn');
  if (!st || !btn) return;
  // A-Gegend? (gleiche Regel wie main.ts: ?region=…, sonst Spielstand)
  try { const r = new URLSearchParams(location.search).get('region') || JSON.parse(localStorage.getItem('luksiRescue.v1') || '{}').region; isA = !!r && r in REGIONS_A; } catch { /* privat */ }
  echt = predictEcht(); N = A.length + (echt ? WORLD.length : 0);
  t0 = tStep = performance.now() / 1000;
  new MutationObserver(() => onStatus(st.textContent || '')).observe(st, { childList: true, characterData: true, subtree: true });
  // Fertig = Start-Knopf wird sichtbar (main.ts zeigt ihn erst, wenn alles geladen ist)
  new MutationObserver(() => { if (btn.style.display !== 'none') finish(); }).observe(btn, { attributes: true, attributeFilter: ['style'] });
  timer = window.setInterval(render, 1000);
  onStatus(st.textContent || '');
  (window as any).__ldSteps = () => ({ idx, N, echt, label, done, frac: document.getElementById('loader')?.style.getPropertyValue('--ld-honest') });
}
