"""Gebiet A (13i, Entscheid Simon 13.11.2026): eine Region aus den Browser-Rohdaten bauen → public/data/aN/
Rohdaten in data/a/raw/: osm_aN_0..3.json (Overpass out geom), wms_aN.jpg (SWISSIMAGE 2 m), bus.json (Bus-/Zugrelationen, optional);
Höhen in data/a/alti4/E-N.i16 (swissALTI3D, 4 m). Gebäude aus OpenStreetMap (keine swissBUILDINGS3D-Kacheln in Gebiet A).
Aufruf: python3 tools/geo/build_region_a.py a1 [a2 …]"""
import json, os, subprocess, sys, math
sys.path.insert(0, os.path.dirname(__file__))
from regions_a import REGIONS_A
WMS = json.load(open(os.path.join(os.path.dirname(__file__), 'regions_a_wms.json')))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
os.chdir(ROOT)

def run(cmd, **env):
    e = dict(os.environ, **{k: str(v) for k, v in env.items()})
    print('▶', cmd if isinstance(cmd, str) else ' '.join(cmd), flush=True)
    subprocess.run(cmd, shell=isinstance(cmd, str), check=True, env=e)

def bus_for(rid, x0, z0, x1, z1, out):
    """Bus-Relationen → {rels, ways, nodes} wie data/osm_bus.json. Quellen: data/a/raw/osm_bus_all.json (schon im Zielformat)
    und optional data/a/raw/bus_<rid>.json (Overpass out geom, 13o: für Gebiete ausserhalb von osm_bus_all, z. B. Küssnacht)."""
    rels, ways, nodes = [], {}, {}
    if os.path.exists('data/a/raw/osm_bus_all.json'):
        d = json.load(open('data/a/raw/osm_bus_all.json')); rels, ways, nodes = d['rels'], d['ways'], d['nodes']
    have = {r['id'] for r in rels}
    for src in (f'data/a/raw/bus_{rid}.json', 'data/a/raw/bus.json'):
        if not os.path.exists(src): continue
        for e in json.load(open(src))['elements']:
            t = e.get('tags', {})
            if e['type'] != 'relation' or t.get('route') != 'bus' or e['id'] in have: continue
            ms = []
            for m in e.get('members', []):
                if m['type'] == 'way' and m.get('geometry'):
                    ways[str(m['ref'])] = [[g['lat'], g['lon']] for g in m['geometry'] if g]
                    ms.append(['w', m['ref'], m.get('role', '')])
                elif m['type'] == 'node' and 'lat' in m:
                    nodes[str(m['ref'])] = [m['lat'], m['lon'], '']
                    ms.append(['n', m['ref'], m.get('role', '')])
            rels.append({'id': e['id'], 't': {'ref': t.get('ref', ''), 'operator': t.get('operator', ''), 'to': t.get('to', ''), 'name': t.get('name', '')}, 'm': ms}); have.add(e['id'])
    json.dump({'rels': rels, 'ways': ways, 'nodes': nodes}, open(out, 'w'), separators=(',', ':'), ensure_ascii=False)
    return len(rels)

for rid in sys.argv[1:]:
    name, (x0, z0, x1, z1) = REGIONS_A[rid]
    E0, N0, E1, N1, W, H = WMS[rid]
    out = f'public/data/{rid}'; conv = f'data/a/conv_{rid}'
    os.makedirs(out, exist_ok=True); os.makedirs(conv, exist_ok=True)
    raws = [f'data/a/raw/osm_{rid}_{q}.json' for q in range(4)]
    run(['python3', 'tools/geo/osm_raw2big.py', conv, *raws])
    nb = bus_for(rid, x0, z0, x1, z1, conv + '/osm_bus.json'); print('Buslinien', nb)
    # Höhen: Mosaik über den Luftbild-Ausschnitt (+1 km), 2 m
    me0, mn1 = int(E0 // 1000 - 1) * 1000, int(N1 // 1000 + 2) * 1000
    mw, mh = int(E1 // 1000 + 2) * 1000 - me0, mn1 - int(N0 // 1000 - 1) * 1000
    run(['python3', 'tools/geo/alti_region.py', str(x0), str(z0), str(x1), str(z1), f'{conv}/terrain_2m.i16'], LR_MOS=f'{me0},{mn1},{mw},{mh}')
    run(['python3', 'tools/geo/build_city.py', f'{conv}/osm_big.json', f'{out}/city.json', f'{x0},{x1},{z0},{z1}'], LR=rid, LR_TUN=f'{conv}/tunnels.json')
    run(['python3', 'tools/geo/region_pois_a.py', rid], LR=rid)
    nx, nz = (x1 - x0) // 2 + 1, (z1 - z0) // 2 + 1
    run(['node', 'tools/geo/terrain_build.mjs'], LR=rid, TR=1.2, LR_GRID=f'{x0},{z0},{nx},{nz}', LR_TERR=f'{conv}/terrain_2m.i16')
    run(['python3', 'tools/geo/aerial.py'], LR=rid, LR_IMG=f'data/a/raw/wms_{rid}.jpg', LR_EN=f'{E0},{N1}', LR_BOUNDS=f'{x0},{z0},{x1},{z1}')
    run(['python3', 'tools/geo/build_props.py', f'{conv}/osm_props.json'], LR=rid, LR_BEACH=f'{conv}/beach.json', LR_BOUNDS=f'{x0},{z0},{x1},{z1}')
    run('python3 tools/geo/build_bus.py > /dev/null', LR=rid, LR_BOUNDS=f'{x0 + 10},{z0 + 10},{x1 - 10},{z1 - 10}', LR_BUS=f'{conv}/osm_bus.json')
    run(f'cp public/data/horizon.json public/data/horizon.bin {out}/')
    run(['python3', 'tools/geo/build_trains.py'], LR=rid, LR_TUN=f'{conv}/tunnels.json')
    osmraw = ','.join(raws)
    run(['python3', 'tools/geo/crossings.py'], LR=rid, LR_OSMRAW=osmraw)
    run(['python3', 'tools/geo/plazas.py'], LR=rid, LR_OSMRAW=osmraw)
    run(['python3', 'tools/geo/roadtags.py', out], LR=rid, LR_OSMRAW=osmraw)
    run(['python3', 'tools/geo/gaps.py', out])
    run(['python3', 'tools/geo/kreisel.py', out, *raws])
    run(['python3', 'tools/geo/missions_a.py', rid], LR=rid, LR_OSMRAW=osmraw)
    run(['python3', 'tools/geo/rural.py', rid], LR=rid)
    if os.path.isdir(f'data/a/b3dm_{rid}'):  # swissBUILDINGS3D-Kacheln (im Browser geholt, Kachelformel siehe STAND.md)
        run(['node', '--max-old-space-size=6000', 'tools/geo/b3d_build.mjs', f'data/a/b3dm_{rid}', f'{x0},{z0},{x1},{z1}'], LR=rid)
        run(['python3', 'tools/geo/roofcolors.py'], LR=rid, LR_IMG=f'data/a/raw/wms_{rid}.jpg', LR_EN=f'{E0},{N1}')
    json.dump({'id': rid, 'name': name, 'bounds': [x0, z0, x1, z1], 'aerial': {'E0': E0, 'E1': E1, 'N0': N0, 'N1': N1}},
              open(f'{out}/region.json', 'w'), ensure_ascii=False)
run(['python3', 'tools/geo/umfang.py'])
