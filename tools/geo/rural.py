"""Ländliche Gebäude für Gebiet A (OSM-Grundrisse ohne Höhenangabe) realistischer machen.

Problem: build_city setzt untypisierte Gebäude (building=yes, 2/3 aller Häuser im Gebiet A) auf 12 m
(±). Auf dem Land sind das meist Einfamilienhäuser (Traufe ~6–8 m), Bauernhäuser, Scheunen und Hallen.

Regeln (Annahme, nach Schweizer Bauweise; keine Höhendaten verfügbar):
- Dichte = Anzahl Gebäude im Umkreis von 120 m. < 22 → ländlich (Weiler/Hof), sonst Siedlung.
- shed/Kleinbau < 30 m²: 2.6 m · Garage/Anbau < 70 m²: 3.2 m
- Wohnhaus 70–300 m²: 6.8–8.4 m (2 Geschosse + Dach), in der Siedlung bis 9.5 m
- ländlich 300–1500 m² (oder barn/farm_auxiliary/stable/cowshed): Scheune, Typ «barn», 6.5–8 m Traufe
- > 1500 m² (oder ländlich > 1200): Halle, Typ «hall», 8–10 m, Flachdach
- In der Siedlung 300–1500 m² untypisiert: bleibt Block (Höhe wie bisher)
Gebäude, deren Höhe nicht im Band der Standardhöhe liegt (= OSM hatte height/levels), bleiben unverändert.

Aufruf: LR=a2 python3 tools/geo/rural.py   (schreibt public/data/<LR>/city.json zurück; wiederholbar über Felder 'h0'/'t0')
"""
import json, os, math, hashlib, sys
from collections import defaultdict

LR = os.environ.get('LR') or (sys.argv[1] if len(sys.argv) > 1 else '')
if not LR.startswith('a'):
    sys.exit('nur Gebiet A (LR=a1..a9)')
P = f'public/data/{LR}/city.json'
d = json.load(open(P))
DEFAULT_H = {'house': 10, 'detached': 9, 'residential': 15, 'apartments': 16, 'garage': 4, 'garages': 3.5, 'shed': 3,
             'barn': 12, 'farm_auxiliary': 12, 'farm': 12, 'stable': 12, 'cowshed': 12, '': 12, 'yes': 12, 'industrial': 10,
             'commercial': 15, 'retail': 12}
RURAL_T = set(DEFAULT_H)
BARN_T = {'barn', 'farm_auxiliary', 'stable', 'cowshed', 'sty', 'hut'}


def area(p):
    return abs(sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))) / 2


def cen(p):
    return sum(x for x, _ in p) / len(p), sum(z for _, z in p) / len(p)


def jit(x, z, k=0):
    return int(hashlib.md5(f'{x:.0f},{z:.0f},{k}'.encode()).hexdigest()[:4], 16) / 65535


B = d['buildings']
C = [cen(b['p']) for b in B]
grid = defaultdict(list)
for i, (x, z) in enumerate(C):
    grid[(int(x // 120), int(z // 120))].append(i)


def dens(x, z):
    gi, gj = int(x // 120), int(z // 120)
    n = 0
    for a in (-1, 0, 1):
        for b in (-1, 0, 1):
            for k in grid.get((gi + a, gj + b), ()):
                if (C[k][0] - x) ** 2 + (C[k][1] - z) ** 2 < 120 * 120:
                    n += 1
    return n


stat = defaultdict(int)
for b, (x, z) in zip(B, C):
    t = b.get('t0', b.get('t', ''))
    if t not in RURAL_T:
        continue
    h0 = b.get('h0', b['h'])
    base = DEFAULT_H[t]
    if not (base * 0.84 <= h0 <= base * 1.21 + 0.05):
        stat['osm-hoehe'] += 1
        continue
    b['h0'] = h0; b['t0'] = t
    a = area(b['p'])
    rural = dens(x, z) < 22
    j = jit(x, z)
    nt, h = t, h0
    if t in BARN_T:
        nt, h = ('shed', 2.6 + j) if a < 40 else ('barn', 6.5 + 1.5 * j)
    elif t in ('garage', 'garages', 'shed'):
        h = 2.6 + 0.8 * j
    elif a < 30:
        nt, h = 'shed', 2.6 + 0.6 * j
    elif a < 70:
        h = 3.0 + 0.6 * j
        nt = 'garage' if t in ('', 'yes') else t
    elif a < 300:
        h = (6.8 + 1.6 * j) if rural else (7.2 + 2.3 * j)
        if t in ('', 'yes'):
            nt = 'house'
    elif t in ('', 'yes', 'farm') and (a > 1500 or (rural and a > 1200)):
        nt, h = 'hall', 8 + 2 * j
    elif t in ('', 'yes', 'farm') and rural:
        nt, h = ('barn', 6.5 + 1.5 * j) if t != 'farm' else ('farm', 8 + j)
    else:
        continue
    b['t'], b['h'] = nt, round(h, 1)
    stat[nt] += 1
json.dump(d, open(P, 'w'), separators=(',', ':'))
print(LR, len(B), dict(stat))
