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
 }
};
