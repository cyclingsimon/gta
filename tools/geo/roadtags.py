"""Strassen-Details aus OpenStreetMap (Abfrage 13.11.2026, data/e4/osm/strassen.json: alle trunk/primary/secondary/tertiary im Raum Luzern)
an die Hauptstrassen in public/data[/REGION]/city.json hängen. Je Strasse (Felder nur, wenn bekannt):
  L  Fahrstreifen gesamt, sw [links, rechts] Trottoir, cy [l, r] Velostreifen, bu [l, r] Busstreifen, v Tempo, ref Strassennummer
links/rechts beziehen sich auf die Punktfolge in city.json (bei umgekehrter OSM-Richtung getauscht)."""
import json, math, os, sys
from shapely.geometry import LineString, Point
from shapely.strtree import STRtree
KX, KZ = math.cos(math.radians(47.0517)) * 111320, 110574
L = lambda g: (round((g['lon'] - 8.3077) * KX, 2), round(-(g['lat'] - 47.0517) * KZ, 2))
ways = [e for e in json.load(open('data/e4/osm/strassen.json'))['elements'] if e.get('geometry')]
geoms = [LineString([L(g) for g in e['geometry'] if g]) for e in ways]
tree = STRtree(geoms)
MAIN = ('trunk', 'primary', 'secondary', 'tertiary', 'trunk_link', 'primary_link', 'secondary_link')
def yes(v): return v not in (None, 'no', 'none', 'separate')
def side(t, key, s):
    v = t.get(f'{key}:{s}', t.get(f'{key}:both'))
    if v is None and key == 'sidewalk' and 'sidewalk' in t: v = 'yes' if t['sidewalk'] in ('both', s) else 'no'
    if v is None and key == 'cycleway' and 'cycleway' in t: v = t['cycleway']
    return 1 if (v == 'lane' if key == 'cycleway' else yes(v)) else 0
def num(v):
    try: return int(str(v).split(';')[0].split()[0])
    except Exception: return None
for d in sys.argv[1:] or ['public/data', 'public/data/nord', 'public/data/ost', 'public/data/west', 'public/data/sued']:
    if not os.path.exists(d + '/city.json'): continue
    c = json.load(open(d + '/city.json')); n = hit = 0
    for r in c['roads']:
        for k in ('L', 'sw', 'cy', 'bu', 'v', 'ref'): r.pop(k, None)
        if 'w0' in r: r['w'] = r['w0']
        elif r['c'] in MAIN: r['w0'] = r['w']  # ursprüngliche Breite merken (Skript ist wiederholbar)
        if r['c'] not in MAIN or len(r['p']) < 2: continue
        n += 1; ln = LineString(r['p']); mid = ln.interpolate(0.5, normalized=True)
        best = None
        for i in tree.query(mid.buffer(6)):
            g = geoms[i]; dd = g.distance(mid)
            if dd > 5: continue
            sc = dd + (0 if ways[i]['tags'].get('highway') == r['c'] else 3) + (0 if ways[i]['tags'].get('name', '') == r.get('n', '') else 2)
            if best is None or sc < best[0]: best = (sc, i)
        if not best: continue
        hit += 1; t = ways[best[1]]['tags']; g = geoms[best[1]]
        # Richtung vergleichen
        s0 = g.project(Point(r['p'][0])); s1 = g.project(Point(r['p'][-1])); same = s1 >= s0
        sw = [side(t, 'sidewalk', 'left'), side(t, 'sidewalk', 'right')]; cy = [side(t, 'cycleway', 'left'), side(t, 'cycleway', 'right')]
        bf, bb = 'bus' in str(t.get('bus:lanes:forward', '')) or 'designated' in str(t.get('bus:lanes:forward', '')), 'designated' in str(t.get('bus:lanes:backward', ''))
        if t.get('bus:lanes') and 'designated' in t['bus:lanes']: bf = True
        bu = [1 if bb else 0, 1 if bf else 0]  # rechts = Vorwärtsrichtung (Rechtsverkehr)
        if not same: sw, cy, bu = sw[::-1], cy[::-1], bu[::-1]
        lanes = num(t.get('lanes'))
        if lanes: r['L'] = lanes
        if lanes and not r.get('b'):  # Fahrbahnbreite aus Streifen: 3.1 m je Fahrstreifen, 1.5 m je Velostreifen (Annahme nach VSS-Regelmass)
            w0 = lanes * 3.1 + 1.5 * (cy[0] + cy[1]); r['w'] = round(max(4.0 if r.get('o') else 6.0, min(16.0, w0)), 1)
        if any(sw): r['sw'] = sw
        if any(cy): r['cy'] = cy
        if any(bu): r['bu'] = bu
        v = num(t.get('maxspeed'))
        if v: r['v'] = v
        if t.get('ref'): r['ref'] = t['ref']
    json.dump(c, open(d + '/city.json', 'w'), separators=(',', ':'), ensure_ascii=False)
    print(d, 'Hauptstrassen', n, 'mit OSM-Details', hit)
# Trottoirs: separat erfasste Fusswege (OSM footway, oft sidewalk=separate), die parallel neben einer Fahrstrasse liegen (≤ 9 m, Richtung ±25°)
# und keine Fahrstrasse kreuzen → Feld «tr»: 1 (im Spiel 12 cm erhöht, grauer Belag, Randstein)
CARS = ('primary', 'secondary', 'tertiary', 'trunk', 'residential', 'unclassified', 'living_street', 'service', 'primary_link', 'secondary_link', 'tertiary_link')
for d in sys.argv[1:] or ['public/data', 'public/data/nord', 'public/data/ost', 'public/data/west', 'public/data/sued']:
    if not os.path.exists(d + '/city.json'): continue
    c = json.load(open(d + '/city.json'))
    cr = [r for r in c['roads'] if r['c'] in CARS and len(r['p']) > 1]; cg = [LineString(r['p']) for r in cr]; ct = STRtree(cg)
    n = 0
    for r in c['roads']:
        r.pop('tr', None)
        if r['c'] != 'footway' or len(r['p']) < 2 or r.get('b'): continue
        g = LineString(r['p'])
        if g.length < 6: continue
        hits = [i for i in ct.query(g.buffer(9)) if cg[i].distance(g) < 9]
        if not hits or any(cg[i].crosses(g) or cg[i].distance(g) < 0.5 for i in hits): continue
        a = r['p'][0]; b = r['p'][-1]; ang = math.atan2(b[1] - a[1], b[0] - a[0])
        ok = False
        for i in hits:
            q = cg[i]; s = q.project(g.interpolate(0.5, normalized=True)); p1 = q.interpolate(max(0, s - 3)); p2 = q.interpolate(min(q.length, s + 3))
            a2 = math.atan2(p2.y - p1.y, p2.x - p1.x); da = abs((ang - a2 + math.pi / 2) % math.pi - math.pi / 2)
            if da < 0.45: ok = True; break
        if ok: r['tr'] = 1; n += 1
    json.dump(c, open(d + '/city.json', 'w'), separators=(',', ':'), ensure_ascii=False)
    print(d, 'Trottoirs', n)
