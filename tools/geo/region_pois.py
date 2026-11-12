"""Ortsnamen für die Region Nord in public/data/nord/city.json (Annahme: Koordinaten aus Kartenkenntnis, ±200 m)."""
import json, math
LAT0, LON0 = 47.0517, 8.3077; KX = math.cos(math.radians(LAT0)) * 111320; KZ = 110574
L = lambda la, lo: [round((lo - LON0) * KX, 1), round(-(la - LAT0) * KZ, 1)]
P = {'Emmenbrücke': (47.0775, 8.2740), 'Seetalplatz': (47.0716, 8.2790), 'Reussbühl': (47.0630, 8.2745), 'Rotsee': (47.0745, 8.3150),
     'Ebikon': (47.0805, 8.3405), 'Adligenswil': (47.0700, 8.3615), 'Maihof': (47.0610, 8.3140), 'Emmen': (47.0830, 8.2900)}
c = json.load(open('public/data/nord/city.json'))
c['pois'] = {k: L(*v) for k, v in P.items()}
json.dump(c, open('public/data/nord/city.json', 'w'), separators=(',', ':'), ensure_ascii=False)
