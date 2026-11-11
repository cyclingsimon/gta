"""Sammelt Base64-Stücke PREFIX+NNN...| aus allen Browser-Tool-Ergebnissen und entpackt das PK-Paket.
Aufruf: collect.py PREFIX N OUTDIR"""
import glob, re, sys, base64, json, struct, os
pre, n, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
parts = {}
rx = re.compile(re.escape(pre) + r'(\d{3})([A-Za-z0-9+/=]*)\|')
for f in glob.glob('/tmp/claude-tool-results/*/*.txt') + glob.glob('/tmp/claude-tool-results/*/*.json'):
    try: s = open(f).read()
    except Exception: continue
    if pre not in s: continue
    try: items = json.loads(s); texts = [i.get('text', '') for i in items] if isinstance(items, list) else [s]
    except Exception: texts = [s]
    for t in texts:
        for m in rx.finditer(t): parts[int(m.group(1))] = m.group(2)
miss = [i for i in range(n) if i not in parts]
if miss: print('FEHLEND', miss); sys.exit(1)
raw = base64.b64decode(''.join(parts[i] for i in range(n)))
hl = struct.unpack('<I', raw[:4])[0]; hdr = json.loads(raw[4:4 + hl]); o = 4 + hl
os.makedirs(out, exist_ok=True)
for name, ln in hdr:
    open(os.path.join(out, name), 'wb').write(raw[o:o + ln]); o += ln
print('ok', len(hdr), 'Dateien', len(raw), 'Bytes')
