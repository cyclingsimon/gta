"""Erweitert data/terrain_2m_big.i16 nach Osten mit swissALTI3D-GeoTIFFs (data/alti2022). 
Aufruf: alti_extend.py NEW_X1 [check]"""
import sys, glob, numpy as np, tifffile
sys.path.insert(0, 'tools/geo'); from lv import lv95, ll
X0, Z0, S, NX, NZ = -3800, -1100, 2, 2476, 3701
old = np.fromfile('data/terrain_2m_big_x1150.i16', dtype='<i2').reshape(NZ, NX)
# Mosaik
E0, N1 = 2666000, 1213000; W, H = 3000, 9000
mos = np.full((H // 2, W // 2), np.nan, np.float32)
for f in glob.glob('data/alti2022/*.tif'):
    t = tifffile.TiffFile(f); a = t.asarray(); e, n = t.pages[0].tags['ModelTiepointTag'].value[3:5]
    i0, j0 = int((e - E0) / 2), int((N1 - n) / 2); mos[j0:j0 + 500, i0:i0 + 500] = a
def samp(E, N):
    fx = (E - E0) / 2 - 0.5; fy = (N1 - N) / 2 - 0.5
    i = np.floor(fx).astype(int); j = np.floor(fy).astype(int); tx = fx - i; ty = fy - j
    ok = (i >= 0) & (j >= 0) & (i < mos.shape[1] - 1) & (j < mos.shape[0] - 1)
    i = np.clip(i, 0, mos.shape[1] - 2); j = np.clip(j, 0, mos.shape[0] - 2)
    v = (mos[j, i] * (1 - tx) + mos[j, i + 1] * tx) * (1 - ty) + (mos[j + 1, i] * (1 - tx) + mos[j + 1, i + 1] * tx) * ty
    return np.where(ok, v, np.nan)
def lv95v(x, z):
    import math
    lat = 47.0517 - z / 110574; lon = 8.3077 + x / (math.cos(47.0517 * math.pi / 180) * 111320)
    p = (lat * 3600 - 169028.66) / 10000; l = (lon * 3600 - 26782.5) / 10000
    return (2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3,
            1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3)
X1 = float(sys.argv[1]); NX2 = int(round((X1 - X0) / S)) + 1
if len(sys.argv) > 2:
    # Vergleich im Überlappungsbereich
    xs = X0 + np.arange(NX) * S; zs = Z0 + np.arange(NZ) * S
    sel_i = np.where((xs > 400) & (xs < 1140))[0]; sel_j = np.where(zs < 1000)[0]
    xx, zz = np.meshgrid(xs[sel_i], zs[sel_j]); E, N = lv95v(xx, zz); v = samp(E, N)
    o = old[np.ix_(sel_j, sel_i)] / 10 + 400; d = v - o; d = d[~np.isnan(d)]
    print('Vergleich', d.size, 'mittel', d.mean(), 'abs-median', np.median(abs(d)), 'p99', np.percentile(abs(d), 99))
    sys.exit()
new = np.zeros((NZ, NX2), '<i2'); new[:, :NX] = old
xs = X0 + np.arange(NX, NX2) * S; zs = Z0 + np.arange(NZ) * S
xx, zz = np.meshgrid(xs, zs); E, N = lv95v(xx, zz); v = samp(E, N)
v = np.where(np.isnan(v), 433.6, v)  # ausserhalb der Kacheln: See (Seespiegel)
print('NaN-Anteil (=See gefüllt)', float(np.isnan(samp(E, N)).mean()))
new[:, NX:] = np.round((v - 400) * 10).astype('<i2')
new.tofile('data/terrain_2m_big.i16'); print('neu', NX2, NZ)
