"""Ortsliste für Wegweiser (alle Regionen, Rang ≥ 1) → src/signPlaces.ts. Nach jedem Regionsbau laufen lassen."""
import json, glob
U = {}
for p in ['public/data/city.json'] + sorted(glob.glob('public/data/*/city.json')):
    for n, x, z, r in json.load(open(p)).get('places', []):
        if r >= 1 and (n not in U or U[n][2] < r):
            U[n] = (round(x), round(z), r)
rows = ',\n'.join(f"  [{json.dumps(n, ensure_ascii=False)}, {x}, {z}, {r}]" for n, (x, z, r) in sorted(U.items()))
open('src/signPlaces.ts', 'w').write('// generiert von tools/geo/sign_places.py: Orte (Name, x, z, Rang) für Wegweiser\nexport const SIGN_PLACES: [string, number, number, number][] = [\n' + rows + '\n];\n')
print(len(U), 'Orte')
