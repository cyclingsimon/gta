"""Lücken zwischen Fahrbahnen an Knoten füllen: Flächen, die vom Strassennetz (Fahrstrassen) ganz umschlossen sind und kleiner als 220 m²,
ohne Gebäude, Grünfläche oder Platz → «gapFill» in city.json (im Spiel als Asphalt unter den Fahrbahnen). Grund: dort sah man sonst das
unscharfe Luftbild. Aufruf: gaps.py [public/data …]"""
import json, os, sys
from shapely.geometry import LineString, Polygon
from shapely.ops import unary_union, polygonize
CAR = ('primary', 'secondary', 'tertiary', 'trunk', 'residential', 'unclassified', 'living_street', 'primary_link', 'secondary_link', 'tertiary_link', 'trunk_link')
for d in sys.argv[1:] or ['public/data', 'public/data/nord', 'public/data/ost', 'public/data/west', 'public/data/sued']:
    if not os.path.exists(d + '/city.json'): continue
    c = json.load(open(d + '/city.json'))
    lines = [LineString(r['p']) for r in c['roads'] if r['c'] in CAR and len(r['p']) > 1 and not r.get('b')]
    roads = unary_union([LineString(r['p']).buffer(r['w'] / 2) for r in c['roads'] if r['c'] in CAR and len(r['p']) > 1 and not r.get('b')])
    blk = []
    for b in c['buildings']:
        try: blk.append(Polygon(b['p']).buffer(0))
        except Exception: pass
    for g in c['green'] + c.get('plazas', []):
        try: blk.append(Polygon(g['p']).buffer(0))
        except Exception: pass
    BLK = unary_union(blk)
    out = []
    for f in polygonize(unary_union(lines)):
        if f.area > 220 or f.area < 4 or f.intersects(BLK): continue
        rest = f.difference(roads)
        if rest.is_empty or rest.area < 1: continue
        q = f.buffer(0.2)
        out.append([[round(x, 1), round(z, 1)] for x, z in list(q.exterior.coords)[:-1]])
    c['gapFill'] = out
    json.dump(c, open(d + '/city.json', 'w'), separators=(',', ':'), ensure_ascii=False)
    print(d, 'Knoten-Lücken gefüllt', len(out))
