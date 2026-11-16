"""Nahaufnahmen: look_nah.py PREFIX 'x,z,dx,dy,dz;…' – Kamera bei (x+dx, Boden+dy, z+dz), Blick auf (x, Boden+1, z). Ambulanz wird 30 m daneben abgestellt (Streaming/Sichtbarkeit)."""
import asyncio, sys, os
from playwright.async_api import async_playwright
PRE = sys.argv[1]; spots = [tuple(float(v) for v in s.split(',')) for s in sys.argv[2].split(';')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000); errs = []; logs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('console', lambda m: logs.append(m.text[:160]) if m.text.startswith('[bau]') else None)
        await pg.goto('http://localhost:8765/?test&notraffic' + os.environ.get('QS', '')); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
        await pg.evaluate("document.querySelectorAll('.radio,#radio,#offer').forEach(e=>e.style.display='none')")
        for i, (x, z, dx, dy, dz) in enumerate(spots):
            await pg.evaluate('([x,z,dx,dy,dz])=>{window.__dbg.tp(x+30,z+30,0); const h=window.__dbg.hg(x,z)[0]; window.__cam=[x+dx,h+dy,z+dz,x,h+1,z];}', [x, z, dx, dy, dz])
            await pg.wait_for_timeout(3000); await pg.screenshot(path=f'shots/{PRE}_{i}.png')
        if os.environ.get('LOG'): print('\n'.join(l for l in logs if os.environ['LOG'] in l))
        print('Fehler', errs); await b.close()
asyncio.run(main())
