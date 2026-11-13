"""Kantonsstrassen-Paket (13j): Kreisel, Mittelinseln und Ortsnamen aus OpenStreetMap → city.json / props.json einer Region.
- «rbs»: Kreisel [x, z, Radius] aus junction=roundabout|circular (zusammenhängende Wegstücke = ein Kreisel), Radius 6–45 m
- «isl» (props.json): Mittelinseln [x, z] an Fussgängerstreifen (crossing:island=yes, traffic_calming=island)
- «places» (city.json): Ortsnamen [Name, x, z, Rang 0–3] für Ortstafeln (Rang: hamlet 0, suburb 1, village 2, town/city 3)
Aufruf: kreisel.py REGIONSORDNER rohdaten.json [rohdaten2.json …]   (Overpass «out geom»)"""
import json, math, os, sys
KX, KZ = math.cos(math.radians(47.0517)) * 111320, 110574
L = lambda la, lo: (round((lo - 8.3077) * KX, 1), round(-(la - 47.0517) * KZ, 1))
d = sys.argv[1]; els, seen = [], set()
for f in sys.argv[2:]:
    for e in json.load(open(f))['elements']:
        k = (e['type'], e['id'])
        if k not in seen: seen.add(k); els.append(e)
c = json.load(open(d + '/city.json')); X0, Z0, X1, Z1 = c['meta']['bounds']
inside = lambda p, m=0: X0 - m < p[0] < X1 + m and Z0 - m < p[1] < Z1 + m
# --- Kreisel: Wegstücke mit gemeinsamen Endknoten zusammenfassen (Union-Find über Knoten-IDs) ---
ways = [e for e in els if e['type'] == 'way' and e.get('tags', {}).get('junction') in ('roundabout', 'circular') and e.get('geometry')]
par = {}
def find(a):
    while par.setdefault(a, a) != a: par[a] = par[par[a]]; a = par[a]
    return a
for w in ways:
    ns = w.get('nodes') or []
    if ns:
        for n in ns[1:]: par[find(n)] = find(ns[0])
groups = {}
for w in ways:
    ns = w.get('nodes') or [w['id'] * -1]
    groups.setdefault(find(ns[0]), []).append(w)
rbs = []
for g in groups.values():
    pts = [L(p['lat'], p['lon']) for w in g for p in w['geometry'] if p]
    if len(pts) < 4: continue
    cx, cz = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
    rs = [math.dist(p, (cx, cz)) for p in pts]; r = sum(rs) / len(rs)
    # nur echte, (fast) geschlossene Ringe: Streuung des Radius klein und Punkte rundum verteilt
    angs = sorted(math.atan2(p[1] - cz, p[0] - cx) for p in pts); gap = max([b - a for a, b in zip(angs, angs[1:])] + [angs[0] + 2 * math.pi - angs[-1]])
    if not (6 <= r <= 45) or max(rs) - min(rs) > max(4, r * 0.35) or gap > 2.2: continue
    if inside((cx, cz)): rbs.append([round(cx, 1), round(cz, 1), round(r, 1)])
c['rbs'] = rbs
# --- Ortsnamen ---
RANK = {'hamlet': 0, 'suburb': 1, 'village': 2, 'town': 3, 'city': 3}
pl = []
for e in els:
    t = e.get('tags', {})
    if e['type'] == 'node' and t.get('place') in RANK and t.get('name'):
        p = L(e['lat'], e['lon'])
        if inside(p, 1500): pl.append([t['name'], p[0], p[1], RANK[t['place']]])
c['places'] = pl
json.dump(c, open(d + '/city.json', 'w'), separators=(',', ':'), ensure_ascii=False)
# --- Mittelinseln ---
isl = []
for e in els:
    t = e.get('tags', {})
    if e['type'] == 'node' and (t.get('crossing:island') == 'yes' or t.get('traffic_calming') == 'island'):
        p = L(e['lat'], e['lon'])
        if inside(p) and not any(math.dist(p, q) < 6 for q in isl): isl.append(list(p))
pj = json.load(open(d + '/props.json')); pj['isl'] = isl
json.dump(pj, open(d + '/props.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print(d, 'Kreisel', len(rbs), 'Mittelinseln', len(isl), 'Orte', len(pl))
