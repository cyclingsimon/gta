#!/usr/bin/env python3
"""P-B Lauf 5: Übersichtskarte für die Schnellreise (ruhiger Landeskarten-Stil, ohne Text).

Liest NUR (nichts schreiben) aus dem Hauptcheckout:
  <DATA>/city.json, <DATA>/<gegend>/city.json(.gz)   – Strassen, Gewässer, Gebäude, Bahn (OSM, © OpenStreetMap-Mitwirkende, ODbL)
  <DATA>/forest.png, <DATA>/<gegend>/forest.png       – Waldmaske (4 m, Ursprung = meta.bounds[0..1])
  <DATA>/horizon.json/.bin                            – Höhenraster 200 m (swissALTI3D, © swisstopo) → Relief + Seen ausserhalb der Gegenden
Schreibt: public/karte.jpg (≈1400 px breit) und public/karte.json {x0,z0,x1,z1} (Spielkoordinaten der Bildränder; x Ost, z Süd).

Aufruf (im Worktree): python3 tools/geo/karte.py [DATA] [AUSGABEORDNER]
"""
import json, gzip, os, sys, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

DATA = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/gta/public/data'
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', '..', 'public')
W_OUT = 1400
SS = 2                      # Überabtastung (Kantenglättung), am Ende verkleinert
PAD = 1500                  # Rand um die Gegenden (m)

# Farben (ruhige Landeskarte)
C_OUT = (226, 229, 214)     # ausserhalb der Daten: entsättigtes Hellgrau-Grün
C_LAND = (241, 238, 222)    # Land hell beige
C_FOREST = (172, 201, 148)  # Wald
C_TOWN = (226, 210, 206)    # Siedlung hellgrau-rosa
C_WATER = (158, 197, 228)   # Seen/Flüsse
C_WATER_EDGE = (110, 160, 205)
C_MOTORWAY = (226, 92, 52)  # Autobahn orange-rot
C_MOTORWAY_CASE = (150, 50, 30)
C_MAIN = (255, 246, 196)    # Hauptstrasse weiss-gelb
C_MAIN_CASE = (120, 110, 95)
C_MINOR = (255, 255, 250)
C_RAIL = (40, 40, 40)


def load(p):
    if os.path.exists(p):
        return json.load(open(p))
    if os.path.exists(p + '.gz'):
        return json.load(gzip.open(p + '.gz'))
    return None


def main():
    regions = []
    for d in [DATA] + sorted(x for x in glob.glob(os.path.join(DATA, '*')) if os.path.isdir(x)):
        c = load(os.path.join(d, 'city.json'))
        if c:
            regions.append((d, c))
    print('Gegenden', len(regions))
    bs = [c['meta']['bounds'] for _, c in regions]
    x0 = min(b[0] for b in bs) - PAD; z0 = min(b[1] for b in bs) - PAD
    x1 = max(b[2] for b in bs) + PAD; z1 = max(b[3] for b in bs) + PAD
    W = W_OUT * SS
    H = int(round(W * (z1 - z0) / (x1 - x0)))
    mpp = (x1 - x0) / W
    print(f'Ausschnitt x {x0}..{x1}, z {z0}..{z1}, {W // SS}×{H // SS} px, {mpp * SS:.1f} m/px')
    P = lambda x, z: ((x - x0) / mpp, (z - z0) / mpp)

    # --- Relief und Seen aus dem 200-m-Höhenraster (auch ausserhalb der Gegenden) ---
    hz = json.load(open(os.path.join(DATA, 'horizon.json')))
    hraw = np.fromfile(os.path.join(DATA, 'horizon.bin'), dtype='<i2').reshape(hz['nz'], hz['nx']).astype(np.float32) * hz['scale']
    ys, xs = np.mgrid[0:H, 0:W]
    gx = (x0 + (xs + 0.5) * mpp - hz['x0']) / hz['step']; gz = (z0 + (ys + 0.5) * mpp - hz['z0']) / hz['step']
    gx = np.clip(gx, 0, hz['nx'] - 1.001); gz = np.clip(gz, 0, hz['nz'] - 1.001)
    i0 = gx.astype(int); j0 = gz.astype(int); fx = gx - i0; fz = gz - j0
    h = (hraw[j0, i0] * (1 - fx) * (1 - fz) + hraw[j0, i0 + 1] * fx * (1 - fz) + hraw[j0 + 1, i0] * (1 - fx) * fz + hraw[j0 + 1, i0 + 1] * fx * fz)
    # glätten (Raster 200 m, 0,1-m-Stufen → sonst Treppen/Streifen): dreimal Kastenfilter ≈ Gauss
    def boxblur(a, r):
        for _ in range(3):
            c = np.cumsum(np.pad(a, ((0, 0), (r + 1, r)), mode='edge'), axis=1); a = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
            c = np.cumsum(np.pad(a, ((r + 1, r), (0, 0)), mode='edge'), axis=0); a = (c[2 * r + 1:, :] - c[:-2 * r - 1, :]) / (2 * r + 1)
        return a
    h = boxblur(h, max(1, int(70 / mpp)))
    dzx = np.gradient(h, axis=1) / mpp; dzz = np.gradient(h, axis=0) / mpp
    # Licht von Nordwesten (Kartenkonvention): x Ost, z Süd → Licht aus (−x, −z), Höhe 45°
    lx, lz, ly = -0.5, -0.5, 0.7071
    nrm = np.sqrt(dzx ** 2 + dzz ** 2 + 1)
    shade = (-dzx * lx - dzz * lz + ly) / nrm / ly  # 1 = flach
    shade = np.clip(shade, 0.45, 1.25)
    # Seen ausserhalb: Raster-Zellen, deren Nachbarn alle auf ±0,25 m gleich hoch sind (Seespiegel)
    flat = np.ones_like(hraw, dtype=bool)
    for dj in (-1, 0, 1):
        for di in (-1, 0, 1):
            flat &= np.abs(np.roll(np.roll(hraw, dj, 0), di, 1) - hraw) < 0.25
    flat[0, :] = flat[-1, :] = flat[:, 0] = flat[:, -1] = False
    vws = flat & (np.abs(hraw) < 0.8)  # Vierwaldstättersee (Spiegel 433,6 m = Höhe 0): auch innerhalb der Gegenden, schliesst an Gegendgrenzen abgeschnittene OSM-Seeflächen
    ix = np.clip(np.round(gz).astype(int), 0, hz['nz'] - 1), np.clip(np.round(gx).astype(int), 0, hz['nx'] - 1)
    lake_out = flat[ix]; lake_vws = vws[ix]

    # --- Datenabdeckung (Union der Gegenden), weich ausgeblendet ---
    cov = Image.new('L', (W, H), 0); dc = ImageDraw.Draw(cov)
    for b in bs:
        a = P(b[0], b[1]); c = P(b[2], b[3]); dc.rectangle([a[0], a[1], c[0], c[1]], fill=255)
    cov = cov.filter(ImageFilter.GaussianBlur(int(900 / mpp)))  # ~900 m weicher Übergang
    covf = np.asarray(cov, dtype=np.float32)[..., None] / 255

    img = np.array(C_OUT, np.float32) * (1 - covf) + np.array(C_LAND, np.float32) * covf

    # --- Wald (Waldmasken der Gegenden) ---
    forest = np.zeros((H, W), np.float32)
    for d, c in regions:
        fp = os.path.join(d, 'forest.png')
        if not os.path.exists(fp):
            continue
        fm = Image.open(fp).convert('L'); b = c['meta']['bounds']
        a = P(b[0], b[1]); w = fm.width * 4 / mpp; hh = fm.height * 4 / mpp
        ia, ja = int(round(a[0])), int(round(a[1])); iw, ih = max(1, int(round(w))), max(1, int(round(hh)))
        sm = np.asarray(fm.resize((iw, ih), Image.BOX), np.float32) / 255
        i_0, j_0 = max(0, ia), max(0, ja); i_1, j_1 = min(W, ia + iw), min(H, ja + ih)
        if i_1 > i_0 and j_1 > j_0:
            sub = sm[j_0 - ja:j_1 - ja, i_0 - ia:i_1 - ia]
            forest[j_0:j_1, i_0:i_1] = np.maximum(forest[j_0:j_1, i_0:i_1], sub)
    # zusätzlich OSM-Waldpolygone (für Lücken in den Masken)
    fl = Image.new('L', (W, H), 0); df = ImageDraw.Draw(fl)
    for _, c in regions:
        for g in c.get('green', []):
            if g.get('k') == 'forest' and len(g['p']) > 2:
                df.polygon([P(*q) for q in g['p']], fill=255)
    forest = np.maximum(forest, np.asarray(fl, np.float32) / 255)
    forest = np.clip(forest * 1.3, 0, 1)[..., None] * covf
    img = img * (1 - forest * 0.85) + np.array(C_FOREST, np.float32) * forest * 0.85

    # --- Siedlung: Gebäude füllen, leicht verwischen → Siedlungsflächen ---
    tw = Image.new('L', (W, H), 0); dt = ImageDraw.Draw(tw)
    nb = 0
    for _, c in regions:
        for bld in c.get('buildings', []):
            p = bld['p']
            if len(p) > 2:
                dt.polygon([P(*q) for q in p], fill=255); nb += 1
    tw = tw.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(3))
    town = np.clip((np.asarray(tw, np.float32) - 40) / 80, 0, 1)[..., None] * covf
    img = img * (1 - town * 0.8) + np.array(C_TOWN, np.float32) * town * 0.8
    print('Gebäude', nb)

    # --- Relief (multiplikativ, dezent) ---
    img = img * (0.78 + 0.22 * shade[..., None])

    # --- Gewässer ---
    wm = Image.new('L', (W, H), 0); dw = ImageDraw.Draw(wm)
    for _, c in regions:
        for wt in c.get('water', []):
            if len(wt['p']) > 2:
                dw.polygon([P(*q) for q in wt['p']], fill=255)
            for hole in wt.get('holes', []) or []:
                if len(hole) > 2:
                    dw.polygon([P(*q) for q in hole], fill=0)
    water = np.asarray(wm, np.float32) / 255
    # Seen ausserhalb der Gegenden aus dem Höhenraster (innerhalb der Gegenden gelten die OSM-Polygone)
    covhard = Image.new('L', (W, H), 0); dch = ImageDraw.Draw(covhard)
    for b in bs:
        a = P(b[0], b[1]); c2 = P(b[2], b[3]); dch.rectangle([a[0], a[1], c2[0], c2[1]], fill=255)
    outside = 1 - np.asarray(covhard, np.float32) / 255
    inner = Image.new('L', (W, H), 0); di = ImageDraw.Draw(inner)  # Gegenden um 400 m verkleinert: dort gilt nur OSM
    for b in bs:
        a = P(b[0] + 400, b[1] + 400); c2 = P(b[2] - 400, b[3] - 400); di.rectangle([a[0], a[1], c2[0], c2[1]], fill=255)
    near_edge = 1 - np.asarray(inner, np.float32) / 255
    lake_img = Image.fromarray((np.maximum(lake_out * outside, lake_vws * near_edge) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(int(160 / mpp)))
    water = np.maximum(water, np.clip((np.asarray(lake_img, np.float32) - 110) / 30, 0, 1))  # weich gerundete Uferlinie
    wimg = Image.fromarray((water * 255).astype(np.uint8))
    edge = np.asarray(wimg.filter(ImageFilter.MaxFilter(3)), np.float32) / 255 - water
    water = water[..., None]; edge = np.clip(edge, 0, 1)[..., None]
    img = img * (1 - edge) + np.array(C_WATER_EDGE, np.float32) * edge
    img = img * (1 - water) + np.array(C_WATER, np.float32) * water

    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')
    dr = ImageDraw.Draw(out)

    # --- Bahn: dünn, schwarz gestrichelt ---
    def dashed(pts, width, col, dash, gap):
        for (ax, az), (bx, bz) in zip(pts, pts[1:]):
            L = ((bx - ax) ** 2 + (bz - az) ** 2) ** 0.5
            if L < 1e-6:
                continue
            t = 0.0
            while t < L:
                t2 = min(L, t + dash)
                dr.line([(ax + (bx - ax) * t / L, az + (bz - az) * t / L), (ax + (bx - ax) * t2 / L, az + (bz - az) * t2 / L)], fill=col, width=width)
                t += dash + gap

    seen = set()
    for _, c in regions:
        for line in c.get('railAll') or c.get('rail') or []:
            if len(line) < 2:
                continue
            if line[0] == line[-1] and len(line) > 3:  # geschlossene Flächen (Perrons) überspringen
                continue
            key = (round(line[0][0]), round(line[0][1]), round(line[-1][0]), round(line[-1][1]))
            if key in seen:
                continue
            seen.add(key)
            dashed([P(*q) for q in line], 2 * SS // 2 + 1, C_RAIL, 7 * SS, 4 * SS)

    # --- Strassen (zuerst Ränder, dann Füllung) ---
    MAIN = ('primary', 'secondary', 'trunk', 'primary_link', 'secondary_link', 'trunk_link')
    MOTOR = ('motorway', 'motorway_link')
    roads = [r for _, c in regions for r in c.get('roads', []) if r.get('c') in MAIN + MOTOR + ('tertiary',) and len(r['p']) > 1 and not r.get('tu')]  # Tunnel weglassen (tu), Brücken (b) zeichnen
    tun = [r for _, c in regions for r in c.get('roads', []) if r.get('c') in MOTOR + MAIN and r.get('tu')]
    def draw(cls, width, col):
        for r in roads:
            if r['c'] in cls:
                dr.line([P(*q) for q in r['p']], fill=col, width=width, joint='curve')
    draw(('tertiary',), int(1.6 * SS), C_MINOR)
    draw(MAIN, int(3.4 * SS), C_MAIN_CASE)
    draw(MOTOR, int(4.6 * SS), C_MOTORWAY_CASE)
    draw(MAIN, int(2.2 * SS), C_MAIN)
    draw(MOTOR, int(3.2 * SS), C_MOTORWAY)
    print('Strassen gezeichnet', len(roads), '| Tunnelstücke ausgelassen', len(tun))

    final = out.resize((W // SS, H // SS), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True)
    jp = os.path.join(OUT, 'karte.jpg')
    for q in (80, 72, 65):
        final.save(jp, 'JPEG', quality=q, optimize=True, progressive=True)
        if os.path.getsize(jp) < 350_000:
            break
    json.dump({'x0': x0, 'z0': z0, 'x1': x1, 'z1': z1, 'w': final.width, 'h': final.height,
               'quelle': 'OpenStreetMap-Mitwirkende (ODbL), swisstopo swissALTI3D; gezeichnet mit tools/geo/karte.py'},
              open(os.path.join(OUT, 'karte.json'), 'w'), ensure_ascii=False)
    print(f'{jp}: {final.width}×{final.height}, {os.path.getsize(jp) // 1024} kB, Qualität {q}')


if __name__ == '__main__':
    main()
