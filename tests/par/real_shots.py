"""P-A Testszene fotografieren: python3 tests/par/real_shots.py [ansicht,...]
Erwartet Server auf Port 8771 mit dist_pa_szene/. Schreibt shots/pa_<ansicht>.png und gibt Dreieckszahlen + Fehler aus."""
import asyncio, sys, json, os
from playwright.async_api import async_playwright
VIEWS = (sys.argv[1] if len(sys.argv) > 1 else 'amb,amb2,amb3,bus,bus2,bus3,baum,moebel,autos,total').split(',')
async def main():
    os.makedirs('shots', exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(180000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300])); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text[:300]))
        for i, v in enumerate(VIEWS):
            q = v.split('+'); await pg.goto(f'http://localhost:8771/real_szene.html?v={q[0]}' + ('&nacht=1' if 'nacht' in q else '')); await pg.wait_for_function('window.__ready')
            await pg.wait_for_timeout(1200)
            await pg.screenshot(path=f"shots/pa_{v.replace('+', '_')}.png")
            if i == 0:
                st = await pg.evaluate('window.__stats'); print(json.dumps(st, indent=0))
                ok = st.get('hochrechnung_3500_min', 0) <= 180000 and st.get('verkehr_proxy_netze', 0) >= 2 and st.get('strasse_objekte', 0) > 0
                print('BUDGET/BAUSTEINE', 'OK' if ok else 'FEHLER', st.get('hochrechnung_3500_min'))
            print(v, await pg.evaluate("document.getElementById('info').textContent"))
        echte = [e for e in errs if '404' not in e]
        print('Fehler (ohne 404 Busheck-Bilder)', echte); await b.close()
asyncio.run(main())
