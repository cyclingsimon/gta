"""Bahnhofplatz und Europaplatz Luzern aus OpenStreetMap (Abfrage 13.11.2026, data/e4/osm/bahnhof.json) → public/data/city.json:
  plazas    + Europaplatz (Fussgängerwege «Europaplatz» 14 m gepuffert, ohne Gebäude, Fahrstrassen und Wasser) und Fussgänger-Flächen am Bahnhof
  busIslands  Bus-Perrons (highway=platform, Fläche) → erhöhte Inseln mit Randstein
  shelters    Wartehallen/Dächer (building=roof) mit Höhe
  wagenbach   Wagenbachbrunnen (Becken-Umriss)"""
import json, math
from shapely.geometry import Polygon, LineString, mapping
from shapely.ops import unary_union
KX, KZ = math.cos(math.radians(47.0517)) * 111320, 110574
L = lambda g: [round((g['lon'] - 8.3077) * KX, 1), round(-(g['lat'] - 47.0517) * KZ, 1)]
els = json.load(open('data/e4/osm/bahnhof.json'))['elements']
c = json.load(open('public/data/city.json'))
def poly(e):
    g = [L(q) for q in e.get('geometry') or [] if q]
    if len(g) < 4: return None
    try: P = Polygon(g).buffer(0); return P if P.area > 2 else None
    except Exception: return None
def rings(P):
    out = []
    for q in (getattr(P, 'geoms', None) or [P]):
        if q.area < 20: continue
        out.append({'p': [[round(x, 1), round(z, 1)] for x, z in list(q.exterior.coords)[:-1]], 'h': [[[round(x, 1), round(z, 1)] for x, z in list(i.coords)[:-1]] for i in q.interiors]})
    return out
isl, sh, wb, ped = [], [], None, []
for e in els:
    t = e.get('tags', {})
    if e['type'] != 'way': continue
    if t.get('highway') == 'platform' and t.get('area') == 'yes' and 'bus' in (t.get('bus', '') + t.get('public_transport', '') + 'bus'):
        P = poly(e)
        if P: isl.append([[round(x, 1), round(z, 1)] for x, z in list(P.exterior.coords)[:-1]])
    elif t.get('building') == 'roof' and 'ferry' not in t.get('amenity', ''):
        P = poly(e)
        if P and P.area < 3000: sh.append({'p': [[round(x, 1), round(z, 1)] for x, z in list(P.exterior.coords)[:-1]], 'h': float(str(t.get('height', '3.5')).split()[0])})
    elif t.get('name') == 'Wagenbachbrunnen':
        P = poly(e)
        if P: wb = [[round(x, 1), round(z, 1)] for x, z in list(P.exterior.coords)[:-1]]
    elif t.get('area') == 'yes' and t.get('highway') in ('footway', 'pedestrian'):
        P = poly(e)
        if P: ped.append(P)
# Europaplatz: die OSM-Fussgängerwege mit diesem Namen, gepuffert
eu = [LineString(r['p']).buffer(14) for r in c['roads'] if r.get('n') == 'Europaplatz' and len(r['p']) > 1]
cut = []
for b in c['buildings']:
    if b.get('n', '').startswith('KKL') or True:
        try: cut.append(Polygon(b['p']).buffer(0.5))
        except Exception: pass
for r in c['roads']:
    if r['c'] in ('primary', 'secondary', 'tertiary', 'residential', 'service', 'unclassified', 'primary_link', 'trunk') and len(r['p']) > 1: cut.append(LineString(r['p']).buffer(r['w'] / 2 + 0.3))
for w in c['water']:
    p = w['multi'][0] if isinstance(w, dict) and 'multi' in w else (w['p'] if isinstance(w, dict) else w)
    try: cut.append(Polygon(p).buffer(0))
    except Exception: pass
from shapely.geometry import box
CUT = unary_union([q for q in cut if q.intersects(box(-100, -100, 600, 500))])
EU = unary_union(eu).difference(CUT) if eu else None
PED = unary_union(ped).difference(CUT) if ped else None
c['plazas'] = [q for q in c.get('plazas', []) if q.get('n') not in ('Europaplatz', 'Bahnhof Fussgänger')]
if EU: c['plazas'] += [dict(r, n='Europaplatz') for r in rings(EU)]
if PED: c['plazas'] += [dict(r, n='Bahnhof Fussgänger') for r in rings(PED)]
# Bahnhofplatz: Grundfläche zwischen Seebrücke, Bahnhof und KKL als Asphalt (statt Luftbild mit Bussen und Dächern)
bx = box(95, 40, 300, 160)
bcut = []
for b in c['buildings']:
    try: bcut.append(Polygon(b['p']).buffer(0.3))
    except Exception: pass
for w in c['water']:
    p = w['multi'][0] if isinstance(w, dict) and 'multi' in w else (w['p'] if isinstance(w, dict) else w)
    try: bcut.append(Polygon(p).buffer(1))
    except Exception: pass
FILL = bx.difference(unary_union([q for q in bcut if q.intersects(bx)]))
if EU: FILL = FILL.difference(EU.buffer(0.5))
if PED: FILL = FILL.difference(PED.buffer(0.5))
FILL = FILL.difference(unary_union([Polygon(q['p']).buffer(0) for q in c.get('plazas', []) if len(q['p']) > 2 and Polygon(q['p']).buffer(0).intersects(bx)] or [Polygon()]))
c['bhfFill'] = rings(FILL)
c['busIslands'] = isl; c['shelters'] = sh; c['wagenbach'] = wb
json.dump(c, open('public/data/city.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print('Bahnhofplatz-Fläche', round(FILL.area), 'm²;', 'Europaplatz', round(EU.area) if EU else 0, 'm²; Fussgängerflächen', round(PED.area) if PED else 0, 'm²; Bus-Inseln', len(isl), 'Dächer', len(sh), 'Wagenbach', bool(wb))
