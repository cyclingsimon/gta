"""Gebiet A: Spital/Rettungsposten und 8 Einsätze je Region aus OpenStreetMap ableiten → public/data/aN/missions.json.
Einsatzorte sind echte OSM-Orte (Spielplatz, Schulhaus, Bahnhof, Badi, Kirche, Hof, Sportplatz, Aussichtspunkt). Spital: echtes
OSM-Spital (Sursee, Wolhusen), sonst ein erfundener Rettungsposten beim Gemeindehaus des grössten Orts (wie Meggen/Littau).
Aufruf: missions_a.py aN"""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from regions_a import REGIONS_A
rid = sys.argv[1]; RNAME, (X0, Z0, X1, Z1) = REGIONS_A[rid]
KX, KZ = math.cos(math.radians(47.0517)) * 111320, 110574
L = lambda la, lo: (round((lo - 8.3077) * KX, 1), round(-(la - 47.0517) * KZ, 1))
els = []
for q in range(4):
    els += json.load(open(f'data/a/raw/osm_{rid}_{q}.json'))['elements']
def pos(e):
    if e['type'] == 'node': return L(e['lat'], e['lon'])
    g = [x for x in e.get('geometry', []) if x]
    if not g: return None
    return L(sum(x['lat'] for x in g) / len(g), sum(x['lon'] for x in g) / len(g))
inside = lambda p, m=250: X0 + m < p[0] < X1 - m and Z0 + m < p[1] < Z1 - m
places = []  # (name, x, z, rang)
RANK = {'town': 3, 'village': 2, 'suburb': 1, 'hamlet': 0}
for e in els:
    t = e.get('tags', {})
    if e['type'] == 'node' and t.get('place') in RANK and t.get('name'):
        p = pos(e); places.append((t['name'], p[0], p[1], RANK[t['place']]))
def near_place(p, min_rank=0):
    c = [q for q in places if q[3] >= min_rank] or places
    return min(c, key=lambda q: math.dist(p, q[1:3]))[0] if c else RNAME.split()[0]
# --- Spital / Rettungsposten ---
hosp = None
for e in els:
    t = e.get('tags', {})
    if t.get('amenity') == 'hospital' and t.get('name') and e['type'] in ('way', 'relation', 'node'):
        p = pos(e)
        if p and inside(p, 0): hosp = {'name': t['name'], 'label': 'Spital ' + near_place(p, 2), 'x': p[0], 'z': p[1], 'kind': 'spital'}; break
if not hosp:
    big = [q for q in places if inside(q[1:3], 300)]
    big.sort(key=lambda q: (-q[3], math.dist(q[1:3], ((X0 + X1) / 2, (Z0 + Z1) / 2))))
    town = big[0] if big else (RNAME, (X0 + X1) / 2, (Z0 + Z1) / 2, 0)
    th = [pos(e) for e in els if e.get('tags', {}).get('amenity') == 'townhall' and pos(e)]
    th = [p for p in th if math.dist(p, town[1:3]) < 1200]
    p = min(th, key=lambda p: math.dist(p, town[1:3])) if th else town[1:3]
    hosp = {'name': f'Rettungsposten {town[0]}', 'label': f'Rettungsposten {town[0]}', 'x': round(p[0], 1), 'z': round(p[1], 1), 'kind': 'rp'}
H = hosp['label']; TO = ('ins ' if hosp['kind'] == 'spital' else 'zum ') + H
# --- Kandidaten ---
def cat(t):
    if t.get('leisure') == 'playground': return 'spielplatz'
    if t.get('amenity') in ('school', 'kindergarten'): return 'schule'
    if t.get('railway') in ('station', 'halt') or (t.get('public_transport') == 'station' and t.get('train') == 'yes'): return 'bahnhof'
    if t.get('leisure') in ('swimming_pool', 'water_park', 'beach_resort') or t.get('natural') == 'beach': return 'badi'
    if t.get('amenity') == 'place_of_worship': return 'kirche'
    if t.get('landuse') == 'farmyard': return 'hof'
    if t.get('leisure') in ('pitch', 'sports_centre') and t.get('sport') in ('soccer', 'multi', None): return 'sport'
    if t.get('tourism') in ('viewpoint', 'attraction'): return 'aussicht'
    return None
cands = []
for e in els:
    t = e.get('tags', {}); k = cat(t)
    if not k: continue
    if k == 'badi' and t.get('access') == 'private': continue
    p = pos(e)
    if not p or not inside(p) or math.dist(p, (hosp['x'], hosp['z'])) < 300: continue
    cands.append((k, p, t.get('name', '')))
def text(k, p, nm):
    ort = near_place(p)
    if k == 'spielplatz':
        pl = nm or f'Spielplatz {ort}'
        return dict(title='Sturz auf dem Spielplatz', place=pl, radio=f'Auf dem {pl if pl.startswith("Spielplatz") else "Spielplatz " + pl} ist ein Kind von der Rutschbahn gerutscht. Ein Pflaster bitte!', game='plaster', transport=False, prop='kid', thanks='Pflaster drauf – und weiter spielen!')
    if k == 'schule':
        pl = nm or f'Schulhaus {ort}'
        return dict(title='Sturz auf dem Pausenplatz', place=pl, radio=f'Beim {pl if pl.lower().startswith(("schul", "kinder")) else "Schulhaus " + pl} ist ein Kind auf dem Pausenplatz hingefallen. Das Knie braucht einen Verband.', game='bandage', transport=False, prop='kid', thanks='Sauber verbunden – ab in die Pause!')
    if k == 'bahnhof':
        pl = f'Bahnhof {nm or ort}'
        return dict(title=f'Bauchweh am Bahnhof', place=pl, radio=f'Am {pl} hat ein Kind nach der Zugfahrt Bauchweh. Bitte {TO} bringen.', game='memory', transport=True, prop='kid', thanks='Mit Tee geht es wieder. Gute Reise!')
    if k == 'badi':
        pl = nm or f'Badi {ort}'
        return dict(title='Sonnenstich in der Badi', place=pl, radio=f'In der {pl if pl.lower().startswith(("badi", "bad")) else "Badi " + pl} ist einem Kind vom vielen Sonnenbaden ganz heiss und schwindlig.', game='water', transport=False, prop='kid', thanks='Wasser trinken und ab in den Schatten. Merci!')
    if k == 'kirche':
        pl = f'Kirche {ort}'
        return dict(title=f'Fieber in {ort}', place=pl, radio=f'Bei der Kirche in {ort} fühlt sich ein Kind ganz heiss an. Bitte Fieber messen und {TO} bringen.', game='thermo', transport=True, prop='kid', thanks=f'{"Im Spital" if hosp["kind"] == "spital" else "Am Rettungsposten"} gibt es Tee und ein kühles Tuch. Gute Besserung!')
    if k == 'hof':
        pl = f'Bauernhof bei {ort}'
        return dict(title=f'Katze in {ort}', place=pl, radio=f'Auf einem Bauernhof bei {ort} sitzt eine Katze ganz oben im Baum und miaut.', game='cat', transport=False, prop='cat', thanks='Die Katze ist wieder unten bei den Kühen. Danke, Luksi!')
    if k == 'sport':
        pl = nm or f'Sportplatz {ort}'
        return dict(title='Beule beim Fussball', place=pl, radio=f'Auf dem {pl if pl.lower().startswith("sport") else "Sportplatz " + pl} hat ein Kind beim Fussball den Ball an den Kopf bekommen und weint.', game='comfort', transport=False, prop='kid', thanks='Kühlbeutel drauf – und weiter tschutten!')
    pl = nm or f'Aussichtspunkt bei {ort}'
    return dict(title='Wanderer ganz schwindlig', place=pl, radio=f'Beim {pl if pl.lower().startswith("aussicht") else "Aussichtspunkt " + pl} ist ein Wanderer ganz schwindlig. Bitte {TO} bringen.', game='water', transport=True, prop='tourist', thanks='Wasser und eine Pause – schon besser. Merci!')
# Auswahl: verschiedene Arten zuerst, dann gut verteilt (Abstand ≥ 700 m), höchstens 8
ORDER = ['spielplatz', 'bahnhof', 'schule', 'badi', 'kirche', 'hof', 'sport', 'aussicht']
chosen = []
for rnd in range(3):
    for k in ORDER:
        if len(chosen) >= 8: break
        if rnd == 0 and any(c[0] == k for c in chosen): continue
        opts = [c for c in cands if c[0] == k and all(math.dist(c[1], o[1]) >= 700 for o in chosen) and not any(c[2] and c[2] == o[2] for o in chosen)]
        if not opts: continue
        # am weitesten weg von den bisherigen (und vom Spital)
        best = max(opts, key=lambda c: min([math.dist(c[1], o[1]) for o in chosen] + [math.dist(c[1], (hosp['x'], hosp['z']))]))
        chosen.append(best)
ms = []
for i, (k, p, nm) in enumerate(chosen):
    m = text(k, p, nm); m.update(id=f'{rid}m{i + 1}', at=[p[0], p[1]]); ms.append(m)
towns = sorted({near_place(c[1], 1) for c in chosen} | {near_place((hosp['x'], hosp['z']), 2)})
out = {'region': rid, 'name': RNAME, 'hosp': hosp, 'missions': ms,
       'welcome': f'Willkommen in {RNAME}! {"Das " + H + " ist" if hosp["kind"] == "spital" else "Der " + H + " ist"} auf der Karte blau markiert.',
       'heartsWhere': f'in {RNAME}'}
json.dump(out, open(f'public/data/{rid}/missions.json', 'w'), ensure_ascii=False, indent=1)
print(H, len(ms), 'Einsätze:', ', '.join(m['place'] for m in ms))
