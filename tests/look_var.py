"""Sichttest für Listen aus Testhaken: look_var.py VAR N DX DY DZ [LOGWORT] – fährt zu den ersten N Punkten [x,z,…] aus window.VAR (nächste am Zentrum),
Kamera bei (x+DX, Boden+DY, z+DZ), Blick auf (x, Boden+2.2, z). Bilder shots/VAR_i.png."""
import asyncio, sys
from playwright.async_api import async_playwright
VAR, N, DX, DY, DZ = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]); WORT = sys.argv[6] if len(sys.argv) > 6 else '[bau]'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000); logs = []; errs = []
        pg.on('console', lambda m: logs.append(m.text[:140]) if WORT in m.text else None); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/?test&notraffic'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
        S = await pg.evaluate('window.' + VAR) or []; print(logs if WORT != '[bau]' else '', len(S))
        for i, q in enumerate(sorted(S, key=lambda q: abs(q[0]) + abs(q[1] - 1500))[:N]):
            await pg.evaluate('([x,z,dx,dy,dz])=>{window.__dbg.tp(x+25,z+25,0); const y=window.__dbg.hg(x,z)[0]; window.__cam=[x+dx,y+dy,z+dz,x,y+2.2,z];}', [q[0], q[1], DX, DY, DZ])
            await pg.wait_for_timeout(2500); await pg.screenshot(path=f'shots/{VAR}_{i}.png'); print(i, q[0], q[1])
        print('Fehler', errs); await b.close()
asyncio.run(main())
