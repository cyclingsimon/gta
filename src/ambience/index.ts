// Geräuschkulisse nach Ort (P-B, Lauf 1): Stadtverkehr, Seeufer/Möwen, Wald/Vögel, Kuhglocken, Bahnhof (Gong + Zug),
// Glocken der Hofkirche zur vollen Stunde, Tunnelhall. Alles synthetisch (WebAudio), leise, duckt unter Musik.
// Ton aus (Master = 0) wirkt automatisch, weil alles am Master hängt; zusätzlich werden dann keine Ereignisse erzeugt.
//
// Einbindung: src/audio.ts ruft initAmbience() in initAudio() und updateAmbience() in updateVenues() auf (läuft also ohne
// Änderung in main.ts). Für echte Orte (Wasser, Häuser, Wald, Tunnel aus der Welt) ruft main.ts einmal bindAmbience(...) auf –
// ohne diesen Aufruf gilt ein Ersatz aus festen Orten (zones.ts).
import { noiseBed, lfo, carPass, gull, bird, cowbell, churchBell, stationGong, trainPass, tunnelImpulse, trolleybus, shipHorn } from './synth';
import { HOFKIRCHE, STATIONS, townWeight, shoreWeight } from './zones';

/** EIN Regler für die ganze Geräuschkulisse (0 = aus, 1 = Stand Lauf 2). Lieber zu leise als Lärm: im Zweifel senken. */
export const AMB_GAIN = 1.4; // Lauf 4: +6 dB (0,7 → 1,4) nach Pegeltest amb_offline.py – Kulisse lag 20–30 dB unter Motor/Sirene

/** Abfragen aus der Spielwelt (alle optional). mask: 0 frei, 1 Wasser, 2 Gebäude, 3 ausserhalb (wie World.mask.at) */
export interface AmbienceProbe {
  mask?: (x: number, z: number) => number;
  forest?: (x: number, z: number) => boolean;
  tunnel?: (x: number, z: number) => boolean;
}
export interface AmbienceMix { music: number; venue: number; siren: boolean; muted: boolean; hidden: boolean }

type Layer = 'stadt' | 'see' | 'wald' | 'land' | 'bahnhof' | 'tunnel';
const LAYERS: Layer[] = ['stadt', 'see', 'wald', 'land', 'bahnhof', 'tunnel'];

let ctx: AudioContext | null = null, bus: GainNode, probe: AmbienceProbe = {};
let beds: Record<'stadt' | 'see' | 'wald' | 'tunnel', GainNode>;
let wet: GainNode, conv: ConvolverNode | null = null, sfxIn: AudioNode | null = null, wetOn = false;
const w: Record<Layer, number> = { stadt: 0, see: 0, wald: 0, land: 0, bahnhof: 0, tunnel: 0 };
const next: Record<string, number> = { car: 3, gull: 5, bird: 2, cow: 3, gong: 20, train: 35, trolley: 12, ship: 40 };
let tSample = -1, lastHour = -1, nearStation = '', forced: Layer | null = null, events: Record<string, number> = {};
let saved: AmbienceProbe | null = null;
let lastX = 0, lastZ = 0, mix: AmbienceMix = { music: 0, venue: 0, siren: false, muted: false, hidden: false };

/** Lautstärken je Schicht (relativ; vor AMB_GAIN und Master 0.6). Lauf 2: konservativ – Stadtverkehr deutlich leiser und seltener. */
export const VOL = { bus: 0.5, stadt: 0.045, see: 0.07, wald: 0, /* 18a: Wald-Rauschen entfernt (Rückmeldung Simon), Vögel bleiben */ tunnel: 0.12, car: 0.022, gull: 0.025, bird: 0.018, cow: 0.022, gong: 0.035, train: 0.05, bell: 0.05, trolley: 0.02, ship: 0.03 };

export function initAmbience(c: AudioContext, master: AudioNode, sfx: AudioNode) {
  if (ctx) return; ctx = c;
  bus = c.createGain(); bus.gain.value = 0; bus.connect(master);
  const stadt = noiseBed(c, bus, [{ type: 'lowpass', f: 340 }, { type: 'highpass', f: 45 }]);
  const see = noiseBed(c, bus, [{ type: 'bandpass', f: 620, q: 0.6 }, { type: 'lowpass', f: 1600 }], 0.7);
  // 18a: Wald-Rauschen klang wie Störgeräusch (Simon) → Rauschbett stumm und nicht gestartet (Vögel bleiben)
  const wald = { g: c.createGain() }; wald.g.gain.value = 0;
  const tun = noiseBed(c, bus, [{ type: 'lowpass', f: 110 }, { type: 'lowpass', f: 160 }], 2.1);
  // Wellen: Bandpass-Mitte und Lautstärke schwanken langsam; Wind im Laub ebenso
  const seeMod = c.createGain(); seeMod.gain.value = 1; see.fl[1].disconnect(); see.fl[1].connect(seeMod); seeMod.connect(see.g);
  lfo(c, seeMod.gain, 0.16, 0.45); lfo(c, see.fl[0].frequency, 0.11, 140);
  beds = { stadt: stadt.g, see: see.g, wald: wald.g, tunnel: tun.g };
  // Tunnelhall: Effekte (Motor, Sirene, Hupe) zusätzlich über eine Raumantwort – nur verbunden, solange man im Tunnel ist (spart Rechenzeit)
  wet = c.createGain(); wet.gain.value = 0; wet.connect(master); sfxIn = sfx;
  // Pause/Menü: Hauptschleife ruft updateAmbience dann nicht auf → Lautstärke separat nachführen (2× pro Sekunde, billig)
  window.setInterval(() => { if (ctx && ctx.state === 'running') bus.gain.setTargetAtTime(busTarget(), ctx.currentTime, 0.4); }, 500);
  (window as any).__amb = { state: ambienceState, force: (l: Layer | null) => { forced = l; tSample = -1; }, chime: (n?: number) => ringHour(n ?? 3, 0), gong: () => fire('gong'), fire: (k: string) => fire(k),
    bind: (p: AmbienceProbe) => { saved = saved || probe; bindAmbience(p); }, unbind: () => { if (saved) bindAmbience(saved); saved = null; } };
}

/** Weltabfragen setzen (main.ts, einmal nach dem Laden; die Funktionen lesen die jeweils aktuelle Welt) */
export function bindAmbience(p: AmbienceProbe) { probe = p; tSample = -1; }

function clamp01(v: number) { return v < 0 ? 0 : v > 1 ? 1 : v; }

/** Gewichte 0..1 je Schicht für den Ort (x, z) */
function sample(x: number, z: number) {
  if (forced) { for (const l of LAYERS) w[l] = l === forced ? 1 : 0; return; }
  const inTun = !!probe.tunnel?.(x, z);
  let water = 0, house = 0, forest = 0, n = 0;
  if (probe.mask) {
    const m = probe.mask;
    for (const r of [0, 30, 75, 140]) {
      const k = r === 0 ? 1 : 12;
      for (let i = 0; i < k; i++) {
        const a = i / k * Math.PI * 2 + r * 0.01, sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r;
        const v = m(sx, sz); n++;
        if (v === 1) water++; else if (v === 2) house++;
        if (probe.forest?.(sx, sz)) forest++;
      }
    }
    water /= n; house /= n; forest /= n;
    w.see = clamp01(water * 3.2);
    w.stadt = clamp01(house * 3.5);
    w.wald = clamp01(forest * 1.8 - w.stadt * 0.5);
  } else {
    w.stadt = townWeight(x, z); w.see = shoreWeight(x, z); w.wald = 0;
  }
  w.land = clamp01(1 - w.stadt * 1.6 - w.wald * 0.9 - w.see * 1.2) * (probe.mask ? clamp01(1 - house * 8) : 1);
  let st = 0; nearStation = '';
  for (const s of STATIONS) { const d = Math.hypot(x - s.x, z - s.z); if (d < s.r) { const k = clamp01((s.r - d) / (s.r * 0.6)); if (k > st) { st = k; nearStation = s.name; } } }
  w.bahnhof = st;
  w.tunnel = inTun ? 1 : 0;
  if (inTun) { w.stadt *= 0.1; w.see = 0; w.wald = 0; w.land = 0; w.bahnhof = 0; }
}

/** Musik/Radio/Konzert/Sirene → Kulisse leiser; Pause → noch leiser */
function busTarget() {
  if (mix.muted || mix.hidden) return 0;
  const paused = document.body.classList.contains('paused') || !!document.querySelector('#pause.show');
  return AMB_GAIN * VOL.bus * (1 - 0.45 * mix.music) * (1 - 0.85 * mix.venue) * (mix.siren ? 0.6 : 1) * (paused ? 0.35 : 1);
}

/** Pro Bild aufrufen (über audio.ts/updateVenues). mix: Musiklautstärke 0..1, Konzertnähe 0..1, Sirene, Ton aus, Tab verborgen */
export function updateAmbience(x: number, z: number, m: AmbienceMix) {
  if (!ctx) return;
  const t = ctx.currentTime, jump = Math.hypot(x - lastX, z - lastZ) > 200; // Schnellreise/Zurücksetzen → sofort neu
  mix = m; lastX = x; lastZ = z;
  if (t - tSample > 0.4 || tSample < 0 || jump) { tSample = t; sample(x, z); applyGains(t); }
  bus.gain.setTargetAtTime(busTarget(), t, 0.4);
  if (mix.muted || mix.hidden) return; // keine Ereignisse, wenn man nichts hört
  // Ereignisse (Abstände in Sekunden, dichter je stärker die Schicht)
  if (w.stadt > 0.3 && t > next.car) { fire('car'); next.car = t + (7 + Math.random() * 10) / (0.5 + w.stadt); } // Lauf 2: ausgedünnt (~1 Auto / 5–11 s im Zentrum)
  if (w.see > 0.2 && t > next.gull) { fire('gull'); next.gull = t + 6 + Math.random() * 12; }
  if (w.wald > 0.2 && t > next.bird) { fire('bird'); next.bird = t + (1.5 + Math.random() * 4) / (0.5 + w.wald) * (nightish() ? 4 : 1); }
  if (w.land > 0.35 && t > next.cow) { fire('cow'); next.cow = t + (2.5 + Math.random() * 6) / (0.4 + w.land) * (nightish() ? 2.5 : 1); }
  if (w.stadt > 0.5 && t > next.trolley) { fire('trolley'); next.trolley = t + 20 + Math.random() * 25; } // Lauf 3: VBL-Trolleybus
  if (w.see > 0.4 && t > next.ship) { fire('ship'); next.ship = t + 120 + Math.random() * 180; } // Lauf 3: Kursschiff, selten
  if (w.bahnhof > 0.2 && t > next.gong) { fire('gong'); next.gong = t + 50 + Math.random() * 50; }
  if (w.bahnhof > 0.15 && t > next.train) { fire('train'); next.train = t + 30 + Math.random() * 45; }
  // Hofkirche: zur vollen Stunde (echte Uhrzeit des Geräts, Annahme) – Stundenschläge 1–12
  const now = new Date();
  if (now.getMinutes() === 0 && now.getSeconds() < 40 && lastHour !== now.getHours()) {
    lastHour = now.getHours();
    const d = Math.hypot(x - HOFKIRCHE.x, z - HOFKIRCHE.z);
    if (d < HOFKIRCHE.r && w.tunnel < 0.5) ringHour(now.getHours() % 12 || 12, d);
  }
}

function nightish() { const h = new Date().getHours(); return h < 6 || h >= 21; }

function applyGains(t: number) {
  beds.stadt.gain.setTargetAtTime(VOL.stadt * w.stadt, t, 1.2);
  beds.see.gain.setTargetAtTime(VOL.see * w.see, t, 1.2);
  beds.wald.gain.setTargetAtTime(VOL.wald * w.wald, t, 1.5);
  beds.tunnel.gain.setTargetAtTime(VOL.tunnel * w.tunnel, t, 0.35);
  // Hall an-/abkoppeln
  if (w.tunnel > 0 && !wetOn && sfxIn && ctx) {
    if (!conv) { conv = ctx.createConvolver(); conv.buffer = tunnelImpulse(ctx); conv.connect(wet); }
    sfxIn.connect(conv); wetOn = true;
  }
  wet.gain.setTargetAtTime(w.tunnel > 0 && !mix.muted ? 0.55 : 0, t, 0.3);
  if (w.tunnel === 0 && wetOn && sfxIn && conv) {
    const c = conv, s = sfxIn; wetOn = false;
    setTimeout(() => { if (!wetOn) { try { s.disconnect(c); } catch { /* schon getrennt */ } } }, 2500);
  }
}

function fire(kind: string) {
  if (!ctx) return;
  events[kind] = (events[kind] || 0) + 1;
  const k = (l: number) => 0.35 + 0.65 * l;
  switch (kind) {
    case 'car': carPass(ctx, bus, VOL.car * k(w.stadt)); break;
    case 'gull': gull(ctx, bus, VOL.gull * k(w.see)); break;
    case 'bird': bird(ctx, bus, VOL.bird * k(w.wald)); break;
    case 'cow': cowbell(ctx, bus, VOL.cow * k(w.land)); break;
    case 'gong': stationGong(ctx, bus, VOL.gong * k(w.bahnhof)); break;
    case 'trolley': trolleybus(ctx, bus, VOL.trolley * k(w.stadt)); break;
    case 'ship': shipHorn(ctx, bus, VOL.ship * k(w.see)); break;
    case 'train': trainPass(ctx, bus, VOL.train * k(w.bahnhof), Math.random() < 0.6); break;
  }
}

/** Stundenschläge der Hofkirche (n Schläge, d = Entfernung in m → leiser und dumpfer) */
const HOUR_BELL = 261.6; // c1 (deutsche Glockennotation: c1 = 261,6 Hz)
function ringHour(n: number, d: number) {
  if (!ctx) return;
  events.bell = (events.bell || 0) + n;
  const t = ctx.currentTime + 0.2, near = clamp01(1 - d / HOFKIRCHE.r);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900 + 3000 * near; lp.connect(bus);
  const v = VOL.bell * (0.3 + 0.7 * near);
  // Geläut (Wikipedia «St. Leodegar im Hof»): 8 Glocken g0 a0 h0 c1 cis1 dis1 f1 g1. Die Stunden schlug früher die Theodulglocke (g0),
  // heute «nur noch einige der kleineren Glocken» (Luzerner Zeitung). Welche genau: unbekannt → Annahme c1 (Festglocke, 261,6 Hz).
  for (let i = 0; i < n; i++) churchBell(ctx, lp, t + i * 2.4, HOUR_BELL, v);
  setTimeout(() => lp.disconnect(), (n * 2.4 + 8) * 1000);
}

/** Für Tests (window.__amb.state()) und die Leistungsanzeige */
export function ambienceState() {
  const r = (v: number) => Math.round(v * 100) / 100;
  return {
    pos: [Math.round(lastX), Math.round(lastZ)], probe: Object.keys(probe), forced,
    w: Object.fromEntries(LAYERS.map((l) => [l, r(w[l])])), bus: ctx ? r(bus.gain.value) : 0, busTarget: r(busTarget()),
    beds: ctx ? Object.fromEntries(Object.entries(beds).map(([k, g]) => [k, Math.round(g.gain.value * 1000) / 1000])) : {},
    wet: ctx ? r(wet.gain.value) : 0, reverb: wetOn, station: nearStation, events: { ...events }, mix,
  };
}
