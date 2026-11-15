"""15b: Luftbild-Stufe aus Browser-Stücken zusammensetzen. Der eingebaute Browser auf Simons PC holt SWISSIMAGE per WMS
(4 × 2048², 1.25 m), setzt es auf einem 4096²-Canvas zusammen und gibt das JPEG als Base64-Stücke «<PREFIX><i>:…:E» zurück;
das Werkzeug speichert jede Rückgabe unter /tmp/claude-tool-results/. Aufruf: python3 -I tools/geo/aerial_mid.py PREFIX N ZIEL.jpg
Farbangleich wie aerial_hr.py, damit die Übergänge zum 2-m-Luftbild nicht auffallen."""
import sys, json, glob, re, base64, io, os
import numpy as np
from PIL import Image, ImageFilter
pre, n, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
parts = {}
for f in sorted(glob.glob('/tmp/claude-tool-results/*/mcp-remote-devices-Claude_Browser__javascript_tool-*.txt')):
    m = re.search(pre + r'(\d+):([A-Za-z0-9+/=]+):E', json.load(open(f))[0]['text'])
    if m: parts[int(m.group(1))] = m.group(2)
assert sorted(parts) == list(range(n)), sorted(parts)
m = Image.open(io.BytesIO(base64.b64decode(''.join(parts[i] for i in range(n))))).convert('RGB')
hsv = np.array(m.filter(ImageFilter.GaussianBlur(0.5)).convert('HSV')).astype(np.float32)
h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
g = (h > 22) & (h < 100) & (v > 40)
h[g] = np.minimum(h[g] + np.clip(10 - (h[g] - 45) * 0.2, 0, 10), 100)
s[g] = np.minimum(s[g] * 1.5 + 12, 255)
v = np.clip(255 * ((v / 255) ** 0.8) * 1.06, 0, 255)
res = Image.fromarray(np.stack([h, s, v], -1).astype(np.uint8), 'HSV').convert('RGB')
res.save(out, quality=80, optimize=True, progressive=True)
res.resize((768, 768)).save('/tmp/mid_preview.jpg', quality=70)
print('ok', m.size, os.path.getsize(out) // 1024, 'KB')
