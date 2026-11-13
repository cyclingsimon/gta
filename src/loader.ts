// Lustiger Ladebildschirm: Luksi rennt über den Ladebalken, dazwischen Gags mit Luksi-Posen (Bilder aus Luksis Haus, lokal mitgeliefert).
const IMG = 'img/luksi/';
const GAGS: [string, string][] = [
  ['lp8-jongliert', 'Luksi jongliert mit Verbandsrollen …'],
  ['lp7-fernglas', 'Luksi sucht den Pilatus … ah, da ist er!'],
  ['lp4-popcorn', 'Die Schwäne holen schon Popcorn …'],
  ['lp11-denkt', 'Wo war nochmal der Autoschlüssel?'],
  ['lp12-glace', 'Kurze Glace-Pause am Quai …'],
  ['lp10-schreck', 'Huch! Die Sirene war ein bisschen laut.'],
  ['lp9-rutscht', 'Die Kapellbrücke wird Brett für Brett gezählt …'],
  ['lp11-lachanfall', 'Der Bus Nr. 1 hat einen Witz erzählt.'],
  ['lp15-kickt', 'Ampeln üben: Rot – Gelb – Grün …'],
  ['lp3-gaehnt', 'Die Häuser in Kriens werden noch geweckt …'],
  ['lp2-winkt', 'Luksi winkt den Kindern im Kinderspital.'],
  ['lp14-freut', 'Blaulicht wird poliert – blitzblank!'],
  ['lp8-verbeugt', 'Der Vierwaldstättersee wird aufgefüllt …'],
  ['lp11-lachanfall', 'Die Kühe üben ihr schönstes «Muuuh» …'],
  ['lp7-fernglas', 'Luksi zählt die Schwäne auf der Reuss …'],
  ['lp14-freut', 'Der Zug pfeift schon: Tschu-tschu!'],
  ['lp2-winkt', '40 Luksi-Herzen werden versteckt – findest du alle?'],
  ['lp15-kickt', 'Leitkegel werden aufgestellt. Boing!'],
  ['lp3-daumen', 'Fahndungslevel: 0 Sterne – du bist einfach zu nett!'],
  ['lp4-popcorn', 'Nice City putzt sich heraus …'],
  ['lp14-freut', 'Tatü-Tata wird gestimmt: Tatüüü – Tataaa!'],
];
let el: HTMLDivElement | null = null, runner: HTMLImageElement, gagImg: HTMLImageElement, gagTxt: HTMLDivElement, bar: HTMLDivElement;
let shown = 0, target = 0, frame = 0, gagI = 0, timer = 0, raf = 0, done = false;

function shuffle<T>(a: T[]) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export function setupLoader(host: HTMLElement) {
  shuffle(GAGS);
  el = document.createElement('div'); el.id = 'loader';
  el.innerHTML = `<div class="ld-gag"><img alt=""><div class="ld-bubble"></div></div>
    <div class="ld-track"><div class="ld-fill"></div><img class="ld-runner" alt="Luksi rennt"><div class="ld-flag">🏥</div></div>`;
  host.prepend(el);
  gagImg = el.querySelector('.ld-gag img')!; gagTxt = el.querySelector('.ld-bubble')!;
  bar = el.querySelector('.ld-fill')!; runner = el.querySelector('.ld-runner')!;
  // Bilder vorladen
  for (const n of ['lp5-rennt-1', 'lp5-rennt-2', 'lp3-daumen', ...GAGS.map((g) => g[0])]) { const i = new Image(); i.src = IMG + n + '.webp'; }
  showGag();
  timer = window.setInterval(() => { if (!done) { gagI++; showGag(); } }, 2600);
  // Antippen von Luksi → nächster Gag
  gagImg.onclick = () => { if (!done) { gagI++; showGag(); } };
  const tick = () => {
    // Balken nähert sich dem Ziel, kriecht aber auch langsam weiter, damit es nie «hängt»
    const cap = done ? 1 : Math.min(0.97, target + 0.12);
    shown += ((done ? 1 : Math.max(target, Math.min(cap, shown + 0.0004))) - shown) * 0.08;
    bar.style.width = (shown * 100).toFixed(1) + '%';
    runner.style.left = `calc(${(shown * 100).toFixed(1)}% - 34px)`;
    if (!done) { frame++; if (frame % 9 === 0) runner.src = IMG + (frame % 18 === 0 ? 'lp5-rennt-1' : 'lp5-rennt-2') + '.webp'; }
    if (!done || shown < 0.995) raf = requestAnimationFrame(tick);
  };
  runner.src = IMG + 'lp5-rennt-1.webp';
  raf = requestAnimationFrame(tick);
}

function showGag() {
  const [n, t] = GAGS[gagI % GAGS.length];
  gagImg.classList.remove('pop'); void gagImg.offsetWidth; gagImg.classList.add('pop');
  gagImg.src = IMG + n + '.webp'; gagTxt.textContent = t;
}

/** Fortschritt 0..1 */
export function loaderProgress(f: number) { target = Math.max(target, f); }

export function loaderDone() {
  if (!el) return; done = true; clearInterval(timer); target = 1;
  gagImg.classList.remove('pop'); void gagImg.offsetWidth; gagImg.classList.add('pop');
  gagImg.src = IMG + 'lp3-daumen.webp'; gagTxt.textContent = 'Bereit! Einsteigen und los!';
  runner.src = IMG + 'lp14-freut.webp';
  const e = el; setTimeout(() => e.classList.add('fin'), 900);
  void raf;
}
