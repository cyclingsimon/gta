"""OSM-Buslinien (VBL, PostAuto) → public/data/bus.json: echte Linienwege im Spielfeld, Haltestellen, Fahrzeugtyp."""
import re, json, math, os
OUT = 'public/data' + ('/' + os.environ['LR'] if os.environ.get('LR') else '')
d = json.load(open(os.environ.get('LR_BUS', 'data/osm_bus.json')))
props = json.load(open(OUT + '/props.json'))
LAT0, LON0 = 47.0517, 8.3077
KX, KZ = math.cos(math.radians(LAT0)) * 111320, 110574
X0, Z0, X1, Z1 = [float(v) for v in os.environ.get('LR_BOUNDS', '-3790,-1090,2690,6290').split(',')]
L = lambda la, lo: (round((lo - LON0) * KX, 1), round(-(la - LAT0) * KZ, 1))
inside = lambda p: X0 < p[0] < X1 and Z0 < p[1] < Z1
DOUBLE = {'1', '2', '8'}            # Hess lighTram 25 (doppelgelenkig)
ARTIC = {'4', '5', '6', '7', '12', '24', '30', '21'}
TROLLEY = {'1', '2', '4', '5', '6', '7', '8'}
def chain(rel):
    ws = [d['ways'][str(m[1])] for m in rel['m'] if m[0] == 'w' and m[2] in ('', 'forward', 'backward') and str(m[1]) in d['ways']]
    path = []
    for w in ws:
        w = [L(*p) for p in w]
        if not path: path = list(w); continue
        e = path[-1]
        ds = math.dist(e, w[0]); de = math.dist(e, w[-1])
        if len(path) >= 2 and min(ds, de) > 3:  # erstes Stück evtl. falsch herum
            s0 = path[0]
            if min(math.dist(s0, w[0]), math.dist(s0, w[-1])) < min(ds, de): path.reverse(); e = path[-1]; ds = math.dist(e, w[0]); de = math.dist(e, w[-1])
        if de < ds: w = w[::-1]
        if min(ds, de) > 40: path.append(None)
        path.extend(w[1:] if min(ds, de) < 1 else w)
    # längstes zusammenhängendes Stück im Spielfeld
    segs, cur = [], []
    for p in path:
        if p is None or not inside(p):
            if len(cur) > 1: segs.append(cur)
            cur = []
        else: cur.append(p)
    if len(cur) > 1: segs.append(cur)
    if not segs: return None
    seg = max(segs, key=lambda s: sum(math.dist(a, b) for a, b in zip(s, s[1:])))
    out = [seg[0]]
    for p in seg[1:]:
        if math.dist(out[-1], p) > 0.8: out.append(p)
    return out
lines = []
for r in d['rels']:
    t = r['t']; op = t.get('op') or t.get('operator') or ''; ref = t.get('ref') or ''
    if op not in ('VBL', 'PAG', 'AAGR') and not os.environ.get('LR', '').startswith('a'): continue  # Gebiet A: alle Betreiber (PostAuto, Rottal Auto, …)  # AAGR = Auto AG Rothenburg (Emmen, Region Nord)
    # 13o: nur Ortsverkehr (Fernbusse wie Flixbus und ausländische Reisecars weg). Betreiber: PostAuto, VBL, Auto AG Rothenburg/Uri?, Rottal Auto, ZVB, Auto AG Schwyz
    if op not in ('PAG', 'VBL', 'AAGR', 'ARAG', 'AAGU', 'ZVB', 'AAGS', 'SGV') or not ref or len(ref) > 3: continue
    pts = chain(r)
    if not pts: continue
    length = sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))
    if length < 400: continue
    cum = [0.0]
    for a, b in zip(pts, pts[1:]): cum.append(cum[-1] + math.dist(a, b))
    stops = []
    for sx, sz, *rest in props['stops']:
        best = None
        for i, (a, b) in enumerate(zip(pts, pts[1:])):
            vx, vz = b[0] - a[0], b[1] - a[1]; l2 = vx * vx + vz * vz or 1
            u = max(0, min(1, ((sx - a[0]) * vx + (sz - a[1]) * vz) / l2))
            dd = math.dist((sx, sz), (a[0] + u * vx, a[1] + u * vz))
            side = ((sx - a[0]) * -vz + (sz - a[1]) * vx) / math.sqrt(l2)  # >0 = rechts der Fahrtrichtung
            if dd < 14 and side > -2.5 and (best is None or dd < best[0]): best = (dd, cum[i] + u * math.sqrt(l2))
        if best and not any(abs(best[1] - s[0]) < 25 or (s[1] == (rest[0] if rest else '') and abs(best[1] - s[0]) < 120) for s in stops): stops.append([round(best[1], 1), rest[0] if rest else ''])
    stops.sort()
    kind = 'double' if ref in DOUBLE else 'artic' if ref in ARTIC else 'rigid'
    lines.append({'ref': ref, 'op': op, 'to': (t.get('to') or '').replace('Luzern, ', ''), 'kind': kind, 'trolley': ref in TROLLEY and op == 'VBL',
                  'len': round(length), 'pts': [[round(x, 1), round(z, 1)] for x, z in pts], 'stops': stops})
# je Linie+Ziel nur die längste Variante
best = {}
for l in lines:
    k = (l['ref'], l['to'])
    if k not in best or l['len'] > best[k]['len']: best[k] = l
lines = sorted(best.values(), key=lambda l: (len(l['ref']), l['ref']))
json.dump(lines, open(OUT + '/bus.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for l in lines: print(l['ref'], l['op'], l['kind'], l['to'], l['len'], 'm', len(l['stops']), 'Halte:', ', '.join(s[1] for s in l['stops'][:6]))
print(len(lines), 'Linienwege')
