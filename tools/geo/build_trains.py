"""Zugstrecken aus OSM-Gleisen (city.json rail) → public/data/trains.json.
Gleisstücke werden zu einem Graphen verbunden; Strecken = kürzeste Wege zwischen Bahnhof und Spielfeldrand."""
import json, math, heapq
c = json.load(open('public/data/city.json'))
key = lambda p: (round(p[0] / 3), round(p[1] / 3))
adj = {}
pos = {}
for r in c['rail']:
    for a, b in zip(r, r[1:]):
        ka, kb = key(a), key(b); pos[ka] = a; pos[kb] = b
        d = math.dist(a, b)
        adj.setdefault(ka, []).append((kb, d)); adj.setdefault(kb, []).append((ka, d))
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
     ('S-Bahn Küssnacht', 'sbb', (205, 240), (1149, -630)),
     ('IR Richtung Zürich', 'sbb', (175, 240), (-1137, -1101)),
     ('S-Bahn Emmenbrücke', 'sbb', (160, 240), (-1640, -1101)),
     ('Zentralbahn Horw', 'zb', (-126, 3453), (-72, 4539))]
out = []
for name, kind, a, b in R:
    r = route(a, b)
    if not r: print('keine Strecke', name); continue
    pts, L = r
    gaps = max(math.dist(p, q) for p, q in zip(pts, pts[1:]))
    print(f'{name:22} {kind} {L:6.0f} m  Punkte {len(pts)}  grösste Lücke {gaps:.0f} m  {pts[0]} → {pts[-1]}')
    out.append({'name': name, 'kind': kind, 'pts': pts})
json.dump(out, open('public/data/trains.json', 'w'), separators=(',', ':'))
