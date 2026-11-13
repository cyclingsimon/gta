#!/bin/sh
# Etappe 4 «Süd» (Hergiswil, Stansstad, Alpnachstad, Stans-Rand) → public/data/sued/
# Rohdaten: data/e4/ (13.11.2026). Feld x −3000..4600, z 6100..11000 (200 m Überlappung mit Luzern bei z 6100..6300).
# OSM: südlich z = 6200 aus Etappe 4, nördlich aus den Luzerner Daten (merge_osm_ost.py mit LR_SIDE=south).
set -e
cd "$(dirname "$0")/../.."
export LR=sued
mkdir -p public/data/sued data/e4/conv
python3 tools/geo/osm_raw2big.py data/e4/conv data/e4/osm/sued.json
LR_SPLIT=6200 LR_SIDE=south LR_NEW=data/e4/conv LR_OUT=data/e4/merged LR_BUSRAW=data/e4/osm/buss.json python3 tools/geo/merge_osm_ost.py
LR_MOS=2661000,1207000,12000,8000 python3 tools/geo/alti_region.py -3000 6100 4600 11000 data/e4/terrain_2m.i16
node tools/geo/b3d_build.mjs data/e4/b3dm -3000,6100,4600,11000
LR_TUN=data/e4/merged/tunnels.json python3 tools/geo/build_city.py data/e4/merged/osm_big.json public/data/sued/city.json "-3000,4600,6100,11000"
python3 tools/geo/region_pois_sued.py
LR_GRID=-3000,6100,3801,2451 LR_TERR=data/e4/terrain_2m.i16 node tools/geo/terrain_build.mjs
export LR_IMG=data/e4/raw/wms_sued.jpg LR_EN=2662800,1205800 LR_BOUNDS=-3000,6100,4600,11000
python3 tools/geo/aerial.py
python3 tools/geo/roofcolors.py
LR_BEACH=data/e4/merged/beach.json python3 tools/geo/build_props.py data/e4/merged/osm_props.json
LR_BOUNDS=-2990,6110,4590,10990 LR_BUS=data/e4/merged/osm_bus.json python3 tools/geo/build_bus.py > /dev/null
cp public/data/horizon.json public/data/horizon.bin public/data/sued/
LR_TUN=data/e4/merged/tunnels.json python3 tools/geo/build_trains.py
python3 tools/geo/crossings.py
python3 tools/geo/plazas.py
python3 tools/geo/roadtags.py public/data/sued
python3 tools/geo/gaps.py public/data/sued && python3 tools/geo/umfang.py
