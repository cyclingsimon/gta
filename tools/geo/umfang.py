"""Spielumfang (für die Anzeige im Spiel): Fläche, Gebäude und Strassen-km aller Regionen ohne Doppelzählung der Überlappungen.
Schreibt public/data/umfang.json. Gebäude = swissBUILDINGS3D-Gebäude (b3d.json) bzw. OSM-Gebäude, wo keine 3D-Daten."""
import json, os
from shapely.geometry import box, LineString, Point
from shapely.ops import unary_union
R = [('luzern', 'public/data'), ('nord', 'public/data/nord'), ('ost', 'public/data/ost'), ('west', 'public/data/west'), ('sued', 'public/data/sued')]
CAR = ('motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service', 'primary_link', 'secondary_link', 'tertiary_link', 'trunk_link', 'motorway_link')
taken = None; tot = {'km2': 0, 'gebaeude': 0, 'strassen_km': 0, 'wege_km': 0}; per = {}
for name, d in R:
    if not os.path.exists(d + '/city.json'): continue
    c = json.load(open(d + '/city.json')); x0, z0, x1, z1 = c['meta']['bounds']; field = box(x0, z0, x1, z1)
    own = field if taken is None else field.difference(taken)
    nb = sum(1 for bb in json.load(open(d + '/b3d.json'))['buildings'] if own.contains(Point(bb[5], bb[6])))
    car = foot = 0.0
    for r in c['roads']:
        if len(r['p']) < 2: continue
        L = LineString(r['p']).intersection(own).length / 1000
        if r['c'] in CAR: car += L
        else: foot += L
    per[name] = {'km2': round(own.area / 1e6, 1), 'gebaeude': nb, 'strassen_km': round(car), 'wege_km': round(foot)}
    for k in tot: tot[k] += per[name][k]
    taken = field if taken is None else taken.union(field)
tot = {k: round(v, 1) if k == 'km2' else round(v) for k, v in tot.items()}
json.dump({'stand': '2026-11-13', 'gesamt': tot, 'regionen': per}, open('public/data/umfang.json', 'w'), ensure_ascii=False, indent=1)
print(tot); print(per)
