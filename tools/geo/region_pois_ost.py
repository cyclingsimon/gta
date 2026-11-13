"""Ortsnamen für die Region Ost in public/data/ost/city.json. Koordinaten aus OpenStreetMap (place=*, Bahnhof, Schloss), Spiel-Meter."""
import json
P = {'Meggen': [4983, 511], 'Meggenhorn': [3686, 1820], 'Würzenbach': [2900, -320], 'Benzeholz': [5252, 939], 'Tschädigen': [5979, -1215],
     'Gottliebenrain': [6292, -382], 'Lerchenbühl': [4006, 1164], 'Büttenen': [3662, -326], 'Gämpi': [4338, -1581]}
c = json.load(open('public/data/ost/city.json'))
c['pois'] = P
json.dump(c, open('public/data/ost/city.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print('POIs', len(P))
