"""Höhenraster 2 m für eine Region (Etappe 2 «Nord») aus swissALTI3D-Kacheln.
Quellen: data/e2/alti/EEEE-NNNN.i16 (500×500, dm relativ 400 m) und data/alti2022/*.tif.
Aufruf: alti_region.py X0 Z0 X1 Z1 OUT.i16   → int16 dm relativ 400 m, Zeilen z, Spalten x, Schritt 2 m"""
import sys, glob, os, numpy as np
X0, Z0, X1, Z1 = [float(v) for v in sys.argv[1:5]]; OUT = sys.argv[5]; S = 2
NX, NZ = int(round((X1 - X0) / S)) + 1, int(round((Z1 - Z0) / S)) + 1
E0, N1, W, H = 2661000, 1217000, 11000, 6000  # Mosaik E 2661–2672, N 1211–1217
mos = np.full((H // 2, W // 2), np.nan, np.float32)
def put(e, n, a):
    i0, j0 = int((e - E0) / 2), int((N1 - n) / 2)
    if 0 <= i0 and 0 <= j0 and i0 + a.shape[1] <= mos.shape[1] and j0 + a.shape[0] <= mos.shape[0]: mos[j0:j0 + a.shape[0], i0:i0 + a.shape[1]] = a
try:
    import tifffile
    for f in glob.glob('data/alti2022/*.tif'):
        t = tifffile.TiffFile(f); e, n = t.pages[0].tags['ModelTiepointTag'].value[3:5]; put(e, n, t.asarray().astype(np.float32))
except ImportError: pass
for f in glob.glob('data/e2/alti/*.i16'):
    E, N = [int(v) for v in os.path.basename(f)[:-4].split('-')]
    put(E * 1000, (N + 1) * 1000, np.fromfile(f, '<i2').reshape(500, 500).astype(np.float32) / 10 + 400)
def lv95v(x, z):
    import math
    lat = 47.0517 - z / 110574; lon = 8.3077 + x / (math.cos(47.0517 * math.pi / 180) * 111320)
    p = (lat * 3600 - 169028.66) / 10000; l = (lon * 3600 - 26782.5) / 10000
    return (2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3,
            1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3)
xs = X0 + np.arange(NX) * S; zs = Z0 + np.arange(NZ) * S
out = np.zeros((NZ, NX), '<i2'); nan = 0
for j0 in range(0, NZ, 200):  # in Streifen, spart Speicher
    xx, zz = np.meshgrid(xs, zs[j0:j0 + 200]); E, N = lv95v(xx, zz)
    fx = (E - E0) / 2 - 0.5; fy = (N1 - N) / 2 - 0.5
    i = np.clip(np.floor(fx).astype(int), 0, mos.shape[1] - 2); j = np.clip(np.floor(fy).astype(int), 0, mos.shape[0] - 2); tx = fx - i; ty = fy - j
    v = (mos[j, i] * (1 - tx) + mos[j, i + 1] * tx) * (1 - ty) + (mos[j + 1, i] * (1 - tx) + mos[j + 1, i + 1] * tx) * ty
    nan += int(np.isnan(v).sum()); v = np.where(np.isnan(v), 433.6, v)  # Lücke: Seespiegel
    out[j0:j0 + 200] = np.round((v - 400) * 10).astype('<i2')
out.tofile(OUT); print('Raster', NX, NZ, 'Lücken', nan, f'{nan / (NX * NZ) * 100:.2f} %', 'Höhe', out.min() / 10 + 400, out.max() / 10 + 400)
