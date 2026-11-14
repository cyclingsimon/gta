// P-B (14.11.2026): ehrlicher Ladefortschritt.
// Der Balken in src/loader.ts kriecht von sich aus weiter (damit er «nie hängt») – das zeigt mehr Fortschritt, als da ist.
// Hier: Fortschritt = abgeschlossene Ladeschritte / alle Schritte, abgelesen an den echten Statusmeldungen (#load-status),
// die main.ts und world.ts ohnehin setzen. Dazu: Schrittname, Schritt k von N, verstrichene Zeit. Keine Schätzung der Restzeit.
// Die CSS-Regeln (style.css, Block «P-B») setzen Balken und Läufer mit !important auf --ld-honest – loader.ts bleibt unverändert.

const STEPS: [RegExp, string][] = [
  [/^Lade (?!Gelände)/, 'Kartendaten'],
  [/^Lade Gelände/, 'Gelände'],
  [/^Karte wird gezeichnet/, 'Karte'],
  [/^Strassen/, 'Strassen'],
  [/^Häuser werden gebaut/, 'Häuser'],
  [/^Materialien/, 'Farben'],
  [/^Konturen/, 'Konturen'],
  [/^Wahrzeichen/, 'Wahrzeichen'],
  [/^Bäume/, 'Bäume'],
  [/^Wald/, 'Wald'],
  [/^Stege/, 'Stege und Laternen'],
  [/^Navi/, 'Navi'],
  [/^(Echte Häuser|Gelände wird verfeinert)/, 'Echte Häuser'],
];

let idx = -1, t0 = 0, tStep = 0, done = false, failed = false, timer = 0;

function fmt(s: number) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

function render() {
  const ld = document.getElementById('loader');
  if (!ld) return;
  ld.classList.add('honest');
  let el = document.getElementById('ld-step');
  if (!el) { el = document.createElement('p'); el.id = 'ld-step'; el.setAttribute('aria-live', 'polite'); ld.appendChild(el); }
  const now = performance.now() / 1000, N = STEPS.length;
  const frac = done ? 1 : Math.max(0, idx) / N; // nur abgeschlossene Schritte zählen
  ld.style.setProperty('--ld-honest', (frac * 100).toFixed(1) + '%');
  if (failed) { el.textContent = 'Laden hat nicht geklappt – Seite neu laden.'; return; }
  if (done) { el.textContent = `Fertig nach ${fmt(now - t0)}`; return; }
  const name = idx >= 0 ? STEPS[idx][1] : 'Start';
  const slow = idx >= 0 && now - tStep > 45 ? ' · dauert auf diesem Gerät länger, es läuft noch' : '';
  el.textContent = `Schritt ${Math.max(1, idx + 1)} von ${N}: ${name} · ${fmt(now - t0)}${slow}`;
}

function onStatus(txt: string) {
  if (done || failed) return;
  if (/^Fehler/.test(txt)) { failed = true; render(); return; }
  for (let i = 0; i < STEPS.length; i++) if (STEPS[i][0].test(txt)) { if (i > idx) { idx = i; tStep = performance.now() / 1000; } break; }
  render();
}

function finish() { if (done) return; done = true; render(); clearInterval(timer); }

export function setupLoadSteps() {
  const st = document.getElementById('load-status'), btn = document.getElementById('start-btn');
  if (!st || !btn) return;
  t0 = tStep = performance.now() / 1000;
  new MutationObserver(() => onStatus(st.textContent || '')).observe(st, { childList: true, characterData: true, subtree: true });
  // Fertig = Start-Knopf wird sichtbar (main.ts zeigt ihn erst, wenn alles geladen ist)
  new MutationObserver(() => { if (btn.style.display !== 'none') finish(); }).observe(btn, { attributes: true, attributeFilter: ['style'] });
  timer = window.setInterval(render, 1000);
  onStatus(st.textContent || '');
}
