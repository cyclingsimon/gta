"""Setzt Base64-Stücke aus Browser-Rückgaben zusammen. Aufruf: assemble.py PREFIX OUT (Stücke beginnen mit PREFIX + 2-stellige Nummer)."""
import json, glob, sys, base64, re
pre, out = sys.argv[1], sys.argv[2]
parts = {}
for f in glob.glob('/tmp/claude-tool-results/*/*.txt') + glob.glob('/tmp/claude-tool-results/*/*.json'):
    try: t = json.load(open(f))[0]['text']
    except Exception: continue
    if not t.startswith('"' + pre): continue
    s, _ = json.JSONDecoder().raw_decode(t)
    m = re.match(re.escape(pre) + r'(\d\d)', s)
    if not m: continue
    parts[int(m.group(1))] = s[m.end():].split('|')[0].split('\n')[0]
keys = sorted(parts); print('Stücke', len(keys), 'fehlend', sorted(set(range(keys[-1] + 1)) - set(keys)))
open(out, 'wb').write(base64.b64decode(''.join(parts[k] for k in keys)))
