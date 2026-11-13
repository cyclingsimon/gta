#!/bin/sh
# Etappe 3 «Ost» (Meggen, Udligenswil) → public/data/ost/
# Rohdaten: data/e3/ (Nacht 12./13.11.2026). Feld x 2500..7500, z −2000..2500 (200 m Überlappung mit Luzern bei x 2500..2700).
# OSM: östlich x = 2600 aus Etappe 3, westlich aus den Luzerner Daten (merge_osm_ost.py).
set -e
cd "$(dirname "$0")/../.."
export LR=ost
mkdir -p public/data/ost data/e3/b3dm_all
python3 tools/geo/osm_raw2big.py data/e3/conv_ost data/e3/osm/ost.json
python3 tools/geo/merge_osm_ost.py
LR_MOS=2656000,1217000,18000,9000 python3 tools/geo/alti_region.py 2500 -2000 7500 2500 data/e3/terrain_ost_2m.i16
rm -f data/e3/b3dm_all/*; (cd data/e3/b3dm_all && for f in ../b3dm/*_11_10[89]*.b3dm ../b3dm/*_11_110*.b3dm ../b3dm_ost2/*.b3dm; do [ -f "$f" ] && ln -sf "$f" .; done; for f in ../../b3dm/*_11_107[4-8]_*.b3dm; do ln -sf "$f" . ; done)
node tools/geo/b3d_build.mjs data/e3/b3dm_all 2500,-2000,7500,2500
LR_TUN=data/e3/merged_ost/tunnels.json python3 tools/geo/build_city.py data/e3/merged_ost/osm_big.json public/data/ost/city.json "2500,7500,-2000,2500"
python3 tools/geo/region_pois_ost.py
LR_GRID=2500,-2000,2501,2251 LR_TERR=data/e3/terrain_ost_2m.i16 node tools/geo/terrain_build.mjs
export LR_IMG=data/e3/raw/wms_ost.jpg LR_EN=2668400,1213700 LR_BOUNDS=2500,-2000,7500,2500
python3 tools/geo/aerial.py
python3 tools/geo/roofcolors.py
LR_BEACH=data/e3/merged_ost/beach.json python3 tools/geo/build_props.py data/e3/merged_ost/osm_props.json
LR_BOUNDS=2510,-1990,7490,2490 LR_BUS=data/e3/merged_ost/osm_bus.json python3 tools/geo/build_bus.py > /dev/null
cp public/data/horizon.json public/data/horizon.bin public/data/ost/
LR_TUN=data/e3/merged_ost/tunnels.json python3 tools/geo/build_trains.py
