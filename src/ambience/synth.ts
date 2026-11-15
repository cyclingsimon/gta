// Geräuschkulisse: Klang-Bausteine, alle live per WebAudio erzeugt (keine Dateien, keine Netzaufrufe).
// Jede Funktion erzeugt kurzlebige Knoten, die sich nach dem Ausklingen selbst beenden.

let noiseBuf: AudioBuffer | null = null;
/** Lauf 3: 7,3 s weisses Rauschen (vorher 3 s – die Wiederholung war in gefiltertem Rauschen hörbar), Schleifenstelle per
 *  80-ms-Überblendung nahtlos: Anfang = Mischung aus Anfang und dem Stück direkt nach dem Ende → kein Sprung beim Zurückspringen. */
export const NOISE_SEC = 7.3;
export function noise(ctx: BaseAudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const sr = ctx.sampleRate, n = Math.floor(sr * NOISE_SEC), F = Math.floor(sr * 0.08), raw = new Float32Array(n + F);
  let s = 12345; for (let i = 0; i < n + F; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; raw[i] = (s / 0x3fffffff) - 1; }
  const b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = raw[i];
  for (let i = 0; i < F; i++) { const k = (i + 0.5) / F; d[i] = raw[i] * Math.sqrt(k) + raw[n + i] * Math.sqrt(1 - k); }
  noiseBuf = b; return b;
}

/** Endlose Rausch-Schleife → Filter → Gain (Gain startet bei 0) */
export function noiseBed(ctx: AudioContext, out: AudioNode, filters: { type: BiquadFilterType; f: number; q?: number }[], startAt = 0) {
  const src = ctx.createBufferSource(); src.buffer = noise(ctx); src.loop = true; src.loopStart = 0; src.loopEnd = src.buffer.duration;
  let last: AudioNode = src;
  const fl: BiquadFilterNode[] = [];
  for (const f of filters) { const b = ctx.createBiquadFilter(); b.type = f.type; b.frequency.value = f.f; if (f.q != null) b.Q.value = f.q; last.connect(b); last = b; fl.push(b); }
  const g = ctx.createGain(); g.gain.value = 0; last.connect(g); g.connect(out);
  src.start(ctx.currentTime, startAt % NOISE_SEC);
  return { src, g, fl };
}

/** Langsames Schwanken eines Parameters (z. B. Wellen, Wind) */
export function lfo(ctx: AudioContext, target: AudioParam, hz: number, depth: number, type: OscillatorType = 'sine') {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz;
  const g = ctx.createGain(); g.gain.value = depth; o.connect(g); g.connect(target); o.start();
  return o;
}

function pan(ctx: AudioContext, out: AudioNode, p: number): AudioNode {
  if (!ctx.createStereoPanner) return out;
  const s = ctx.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p)); s.connect(out); return s;
}
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Vorbeifahrendes Auto in der Ferne: gefiltertes Rauschen schwillt an und ab, wandert von links nach rechts */
export function carPass(ctx: AudioContext, out: AudioNode, vol: number) {
  const t = ctx.currentTime, dur = rnd(2.2, 4);
  const src = ctx.createBufferSource(); src.buffer = noise(ctx); src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(rnd(380, 520), t); bp.frequency.linearRampToValueAtTime(rnd(650, 900), t + dur * 0.5); bp.frequency.linearRampToValueAtTime(rnd(320, 450), t + dur); // leichter Doppler
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let p: StereoPannerNode | null = null;
  if (ctx.createStereoPanner) { p = ctx.createStereoPanner(); const d = Math.random() < 0.5 ? -1 : 1; p.pan.setValueAtTime(-0.8 * d, t); p.pan.linearRampToValueAtTime(0.8 * d, t + dur); p.connect(out); }
  src.connect(bp); bp.connect(g); g.connect(p || out);
  src.start(t, rnd(0, NOISE_SEC - 0.5)); src.stop(t + dur + 0.05);
}

/** Möwe: 2–4 «kiää»-Rufe, Sägezahn durch Bandpass, Tonhöhe fällt */
export function gull(ctx: AudioContext, out: AudioNode, vol: number) {
  const o = pan(ctx, out, rnd(-0.8, 0.8)), n = 2 + Math.floor(Math.random() * 3), f0 = rnd(1250, 1650);
  for (let i = 0; i < n; i++) {
    const t = ctx.currentTime + i * rnd(0.28, 0.4), d = rnd(0.18, 0.3);
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0 * 1.15, t); osc.frequency.linearRampToValueAtTime(f0, t + d * 0.25); osc.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + d);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f0 * 1.3; bp.Q.value = 2.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(bp); bp.connect(g); g.connect(o); osc.start(t); osc.stop(t + d + 0.03);
  }
}

/** Singvogel: kurze, schnelle Pfeiftöne (Meise/Fink-artig) oder eine kleine Amsel-Melodie */
export function bird(ctx: AudioContext, out: AudioNode, vol: number) {
  const o = pan(ctx, out, rnd(-0.9, 0.9)), amsel = Math.random() < 0.35;
  const n = amsel ? 4 + Math.floor(Math.random() * 4) : 3 + Math.floor(Math.random() * 5);
  let t = ctx.currentTime;
  const base = amsel ? rnd(1500, 2300) : rnd(3200, 4600);
  for (let i = 0; i < n; i++) {
    const d = amsel ? rnd(0.12, 0.26) : rnd(0.05, 0.1);
    const f = amsel ? base * [1, 1.25, 1.12, 1.5, 0.9, 1.33, 1.06][i % 7] : base * (i % 2 ? 0.82 : 1);
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(f, t); osc.frequency.exponentialRampToValueAtTime(f * (amsel ? rnd(0.9, 1.15) : rnd(1.15, 1.4)), t + d);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(vol * 0.003, t + d); g.gain.linearRampToValueAtTime(0, t + d + 0.015);
    osc.connect(g); g.connect(o); osc.start(t); osc.stop(t + d + 0.02);
    t += d + (amsel ? rnd(0.04, 0.12) : rnd(0.03, 0.07));
  }
}

/** Metallischer Schlag mit unharmonischen Teiltönen (Kuhglocke, Glocke, Gong) */
function strike(ctx: AudioContext, out: AudioNode, when: number, f: number, partials: [number, number, number][], vol: number) {
  // partials: [Verhältnis, relative Lautstärke, Abklingzeit s]
  for (const [r, a, dec] of partials) {
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f * r;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vol * a, when + 0.006); g.gain.exponentialRampToValueAtTime(vol * a * 0.001, when + dec); g.gain.linearRampToValueAtTime(0, when + dec + 0.04); // Lauf 3: linearer Anschlag, Ende sauber auf 0
    osc.connect(g); g.connect(out); osc.start(when); osc.stop(when + dec + 0.05);
  }
}

/** Kuhglocke (Treichel-artig, blechern): 1–4 unregelmässige Schläge, wie beim Grasen */
export function cowbell(ctx: AudioContext, out: AudioNode, vol: number) {
  const o = pan(ctx, out, rnd(-0.9, 0.9)), f = rnd(420, 720), n = 1 + Math.floor(Math.random() * 4);
  let t = ctx.currentTime;
  for (let i = 0; i < n; i++) {
    strike(ctx, o, t, f, [[1, 1, 0.7], [1.47, 0.6, 0.5], [2.09, 0.45, 0.35], [2.94, 0.3, 0.22], [4.2, 0.15, 0.12]], vol * rnd(0.6, 1));
    t += rnd(0.22, 0.6);
  }
}

/** Kirchenglocke: Teiltöne einer Kirchenglocke (Unterton, Prim, Moll-Terz, Quint, Oktave), langes Ausklingen */
export function churchBell(ctx: AudioContext, out: AudioNode, when: number, f: number, vol: number) {
  strike(ctx, out, when, f, [[0.5, 0.7, 7], [1, 1, 5.5], [1.19, 0.55, 3.5], [1.5, 0.35, 2.8], [2, 0.45, 2.4], [2.52, 0.2, 1.4], [3, 0.12, 1]], vol);
}

/** Bahnhof-Gong der SBB, Deutschschweiz: drei «dun» tief–hoch–mittel, Es – B – Akkord (B/Ges/Es).
 *  Quelle: Klavier-Analyse in https://www.galaxus.ch/en/page/how-the-sbb-jingle-represents-switzerland-36939 (inoffiziell, SBB bestätigt nicht).
 *  Lage (Es4 = 311 Hz) ist eine Annahme; Klang weich wie ein Glockenspiel. */
export function stationGong(ctx: AudioContext, out: AudioNode, vol: number) {
  const t = ctx.currentTime, P: [number, number, number][] = [[1, 1, 1.6], [2, 0.22, 0.9], [3, 0.06, 0.5]];
  strike(ctx, out, t, 311.13, P, vol);
  strike(ctx, out, t + 0.5, 466.16, P, vol);
  for (const f of [311.13, 369.99, 466.16]) strike(ctx, out, t + 1.0, f, P, vol * 0.6);
}

/** Zug fährt ein/vorbei: tiefes Rollen, Schienenstösse (ta-tam … ta-tam), leises Bremsquietschen */
export function trainPass(ctx: AudioContext, out: AudioNode, vol: number, braking: boolean) {
  const t = ctx.currentTime, dur = rnd(7, 10);
  const src = ctx.createBufferSource(); src.buffer = noise(ctx); src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(lp); lp.connect(g); g.connect(out); src.start(t); src.stop(t + dur + 0.1);
  // Schienenstösse: Paare kurzer, dumpfer Schläge, werden beim Bremsen langsamer
  let k = t + 0.6, gap = braking ? 0.55 : 0.45;
  while (k < t + dur - 0.8) {
    const env = Math.sin(Math.PI * (k - t) / dur);
    for (const dk of [0, 0.11]) {
      const s = ctx.createBufferSource(); s.buffer = noise(ctx);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 180; bp.Q.value = 1.5;
      const sg = ctx.createGain(); sg.gain.setValueAtTime(0, k + dk); sg.gain.linearRampToValueAtTime(vol * 1.6 * env + 0.0001, k + dk + 0.008); sg.gain.exponentialRampToValueAtTime(0.0001, k + dk + 0.07); sg.gain.linearRampToValueAtTime(0, k + dk + 0.09); // Lauf 3: 8 ms Einsatz statt Sprung
      s.connect(bp); bp.connect(sg); sg.connect(out); s.start(k + dk, rnd(0, NOISE_SEC - 0.5)); s.stop(k + dk + 0.1);
    }
    k += gap; if (braking) gap *= 1.06;
  }
  if (braking) { // Bremsquietschen gegen Ende, sehr leise
    const q = ctx.createOscillator(); q.type = 'triangle'; const tq = t + dur * 0.65;
    q.frequency.setValueAtTime(2900, tq); q.frequency.linearRampToValueAtTime(2600, t + dur * 0.92);
    const qg = ctx.createGain(); qg.gain.setValueAtTime(0.0001, tq); qg.gain.exponentialRampToValueAtTime(vol * 0.18, tq + 0.6); qg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.92);
    q.connect(qg); qg.connect(out); q.start(tq); q.stop(t + dur);
  }
}

/** Lauf 3 – Trolleybus der VBL (Luzern fährt viele Linien elektrisch mit Fahrleitung, https://en.wikipedia.org/wiki/Trolleybuses_in_Lucerne):
 *  leises Singen des Fahrmotors, das beim Anfahren steigt, dazu Abrollen der Reifen. Tonhöhen sind eine Annahme (Vertrauen gering). */
export function trolleybus(ctx: AudioContext, out: AudioNode, vol: number) {
  const t = ctx.currentTime, dur = rnd(5, 7.5), f0 = rnd(180, 240), up = Math.random() < 0.6; // meist Anfahren (Haltestelle), sonst Vorbeifahrt
  let p: StereoPannerNode | null = null;
  if (ctx.createStereoPanner) { p = ctx.createStereoPanner(); const d = Math.random() < 0.5 ? -1 : 1; p.pan.setValueAtTime(-0.7 * d, t); p.pan.linearRampToValueAtTime(0.7 * d, t + dur); p.connect(out); }
  const o = p || out;
  const env = ctx.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(vol, t + dur * 0.45); env.gain.exponentialRampToValueAtTime(0.0001, t + dur); env.connect(o);
  for (const [m, a] of [[1, 1], [2, 0.35], [3.02, 0.12]] as const) { // Motorsingen: Grundton + Obertöne
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(f0 * m * (up ? 1 : 2.4), t); osc.frequency.linearRampToValueAtTime(f0 * m * (up ? 3.2 : 2.6), t + dur);
    const g = ctx.createGain(); g.gain.value = 0.22 * a; osc.connect(g); g.connect(env); osc.start(t); osc.stop(t + dur + 0.05);
  }
  const src = ctx.createBufferSource(); src.buffer = noise(ctx); src.loop = true; // Reifen
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.7;
  const ng = ctx.createGain(); ng.gain.value = 0.9; src.connect(bp); bp.connect(ng); ng.connect(env);
  src.start(t, rnd(0, NOISE_SEC - 0.5)); src.stop(t + dur + 0.05);
}

/** Lauf 3 – Schiffshorn eines Kursschiffs auf dem Vierwaldstättersee (SGV, Dampf- und Motorschiffe, https://www.lakelucerne.ch/):
 *  ein langer, tiefer Ton aus der Ferne, gelegentlich zweimal. Tonhöhe/Länge sind eine Annahme (Vertrauen gering). */
export function shipHorn(ctx: AudioContext, out: AudioNode, vol: number) {
  const n = Math.random() < 0.35 ? 2 : 1, f = rnd(150, 185), o = pan(ctx, out, rnd(-0.6, 0.6));
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(o); // weit weg → dumpf
  for (let i = 0; i < n; i++) {
    const t = ctx.currentTime + i * 3.2, d = i ? 1.4 : rnd(2.2, 3);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.25); g.gain.setValueAtTime(vol, t + d - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + d); g.connect(lp);
    for (const [m, a] of [[1, 1], [1.5, 0.5], [2, 0.3], [3, 0.12]] as const) { // leicht hohler Akkord wie eine Dampfpfeife
      const osc = ctx.createOscillator(); osc.type = m === 1 ? 'triangle' : 'sine'; osc.frequency.setValueAtTime(f * m * 0.97, t); osc.frequency.linearRampToValueAtTime(f * m, t + 0.3);
      const og = ctx.createGain(); og.gain.value = a * 0.5; osc.connect(og); og.connect(g); osc.start(t); osc.stop(t + d + 0.05);
    }
  }
}

/** Künstliche Raumantwort für den Tunnelhall: abklingendes Rauschen, Stereo, ~2 s */
export function tunnelImpulse(ctx: BaseAudioContext, sec = 2.2): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) { const x = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, 3.2) * (i < 40 ? i / 40 : 1); }
    // Frühe Reflexionen der Röhrenwände (alle ~25 ms)
    for (let e = 1; e < 8; e++) { const j = Math.floor(ctx.sampleRate * 0.025 * e); if (j < n) d[j] += 0.5 / e * (c ? -1 : 1); }
  }
  return b;
}
