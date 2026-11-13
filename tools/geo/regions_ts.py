"""Gebiet A: src/regionsA.ts aus public/data/aN/region.json + missions.json erzeugen (Name, Feld, Luftbild, Spital/Rettungsposten).
Nur gebaute Regionen (mit city.json) kommen ins Spiel. Aufruf: regions_ts.py"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from regions_a import REGIONS_A
out = {}
for rid in REGIONS_A:
    d = f'public/data/{rid}'
    if not (os.path.exists(d + '/city.json') and os.path.exists(d + '/missions.json')): continue
    r = json.load(open(d + '/region.json')); m = json.load(open(d + '/missions.json'))
    out[rid] = {'name': r['name'], 'b': r['bounds'], 'aerial': r['aerial'], 'hosp': {k: m['hosp'][k] for k in ('label', 'kind', 'x', 'z')}, 'welcome': m['welcome']}
src = ('// Automatisch erzeugt von tools/geo/regions_ts.py – nicht von Hand ändern.\n'
       '// Gebiet A (13i): Regionen zwischen Luzern, Sursee und Wolhusen. Gebäude aus OpenStreetMap, Gelände swissALTI3D (4 m), Luftbild SWISSIMAGE.\n'
       'export interface RegionA { name: string; b: [number, number, number, number]; aerial: { E0: number; E1: number; N0: number; N1: number }; hosp: { label: string; kind: "spital" | "rp"; x: number; z: number }; welcome: string }\n'
       f'export const REGIONS_A: Record<string, RegionA> = {json.dumps(out, ensure_ascii=False, indent=1)};\n')
open('src/regionsA.ts', 'w').write(src); print('Regionen im Spiel:', list(out))
