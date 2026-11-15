// P-B Lauf 3: Sirene und kurze Effekt-Töne als Bausteine mit frei wählbarem Kontext (auch OfflineAudioContext → Pegeltest
// tests/par/amb.html). audio.ts baut damit die echte Sirene; Klang wie Lauf 1/2; Lauf 3 korrigiert die Tonhöhen (siehe restart) und die Einsätze.

/** Schweizer Wechselklanghorn (VTS Anhang 11 Ziff. 3, SR 741.41): zwei Töne im Verhältnis 3:4, Grundfrequenzen 360–630 Hz,
 *  Zyklus 2 hohe + 2 tiefe Töne in 2,5–3,5 s, Neubeginn mit dem hohen Ton bei jeder Betätigung.
 *  Hier 586,7 Hz (d'') / 440 Hz (a'), je 0,7 s → 2,8 s. Die konkreten Töne sind eine Annahme innerhalb der Vorschrift. */
export const SIREN_HI = 586.7, SIREN_LO = 440, SIREN_TONE = 0.7, SIREN_VOL = 0.11;

let sqWave: PeriodicWave | null = null, sqCtx: BaseAudioContext | null = null;
/** Rechteck ±1 als Fourier-Reihe (4/π · Σ sin(nωt)/n, ungerade n bis 31), ohne Normierung */
function squareWave(ctx: BaseAudioContext) {
  if (sqWave && sqCtx === ctx) return sqWave;
  const N = 32, re = new Float32Array(N), im = new Float32Array(N);
  for (let n = 1; n < N; n += 2) im[n] = 4 / (Math.PI * n);
  sqWave = ctx.createPeriodicWave(re, im, { disableNormalization: true }); sqCtx = ctx; return sqWave;
}

export function buildSiren(ctx: BaseAudioContext, out: AudioNode) {
  const MID = (SIREN_HI + SIREN_LO) / 2, DEV = (SIREN_HI - SIREN_LO) / 2;
  const gain = ctx.createGain(); gain.gain.value = 0;
  const saw = ctx.createOscillator(); saw.type = 'sawtooth'; saw.frequency.value = MID;
  const sq = ctx.createOscillator(); sq.type = 'square'; sq.frequency.value = MID;
  const sqG = ctx.createGain(); sqG.gain.value = 0.35;
  const fm = ctx.createGain(); fm.gain.value = DEV; fm.connect(saw.frequency); fm.connect(sq.frequency);
  const smooth = ctx.createBiquadFilter(); smooth.type = 'lowpass'; smooth.frequency.value = 28; smooth.connect(fm); // Gleitübergang statt Knacks
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = 0.8;
  saw.connect(lp); sq.connect(sqG); sqG.connect(lp); lp.connect(gain); gain.connect(out);
  saw.start(); sq.start();
  let lfo: OscillatorNode | null = null, on = false;
  const restart = () => {
    if (lfo) { try { lfo.stop(); lfo.disconnect(); } catch { /* schon gestoppt */ } }
    // Lauf 3: eigenes Rechteck ohne Normierung. Das eingebaute 'square' wird von WebAudio auf Spitze 1 normiert (inkl. Gibbs-Überschwinger),
    // das Plateau liegt dann nur bei ≈ 0,85 → gemessen 575/451 Hz, Verhältnis 1,276 (ausserhalb der Toleranz 4:3 −3 %). Jetzt Plateau ±1.
    lfo = ctx.createOscillator(); lfo.setPeriodicWave(squareWave(ctx)); lfo.frequency.value = 1 / (2 * SIREN_TONE); // startet positiv → hoch zuerst
    lfo.connect(smooth); lfo.start(ctx.currentTime);
  };
  restart();
  return {
    set(v: boolean) {
      if (v && !on) restart();
      on = v; gain.gain.setTargetAtTime(v ? SIREN_VOL : 0, ctx.currentTime, 0.15);
    },
    get on() { return on; },
  };
}

/** Kurzer Effekt-Ton. Lauf 3: 6 ms Einschwingen (bei sehr kurzen Tönen 10 % der Dauer) statt Sprung auf volle Lautstärke (vorher hörbares Klicken bei Rechteck/Sägezahn). */
export function blipTo(ctx: BaseAudioContext, out: AudioNode, freq: number, dur: number, type: OscillatorType = 'square', vol = 0.15, slide = 0, when = 0) {
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.006, dur * 0.1)); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.015); // Rest (−60 dB) sauber auf 0, bevor der Oszillator stoppt
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
}
