"""Schräge Luftbilder: air.py prefix 'x,z,d,h,a;...' (QS=&region=a5)"""
import asyncio, sys, os
from playwright.async_api import async_playwright
PRE = sys.argv[1]; spots = [tuple(float(v) for v in s.split(',')) for s in sys.argv[2].split(';')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/?test' + os.environ.get('QS', '')); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn')
        await pg.wait_for_function('window.__luksiReady', timeout=900000)
        await pg.evaluate("document.querySelectorAll('.radio,#radio,#offer,#hud,.minimap,#minimap').forEach(e=>e.style.display='none')")
        for i, (x, z, d, h, a) in enumerate(spots):
            await pg.evaluate(f'window.__dbg.tp({x},{z});window.__dbg.airCam({x},{z},{d},{h},{a})')
            await pg.wait_for_timeout(5000)
            await pg.screenshot(path=f'shots/{PRE}_{i}.png')
        print('Fehler', errs); await b.close()
asyncio.run(main())
