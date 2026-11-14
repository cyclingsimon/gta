"""Screenshots an beliebigen Punkten. Aufruf: look_spots.py prefix 'x,z,h,cam;...'"""
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
        await pg.evaluate("document.querySelectorAll('.radio,#radio,#offer').forEach(e=>e.style.display='none')")
        if os.environ.get('EVE'): await pg.evaluate('window.__dbg.evening(true)')
        for i, (x, z, h, cam) in enumerate(spots):
            if cam < 0: await pg.evaluate(f'window.__cam=[{x},{h},{z},{x+(-cam%1000)-500},{h-28},{z+(-cam//1000)-500}]')
            else: await pg.evaluate(f'window.__cam=null;window.__dbg.tp({x},{z},{h})')
            for _ in range(max(0,int(cam))): await pg.keyboard.press('KeyC')
            await pg.wait_for_timeout(4000)
            await pg.screenshot(path=f'shots/{PRE}_{i}.png')
            for _ in range((3 - max(0,int(cam))) % 3): await pg.keyboard.press('KeyC')
        print('Fehler', errs); await b.close()
asyncio.run(main())
