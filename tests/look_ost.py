"""Sichtprüfung Osterweiterung (Verkehrshaus, Haldenstrasse, Kastanienbaum). Aufruf: look_ost.py [url]"""
import asyncio, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/?test'
spots = [(2086, -127, 'vhs', 0), (2086, -127, 'vhs_oben', 1), (1519, -397, 'halde', 0), (1647, 3796, 'kastanienbaum', 0), (1150, -300, 'naht', 1)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto(URL); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn')
        await pg.wait_for_function('window.__luksiReady', timeout=900000)
        for x, z, n, cam in spots:
            await pg.evaluate(f'window.__dbg.tp({x},{z})')
            if cam: await pg.keyboard.press('KeyC')
            await pg.wait_for_timeout(5000)
            await pg.screenshot(path=f'shots/ost_{n}.png')
            if cam: await pg.keyboard.press('KeyC'); await pg.keyboard.press('KeyC')
        print('Fehler', errs); await b.close()
asyncio.run(main())
