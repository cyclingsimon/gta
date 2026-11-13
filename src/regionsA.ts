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
   "label": "Spital Sursee",
   "kind": "spital",
   "x": -14436.4,
   "z": -12884.8
  },
  "welcome": "Willkommen in Sursee! Das Spital Sursee ist auf der Karte blau markiert."
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
   "label": "Spital Nottwil",
   "kind": "spital",
   "x": -13337.1,
   "z": -9969.2
  },
  "welcome": "Willkommen in Sempach und Nottwil! Das Spital Nottwil ist auf der Karte blau markiert."
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
   "label": "Rettungsposten Hildisrieden",
   "kind": "rp",
   "x": -5921.5,
   "z": -10738.7
  },
  "welcome": "Willkommen in Hildisrieden und Rain! Der Rettungsposten Hildisrieden ist auf der Karte blau markiert."
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
   "label": "Rettungsposten Buttisholz",
   "kind": "rp",
   "x": -16074.4,
   "z": -6926.5
  },
  "welcome": "Willkommen in Buttisholz! Der Rettungsposten Buttisholz ist auf der Karte blau markiert."
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
   "label": "Rettungsposten Ruswil",
   "kind": "rp",
   "x": -13802.6,
   "z": -3630.5
  },
  "welcome": "Willkommen in Ruswil! Der Rettungsposten Ruswil ist auf der Karte blau markiert."
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
   "label": "Rettungsposten Neuenkirch",
   "kind": "rp",
   "x": -7779.4,
   "z": -5143.3
  },
  "welcome": "Willkommen in Neuenkirch und Hellbühl! Der Rettungsposten Neuenkirch ist auf der Karte blau markiert."
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
   "label": "Spital Wolhusen",
   "kind": "spital",
   "x": -17712.4,
   "z": -1628.0
  },
  "welcome": "Willkommen in Wolhusen! Das Spital Wolhusen ist auf der Karte blau markiert."
 }
};
