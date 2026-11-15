"""P-A Lauf 6: Bäume in Zellen vs. instanziert vs. alt (Testseite real_baeume.html, Port 8771). Prüft: Zellen ≤ inst-Dreiecke in der
Strassenansicht, Aufrufe ≤ inst + 20, kein JS-Fehler. Aufruf: nice -n 10 python3 tests/par/real_baeume.py"""
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(180000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        R = {}
        for v in ['strasse', 'hoch']:
            for m in ['alt', 'inst', 'zellen']:
                await pg.goto(f'http://localhost:8771/real_baeume.html?modus={m}&v={v}'); await pg.wait_for_function('window.__ready')
                st = await pg.evaluate('window.__stats'); R[(m, v)] = st; print(m, v, json.dumps(st))
                await pg.screenshot(path=f'shots/pa_baeume_{m}_{v}.png')
        ok = all(R[('zellen', v)]['dreiecke'] <= R[('inst', v)]['dreiecke'] and R[('zellen', v)]['aufrufe'] <= R[('inst', v)]['aufrufe'] + 20 for v in ['strasse', 'hoch'])
        print('BAEUME ZELLEN', 'OK' if ok and not errs else 'FEHLER', errs); await b.close()
asyncio.run(main())
