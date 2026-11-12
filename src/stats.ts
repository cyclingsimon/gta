// Anonyme Spielstatistik an den eigenen Server (stats/api.php auf derselben Domain).
// Gesendet werden: zufällige Geräte-ID, Spielversion, Region, Spielzeit, Strecke und Spielereignisse.
// Keine Namen, keine IP-Auswertung, keine Drittanbieter. Abschaltbar im Pause-Menü (bleibt gespeichert).

const OFF_KEY = 'luksiStatsOff', DEV_KEY = 'luksiDev';
const rid = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');

export interface StatEvent { t: number; type: string; m?: string; n?: string; val?: number; region?: string; x?: number; z?: number }

export class Stats {
  readonly sid = rid(10);
  readonly dev: string;
  enabled: boolean;
  tot = { active_s: 0, dist_m: 0, max_kmh: 0, siren_s: 0, horns: 0, boings: 0, hearts: 0, m_accept: 0, m_done: 0, stars: 0, splashes: 0, region_switches: 0 };
  players = 1;
  private ev: StatEvent[] = [];
  private sinceFlush = 0; private sincePos = 25; private acceptAt = 0; private sent = false; private lastT = 0;

  constructor(private meta: { v: string; region: string; q: string }, private url = 'stats/api.php', off = false) {
    let d = ''; try { d = localStorage.getItem(DEV_KEY) || ''; if (!d) { d = rid(10); localStorage.setItem(DEV_KEY, d); } } catch { d = rid(10); }
    this.dev = d;
    let o = false; try { o = localStorage.getItem(OFF_KEY) === '1'; } catch { /* privat */ }
    this.enabled = !off && !o;
    const bye = () => this.flush(true);
    addEventListener('pagehide', bye);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') bye(); });
  }

  setEnabled(on: boolean) { this.enabled = on; try { if (on) localStorage.removeItem(OFF_KEY); else localStorage.setItem(OFF_KEY, '1'); } catch { /* privat */ } }

  event(type: string, extra: Omit<StatEvent, 't' | 'type'> = {}) {
    if (this.ev.length < 400) this.ev.push({ t: Math.round(Date.now() / 1000), type, region: this.meta.region, ...extra });
  }
  missionAccept(id: string, title = '') { this.tot.m_accept++; this.acceptAt = this.tot.active_s; this.event('mission_accept', { m: id, n: title }); }
  missionDone(id: string, stars: number) { this.tot.m_done++; this.tot.stars += stars; this.event('mission_done', { m: id, val: Math.round(this.tot.active_s - this.acceptAt) }); this.event('stars', { m: id, val: stars }); }

  /** jedes Bild, nur während das Spiel läuft (nicht pausiert, Fenster sichtbar) */
  tick(dt: number, speeds: number[], siren: boolean, pos: [number, number]) {
    // Spielzeit nach Uhr (das Spiel begrenzt dt je Bild; bei wenigen Bildern pro Sekunde wäre die Zeit sonst zu kurz)
    const now = performance.now() / 1000, wall = this.lastT ? now - this.lastT : 0; this.lastT = now;
    if (!this.enabled || dt <= 0 || document.visibilityState !== 'visible') return;
    if (wall > 0 && wall < 5) this.tot.active_s += wall; // längere Lücke = Tab schlief
    for (const s of speeds) { this.tot.dist_m += Math.abs(s) * dt; this.tot.max_kmh = Math.max(this.tot.max_kmh, Math.abs(s) * 3.6); }
    if (siren) this.tot.siren_s += dt;
    this.sincePos += wall < 5 ? wall : 0; this.sinceFlush += wall < 5 ? wall : 0;
    if (this.sincePos >= 30) { this.sincePos = 0; this.event('pos', { x: Math.round(pos[0]), z: Math.round(pos[1]) }); }
    if (this.sinceFlush >= 30) this.flush(false); // alle 30 s Spielzeit senden
  }

  flush(leaving: boolean) {
    if (!this.enabled || this.tot.active_s < 3 && !this.sent) return; // blosses Öffnen nicht melden
    const body = JSON.stringify({
      sid: this.sid, dev: this.dev, v: this.meta.v, region: this.meta.region, q: this.meta.q, players: this.players,
      mob: matchMedia('(pointer: coarse)').matches, scr: `${screen.width}x${screen.height}`, lang: (navigator.language || '').slice(0, 5),
      tot: { ...this.tot, active_s: Math.round(this.tot.active_s), dist_m: Math.round(this.tot.dist_m), max_kmh: Math.round(this.tot.max_kmh), siren_s: Math.round(this.tot.siren_s) },
      ev: this.ev,
    });
    this.ev = []; this.sinceFlush = 0; this.sent = true;
    try {
      if (leaving && navigator.sendBeacon) navigator.sendBeacon(this.url, new Blob([body], { type: 'text/plain' }));
      else fetch(this.url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => { /* offline: Summen kommen mit dem nächsten Paket */ });
    } catch { /* egal */ }
  }
}
