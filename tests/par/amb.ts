// P-B Lauf 3: Pegeltest der Geräuschkulisse per OfflineAudioContext (rechnet den Ton, ohne Lautsprecher).
// Misst je Baustein und für eine 72-s-Mischung: Spitzenpegel (dBFS), RMS, Klick-Verdacht (Sprünge von Abtastwert zu Abtastwert,
// die deutlich aus der Umgebung herausstechen). Ergebnis: window.__ambResult (JSON). Läuft über tests/par/amb_offline.py.
import { carPass, gull, bird, cowbell, churchBell, stationGong, trainPass, trolleybus, shipHorn } from '../../src/ambience/synth';
import { buildSiren, blipTo } from '../../src/ambience/horn';
import { initAmbience, updateAmbience, VOL, AMB_GAIN } from '../../src/ambience';

// Reproduzierbar: Zufall mit festem Startwert
let seed = 7; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const SR = 48000;
const db = (v: number) => (v > 0 ? Math.round(200 * Math.log10(v)) / 10 : -999);

type Seg = { name: string; t0: number; t1: number };
/** Klick-Verdacht = harter Einsatz oder Abbruch. Hüllkurve = RMS über 10 ms (länger als die tiefste Tonperiode, Schritt 0,25 ms). Ein Einsatz ist, wo die Hüllkurve
 *  von unter −40 dB (rel. Segmentspitze) auf die Hälfte ihres Maximums der folgenden 50 ms steigt; gemessen ab −40 dB unter dem Maximum dieses Klangs; dauert das < 3,5 ms → Klick
 *  (Sprung ohne Einschwingen ergibt mit diesem Fenster 2,5 ms, 4 ms Einschwingen ergibt ≈ 5 ms).
 *  Abbruch gespiegelt. Gewollte Klangfarben (Rechteck, Sägezahn) lösen das nicht aus; ein Ton, der ohne Einschwingen auf volle
 *  Lautstärke springt, schon (Positivkontrolle «alt_blip»). Einsätze, die unter lauteren Klängen liegen, werden nicht bewertet. */
function analyse(buf: AudioBuffer, segs: Seg[]) {
  const ch = [buf.getChannelData(0), buf.getChannelData(1)], W = Math.floor(0.010 * SR), H = Math.floor(0.00025 * SR);
  const out: any[] = [];
  for (const s of segs) {
    const a = Math.floor(s.t0 * SR), b = Math.min(buf.length, Math.floor(s.t1 * SR));
    let peak = 0, sum = 0, n = 0;
    for (const d of ch) for (let i = a; i < b; i++) { const v = d[i]; if (Math.abs(v) > peak) peak = Math.abs(v); sum += v * v; n++; }
    const clicks: number[] = [], rises: number[] = [], low = 0.01 * peak;
    for (const d of ch) {
      const env: number[] = [];
      for (let i = a; i + W <= b; i += H) { let q = 0; for (let j = 0; j < W; j++) q += d[i + j] * d[i + j]; env.push(Math.sqrt(q / W)); }
      const N50 = Math.floor(0.05 * SR / H), lim = 3.5e-3 * SR / H;
      const flag = (k: number, dt: number) => { const t = Math.round((a + k * H) / SR * 1000) / 1000; rises.push(Math.round(dt * H / SR * 1e4) / 10); if (dt < lim && !clicks.some((c) => Math.abs(c - t) < 0.02)) clicks.push(t); };
      for (let k = 1; k < env.length; k++) {
        if (env[k - 1] < low && env[k] >= low) { // Einsatz
          let mx = 0; for (let j = k; j < Math.min(env.length, k + N50); j++) mx = Math.max(mx, env[j]);
          if (mx < 0.05 * peak) continue; let j0 = k; while (j0 > 0 && env[j0 - 1] > 0.01 * mx) j0--; let j = k; while (j < env.length && env[j] < 0.5 * mx) j++; flag(k, j - j0 + 1);
        }
        if (env[k - 1] >= low && env[k] < low) { // Abbruch
          let mx = 0; for (let j = Math.max(0, k - N50); j < k; j++) mx = Math.max(mx, env[j]);
          if (mx < 0.05 * peak) continue; let j1 = k; while (j1 < env.length - 1 && env[j1 + 1] > 0.01 * mx) j1++; let j = k - 1; while (j > 0 && env[j] < 0.5 * mx) j--; flag(k, j1 - j + 1);
        }
      }
    }
    clicks.sort((x, y) => x - y);
    out.push({ name: s.name, peakDb: db(peak), rmsDb: db(Math.sqrt(sum / Math.max(1, n))), clip: peak >= 0.999, clicks: clicks.slice(0, 12), nClicks: clicks.length, kuerzesterUebergangMs: rises.length ? Math.min(...rises) : null, nUebergaenge: rises.length });
  }
  return out;
}
/** Grundton: stärkste Frequenz 380–650 Hz (Goertzel, 0,5-Hz-Raster) */
function pitch(d: Float32Array, t0: number, t1: number) {
  const a = Math.floor(t0 * SR), b = Math.floor(t1 * SR); let best = 0, bf = 0;
  for (let f = 380; f <= 650; f += 0.5) {
    const w = 2 * Math.cos(2 * Math.PI * f / SR); let s1 = 0, s2 = 0;
    for (let i = a; i < b; i++) { const s0 = d[i] + w * s1 - s2; s2 = s1; s1 = s0; }
    const p = s1 * s1 + s2 * s2 - w * s1 * s2; if (p > best) { best = p; bf = f; }
  }
  return bf;
}

/** Spielkette nachbauen: master 0.6 → Ziel, sfx 0.8 → master, Kulissenbus = AMB_GAIN·VOL.bus (wie busTarget ohne Musik) */
function chain(ctx: OfflineAudioContext) {
  const master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
  const sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
  const amb = ctx.createGain(); amb.gain.value = AMB_GAIN * VOL.bus; amb.connect(master);
  return { master, sfx, amb };
}

async function blocks() {
  // Jeder Baustein bekommt ein eigenes Fenster in EINEM Offline-Durchlauf; Startzeiten über suspend()
  const plan: [string, number, (c: any, o: AudioNode) => void][] = [
    ['auto', 4.5, (c, o) => carPass(c, o, VOL.car)],
    ['moewe', 2.5, (c, o) => gull(c, o, VOL.gull)],
    ['vogel', 2.5, (c, o) => bird(c, o, VOL.bird)],
    ['kuhglocke', 3, (c, o) => cowbell(c, o, VOL.cow)],
    ['glocke_c1', 8, (c, o) => churchBell(c, o, c.currentTime, 261.6, VOL.bell)],
    ['gong_sbb', 3, (c, o) => stationGong(c, o, VOL.gong)],
    ['zug_bremsend', 10.5, (c, o) => trainPass(c, o, VOL.train, true)],
    ['trolleybus', 8, (c, o) => trolleybus(c, o, VOL.trolley)],
    ['schiffshorn', 6.5, (c, o) => shipHorn(c, o, VOL.ship)],
  ];
  const total = plan.reduce((s, p) => s + p[1], 0) + 1;
  const ctx = new OfflineAudioContext(2, Math.ceil(total * SR), SR), { amb } = chain(ctx);
  const segs: Seg[] = []; let t = 0.5;
  for (const [name, dur, f] of plan) {
    const t0 = t; ctx.suspend(t0).then(() => { f(ctx, amb); ctx.resume(); });
    segs.push({ name, t0, t1: t0 + dur }); t += dur;
  }
  return analyse(await ctx.startRendering(), segs);
}

async function sirenAndBlips() {
  const ctx = new OfflineAudioContext(2, 17 * SR, SR), { sfx } = chain(ctx);
  const s = buildSiren(ctx, sfx);
  const at = (t: number, f: () => void) => ctx.suspend(t).then(() => { f(); ctx.resume(); });
  at(0.5, () => s.set(true)); at(6.1, () => s.set(false)); at(6.9, () => s.set(true)); at(9.3, () => s.set(false)); // aus/an mitten im Ton
  // Effekt-Töne wie sfxPlay (horn, bump, star, good, radio, click)
  at(11, () => { blipTo(ctx, sfx, 330, 0.35, 'square', 0.12); blipTo(ctx, sfx, 415, 0.35, 'square', 0.08); });
  at(12, () => { blipTo(ctx, sfx, 140, 0.18, 'triangle', 0.2, -60); blipTo(ctx, sfx, 600, 0.25, 'sine', 0.06, 500, 0.05); });
  at(13, () => { [523, 659, 784, 1046].forEach((f, i) => blipTo(ctx, sfx, f, 0.2, 'triangle', 0.12, 0, i * 0.09)); });
  at(14, () => { blipTo(ctx, sfx, 1200, 0.08, 'square', 0.07); blipTo(ctx, sfx, 1600, 0.08, 'square', 0.07, 0, 0.11); blipTo(ctx, sfx, 700, 0.05, 'square', 0.05, 0, 0.5); });
  at(15, () => { // Positivkontrolle: Effekt-Ton wie bis Lauf 2 (Sprung auf volle Lautstärke) → muss als Klick erkannt werden
    const t = ctx.currentTime, o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 330; const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.37);
  });
  const buf = await ctx.startRendering();
  const d = buf.getChannelData(0);
  return { segs: analyse(buf, [{ name: 'sirene_an_aus', t0: 0, t1: 10.5 }, { name: 'effekttoene', t0: 10.5, t1: 14.9 }, { name: 'alt_blip_positivkontrolle', t0: 14.9, t1: 16 }]), sireneHz: { ton1_hoch: pitch(d, 0.75, 1.1), ton2_hoch: pitch(d, 1.45, 1.8), ton3_tief: pitch(d, 2.15, 2.5), ton4_tief: pitch(d, 2.85, 3.2), nach_neustart_hoch: pitch(d, 7.05, 7.4) } };
}

/** Lautester Fall: Motor Vollgas + Sirene + Hupe + Sterne-Ton + (Lauf 4) Kirchenglocke und Gong gleichzeitig (Summe muss unter 0 dBFS bleiben) */
async function worst() {
  const ctx = new OfflineAudioContext(2, 4 * SR, SR), { sfx, amb } = chain(ctx);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  const eg = ctx.createGain(); eg.gain.value = 0.13; const e1 = ctx.createOscillator(); e1.type = 'sawtooth'; e1.frequency.value = 120;
  const e2 = ctx.createOscillator(); e2.type = 'square'; e2.frequency.value = 60; const g2 = ctx.createGain(); g2.gain.value = 0.3;
  e1.connect(lp); e2.connect(g2); g2.connect(lp); lp.connect(eg); eg.connect(sfx); e1.start(); e2.start();
  const s = buildSiren(ctx, sfx); s.set(true);
  ctx.suspend(1).then(() => { churchBell(ctx as any, amb, ctx.currentTime, 261.6, VOL.bell); stationGong(ctx as any, amb, VOL.gong); // Lauf 4: lautester Kulissenklang dazu
    blipTo(ctx, sfx, 330, 0.35, 'square', 0.12); blipTo(ctx, sfx, 415, 0.35, 'square', 0.08);
    [0, 1, 2].forEach((i) => { blipTo(ctx, sfx, 880 + i * 220, 0.18, 'square', 0.1, 0, i * 0.12); blipTo(ctx, sfx, 1320 + i * 220, 0.22, 'sine', 0.08, 0, i * 0.12 + 0.05); });
    [523, 659, 784, 1046].forEach((f, i) => blipTo(ctx, sfx, f, 0.2, 'triangle', 0.12, 0, i * 0.09)); ctx.resume(); });
  const r = analyse(await ctx.startRendering(), [{ name: 'lautester_fall', t0: 0, t1: 4 }])[0];
  return { name: r.name, peakDb: r.peakDb, rmsDb: r.rmsDb, clip: r.clip, nClicks: 0, clicks: [] };
}

/** Volle Kulisse wie im Spiel (initAmbience/updateAmbience), Schichten der Reihe nach erzwungen, plus Sirene, Ton aus, Musik */
async function mix(engine: boolean) {
  const T = 72, ctx = new OfflineAudioContext(2, T * SR, SR);
  const master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
  const sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
  // Motor wie audio.ts (läuft im Spiel immer mit)
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  const eg = ctx.createGain(); eg.gain.value = 0.1; const e1 = ctx.createOscillator(); e1.type = 'sawtooth'; e1.frequency.value = 90;
  const e2 = ctx.createOscillator(); e2.type = 'square'; e2.frequency.value = 45; const g2 = ctx.createGain(); g2.gain.value = 0.3;
  e1.connect(lp); e2.connect(g2); g2.connect(lp); lp.connect(eg); if (engine) eg.connect(sfx); e1.start(); e2.start();
  const siren = buildSiren(ctx, sfx);
  initAmbience(ctx as unknown as AudioContext, master, sfx);
  const amb = (window as any).__amb;
  const st: any = { music: 0, venue: 0, siren: false, muted: false, hidden: false };
  // Ablauf (s): Schicht | Ereignis
  const sched: [number, () => void][] = [
    [0.1, () => amb.force('stadt')], [10, () => amb.force('see')], [18, () => amb.force('wald')], [26, () => amb.force('land')],
    [34, () => amb.force('bahnhof')], [42, () => amb.force('tunnel')], [48, () => { amb.force('stadt'); }],
    [36, () => amb.gong()], [37, () => amb.fire('train')], [12, () => amb.fire('ship')], [3, () => amb.fire('trolley')], [28, () => amb.chime(2)],
    [44, () => { siren.set(true); st.siren = true; }], [52, () => { siren.set(false); st.siren = false; }],
    [55, () => { st.music = 1; }], [60, () => { st.muted = true; master.gain.setTargetAtTime(0, ctx.currentTime, 0.05); }],
    [64, () => { st.muted = false; master.gain.setTargetAtTime(0.6, ctx.currentTime, 0.05); }],
  ];
  for (const [t, f] of sched) ctx.suspend(t).then(() => { f(); ctx.resume(); });
  const steps: number[] = []; for (let t = 0.2; t < T - 0.2; t += 0.1) steps.push(Math.round(t * 1000) / 1000);
  const used = new Set(sched.map((s) => s[0]));
  for (const t of steps) if (!used.has(t)) ctx.suspend(t).then(() => { updateAmbience(0, 0, { ...st }); ctx.resume(); });
  const buf = await ctx.startRendering();
  return analyse(buf, [
    { name: 'stadt', t0: 2, t1: 10 }, { name: 'uebergang_stadt_see', t0: 9.5, t1: 11.5 }, { name: 'see', t0: 13, t1: 18 }, { name: 'wald', t0: 21, t1: 26 },
    { name: 'land_mit_glocke', t0: 28, t1: 34 }, { name: 'bahnhof_gong_zug', t0: 35, t1: 42 }, { name: 'tunnel_mit_sirene', t0: 43, t1: 48 },
    { name: 'stadt_sirene', t0: 48.5, t1: 52 }, { name: 'stadt_mit_musik_geduckt', t0: 57, t1: 60 }, { name: 'ton_aus', t0: 61, t1: 64 },
    { name: 'wieder_an', t0: 63.8, t1: 66 }, { name: 'gesamt', t0: 0, t1: T },
  ]);
}

(async () => {
  const info = document.getElementById('info')!;
  try {
    info.textContent = 'Bausteine …'; const b = await blocks();
    info.textContent = 'Sirene …'; const s = await sirenAndBlips();
    info.textContent = 'lautester Fall …'; const w = await worst();
    info.textContent = 'Mischung …'; const m = await mix(false);
    (window as any).__ambResult = { ok: true, bausteine: b, sirene: s, lautester: w, mischung: m };
    info.textContent = 'fertig';
  } catch (e) { (window as any).__ambResult = { ok: false, err: String(e) }; info.textContent = 'Fehler ' + e; }
})();
