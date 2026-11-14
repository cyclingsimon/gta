// Alle Klänge werden live mit WebAudio erzeugt – keine Dateien, keine Netzaufrufe.
// Ausnahme 14z (Simon): Musik «Spitalradio LuZ» – nur wenn im Menü gewählt, dann Live-Stream vom offiziellen Server (radioluz.ch/empfang).
let ctx: AudioContext | null = null;
let master: GainNode, sfx: GainNode, music: GainNode;
let engineOsc: OscillatorNode | null = null, engineGain: GainNode;
let sirenOsc: OscillatorNode | null = null, sirenGain: GainNode, sirenLfo: OscillatorNode | null = null;
let muted = false;
let musicTimer: number | null = null;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new AudioContext();
  master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
  sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
  music = ctx.createGain(); music.gain.value = 0.18; music.connect(master);

  // Motor: zwei leicht verstimmte Sägezähne durch Tiefpass
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  engineGain = ctx.createGain(); engineGain.gain.value = 0;
  engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 50;
  const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 25;
  const g2 = ctx.createGain(); g2.gain.value = 0.3;
  engineOsc.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(engineGain); engineGain.connect(sfx);
  engineOsc.start(); o2.start();
  (engineOsc as any)._sub = o2;

  // Sirene: weich, zwei Töne (Tatü-tata), über einen Rechteck-LFO
  sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
  sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle'; sirenOsc.frequency.value = 520;
  sirenLfo = ctx.createOscillator(); sirenLfo.type = 'square'; sirenLfo.frequency.value = 0.75;
  const lfoG = ctx.createGain(); lfoG.gain.value = 95;
  sirenLfo.connect(lfoG); lfoG.connect(sirenOsc.frequency);
  const sLp = ctx.createBiquadFilter(); sLp.type = 'lowpass'; sLp.frequency.value = 1400;
  sirenOsc.connect(sLp); sLp.connect(sirenGain); sirenGain.connect(sfx);
  sirenOsc.start(); sirenLfo.start();

  startMusic();
}

export function setMuted(m: boolean) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.05);
  radioApply();
}
export function isMuted() { return muted; }
export function suspendAudio(s: boolean) { if (ctx) s ? ctx.suspend() : ctx.resume(); hidden = s; radioApply(); }

export function updateEngine(speed: number, throttle: number) {
  if (!ctx || !engineOsc) return;
  const f = 45 + Math.abs(speed) * 4.2 + throttle * 12;
  engineOsc.frequency.setTargetAtTime(f, ctx.currentTime, 0.08);
  (engineOsc as any)._sub.frequency.setTargetAtTime(f / 2, ctx.currentTime, 0.08);
  engineGain.gain.setTargetAtTime(0.07 + throttle * 0.06, ctx.currentTime, 0.1);
}

export function setSiren(on: boolean) {
  sirenOn = on; radioApply();
  if (!ctx) return;
  sirenGain.gain.setTargetAtTime(on ? 0.11 : 0, ctx.currentTime, 0.15);
}

function blip(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.15, slide = 0, when = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + 0.02);
}

export const sfxPlay = {
  horn() { blip(330, 0.35, 'square', 0.12); blip(415, 0.35, 'square', 0.08); },
  bump() { blip(140, 0.18, 'triangle', 0.2, -60); blip(600, 0.25, 'sine', 0.06, 500, 0.05); },
  splash() { blip(900, 0.35, 'sawtooth', 0.05, -700); blip(300, 0.3, 'sine', 0.08, -150, 0.05); },
  train() { blip(660, 0.5, 'square', 0.04, 0); blip(830, 0.5, 'square', 0.035, 0, 0.05); },
  toot() { blip(98, 1.4, 'sawtooth', 0.07, 0); blip(147, 1.4, 'triangle', 0.08, 0); },
  moo() { blip(150, 0.9, 'sawtooth', 0.08, -40); blip(110, 0.9, 'triangle', 0.1, -20, 0.05); },
  boing() { blip(160, 0.38, 'sine', 0.2, 520); blip(480, 0.28, 'triangle', 0.07, -260, 0.14); },
  star(i = 0) { blip(880 + i * 220, 0.18, 'square', 0.1, 0, i * 0.12); blip(1320 + i * 220, 0.22, 'sine', 0.08, 0, i * 0.12 + 0.05); },
  radio() { blip(1200, 0.08, 'square', 0.07); blip(1600, 0.08, 'square', 0.07, 0, 0.11); },
  click() { blip(700, 0.05, 'square', 0.05); },
  good() { [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.2, 'triangle', 0.12, 0, i * 0.09)); },
  pop() { blip(500, 0.12, 'sine', 0.12, 400); },
  reset() { blip(300, 0.2, 'sine', 0.12, 600); },
};

// Platzhalter-Musik: ruhige Arpeggio-Schleife, sehr leise. Wird ersetzt, falls Suno-Musik kommt.
let musicMode: 'free' | 'mission' = 'free';
export function setMusicMode(m: 'free' | 'mission') { musicMode = m; }
function startMusic() {
  if (!ctx) return;
  const scaleFree = [262, 330, 392, 440, 392, 330, 294, 392];
  const scaleMission = [294, 370, 440, 587, 440, 370, 330, 494];
  const bassFree = [131, 131, 110, 98];
  const bassMission = [147, 147, 123, 110];
  let step = 0;
  const tick = () => {
    if (!ctx) return;
    const mission = musicMode === 'mission';
    if (musicSrc !== 'spiel') { step++; musicTimer = window.setTimeout(tick, 260); return; }
    const sc = mission ? scaleMission : scaleFree;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = sc[step % sc.length];
    const g = ctx.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(music); o.start(t); o.stop(t + 0.4);
    if (step % 4 === 0) {
      const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = (mission ? bassMission : bassFree)[(step / 4) % 4];
      const bg = ctx.createGain(); bg.gain.setValueAtTime(0.5, t); bg.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      b.connect(bg); bg.connect(music); b.start(t); b.stop(t + 1.2);
    }
    step++;
    musicTimer = window.setTimeout(tick, mission ? 190 : 260);
  };
  if (musicTimer == null) tick();
}

// ---------------- Musikquelle: Spielmusik, Spitalradio LuZ oder aus ----------------
export type MusicSrc = 'spiel' | 'radio' | 'aus';
const RADIO_URL = 'https://s10.streamingcloud.online:13552/radioluz128.mp3'; // offiziell, 128 kbps (schont Daten)
let musicSrc: MusicSrc = 'spiel', radio: HTMLAudioElement | null = null, hidden = false, sirenOn = false, radioFail: ((m: string) => void) | null = null;
export function onRadioProblem(f: (m: string) => void) { radioFail = f; }
export function getMusicSrc() { return musicSrc; }
export function setMusicSrc(m: MusicSrc) {
  musicSrc = m;
  if (music && ctx) music.gain.setTargetAtTime(m === 'spiel' ? 0.18 : 0, ctx.currentTime, 0.1);
  radioApply();
}
function radioApply() {
  const want = musicSrc === 'radio' && !muted && !hidden && !!ctx;
  if (!want) { if (radio) { radio.pause(); radio.removeAttribute('src'); radio.load(); radio = null; } return; } // ganz trennen: kein Stream im Hintergrund
  if (!radio) {
    radio = new Audio(); radio.preload = 'none';
    radio.addEventListener('error', () => { if (musicSrc === 'radio' && radio) { setMusicSrc('spiel'); radioFail?.('Spitalradio LuZ ist gerade nicht erreichbar – Spielmusik läuft.'); } });
    radio.src = RADIO_URL;
    const me = radio; setTimeout(() => { if (radio === me && me.readyState < 2) { setMusicSrc('spiel'); radioFail?.('Spitalradio LuZ antwortet nicht – Spielmusik läuft. Im Menü erneut wählen.'); } }, 15000);
    radio.play().catch(() => { /* Browser wartet auf Tipp – nächster Tastendruck startet */ });
  }
  radio.volume = (sirenOn ? 0.18 : 0.45) * (1 - 0.85 * duck); // Sirene / Konzert übertönt das Radio etwas
}
export function radioKick() { if (radio && radio.paused) radio.play().catch(() => {}); }

// ---------------- 14z (Simon): Musik aus Gebäuden – Metalkonzert in der Schüür, Broadway im KKL ----------------
// Eigene Dateien (audio/), laufen in Schleife, nur in der Nähe hörbar; gedämpft wie «durch die Wand».
type Venue = { x: number; z: number; r: number; url: string; el?: HTMLAudioElement; g?: GainNode; lp?: BiquadFilterNode; near: number };
const venues: Venue[] = [];
export function setVenues(v: { x: number; z: number; r: number; url: string }[]) { venues.length = 0; for (const a of v) venues.push({ ...a, near: 0 }); (window as any).__venues = venues; }
/** 0..1, wie stark gerade eine Konzertmusik zu hören ist (Spielmusik/Radio werden dann leiser) */
export function updateVenues(x: number, z: number) {
  if (!ctx) return;
  let top = 0;
  for (const v of venues) {
    const d = Math.hypot(x - v.x, z - v.z);
    const k = d > v.r ? 0 : Math.min(1, ((v.r - d) / (v.r - 25)) ** 1.6); // ab 25 m voll, am Rand 0
    v.near = k; top = Math.max(top, k);
    if (k > 0 && !v.el) {
      const el = new Audio(v.url); el.loop = true; el.preload = 'auto';
      const src = ctx.createMediaElementSource(el);
      v.lp = ctx.createBiquadFilter(); v.lp.type = 'lowpass'; v.lp.frequency.value = 700;
      v.g = ctx.createGain(); v.g.gain.value = 0;
      src.connect(v.lp); v.lp.connect(v.g); v.g.connect(sfx);
      v.el = el; el.play().catch(() => {});
    }
    if (v.el && v.g && v.lp) {
      v.g.gain.setTargetAtTime(muted || hidden ? 0 : k * 0.9, ctx.currentTime, 0.15);
      v.lp.frequency.setTargetAtTime(500 + 2500 * k * k, ctx.currentTime, 0.2); // näher = heller
      if (k > 0 && v.el.paused && !hidden) v.el.play().catch(() => {});
      if (k === 0 && !v.el.paused && d > v.r + 80) v.el.pause();
    }
  }
  duck = top;
  if (music) music.gain.setTargetAtTime(musicSrc === 'spiel' ? 0.18 * (1 - top) : 0, ctx.currentTime, 0.2);
  if (radio) radio.volume = (sirenOn ? 0.18 : 0.45) * (1 - 0.85 * top);
}
let duck = 0;
