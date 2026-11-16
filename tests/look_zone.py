"""Sichttest Zone 30: Kamera 12 m vor dem Bodenzeichen (aus Sicht der einfahrenden Ambulanz), 3 m hoch."""
import asyncio, sys
from playwright.async_api import async_playwright
N = int(sys.argv[1]) if len(sys.argv) > 1 else 4
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000); logs = []; errs = []
        pg.on('console', lambda m: logs.append(m.text) if 'Zone 30' in m.text else None); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/?test&notraffic'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
        S = await pg.evaluate('window.__zone30') or []; print(logs, len(S))
        for i, (x, z, ux, uz) in enumerate(sorted(S, key=lambda q: abs(q[0]) + abs(q[1] - 400))[:N]):
            await pg.evaluate('([x,z,ux,uz])=>{window.__dbg.tp(x+25,z+25,0); const h=window.__dbg.hg(x,z)[0]; window.__cam=[x-ux*12,h+3,z-uz*12,x+ux*3,h+1,z+uz*3];}', [x, z, ux, uz])
            await pg.wait_for_timeout(2500); await pg.screenshot(path=f'shots/zone_{i}.png'); print(i, x, z)
        print('Fehler', errs); await b.close()
asyncio.run(main())
