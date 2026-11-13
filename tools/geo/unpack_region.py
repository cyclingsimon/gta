"""13o: Browser-Paket (packGz, collect.py) einer A-Region einsortieren: osm_<id>_N.json, wms_<id>.jpg, bus_<id>.json → data/a/raw,
altids_E-N.bin (Zeilen-Delta + Byte-Shuffle) → data/a/alti4/E-N.i16. Aufruf: unpack_region.py <ordner>"""
import os, sys, glob, shutil, numpy as np
src, G = sys.argv[1], 'data/a'
for f in glob.glob(f'{src}/osm_*.json') + glob.glob(f'{src}/wms_*.jpg') + glob.glob(f'{src}/bus_*.json'):
    shutil.copy(f, f'{G}/raw/' + os.path.basename(f))
n = 0
for f in glob.glob(f'{src}/altids_*.bin'):
    k = os.path.basename(f)[7:-4]; b = np.frombuffer(open(f, 'rb').read(), np.uint8); h = len(b) // 2
    u = np.empty(len(b), np.uint8); u[0::2] = b[:h]; u[1::2] = b[h:]
    d = u.view('<i2').astype(np.int64).reshape(250, 250); a = np.empty_like(d)
    a[:, 0] = np.cumsum(d[:, 0]); a[:, 1:] = a[:, :1] + np.cumsum(d[:, 1:], axis=1)
    out = f'{G}/alti4/{k}.i16'
    if not os.path.exists(out): (((a + 32768) % 65536) - 32768).astype('<i2').tofile(out); n += 1
print('Höhenkacheln neu', n)
