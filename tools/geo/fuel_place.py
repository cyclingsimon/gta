"""15b: Tankstellen-Standorte bereinigen. Liest public/data/fuel.json (Feld «roh» = OSM-Punkte in Spielkoordinaten) und alle
city.json der Gegenden. Liegt ein Punkt in einem Gebäude, das kein Vordach ist (t != 'roof'), wird er an den Rand der nächsten
Strasse geschoben und als «kompakt» markiert (dritter Wert 1: nur Zapfinsel + Preistafel, kein Dach) – sonst stünde das Dach im Haus.
Aufruf: python3 -I tools/geo/fuel_place.py"""
import json, math, glob, gzip, os
import numpy as np
J = json.load(open('public/data/fuel.json')); RAW = J.get('roh') or [p[:2] for p in J['p']]
def load(d):
    for n in ('city.json', 'city.json.gz'):
        p = os.path.join(d, n)
        if os.path.exists(p): return json.load(gzip.open(p) if n.endswith('gz') else open(p))
def inpoly(x, z, P):
    c = False; n = len(P)
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]
        if (a[1] > z) != (b[1] > z) and x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]: c = not c
    return c
def load_b3d(d):
    """swissBUILDINGS3D der Gegend: je Gebäude Rechteck + Dreiecke (x/z in m) + Höhe; None, wenn die Gegend keine hat"""
    jp, bp = os.path.join(d, 'b3d.json'), os.path.join(d, 'b3d.bin')
    if not (os.path.exists(jp) and os.path.exists(bp)): return None
    m = json.load(open(jp)); raw = np.fromfile(bp, dtype=np.int16, count=m['posBytes'] // 2).reshape(-1, 3).astype(np.float32) / 10; yabs = np.fromfile(bp, dtype=np.int16, count=m['posBytes'] // 2).reshape(-1, 3)[:, 1].astype(np.float32) / 10
    idx = np.fromfile(bp, dtype=np.uint16, offset=m['posBytes'] + m.get('pad', 0), count=m['idxCount'])
    L = []
    for b in m['buildings']:
        vS, vC, iS, iC, cx, cz, y0, y1 = b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8]
        v = raw[vS:vS + vC, [0, 2]] + (np.array([cx, cz], dtype=np.float32) if m.get('rel') else 0)
        yy = yabs[vS:vS + vC]
        L.append((v[:, 0].min(), v[:, 1].min(), v[:, 0].max(), v[:, 1].max(), v, idx[iS:iS + iC].reshape(-1, 3), yy - yy.min()))
    return L
def in_b3d(L, x, z):
    """Höhe der Dachfläche über dem tiefsten Punkt des 3D-Gebäudes an der Stelle (x, z); 0 = kein Gebäude"""
    best = 0.0
    for x0, z0, x1, z1, v, tri, yy in L or []:
        if x < x0 or x > x1 or z < z0 or z > z1: continue
        a, b, c = v[tri[:, 0]], v[tri[:, 1]], v[tri[:, 2]]
        d1 = (x - b[:, 0]) * (a[:, 1] - b[:, 1]) - (a[:, 0] - b[:, 0]) * (z - b[:, 1])
        d2 = (x - c[:, 0]) * (b[:, 1] - c[:, 1]) - (b[:, 0] - c[:, 0]) * (z - c[:, 1])
        d3 = (x - a[:, 0]) * (c[:, 1] - a[:, 1]) - (c[:, 0] - a[:, 0]) * (z - a[:, 1])
        ar = np.abs((b[:, 0] - a[:, 0]) * (c[:, 1] - a[:, 1]) - (b[:, 1] - a[:, 1]) * (c[:, 0] - a[:, 0]))
        ok = (ar > 0.05) & (((d1 >= 0) & (d2 >= 0) & (d3 >= 0)) | ((d1 <= 0) & (d2 <= 0) & (d3 <= 0)))
        if np.any(ok): best = max(best, float(np.maximum(np.maximum(yy[tri[ok, 0]], yy[tri[ok, 1]]), yy[tri[ok, 2]]).max()), 0.1)
    return best
out = {}; stat = {'dach': 0, 'haus': 0, 'frei': 0, 'verschoben': 0}
for d in ['public/data'] + sorted(glob.glob('public/data/*/')):
    c = load(d)
    if not c: continue
    R = c['roads']; B = c['buildings']; B3 = load_b3d(d)
    xs = [p[0] for r in R for p in r['p']]; zs = [p[1] for r in R for p in r['p']]
    if not xs: continue
    bb = (min(xs), min(zs), max(xs), max(zs))
    near = lambda x, z, m=40: [b for b in B if any(abs(q[0] - x) < m and abs(q[1] - z) < m for q in b['p'][:1]) or inpoly(x, z, b['p'])]
    for i, (x, z) in enumerate(RAW):
        if i in out or not (bb[0] < x < bb[2] and bb[1] < z < bb[3]): continue
        hit = next((b for b in B if inpoly(x, z, b['p'])), None)
        # 15b Block 13: auch gegen die echten 3D-Gebäude prüfen. Die lokale Dachhöhe trennt Vordach und Haus NICHT sauber
        # (Vordächer 7.7–8.9, Häuser 6.8–9.6 über dem tiefsten Gebäudepunkt) – darum: OSM-Vordach bleibt; OSM-frei unter einem
        # niedrigen 3D-Dach (≤ 10.5) bleibt (Annahme Tankstellendach); OSM-Haus oder hohes 3D-Haus → an den Strassenrand, kompakt.
        h3 = in_b3d(B3, x, z)
        if hit and hit.get('t') == 'roof': out[i] = [x, z]; stat['dach'] += 1; continue
        if not hit and h3 <= 10.5: out[i] = [x, z]; stat['frei' if h3 == 0 else '3D-Dach'] = stat.get('frei' if h3 == 0 else '3D-Dach', 0) + 1; continue
        stat['haus' if hit else '3D-Haus'] = stat.get('haus' if hit else '3D-Haus', 0) + 1
        best = None
        for r in R:
            P = r['p']
            for k in range(len(P) - 1):
                ax, az = P[k]; bx, bz = P[k + 1]; dx, dz = bx - ax, bz - az; L = dx * dx + dz * dz
                if L < 1: continue
                t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L)); qx, qz = ax + dx * t, az + dz * t; dd = math.hypot(qx - x, qz - z)
                if best is None or dd < best[0]: best = (dd, qx, qz, r.get('w', 6), dx / math.sqrt(L), dz / math.sqrt(L))
        pos = None
        def frei(nx, nz):  # nicht in einem Haus und nicht auf einer Fahrbahn (Zapfinsel 7 m lang → 3 m Luft zum Rand)
            if any(inpoly(nx, nz, b['p']) for b in B if b.get('t') != 'roof') or in_b3d(B3, nx, nz) > 0: return False
            for r in R:
                P = r['p']; lim = r.get('w', 6) / 2 + 3
                for k in range(len(P) - 1):
                    ax, az = P[k]; bx, bz = P[k + 1]
                    if min(ax, bx) - lim > nx or max(ax, bx) + lim < nx or min(az, bz) - lim > nz or max(az, bz) + lim < nz: continue
                    dx, dz = bx - ax, bz - az; L = dx * dx + dz * dz
                    if L < 1: continue
                    t = max(0, min(1, ((nx - ax) * dx + (nz - az) * dz) / L))
                    if math.hypot(ax + dx * t - nx, az + dz * t - nz) < lim: return False
            return True
        if best and best[0] < 80:
            dd, qx, qz, w, tx, tz = best; ux, uz = ((x - qx) / dd, (z - qz) / dd) if dd > 0.5 else (-tz, tx)
            for along in (0, 8, -8, 16, -16, 24, -24):
                for off in (w / 2 + 3.5, w / 2 + 6):
                    for s in (1, -1):
                        nx, nz = qx + tx * along + s * ux * off, qz + tz * along + s * uz * off
                        if frei(nx, nz) and frei(nx + tx * 3.5, nz + tz * 3.5) and frei(nx - tx * 3.5, nz - tz * 3.5): pos = [round(nx, 1), round(nz, 1), 1]; break
                    if pos: break
                if pos: break
        if not pos: stat['ohne Platz'] = stat.get('ohne Platz', 0) + 1
        if pos: stat['verschoben'] += 1
        out[i] = pos or [x, z, 2]  # 2 = kein freier Platz gefunden → wird nicht gezeichnet
P = [out.get(i, list(RAW[i])) for i in range(len(RAW))]
J['roh'] = RAW; J['p'] = P
json.dump(J, open('public/data/fuel.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(RAW), 'Punkte,', len(out), 'in geladenen Gegenden', stat, 'kompakt:', sum(1 for p in P if len(p) > 2))
