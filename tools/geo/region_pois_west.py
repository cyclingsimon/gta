"""Ortsnamen für die Region West in public/data/west/city.json. Koordinaten aus OpenStreetMap (place=*, Bahnhof, Wegweiser), Spiel-Meter."""
import json
P = {'Littau': [-3629, 130], 'Obernau': [-4104, 2167], 'Blatten': [-6371, 1193], 'Spahau': [-5650, 116], 'Blattig': [-5164, 2159],
     'Stegmättli': [-7238, 1053], 'Buggenringen': [-6824, -978], 'Ränggloch': [-5099, 1469], 'Thorenberg': [-4337, -117]}
c = json.load(open('public/data/west/city.json')); c['pois'] = P
json.dump(c, open('public/data/west/city.json', 'w'), separators=(',', ':'), ensure_ascii=False); print('POIs', len(P))
