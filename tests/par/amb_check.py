"""P-B: Geräuschkulisse – nur Zustände (Testrechner ohne Tonausgabe). Ein Seitenaufruf, Leicht-Stufe.
Aufruf: nice -n 10 python3 tests/par/amb_check.py [PORT]"""
import asyncio, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8772'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 640, 'height': 360}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('console', lambda m: m.type == 'error' and errs.append('console: ' + m.text[:160]))
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&q=leicht&notraffic'); await pg.evaluate('localStorage.clear()'); await pg.reload()
        await pg.wait_for_selector('#start-btn', state='visible'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        await pg.evaluate('window.__dbg.quiet()')
        for name, x, z in [('Bahnhof Luzern', 203, 214), ('Kriens Zentrum', -2040, 1941), ('Horw Land', 1200, 3000)]:
            await pg.evaluate(f'window.__dbg.tp({x},{z},0)'); await pg.wait_for_timeout(20000)
            print(name, await pg.evaluate('JSON.stringify(window.__amb.state())'))
        await pg.evaluate('window.__amb.gong(); window.__amb.chime(3)'); await pg.wait_for_timeout(3000)
        print('nach gong/chime', await pg.evaluate('JSON.stringify(window.__amb.state().events)'))
        print('Fehler', errs); await b.close()
asyncio.run(main())
