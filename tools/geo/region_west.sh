#!/bin/sh
# Etappe 3 «West» (Littau, Blatten, Obernau, Malters-Rand) → public/data/west/
# Feld x −8500..−3600, z −1300..3000 (200 m Überlappung mit Luzern bei x −3800..−3600). OSM westlich x = −3700 aus Etappe 3.
set -e
cd "$(dirname "$0")/../.."
export LR=west
mkdir -p public/data/west data/e3/b3dm_west data/e3/conv_west
python3 tools/geo/osm_raw2big.py data/e3/conv_west data/e3/osm/west.json
LR_SPLIT=-3700 LR_SIDE=west LR_NEW=data/e3/conv_west LR_OUT=data/e3/merged_west LR_BUSRAW=data/e3/osm/busw.json python3 tools/geo/merge_osm_ost.py
LR_MOS=2656000,1217000,18000,9000 python3 tools/geo/alti_region.py -8500 -1300 -3600 3000 data/e3/terrain_west_2m.i16
rm -f data/e3/b3dm_west/*; (cd data/e3/b3dm_west && for f in ../b3dm/*_11_10[0-3]*.b3dm; do ln -sf "$f" .; done; for f in ../../b3dm/*_11_10[34][0-9]_*.b3dm; do x=$(basename $f .b3dm | cut -d_ -f3); [ $x -le 1040 ] && ln -sf "$f" . || true; done)
node tools/geo/b3d_build.mjs data/e3/b3dm_west -8500,-1300,-3600,3000
LR_TUN=data/e3/merged_west/tunnels.json python3 tools/geo/build_city.py data/e3/merged_west/osm_big.json public/data/west/city.json "-8500,-3600,-1300,3000"
python3 tools/geo/region_pois_west.py
LR_GRID=-8500,-1300,2451,2151 LR_TERR=data/e3/terrain_west_2m.i16 node tools/geo/terrain_build.mjs
export LR_IMG=data/e3/raw/wms_west.jpg LR_EN=2657400,1212900 LR_BOUNDS=-8500,-1300,-3600,3000
python3 tools/geo/aerial.py
python3 tools/geo/roofcolors.py
LR_BEACH=data/e3/merged_west/beach.json python3 tools/geo/build_props.py data/e3/merged_west/osm_props.json
LR_BOUNDS=-8490,-1290,-3610,2990 LR_BUS=data/e3/merged_west/osm_bus.json python3 tools/geo/build_bus.py > /dev/null
cp public/data/horizon.json public/data/horizon.bin public/data/west/
LR_TUN=data/e3/merged_west/tunnels.json python3 tools/geo/build_trains.py
python3 tools/geo/crossings.py
python3 tools/geo/plazas.py
