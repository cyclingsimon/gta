"""15a: Umland einer Nachbargegend darf nicht über der aktiven Gegend liegen (grüne Fläche über Strassen/See, Simon 14.11.).
Lädt zu Luzern die Nachbarn Nord und West und fotografiert Schwanenplatz, Bahnhof, Kriens. Aufruf: apron_clip.py [port]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&q=leicht&notraffic'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        await pg.evaluate('window.__dbg.quiet()')
        for r in ['nord', 'west']: await pg.evaluate(f"window.__weltLoad('{r}')")
        w = await pg.evaluate('JSON.stringify(window.__welt())')
        for i, (x, z) in enumerate([(86, -151), (250, 60), (-150, -60), (-2000, 1900), (-600, -900)]):
            await pg.evaluate(f'window.__dbg.tp({x},{z})'); await pg.wait_for_timeout(3500); await pg.screenshot(path=f'shots/apron_{i}.png')
        await pg.evaluate('window.__cam=[86,260,150,86,0,-151]'); await pg.wait_for_timeout(3000); await pg.screenshot(path='shots/apron_luft.png')
        print(w, 'Fehler', errs); await b.close()
asyncio.run(main())
