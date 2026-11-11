"""Sichtprüfung Altstadt. Aufruf: look_alt.py [prefix]"""
import asyncio, sys
from playwright.async_api import async_playwright
PRE = sys.argv[1] if len(sys.argv) > 1 else 'alt'
spots = [(1519, -397, 'halde', 0, 2.0), (86, -151, 'schwanen', 1), (1647, 3796, 'niklausen', 1)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn')
        await pg.wait_for_function('window.__luksiReady', timeout=900000)
        await pg.evaluate("document.querySelectorAll('.radio,#radio,#offer').forEach(e=>e.style.display='none')")
        for x, z, n, cam, *h in spots:
            await pg.evaluate(f'window.__dbg.tp({x},{z}' + (f',{h[0]}' if h else '') + ')')
            if cam: await pg.keyboard.press('KeyC')
            await pg.wait_for_timeout(4000)
            await pg.screenshot(path=f'shots/{PRE}_{n}.png')
            if cam: await pg.keyboard.press('KeyC'); await pg.keyboard.press('KeyC')
        print('Fehler', errs); await b.close()
asyncio.run(main())
