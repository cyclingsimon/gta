"""Zugstrecken aus OSM-Gleisen (city.json rail) → public/data/trains.json.
Gleisstücke werden zu einem Graphen verbunden; Strecken = kürzeste Wege zwischen Bahnhof und Spielfeldrand."""
import json, math, heapq, os
OUT = 'public/data' + ('/' + os.environ['LR'] if os.environ.get('LR') else '')
TUNF = os.environ.get('LR_TUN', 'data/tunnels.json')
from shapely.geometry import LineString, Point
from shapely.ops import unary_union
TUNU = unary_union([LineString(t['p']).buffer(6) for t in json.load(open(TUNF)) if len(t['p']) > 1]) if os.path.exists(TUNF) else None
c = json.load(open(OUT + '/city.json'))
key = lambda p: (round(p[0] / 3), round(p[1] / 3))
adj = {}
pos = {}
for r in c.get('railAll', c['rail']):
    for a, b in zip(r, r[1:]):
        ka, kb = key(a), key(b); pos[ka] = a; pos[kb] = b
        d = math.dist(a, b)
        adj.setdefault(ka, []).append((kb, d)); adj.setdefault(kb, []).append((ka, d))
if os.environ.get('LR'):  # Nord/Ost: Gleisenden an der Nahtstelle z = −950 (zwei OSM-Stände) bis 25 m verbinden
    dang = [k for k, v in adj.items() if len(v) == 1]
    segs = [(key(a), key(b), a, b) for r in c.get('railAll', c['rail']) for a, b in zip(r, r[1:])]
    for ka in dang:  # Gleisende auf das nächste fremde Gleisstück (Weiche) bis 20 m einhängen
        P = pos[ka]; best = None
        for k1, k2, a, b in segs:
            if ka in (k1, k2): continue
            dx, dz = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dz * dz or 1e-9
            t = max(0, min(1, ((P[0] - a[0]) * dx + (P[1] - a[1]) * dz) / L2)); q = [a[0] + dx * t, a[1] + dz * t]; d = math.dist(P, q)
            if d < 20 and (best is None or d < best[0]): best = (d, k1, k2, q)
        if not best: continue
        d, k1, k2, q = best; kq = (ka[0] + 0.5, ka[1] + 0.5, 1); pos[kq] = q
        for kk in (k1, k2): w = math.dist(q, pos[kk]); adj.setdefault(kq, []).append((kk, w)); adj[kk].append((kq, w))
        adj[ka].append((kq, d)); adj[kq].append((ka, d))
def near(p):
    return min(pos, key=lambda k: math.dist(pos[k], p))
def route(a, b):
    s, t = near(a), near(b); dist = {s: 0}; prev = {}; q = [(0, s)]
    while q:
        d, u = heapq.heappop(q)
        if u == t: break
        if d > dist.get(u, 1e18): continue
        for v, w in adj.get(u, []):
            nd = d + w
            if nd < dist.get(v, 1e18): dist[v] = nd; prev[v] = u; heapq.heappush(q, (nd, v))
    if t not in dist: return None
    path = [t]
    while path[-1] != s: path.append(prev[path[-1]])
    return [[round(pos[k][0], 1), round(pos[k][1], 1)] for k in reversed(path)], dist[t]
R = [('S-Bahn Littau', 'sbb', (190, 240), (-3801, -245)),
     ('S-Bahn Küssnacht', 'sbb', (205, 240), (2699, 133)),
     ('IR Richtung Zürich', 'sbb', (175, 240), (-1137, -1101)),
     ('S-Bahn Emmenbrücke', 'sbb', (160, 240), (-1640, -1101)),
     ('Zentralbahn Luzern–Horw', 'zb', (130, 330), (361, 6299))]
if os.environ.get('LR') == 'nord':  # Region Nord: Strecken zwischen Spielfeldrändern (Kreuzungspunkte der Gleise mit dem Rand)
    # OSM-Streckennummern (Abfrage 13.11.): 500 Rothenburg–Olten verlässt das Feld am Nordrand bei x ≈ −2026, 651 Seetalbahn bei x ≈ −1998
    R = [('S-Bahn Rothenburg', 'sbb', (-1580, -552), (-2026, -3898)),
         ('S-Bahn Seetal (Hochdorf)', 'sbb', (-1585, -552), (-1998, -3899)),
         ('IR Richtung Zürich', 'sbb', (-1578, -552), (2929, -3899))]
if os.environ.get('LR') == 'ost':  # Region Ost: S-Bahn Luzern–Küssnacht via Meggen (Westrand bei Würzenbach → Nordostrand Richtung Merlischachen)
    R = [('S-Bahn Küssnacht', 'sbb', (2501, -157), (7499, -1655)), ('S-Bahn Luzern', 'sbb', (7499, -1655), (2501, -157))]
if os.environ.get('LR') == 'west':  # Region West: S-Bahn Luzern–Littau–Malters (Ostrand → Westrand entlang der Kleinen Emme)
    R = [('S-Bahn Malters', 'sbb', (-3601, -496), (-8499, 1228)), ('S-Bahn Luzern', 'sbb', (-8499, 1228), (-3601, -496))]
if os.environ.get('LR') == 'sued':  # Region Süd: Zentralbahn Luzern–Hergiswil, dort Richtung Stans/Engelberg und Brünig (Alpnachstad)
    R = [('Zentralbahn Stans', 'zb', (305, 6101), (4599, 10387)), ('Zentralbahn Luzern', 'zb', (4599, 10387), (305, 6101)),
         ('Zentralbahn Brünig', 'zb', (303, 6101), (-2317, 10999)), ('Zentralbahn Luzern', 'zb', (-2317, 10999), (303, 6101))]
if os.environ.get('LR', '').startswith('a'):  # Gebiet A (13i): Strecken automatisch zwischen den Punkten, wo Gleise den Feldrand kreuzen
    from shapely.geometry import box as _box
    X0, Z0, X1, Z1 = c['meta']['bounds']; edge = _box(X0 + 1, Z0 + 1, X1 - 1, Z1 - 1).exterior
    xs = []
    for r in c.get('rail', []):
        if len(r) < 2: continue
        g = LineString(r).intersection(edge)
        for q in ([g] if g.geom_type == 'Point' else list(getattr(g, 'geoms', []))):
            if q.geom_type == 'Point' and not any(math.dist((q.x, q.y), x) < 80 for x in xs): xs.append((round(q.x, 1), round(q.y, 1)))
    R, used = [], []
    pairs = sorted(((math.dist(p, q), p, q) for i, p in enumerate(xs) for q in xs[i + 1:]), reverse=True)
    for _, p, q in pairs:
        r = route(p, q)
        if not r or r[1] < 1500 or math.dist(r[0][0], p) > 40 or math.dist(r[0][-1], q) > 40: continue
        mid = r[0][len(r[0]) // 2]
        if any(min(math.dist(mid, u) for u in uu) < 30 for uu in used): continue
        used.append(r[0]); R += [('S-Bahn', 'sbb', p, q), ('S-Bahn', 'sbb', q, p)]
        if len(R) >= 4: break
out = []
for name, kind, a, b in R:
    r = route(a, b)
    if not r: print('keine Strecke', name); continue
    pts, L = r
    gaps = max([math.dist(p, q) for p, q in zip(pts, pts[1:])] or [0])
    print(f'{name:22} {kind} {L:6.0f} m  Punkte {len(pts)}  grösste Lücke {gaps:.0f} m  {pts[0]} → {pts[-1]}')
    # Tunnelabschnitte (OpenStreetMap tunnel=*) als Bogenlängen-Intervalle: dort sind die Wagen unsichtbar
    tun = []
    if TUNU is not None:
        acc = 0.0; cur = None
        for p0, p1 in zip(pts, pts[1:]):
            seg = math.dist(p0, p1); n = max(1, int(seg / 4))
            for k in range(n):
                s0 = acc + seg * k / n; q = (p0[0] + (p1[0] - p0[0]) * (k + 0.5) / n, p0[1] + (p1[1] - p0[1]) * (k + 0.5) / n)
                inside = TUNU.contains(Point(q))
                if inside and cur is None: cur = s0
                if not inside and cur is not None: tun.append([round(cur, 1), round(s0, 1)]); cur = None
            acc += seg
        if cur is not None: tun.append([round(cur, 1), round(acc, 1)])
        tun = [t for t in tun if t[1] - t[0] > 25]
    print('   Tunnel:', tun)
    out.append({'name': name, 'kind': kind, 'pts': pts, 'tun': tun})
json.dump(out, open(OUT + '/trains.json', 'w'), separators=(',', ':'))
