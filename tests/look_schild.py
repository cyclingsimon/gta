"""Sichttest Strassenschilder: fährt zu den ersten N Pfosten (window.__strassenschilder) und fotografiert aus 7 m Entfernung in Augenhöhe."""
import asyncio, sys
from playwright.async_api import async_playwright
N = int(sys.argv[1]) if len(sys.argv) > 1 else 4
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000); logs = []
        pg.on('console', lambda m: logs.append(m.text) if 'Strassenschilder' in m.text else None); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/?test&noshadow&notraffic&q=leicht'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
        S = await pg.evaluate('window.__strassenschilder'); print(logs, errs, S and len(S)); S = S or []
        pick = sorted(S, key=lambda q: abs(q[0] - 100) + abs(q[1] - 300))[:N]
        for i, (x, z) in enumerate(pick):
            await pg.evaluate('([x,z])=>{window.__dbg.tp(x+20,z+20,0); const h=window.__dbg.hg(x,z)[0]; window.__cam=[x+4.5,h+2.3,z+5.5,x,h+2.7,z];}', [x, z])
            await pg.wait_for_timeout(2500); await pg.screenshot(path=f'shots/schild_{i}.png'); print(i, x, z)
        print('Fehler', errs); await b.close()
asyncio.run(main())
