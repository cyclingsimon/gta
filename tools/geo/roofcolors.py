"""Dachfarbe je Gebäude aus SWISSIMAGE (2-m-Luftbild data/swissimage_2m.jpg, LV95-Ausschnitt) → public/data/roofcolors.json"""
import json, math, colorsys, numpy as np
from PIL import Image
meta = json.load(open('public/data/b3d.json')); raw = open('public/data/b3d.bin', 'rb').read()
P = np.frombuffer(raw, dtype=np.int16, count=meta['posBytes'] // 2).reshape(-1, 3).astype(np.float64) / 10
I = np.frombuffer(raw, dtype=np.uint16, offset=meta['posBytes'] + meta['pad'], count=meta['idxCount'])
img = np.asarray(Image.open('data/swissimage_2m_x2700.jpg').convert('RGB')).astype(np.int32)
E0, N1, R = 2662190, 1212690, 2  # aus dem Browser-Export
LAT0, LON0 = 47.0517, 8.3077; KX = math.cos(math.radians(LAT0)) * 111320; KZ = 110574
def lv(x, z):
    lon = LON0 + x / KX; lat = LAT0 - z / KZ
    p = (lat * 3600 - 169028.66) / 10000; l = (lon * 3600 - 26782.5) / 10000
    E = 2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3
    N = 1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3
    return E, N
def sample(x, z):
    E, N = lv(x, z); px = int(round((E - E0) / R)); py = int(round((N1 - N) / R))
    if not (1 <= px < img.shape[1] - 1 and 1 <= py < img.shape[0] - 1): return None
    patch = img[py - 1:py + 2, px - 1:px + 2].reshape(-1, 3)
    return np.median(patch, axis=0)
out = []
for m in meta['buildings']:
    vS, vC, iS, iC, cx, cz = m[1], m[2], m[3], m[4], m[5], m[6]
    V = P[vS:vS + vC].copy()
    if meta.get('rel'): V[:, 0] += cx; V[:, 2] += cz
    tri = I[iS:iS + iC].reshape(-1, 3)
    a, b, c = V[tri[:, 0]], V[tri[:, 1]], V[tri[:, 2]]
    n = np.cross(b - a, c - a); area = np.linalg.norm(n, axis=1) + 1e-9; ny = n[:, 1] / area
    ok = np.abs(ny) > 0.3
    if not ok.any(): out.append(''); continue
    idx = np.argsort(-(area * ok))[:2]
    cols = [s for s in (sample(*(((a[k] + b[k] + c[k]) / 3)[[0, 2]])) for k in idx if ok[k]) if s is not None]
    if not cols: out.append(''); continue
    r, g, bb = max(cols, key=lambda q: q.sum()) / 255
    h, l, s = colorsys.rgb_to_hls(r, g, bb)
    l = min(0.78, max(0.32, l * 1.18 + 0.04)); s = min(0.75, s * 1.8)
    h = round(h * 24) / 24; l = round(l * 12) / 12; s = round(s * 8) / 8
    R_, G_, B_ = colorsys.hls_to_rgb(h, l, s)
    out.append('%02x%02x%02x' % (round(R_ * 255), round(G_ * 255), round(B_ * 255)))
json.dump(out, open('public/data/roofcolors.json', 'w'))
print(len(out), 'Gebäude,', sum(1 for o in out if o), 'mit Farbe')
