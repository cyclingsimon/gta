// Automatisch erzeugt von tools/geo/regions_ts.py – nicht von Hand ändern.
// Gebiet A (13i): Regionen zwischen Luzern, Sursee und Wolhusen. Gebäude aus OpenStreetMap, Gelände swissALTI3D (4 m), Luftbild SWISSIMAGE.
export interface RegionA { name: string; b: [number, number, number, number]; aerial: { E0: number; E1: number; N0: number; N1: number }; hosp: { label: string; kind: "spital" | "rp"; x: number; z: number }; welcome: string }
export const REGIONS_A: Record<string, RegionA> = {
 "a1": {
  "name": "Sursee",
  "b": [
   -20000,
   -14600,
   -14300,
   -8900
  ],
  "aerial": {
   "E0": 2645820,
   "E1": 2651700,
   "N0": 1220250,
   "N1": 1226150
  },
  "hosp": {
   "label": "LUKS Sursee",
   "kind": "spital",
   "x": -14436.4,
   "z": -12884.8
  },
  "welcome": "Willkommen in Sursee! Das LUKS Sursee ist auf der Karte blau markiert."
 },
 "a2": {
  "name": "Sempach und Nottwil",
  "b": [
   -14500,
   -14600,
   -8200,
   -8900
  ],
  "aerial": {
   "E0": 2651320,
   "E1": 2657800,
   "N0": 1220290,
   "N1": 1226210
  },
  "hosp": {
   "label": "Bahnhof Nottwil",
   "kind": "rp",
   "x": -12830.4,
   "z": -9630.9
  },
  "welcome": "Willkommen in Sempach und Nottwil! Treffpunkt ist der Bahnhof Nottwil. Er ist auf der Karte blau markiert."
 },
 "a3": {
  "name": "Hildisrieden und Rain",
  "b": [
   -8400,
   -14600,
   -3500,
   -8900
  ],
  "aerial": {
   "E0": 2657410,
   "E1": 2662500,
   "N0": 1220350,
   "N1": 1226260
  },
  "hosp": {
   "label": "Haltestelle Hildisrieden Post",
   "kind": "rp",
   "x": -5942.0,
   "z": -10761.4
  },
  "welcome": "Willkommen in Hildisrieden und Rain! Treffpunkt ist die Haltestelle Hildisrieden Post. Sie ist auf der Karte blau markiert."
 },
 "a4": {
  "name": "Buttisholz",
  "b": [
   -20000,
   -9100,
   -14300,
   -3400
  ],
  "aerial": {
   "E0": 2645860,
   "E1": 2651740,
   "N0": 1214720,
   "N1": 1220620
  },
  "hosp": {
   "label": "Haltestelle Buttisholz Dorf",
   "kind": "rp",
   "x": -16267.5,
   "z": -6905.2
  },
  "welcome": "Willkommen in Buttisholz! Treffpunkt ist die Haltestelle Buttisholz Dorf. Sie ist auf der Karte blau markiert."
 },
 "a5": {
  "name": "Ruswil",
  "b": [
   -14500,
   -9100,
   -8200,
   -3400
  ],
  "aerial": {
   "E0": 2651360,
   "E1": 2657850,
   "N0": 1214760,
   "N1": 1220680
  },
  "hosp": {
   "label": "Haltestelle Sonnhöfli",
   "kind": "rp",
   "x": -14148.3,
   "z": -3690.6
  },
  "welcome": "Willkommen in Ruswil! Treffpunkt ist die Haltestelle Sonnhöfli. Sie ist auf der Karte blau markiert."
 },
 "a6": {
  "name": "Neuenkirch und Hellbühl",
  "b": [
   -8400,
   -9100,
   -3500,
   -1200
  ],
  "aerial": {
   "E0": 2657470,
   "E1": 2662580,
   "N0": 1212610,
   "N1": 1220730
  },
  "hosp": {
   "label": "Bahnhof Rothenburg Station",
   "kind": "rp",
   "x": -4560.3,
   "z": -4138.5
  },
  "welcome": "Willkommen in Neuenkirch und Hellbühl! Treffpunkt ist der Bahnhof Rothenburg Station. Er ist auf der Karte blau markiert."
 },
 "a7": {
  "name": "Wolhusen",
  "b": [
   -20000,
   -3600,
   -14300,
   3000
  ],
  "aerial": {
   "E0": 2645910,
   "E1": 2651800,
   "N0": 1208280,
   "N1": 1215090
  },
  "hosp": {
   "label": "LUKS Wolhusen",
   "kind": "spital",
   "x": -17712.4,
   "z": -1628.0
  },
  "welcome": "Willkommen in Wolhusen! Das LUKS Wolhusen ist auf der Karte blau markiert."
 },
 "a8": {
  "name": "Malters",
  "b": [
   -14500,
   -3600,
   -8400,
   3000
  ],
  "aerial": {
   "E0": 2651410,
   "E1": 2657710,
   "N0": 1208330,
   "N1": 1215150
  },
  "hosp": {
   "label": "Bahnhof Malters",
   "kind": "rp",
   "x": -9535.6,
   "z": 1456.1
  },
  "welcome": "Willkommen in Malters! Treffpunkt ist der Bahnhof Malters. Er ist auf der Karte blau markiert."
 },
 "a9": {
  "name": "Rothenburg",
  "b": [
   -3700,
   -9100,
   1500,
   -3700
  ],
  "aerial": {
   "E0": 2662170,
   "E1": 2667560,
   "N0": 1215170,
   "N1": 1220780
  },
  "hosp": {
   "label": "Bahnhof Emmenbrücke Kapf",
   "kind": "rp",
   "x": -2618.0,
   "z": -4326.8
  },
  "welcome": "Willkommen in Rothenburg! Treffpunkt ist der Bahnhof Emmenbrücke Kapf. Er ist auf der Karte blau markiert."
 },
 "a10": {
  "name": "Root, Buchrain und Inwil",
  "b": [
   1300,
   -9100,
   7500,
   -3700
  ],
  "aerial": {
   "E0": 2667137,
   "E1": 2673596,
   "N0": 1215190,
   "N1": 1220883
  },
  "hosp": {
   "label": "Bahnhof Buchrain",
   "kind": "rp",
   "x": 3653.3,
   "z": -4600.6
  },
  "welcome": "Willkommen in Root, Buchrain und Inwil! Treffpunkt ist der Bahnhof Buchrain. Er ist auf der Karte blau markiert."
 },
 "a11": {
  "name": "Küssnacht und Meierskappel",
  "b": [
   7300,
   -8600,
   12300,
   -1800
  ],
  "aerial": {
   "E0": 2673145,
   "E1": 2678426,
   "N0": 1213351,
   "N1": 1220441
  },
  "hosp": {
   "label": "Bahnhof Küssnacht am Rigi",
   "kind": "rp",
   "x": 9547.4,
   "z": -3523.1
  },
  "welcome": "Willkommen in Küssnacht und Meierskappel! Treffpunkt ist der Bahnhof Küssnacht am Rigi. Er ist auf der Karte blau markiert."
 },
 "a12": {
  "name": "Hochdorf und Ballwil",
  "b": [
   -3700,
   -14800,
   2300,
   -8900
  ],
  "aerial": {
   "E0": 2662077,
   "E1": 2668330,
   "N0": 1220364,
   "N1": 1226551
  },
  "hosp": {
   "label": "Bahnhof Hochdorf",
   "kind": "rp",
   "x": -1435.3,
   "z": -12745.6
  },
  "welcome": "Willkommen in Hochdorf und Ballwil! Treffpunkt ist der Bahnhof Hochdorf. Er ist auf der Karte blau markiert."
 },
 "a13": {
  "name": "Willisau und Ettiswil",
  "b": [
   -26200,
   -11000,
   -19800,
   -5000
  ],
  "aerial": {
   "E0": 2639619,
   "E1": 2646255,
   "N0": 1216250,
   "N1": 1222519
  },
  "hosp": {
   "label": "Bahnhof Willisau",
   "kind": "rp",
   "x": -23582.8,
   "z": -7840.7
  },
  "welcome": "Willkommen in Willisau und Ettiswil! Treffpunkt ist der Bahnhof Willisau. Er ist auf der Karte blau markiert."
 },
 "a14": {
  "name": "Dagmersellen und Wauwil",
  "b": [
   -26200,
   -18300,
   -19800,
   -10800
  ],
  "aerial": {
   "E0": 2639570,
   "E1": 2646210,
   "N0": 1222082,
   "N1": 1229858
  },
  "hosp": {
   "label": "Bahnhof Wauwil",
   "kind": "rp",
   "x": -21890.2,
   "z": -14613.9
  },
  "welcome": "Willkommen in Dagmersellen und Wauwil! Treffpunkt ist der Bahnhof Wauwil. Er ist auf der Karte blau markiert."
 },
 "a15": {
  "name": "Knutwil und Triengen",
  "b": [
   -20000,
   -20300,
   -13500,
   -14400
  ],
  "aerial": {
   "E0": 2645746,
   "E1": 2652477,
   "N0": 1225746,
   "N1": 1231921
  },
  "hosp": {
   "label": "Haltestelle Triengen Dorf",
   "kind": "rp",
   "x": -17407.4,
   "z": -20013.5
  },
  "welcome": "Willkommen in Knutwil und Triengen! Treffpunkt ist die Haltestelle Triengen Dorf. Sie ist auf der Karte blau markiert."
 },
 "a16": {
  "name": "Rotkreuz und Hünenberg",
  "b": [
   7300,
   -14000,
   13300,
   -8400
  ],
  "aerial": {
   "E0": 2673078,
   "E1": 2679339,
   "N0": 1219986,
   "N1": 1225883
  },
  "hosp": {
   "label": "Bahnhof Rotkreuz",
   "kind": "rp",
   "x": 9317.9,
   "z": -9951.9
  },
  "welcome": "Willkommen in Rotkreuz und Hünenberg! Treffpunkt ist der Bahnhof Rotkreuz. Er ist auf der Karte blau markiert."
 }
};
