"""Luftbild für den Boden + Waldmaske aus data/swissimage_2m.jpg (SWISSIMAGE 2 m, E 2662190–2667280, N 1205150–1212690).
→ public/data/aerial.jpg, aerial_s.jpg (Handy), forest.png (4-m-Raster des Spielfelds, 1 = Wald)."""
import math, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
SRC = 'data/swissimage_2m.jpg'
im = Image.open(SRC).convert('RGB')
# --- Bodentextur: leicht weichzeichnen, Schatten aufhellen, Wiesen grüner (Comic-Look) ---
hsv = np.array(im.filter(ImageFilter.GaussianBlur(0.7)).convert('HSV')).astype(np.float32)
h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
m = (h > 22) & (h < 100) & (v > 40)
h[m] = np.minimum(h[m] + np.clip(10 - (h[m] - 45) * 0.2, 0, 10), 100)
s[m] = np.minimum(s[m] * 1.5 + 12, 255)
v = np.clip(255 * ((v / 255) ** 0.8) * 1.06, 0, 255)
out = Image.fromarray(np.stack([h, s, v], -1).astype(np.uint8), 'HSV').convert('RGB')
out.save('public/data/aerial.jpg', quality=80, optimize=True, progressive=True)
out.resize((out.width // 2, out.height // 2), Image.LANCZOS).save('public/data/aerial_s.jpg', quality=80, optimize=True)
# --- Waldmaske: dunkel, grün (nicht blau wie der See), strukturiert ---
A = np.array(im).astype(np.float32); a = np.array(im.filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]; vmax = a.max(-1)
gray = A.mean(-1); m1 = np.array(Image.fromarray(gray.astype(np.uint8)).filter(ImageFilter.BoxBlur(3))).astype(np.float32)
sq = np.array(Image.fromarray(np.clip(gray ** 2 / 255, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(3))).astype(np.float32) * 255
std = np.sqrt(np.maximum(sq - m1 ** 2, 0))
F = (vmax < 105) & (g > b * 1.08) & (r < g * 0.97) & (std > 9)
f = Image.fromarray((F * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(5))
F = np.array(f) > 127
LAT0, LON0 = 47.0517, 8.3077; KX = math.cos(math.radians(LAT0)) * 111320; KZ = 110574
X0, Z0, X1, Z1, S = -3800, -1100, 1150, 6300, 4
X, Z = np.meshgrid(np.arange(X0, X1, S) + S / 2, np.arange(Z0, Z1, S) + S / 2)
lon = LON0 + X / KX; lat = LAT0 - Z / KZ; p = (lat * 3600 - 169028.66) / 10000; l = (lon * 3600 - 26782.5) / 10000
E = 2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3
N = 1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3
M = F[np.clip(((1212690 - N) / 2).astype(int), 0, F.shape[0] - 1), np.clip(((E - 2662190) / 2).astype(int), 0, F.shape[1] - 1)]
lab, n = ndimage.label(M); sizes = ndimage.sum(M, lab, range(1, n + 1))
M = np.isin(lab, np.where(sizes >= 250)[0] + 1)
Image.fromarray((M * 255).astype(np.uint8)).save('public/data/forest.png', optimize=True)
print('Wald', round(M.sum() * 16 / 1e6, 2), 'km²')
