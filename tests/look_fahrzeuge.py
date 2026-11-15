"""15b: Züge und Schiffe (P-A Lauf 7) im echten Spiel ansehen – Kamera auf das erste Kursschiff und den ersten Zug. Aufruf: look_fahrzeuge.py [port]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&notraffic'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.evaluate('window.__dbg.quiet()')
        f = json.loads(await pg.evaluate('JSON.stringify(window.__fahrzeuge())')); print(f)
        for name, lst, d, h in [('schiff', f['schiffe'], 70, 28), ('zug', f['zuege'], 35, 14)]:
            for i, (x, y, z) in enumerate(lst[:2] if name == 'schiff' else [lst[0], lst[len(lst) // 2]] if lst else []):
                f2 = json.loads(await pg.evaluate('JSON.stringify(window.__fahrzeuge())')); q = (f2['schiffe'] if name == 'schiff' else f2['zuege']); x, y, z = q[i if name == 'schiff' else (0 if i == 0 else len(q) // 2)]
                await pg.evaluate(f'window.__cam=[{x + d},{y + h},{z + d * 0.6},{x},{y + 2},{z}]'); await pg.wait_for_timeout(2500); await pg.screenshot(path=f'shots/fz_{name}{i}.png')
        print('Fehler', errs); await b.close()
asyncio.run(main())
