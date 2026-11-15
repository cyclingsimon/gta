"""P-A Lauf 10: OSM-Bausteine fotografieren und Budget je Baustein prüfen. Server: Port 8771 auf dist_pa_lm/."""
import asyncio, json, sys
from playwright.async_api import async_playwright
VIEWS = (sys.argv[1] if len(sys.argv) > 1 else 'ueber,strom,fussball,tennis,basket,spiel,bahn,masten').split(',')
LIM = {'einzeln_mast': 60, 'einzeln_fussball_105x68': 200, 'einzeln_fussball_120x80': 200, 'einzeln_fussball_klein_40x25': 200, 'einzeln_tennis': 200, 'einzeln_basketball': 200,
       'einzeln_spielplatz': 120, 'einzeln_bahnuebergang': 80, 'einzeln_kamin': 40, 'einzeln_funkmast': 40}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(180000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        st = None
        for v in VIEWS:
            await pg.goto(f'http://localhost:8771/pa_osmprops.html?v={v}'); await pg.wait_for_function('window.__ready')
            st = await pg.evaluate('window.__stats'); await pg.screenshot(path=f'shots/pa_osm_{v}.png')
        print(json.dumps(st, indent=0))
        bad = {k: (st.get(k), l) for k, l in LIM.items() if st.get(k) is None or st[k] > l}
        print('OSMPROPS', 'OK' if not bad and not errs else 'FEHLER', bad, errs); await b.close()
asyncio.run(main())
