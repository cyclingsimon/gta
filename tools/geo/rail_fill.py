"""Fehlende Hauptgleise einer Region aus der OSM-Abfrage data/e4/osm/rail_nord.json (13.11.2026, railway=rail im Raum Luzern–Rothenburg–Seetal) ergänzen.
Grund: in den Etappe-2-Daten fehlte die Strecke 500 zwischen Emmenbrücke und Rothenburg (Gleisgraph unterbrochen).
Nur Abschnitte, die weiter als 4 m von vorhandenen Gleisen liegen, werden angehängt (rail sichtbar + railAll für Zugstrecken). Aufruf: rail_fill.py public/data/nord"""
import json, math, sys
from shapely.geometry import LineString, box
from shapely.ops import unary_union
KX, KZ = math.cos(math.radians(47.0517)) * 111320, 110574
L = lambda g: (round((g['lon'] - 8.3077) * KX, 1), round(-(g['lat'] - 47.0517) * KZ, 1))
d = sys.argv[1]; c = json.load(open(d + '/city.json')); B = box(*c['meta']['bounds'])
have = unary_union([LineString(r) for r in c['railAll'] if len(r) > 1]).buffer(4)
add = 0
for e in json.load(open('data/e4/osm/rail_nord.json'))['elements']:
    t = e['tags']
    if t.get('usage') not in ('main', 'branch') or t.get('service'): continue
    g = LineString([L(q) for q in e['geometry'] if q]).intersection(B)
    for part in (getattr(g, 'geoms', None) or [g]):
        if part.is_empty or part.length < 2: continue
        rest = part.difference(have)
        for q in (getattr(rest, 'geoms', None) or [rest]):
            if q.is_empty or q.length < 3 or q.geom_type != 'LineString': continue
            # an beiden Enden 6 m überlappen lassen, damit build_trains die Stücke verbindet
            pts = [[round(x, 1), round(z, 1)] for x, z in q.coords]
            full = [[round(x, 1), round(z, 1)] for x, z in part.coords]
            c['railAll'].append(full); c['rail'].append(pts); add += 1
json.dump(c, open(d + '/city.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print(d, 'ergänzte Gleisstücke', add)
