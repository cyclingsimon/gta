"""21a: Sichtbilder je Wetter (Fahrersicht hinter dem Auto + Schrägsicht). Aufruf: look_wetter.py [qs] → shots/wetter_<w>_<n>.png"""
import asyncio, sys, os
from playwright.async_api import async_playwright
QS = sys.argv[1] if len(sys.argv) > 1 else ''
async def main():
    os.makedirs('shots', exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        pg.on('console', lambda m: errs.append(m.text[:300]) if m.type == 'error' and 'aerial_hr' not in m.text else None)
        await pg.goto(f'http://localhost:8765/?test&region=luzern{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate("localStorage.clear(); document.querySelector('#start-btn').click()"); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(3000)
        for w in ['sonne', 'regen', 'schnee', 'nebel']:
            r = await pg.evaluate(f"window.__dbg.wetter('{w}')"); print(w, r)
            await pg.evaluate('window.__cam = null'); await pg.wait_for_timeout(2500); await pg.screenshot(path=f'shots/wetter_{w}_0.png')
            await pg.evaluate('window.__dbg.airCam(-400, -30, 140, 70, 1.5)'); await pg.wait_for_timeout(2500); await pg.screenshot(path=f'shots/wetter_{w}_1.png')
        print('Fehler', errs); await b.close()
asyncio.run(main())
