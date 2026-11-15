"""15b: Zug im Spiel ansehen – alle 4 s den Wagen fotografieren, der am weitesten vom Bahnhof entfernt ist (Kamera seitlich). Aufruf: look_zug.py [port]"""
import asyncio, json, sys, math
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&notraffic&q=leicht'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.evaluate('window.__dbg.quiet()')
        orte = []
        for k in range(8):
            f = json.loads(await pg.evaluate("JSON.stringify(((window.__fahrzeuge2 && window.__fahrzeuge2()) || window.__fahrzeuge().zuege))"))
            x, y, z = max(f, key=lambda q: math.hypot(q[0] - 300, q[2] - 300) if q[1] > -50 else -1)
            await pg.evaluate(f'window.__cam=[{x + 14},{y + 38},{z + 14},{x},{y + 2},{z}]'); await pg.wait_for_timeout(1500); await pg.screenshot(path=f'shots/zug_{k}.png'); orte.append([x, y, z])
            await pg.wait_for_timeout(2500)
        print(orte, 'Fehler', errs); await b.close()
asyncio.run(main())
