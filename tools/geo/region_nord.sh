#!/bin/sh
# Etappe 2 «Nord» (Emmenbrücke, Rotsee, Ebikon, Adligenswil) → public/data/nord/
# Rohdaten: data/e2/ (siehe STAND.md). Feld x −3800..4600, z −3900..−550 (550 m Überlappung mit Luzern, enthält das Kinderspital).
# OSM: nördlich z = −950 aus Etappe 2, südlich aus den Luzerner Daten (merge_osm.py).
set -e
cd "$(dirname "$0")/../.."
export LR=nord
mkdir -p public/data/nord data/e2/b3dm_all
python3 tools/geo/osm_raw2big.py data/e2/conv data/e2/osm/osm_a.json data/e2/osm/osm_b.json
python3 tools/geo/merge_osm.py
python3 tools/geo/alti_region.py -3800 -3900 4600 -550 data/e2/terrain_2m.i16
(cd data/e2/b3dm_all && for f in ../b3dm/*.b3dm; do ln -sf "$f" .; done && for f in ../../b3dm/*.b3dm; do y=$(basename $f .b3dm | cut -d_ -f4); [ $y -ge 1276 ] && ln -sf "$f" . || true; done)
node tools/geo/b3d_build.mjs data/e2/b3dm_all -3800,-3900,4600,-550
LR_TUN=data/e2/merged/tunnels.json python3 tools/geo/build_city.py data/e2/merged/osm_big.json public/data/nord/city.json "-3800,4600,-3900,-550"
python3 tools/geo/region_pois.py
LR_GRID=-3800,-3900,4201,1676 LR_TERR=data/e2/terrain_2m.i16 node tools/geo/terrain_build.mjs
python3 - <<'PY'
# Luftbild Nord (E 2662190–2670670, N 1215560 → 1212000): Etappe-2-WMS + unterer Rand aus dem Luzerner Luftbild
from PIL import Image
a = Image.open('data/e2/b3dm/wms_w.jpg'); b = Image.open('data/e2/b3dm/wms_o.jpg'); lu = Image.open('data/swissimage_2m_x2700.jpg')
m = Image.new('RGB', (a.width + b.width, a.height + 295), (120, 130, 110)); m.paste(a, (0, 0)); m.paste(b, (a.width, 0))
m.paste(lu.crop((0, 50, lu.width, 345)), (0, a.height)); m.save('data/e2/swissimage_nord.jpg', quality=92)
PY
export LR_IMG=data/e2/swissimage_nord.jpg LR_EN=2662190,1215560 LR_BOUNDS=-3800,-3900,4600,-550
python3 tools/geo/aerial.py
python3 tools/geo/roofcolors.py
LR_BEACH=data/e2/merged/beach.json python3 tools/geo/build_props.py data/e2/merged/osm_props.json
LR_BOUNDS=-3790,-3890,4590,-560 LR_BUS=data/e2/merged/osm_bus.json python3 tools/geo/build_bus.py > /dev/null
cp public/data/horizon.json public/data/horizon.bin public/data/nord/

LR_TUN=data/e2/merged/tunnels.json python3 tools/geo/build_trains.py
python3 tools/geo/plazas.py && python3 tools/geo/crossings.py
