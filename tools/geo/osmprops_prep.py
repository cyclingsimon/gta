"""15b/16a: OSM-Kleinobjekte aufbereiten. Eingabe: Rohdatei (lat/lon) aus Overpass (über den Browser auf Simons PC geholt,
15.11.2026, © OpenStreetMap-Mitwirkende, ODbL). Ausgabe: public/data/osmprops.json in Spielkoordinaten (m, 0.1 genau).
Aufruf: python3 -I tools/geo/osmprops_prep.py ROH.json"""
import json, math, sys, glob, gzip, os
o = json.load(open(sys.argv[1]))
C = math.cos(math.radians(47.0517)) * 111320
def g(lat, lon): return [round((lon - 8.3077) * C, 1), round((47.0517 - lat) * 110574, 1)]
def dedupe(P, d):
    out = []
    for p in P:
        if not any(abs(p[0] - q[0]) < d and abs(p[1] - q[1]) < d for q in out): out.append(p)
    return out
# Strassen aller Gegenden (für die Richtung der Bahnübergänge)
R = []
for d in ['public/data'] + sorted(glob.glob('public/data/*/')):
    for n in ('city.json', 'city.json.gz'):
        p = os.path.join(d, n)
        if os.path.exists(p):
            R += [r['p'] for r in json.load(gzip.open(p) if n.endswith('gz') else open(p))['roads']]; break
def road_rot(x, z):
    best = 40 * 40; rot = None
    for P in R:
        for k in range(len(P) - 1):
            ax, az = P[k]; bx, bz = P[k + 1]
            if min(ax, bx) - 40 > x or max(ax, bx) + 40 < x or min(az, bz) - 40 > z or max(az, bz) + 40 < z: continue
            dx, dz = bx - ax, bz - az; L = dx * dx + dz * dz
            if L < 1: continue
            t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L)); dd = (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2
            if dd < best: best = dd; rot = round(math.atan2(-dz, dx), 3)
    return rot
out = {'quelle': 'OpenStreetMap über Overpass, 15.11.2026, © OpenStreetMap-Mitwirkende (ODbL)'}
out['spiel'] = dedupe([g(*p) for p in o['spiel'] if p], 30)
out['platz'] = [[s, [g(*q) for q in P[:-1] if True]] for s, P in o['platz'] if 4 <= len(P) <= 12 and s in ('soccer', 'tennis', 'basketball')]
out['mast'] = [g(*p) for p in o['mast']]
out['leitung'] = [[g(*q) for q in P] for v, P in o['leitung'] if len(P) >= 2]
bue = []
for lat, lon, _ in o['bue']:
    x, z = g(lat, lon); rot = road_rot(x, z)
    if rot is not None: bue.append([x, z, rot])   # nur Übergänge an einer Strasse, die es im Spiel gibt
out['bue'] = bue
turm = []
for lat, lon, kind, h, tt in o['turm']:
    try: hh = float(str(h).replace('m', '').strip()) if h else 0
    except ValueError: hh = 0
    if kind == 'chimney' and hh >= 20: turm.append(g(lat, lon) + ['chimney', round(hh)])
    elif kind in ('mast', 'communications_tower') or (kind == 'tower' and tt == 'communication'):
        if tt == 'lighting': turm.append(g(lat, lon) + ['mast', round(hh) if hh else 18])   # Flutlichtmast
        elif tt in ('communication', '') or kind == 'communications_tower': turm.append(g(lat, lon) + ['mast', round(hh) if hh else 30])
out['turm'] = turm
for k in ('hydrant', 'recycling', 'post', 'blitzer'): out[k] = [g(*p) for p in o[k] if p]
json.dump(out, open('public/data/osmprops.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print({k: len(v) for k, v in out.items() if k != 'quelle'}, os.path.getsize('public/data/osmprops.json') // 1024, 'KB')
