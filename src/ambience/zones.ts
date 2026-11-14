// Geräuschkulisse: feste Orte (Spielkoordinaten in Metern, x = Ost, z = Süd; Ursprung Luzern, wie im ganzen Spiel).
// Quellen: Gebäudeschwerpunkte aus public/data/city.json (OSM-Namen «St. Leodegar im Hof (Hofkirche)», «Bahnhof Luzern»),
// Bahnhöfe aus src/main.ts und src/regionsA.ts, Ortschaften aus places[] der city.json aller Gegenden (Rang ≥ 2).
import { REGIONS_A } from '../regionsA';

/** Hofkirche St. Leodegar – Stundenschlag */
export const HOFKIRCHE = { x: 488, z: -437, r: 1300 };

/** Bahnhöfe: Gong und Zugsgeräusch; r = Hörweite in m */
export const STATIONS: { name: string; x: number; z: number; r: number }[] = [
  { name: 'Bahnhof Luzern', x: 203, z: 214, r: 380 },
  { name: 'Horw Bahnhof', x: -6, z: 3690, r: 200 },
  { name: 'Emmenbrücke Bahnhof', x: -1929, z: -2086, r: 200 },
  { name: 'Ebikon Bahnhof', x: 2684, z: -3626, r: 200 },
  { name: 'Bahnhof Meggen', x: 5715, z: 171, r: 180 },
  { name: 'Bahnhof Littau', x: -3835, z: -145, r: 180 },
  { name: 'Bahnhof Hergiswil', x: 183, z: 7634, r: 180 },
  ...Object.values(REGIONS_A).filter((r) => r.hosp.label.startsWith('Bahnhof')).map((r) => ({ name: r.hosp.label, x: r.hosp.x, z: r.hosp.z, r: 200 })),
];

/** Ortschaften [Name, x, z, Rang] – nur Ersatz, wenn die Welt-Abfrage (bindAmbience) fehlt */
export const TOWNS: [string, number, number, number][] = [
  ['Horw', 234, 3671, 3], ['Kriens', -2040, 1941, 3], ['Hergiswil NW', 209, 7476, 2], ['Luzern', -143, -49, 3], ['Obernau', -4104, 2167, 2], ['Kastanienbaum', 2237, 4729, 2],
  ['Littauerboden', -3170, -1412, 2], ['Hellbühl', -8383, -2107, 2], ['Adligenswil', 4592, -2083, 2], ['Meggen', 4983, 511, 2], ['Ebikon', 2338, -3263, 3], ['Merlischachen', 7547, -1532, 2],
  ['Grosswangen', -19612, -8908, 2], ['Oberkirch LU', -14605, -11496, 2], ['Sursee', -15239, -13361, 3], ['Beromünster', -8742, -17243, 2], ['Hitzkirch', -3374, -19167, 2],
  ['Buttisholz', -16246, -6884, 2], ['Neuenkirch', -7942, -5367, 2], ['Rain', -3887, -8571, 2], ['Schötz', -24212, -13064, 2], ['Dagmersellen', -24088, -17898, 2], ['Wauwil', -21353, -14668, 2],
  ['Buchrain', 3000, -4689, 2], ['Dierikon', 4671, -5004, 2], ['Inwil', 3272, -7774, 2], ['Root', 6326, -7037, 2], ['Küssnacht am Rigi', 9931, -3555, 3], ['Immensee', 11754, -4989, 2],
  ['Meierskappel', 10303, -7990, 2], ['Stans', 4430, 10465, 3], ['Stansstad', 2250, 7957, 2], ['Malters', -9454, 1471, 2], ['Ruswil', -13764, -3565, 2], ['Entlebuch', -18441, 6575, 2],
  ['Emmen', -1802, -2603, 3], ['Emmen-Dorf', -465, -2941, 2], ['Rothenburg', -2676, -4678, 2], ['Eschenbach', 779, -8992, 2], ['Wolhusen', -17834, -698, 2], ['Nottwil', -13337, -9526, 2],
  ['Sempach', -8774, -9252, 2], ['Triengen', -17517, -20290, 2], ['Hildisrieden', -6145, -11020, 2], ['Rotkreuz', 9375, -9853, 3], ['Hochdorf', -1345, -12698, 2], ['Ballwil', 825, -11110, 2],
  ['Willisau', -23597, -7720, 2], ['Ettiswil', -22195, -10692, 2],
];

/** Seeufer-Punkte im Seebecken/Horwer Bucht – nur Ersatz ohne Welt-Abfrage */
export const SHORE: [number, number, number][] = [
  [330, 60, 260], [86, -151, 220], [700, 450, 300], [1300, 900, 300], [2050, -120, 300], [1600, -250, 300], [409, 6257, 350], [600, 5000, 400], [2400, 4700, 400], [5000, 900, 400], [200, 7700, 400],
];

/** 0..1: wie «städtisch» ist der Ort ohne Welt-Abfrage (Ortskerne nach Rang) */
export function townWeight(x: number, z: number) {
  let w = 0;
  for (const [, tx, tz, r] of TOWNS) {
    const R = r >= 3 ? 1400 : 550, d = Math.hypot(x - tx, z - tz);
    if (d < R) w = Math.max(w, Math.min(1, (R - d) / (R * 0.55)) * (r >= 3 ? 1 : 0.7));
  }
  return w;
}
export function shoreWeight(x: number, z: number) {
  let w = 0;
  for (const [sx, sz, r] of SHORE) { const d = Math.hypot(x - sx, z - sz); if (d < r) w = Math.max(w, 1 - d / r); }
  return w;
}
