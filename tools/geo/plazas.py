"""Plätze (OSM highway=pedestrian + area=yes, area:highway=pedestrian, Abfrage 12./13.11.2026) → «plazas» in public/data[/REGION]/city.json.
Grund: auf Plätzen zeigte der Luftbild-Boden Dächer und Schatten; jetzt liegt dort Pflaster (Kapellplatz, Weinmarkt, Europaplatz …)."""
import json, math, os
KX, KZ = math.cos(math.radians(47.0517)) * 111320, 110574
L = lambda g: [round((g['lon'] - 8.3077) * KX, 1), round(-(g['lat'] - 47.0517) * KZ, 1)]
out = []
SRC = json.load(open('data/e3/osm/plaetze.json'))['elements']
if os.path.exists('data/e4/osm/sued.json'): SRC += [e for e in json.load(open('data/e4/osm/sued.json'))['elements'] if e['type'] in ('way', 'relation')]
for e in SRC:
    t = e.get('tags', {})
    if not ((t.get('highway') == 'pedestrian' and t.get('area') == 'yes') or t.get('area:highway') in ('pedestrian',)): continue
    if e['type'] == 'way' and e.get('geometry'):
        p = [L(g) for g in e['geometry'] if g]
        if len(p) >= 4: out.append({'p': p[:-1] if p[0] == p[-1] else p, 'h': [], 'n': t.get('name', '')})
    elif e['type'] == 'relation':
        outer = [[L(g) for g in m['geometry'] if g] for m in e.get('members', []) if m.get('role') == 'outer' and m.get('geometry')]
        inner = [[L(g) for g in m['geometry'] if g] for m in e.get('members', []) if m.get('role') == 'inner' and m.get('geometry')]
        for p in outer:
            if len(p) >= 4: out.append({'p': p[:-1] if p[0] == p[-1] else p, 'h': [q[:-1] if q[0] == q[-1] else q for q in inner], 'n': t.get('name', '')})
for d in ('public/data', 'public/data/nord', 'public/data/ost', 'public/data/west', 'public/data/sued'):
    if not os.path.exists(d + '/city.json'): continue
    c = json.load(open(d + '/city.json')); X0, Z0, X1, Z1 = c['meta']['bounds']
    c['plazas'] = [q for q in out if all(X0 < x < X1 and Z0 < z < Z1 for x, z in q['p'])]
    json.dump(c, open(d + '/city.json', 'w'), separators=(',', ':'), ensure_ascii=False)
    print(d, len(c['plazas']), [q['n'] for q in c['plazas'] if q['n']][:12])
