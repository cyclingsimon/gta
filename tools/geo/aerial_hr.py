"""Scharfes Luftbild Kernzone (SWISSIMAGE via WMS, 0.25/0.5 m) → public/data/aerial_hr.jpg (4096², 0.625 m).
Kachelraster 4×4 à 640 m ab E 2664760 / N 1212960 (Nordwest-Ecke), Abdeckung E 2664760–2667320, N 1210400–1212960.
Farbanpassung wie aerial.py, damit der Übergang zum 2-m-Luftbild nicht auffällt."""
import os, numpy as np
from PIL import Image, ImageFilter
S = 4096; T = S // 4
m = Image.new('RGB', (S, S))
for j in range(4):
    for i in range(4):
        f = f'data/e3/hr/hr_{j}_{i}.jpg'
        if not os.path.exists(f): f = f'data/e3/hrq/hr_{j}_{i}.jpg'
        m.paste(Image.open(f).convert('RGB').resize((T, T), Image.LANCZOS), (i * T, j * T))
hsv = np.array(m.filter(ImageFilter.GaussianBlur(0.5)).convert('HSV')).astype(np.float32)
h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
g = (h > 22) & (h < 100) & (v > 40)
h[g] = np.minimum(h[g] + np.clip(10 - (h[g] - 45) * 0.2, 0, 10), 100)
s[g] = np.minimum(s[g] * 1.5 + 12, 255)
v = np.clip(255 * ((v / 255) ** 0.8) * 1.06, 0, 255)
out = Image.fromarray(np.stack([h, s, v], -1).astype(np.uint8), 'HSV').convert('RGB')
out.save('public/data/aerial_hr.jpg', quality=82, optimize=True, progressive=True)
print('ok', os.path.getsize('public/data/aerial_hr.jpg') // 1024, 'KB')
