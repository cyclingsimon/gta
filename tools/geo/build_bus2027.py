"""Neues Busnetz «Luzern fährt neu direkt» ab 13.12.2026 (Fahrplan 2027).
Quelle Linienliste: https://www.luzern-faehrt-neu.ch/busnetz (abgerufen 11.11.2026).
OpenStreetMap kennt die neuen Linien noch nicht → neue Linienwege werden aus den bisherigen OSM-Linienwegen
zusammengesetzt (zwischen echten Haltestellen geschnitten). Annahmen sind im Spec markiert.
Eingabe: public/data/bus.json (Stand 2026, aus build_bus.py) → data/bus_2026.json (Sicherung) + bus.json (2027)."""
import json, math, os, shutil
SRC = 'data/bus_2026.json'
if not os.path.exists(SRC): shutil.copy('public/data/bus.json', SRC)
old = json.load(open(SRC))

def find(ref, to):
    c = [l for l in old if l['ref'] == ref and to in l['to']]
    if not c: raise SystemExit(f'Linie {ref} → {to} fehlt')
    return max(c, key=lambda l: l['len'])

def cum(p):
    c = [0.0]
    for a, b in zip(p, p[1:]): c.append(c[-1] + math.dist(a, b))
    return c

def stop_s(l, name, first=True):
    ss = [s for s, n in l['stops'] if n == name]
    if not ss: raise SystemExit(f"Halt {name} fehlt auf {l['ref']} → {l['to']}")
    return ss[0] if first else ss[-1]

def cut(l, a, b):
    """Teilstück von Bogenlänge a bis b (None = Anfang/Ende), inkl. Haltestellen."""
    P, C = l['pts'], cum(l['pts'])
    a = 0 if a is None else a; b = C[-1] if b is None else b
    def at(s):
        for i in range(1, len(C)):
            if C[i] >= s:
                u = (s - C[i - 1]) / ((C[i] - C[i - 1]) or 1); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u]
        return list(P[-1])
    pts = [at(a)] + [list(P[i]) for i in range(len(P)) if a < C[i] < b] + [at(b)]
    stops = [[s - a, n] for s, n in l['stops'] if a - 1 <= s <= b + 1]
    return pts, stops

def seg(ref, to, frm=None, until=None):
    l = find(ref, to)
    return cut(l, None if frm is None else stop_s(l, frm), None if until is None else stop_s(l, until, first=False))

def rev(part):
    pts, stops = part; L = cum(pts)[-1]
    return pts[::-1], sorted([[L - s, n] for s, n in stops])

def join(parts):
    pts, stops = [], []
    for p, st in parts:
        off = cum(pts)[-1] if pts else 0
        if pts and math.dist(pts[-1], p[0]) < 1: p = p[1:]; off2 = off
        else: off2 = off + (math.dist(pts[-1], p[0]) if pts else 0)
        for s, n in st:
            if not stops or n != stops[-1][1] or off2 + s - stops[-1][0] > 30: stops.append([round(off2 + s, 1), n])
        pts += [list(q) for q in p]
    return pts, stops

out = []
def add(ref, to, kind, trolley, parts, wire=True, op='VBL'):
    pts, stops = join(parts)
    out.append({'ref': ref, 'op': op, 'to': to, 'kind': kind, 'trolley': trolley, 'wire': wire, 'len': round(cum(pts)[-1]),
                'pts': [[round(x, 1), round(z, 1)] for x, z in pts], 'stops': stops})
def keep(ref, to, newref=None, newto=None):
    l = dict(find(ref, to)); l['ref'] = newref or ref
    if newto: l['to'] = newto
    l.setdefault('wire', l['trolley']); out.append(l)

# --- unverändert ---
keep('1', 'Obernau'); keep('1', 'Ebikon')
keep('2', 'Sprengi'); keep('2', 'Bahnhof')
keep('7', 'Unterlöchli'); keep('7', 'Biregghof')
keep('11', 'Dattenberg'); keep('11', 'Bahnhof')
keep('18', 'Bramberg'); keep('18', 'Pilatusplatz', newto='Bahnhof')
keep('6', 'Matthof'); keep('6', 'Büttenenhalde')          # nur Hauptverkehrszeit
keep('71', 'Eigenthal'); keep('71', 'Bahnhof'); keep('72', 'Neuenkirch'); keep('72', 'Bahnhof')
keep('73', 'Rotkreuz'); keep('73', 'Bahnhof')
# --- umnummeriert ---
keep('4', 'Hubelmatt', '5'); keep('4', 'Bahnhof', '5')          # neue 5 = bisherige 4 (HVZ bis Maihof)
keep('10', 'Obergütsch', '17'); keep('10', 'Bahnhof', '17')      # neue 17 = bisherige 10
keep('14', 'Horw, Zentrum', '30'); keep('14', 'Brüelstrasse', '30', 'Klinik St. Anna')  # neue 30 = bisherige 14
keep('15', 'Kriens, Busschleife', '15', 'Gabeldingen')           # neue Schlaufe
# --- neue Durchmesserlinien (Annahme: Batterie-Trolleybusse 3/4/9/21 als Gelenk-Trolleybus, fahren abseits der Leitung mit Batterie) ---
add('3', 'Büttenenhalde', 'artic', True, [seg('12', 'Bahnhof'), seg('6', 'Büttenenhalde', 'Luzern Bahnhof')], wire=False)
add('3', 'Littau, Gasshof', 'artic', True, [seg('6', 'Matthof', None, 'Luzern Bahnhof'), seg('12', 'Gasshof', 'Luzern Bahnhof')], wire=False)
add('4', 'Würzenbach', 'artic', True, [seg('12', 'Bahnhof'), seg('8', 'Würzenbach', 'Luzern Bahnhof')], wire=False)
add('4', 'Littau, Gasshof', 'artic', True, [seg('8', 'Hirtenhof', None, 'Luzern Bahnhof'), seg('12', 'Gasshof', 'Luzern Bahnhof')], wire=False)
add('8', 'Friedental', 'double', True, [seg('8', 'Würzenbach', None, 'Luzern Bahnhof'), seg('2', 'Sprengi', 'Luzern Bahnhof', 'Kasernenplatz'), seg('18', 'Bramberg', 'Kasernenplatz', 'St. Karli'), seg('19', 'Friedental', 'St. Karli')], wire=False)
add('8', 'Hirtenhof', 'double', True, [seg('19', 'Bahnhof', None, 'St. Karli'), seg('18', 'Pilatusplatz', 'St. Karli', 'Kasernenplatz'), seg('2', 'Bahnhof', 'Kasernenplatz', 'Luzern Bahnhof'), seg('8', 'Hirtenhof', 'Luzern Bahnhof')], wire=False)
add('9', 'Littau, Bahnhof', 'artic', True, [seg('6', 'Büttenenhalde', None, 'Luzern Bahnhof'), seg('2', 'Sprengi', 'Luzern Bahnhof', 'Kasernenplatz'), seg('18', 'Bramberg', 'Kasernenplatz', 'St. Karli'), seg('30', 'Littau', 'St. Karli')], wire=False)
add('9', 'Matthof', 'artic', True, [seg('30', 'Ebikon', None, 'St. Karli'), seg('18', 'Pilatusplatz', 'St. Karli', 'Kasernenplatz'), seg('2', 'Bahnhof', 'Kasernenplatz', 'Luzern Bahnhof'), seg('6', 'Matthof', 'Luzern Bahnhof')], wire=False)
add('20', 'Horw, Ennethorw', 'rigid', False, [seg('24', 'Bahnhof', None, 'Luzern Bahnhof'), seg('20', 'Ennethorw', 'Luzern Bahnhof')])
add('20', 'Horw, Technikumstrasse', 'rigid', False, [seg('24', 'Bahnhof', None, 'Luzern Bahnhof'), seg('20', 'Technikumstrasse', 'Luzern Bahnhof')])
add('20', 'Meggen, Tschädigen', 'rigid', False, [seg('20', 'Bahnhof', None, 'Luzern Bahnhof'), seg('24', 'Meggen', 'Luzern Bahnhof')])
add('21', 'Emmenbrücke, Bahnhof Süd', 'artic', True, [seg('30', 'Littau', None, 'Kreuzstutz'), seg('5', 'Emmenbrücke', 'Kreuzstutz')], wire=False)
add('21', 'Ebikon, Bahnhof', 'artic', True, [seg('5', 'Kriens', None, 'Kreuzstutz'), seg('30', 'Ebikon', 'Kreuzstutz')], wire=False)
add('31', 'Horw, Spitz', 'rigid', False, [rev(seg('15', 'Pilatus-Bahnen')), seg('16', 'Spitz', 'Kriens Busschleife')])
add('31', 'Kriens, Pilatus-Bahnen', 'rigid', False, [seg('16', 'Kriens, Busschleife'), seg('15', 'Pilatus-Bahnen')])
add('32', 'Kastanienbaum', 'artic', False, [seg('21', 'Horw, Zentrum')])                     # Stadtteil bis Spielfeldrand
add('32', 'Bahnhof', 'artic', False, [rev(seg('21', 'Horw, Zentrum'))])
add('32', 'Kriens, Sidhalde', 'artic', False, [seg('21', 'Kriens, Busschleife'), seg('15', 'Sidhalde', 'Kriens Busschleife')])
add('32', 'Bahnhof', 'artic', False, [rev(seg('15', 'Sidhalde', 'Kriens Busschleife')), seg('21', 'Bahnhof')])
add('33', 'Adligenswil, Widspüel', 'artic', False, [seg('1', 'Ebikon', 'Kriens Busschleife', 'Luzern Bahnhof'), seg('73', 'Adligenswil', 'Luzern Bahnhof')])
add('33', 'Kriens, Busschleife', 'artic', False, [seg('73', 'Bahnhof', None, 'Luzern Bahnhof'), seg('1', 'Obernau', 'Luzern Bahnhof', 'Kriens Busschleife')])

from shapely.geometry import Polygon, LineString
from shapely.strtree import STRtree
_city = json.load(open('public/data/city.json'))
_polys = [Polygon(b['p']).buffer(-1.5) for b in _city['buildings'] if len(b['p']) >= 3 and b.get('t') not in ('roof', 'carport')]
_polys = [q for q in _polys if q.is_valid and not q.is_empty]
_tree = STRtree(_polys)
def through_house(a, b):
    ln = LineString([a, b]); return any(_polys[i].intersects(ln) for i in _tree.query(ln))
# Lücken (fehlende OSM-Stücke) nicht quer durch Häuser überbrücken: Linie dort teilen
split = []
for l in out:
    P = l['pts']; C = cum(P); start = 0
    cuts = [i for i in range(1, len(P)) if math.dist(P[i - 1], P[i]) > 25 and through_house(P[i - 1], P[i])] + [len(P)]
    for c in cuts:
        seg = P[start:c]
        if len(seg) >= 2 and cum(seg)[-1] > 400:
            a, b = C[start], C[c - 1]
            split.append(dict(l, pts=seg, len=round(b - a), stops=[[round(s0 - a, 1), n] for s0, n in l['stops'] if a - 1 <= s0 <= b + 1]))
        start = c
out = split
for l in out:
    gaps = max((math.dist(a, b) for a, b in zip(l['pts'], l['pts'][1:])), default=0)
    print(f"{l['ref']:>3} {l['kind']:6} {'T' if l['trolley'] else ' '}{'W' if l['wire'] else ' '} → {l['to']:28} {l['len']:5} m  Halte {len(l['stops']):2}  grösste Lücke {gaps:5.0f} m")
json.dump(out, open('public/data/bus.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'Linienwege (Fahrplan 2027)')
