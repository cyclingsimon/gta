// P-A: Schalter für die Realismus-Bausteine. Jeder Baustein fällt bei «false»/'alt' auf das bisherige Aussehen zurück
// (gleiche Geometrie, gleiche Dreiecke wie vor dem Einbau). Testweise per URL: ?real=0 schaltet alles ab,
// ?real=trees:alt,cars:0 einzelne Teile (nur Lesen der eigenen Adresse, keine Netzwerkaufrufe).
export type TreeMode = 'alt' | 'min' | 'lite' | 'full';
export const REAL = {
  /** Bäume: 'alt' = bisherige Kugelbäume (44 Dreiecke), 'min' = Arten in Sparform (Standard, ≤ ~50 Dreiecke im Mittel), 'lite'/'full' = mehr Details */
  trees: 'min' as TreeMode,
  /** Wartehallen an Bushaltestellen (sonst nur blaues Schild wie bisher) */
  shelters: true,
  /** Altstadt-Kandelaber + moderne Strassenleuchten (sonst bisherige Laternen) */
  lamps: true,
  /** neue Bank-Geometrie */
  bench: true,
  /** Verkehrsautos nach Typ und Farbverteilung (sonst bisherige Kisten) */
  cars: true,
  /** geparkte Autos und Velos am Strassenrand */
  parked: true,
  /** Nachtlicht für Kandelaber/Wartehalle (über NIGHT.value) */
  night: true,
};
try {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('real') : null;
  if (q === '0') { REAL.trees = 'alt'; REAL.shelters = REAL.lamps = REAL.bench = REAL.cars = REAL.parked = REAL.night = false; }
  else if (q) for (const kv of q.split(',')) {
    const [k, v] = kv.split(':'); const R = REAL as any;
    if (!(k in R)) continue;
    R[k] = k === 'trees' ? (['alt', 'min', 'lite', 'full'].includes(v) ? v : 'min') : !(v === '0' || v === 'false');
  }
} catch { /* ohne location (Tests in Node) */ }
