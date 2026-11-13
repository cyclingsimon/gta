"""Ortsnamen für die Region Süd in public/data/sued/city.json. Koordinaten aus OpenStreetMap (place=*), Spiel-Meter."""
import json
P = {'Hergiswil': [212, 7475], 'Stansstad': [2253, 7961], 'Alpnachstad': [-2495, 10880], 'Stans': [4429, 10460], 'Ennetmoos': [2253, 10482], 'Acheregg': [1798, 8083], 'Rotzloch': [1813, 9797], 'Fronhofen': [3284, 9045], 'Obbürgen': [4172, 7641], 'Alpnachersee': [30, 9896], 'Rengg': [-1236, 8149], 'Oberstalden': [-576, 7243]}
c = json.load(open('public/data/sued/city.json')); c['pois'] = P
json.dump(c, open('public/data/sued/city.json', 'w'), separators=(',', ':'), ensure_ascii=False); print('POIs', len(P))
