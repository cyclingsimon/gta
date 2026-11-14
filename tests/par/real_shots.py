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
            await pg.goto(f'http://localhost:8771/real_szene.html?v={v}'); await pg.wait_for_function('window.__ready')
            await pg.wait_for_timeout(1200)
            await pg.screenshot(path=f'shots/pa_{v}.png')
            if i == 0: print(json.dumps(await pg.evaluate('window.__stats'), indent=0))
            print(v, await pg.evaluate("document.getElementById('info').textContent"))
        print('Fehler', errs); await b.close()
asyncio.run(main())
