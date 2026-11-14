"""13i Gebiet A: jede Region laden (leicht), Einsätze, Spital, Busse, Fehler. Aufruf: smoke_a.py [port] [regionen…]"""
import asyncio, sys, json
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
RS = sys.argv[2:] or [f'a{i}' for i in range(1, 17)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        for r in RS:
            pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            await pg.goto(f'http://localhost:{PORT}/?test&noshadow&q=leicht&region={r}'); await pg.evaluate('localStorage.clear()'); await pg.reload()
            await pg.wait_for_selector('#start-btn', state='visible'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
            await pg.wait_for_timeout(1500)
            i = await pg.evaluate('JSON.stringify({m: window.__dbg.info().missions.length, bay: window.__dbg.info().bay, reach: window.__dbg.reach ? window.__dbg.reach().filter(x => x).length : null})')
            await pg.screenshot(path=f'shots/smoke_{r}.png')
            print(r, i, 'Fehler', errs[:3], flush=True); await pg.close()
        await b.close()
asyncio.run(main())
