"""15a: Funkspruch hält die Welt an (Simon 14.11.: «Don't text and drive»). Aufruf: funkhalt.py [port]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await pg.goto(f'http://localhost:{PORT}/?test&funkhalt&noshadow&q=leicht&notraffic'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        car = lambda: pg.evaluate('JSON.stringify(window.__dbg.car())')
        await pg.evaluate('window.__dbg.speed(15)'); await pg.wait_for_timeout(1500); a = json.loads(await car())
        await pg.evaluate('window.__dbg.offer()'); await pg.wait_for_selector('#radio.show'); await pg.wait_for_timeout(500)
        b1 = json.loads(await car()); await pg.wait_for_timeout(3000); b2 = json.loads(await car())
        await pg.screenshot(path='shots/funkhalt.png')
        await pg.click('#acc'); await pg.wait_for_timeout(2500); c = json.loads(await car())
        steht = abs(b2['x'] - b1['x']) + abs(b2['z'] - b1['z']) < 0.01
        faehrt = abs(c['x'] - b2['x']) + abs(c['z'] - b2['z']) > 0.5
        print(json.dumps({'vorher': a, 'halt1': b1, 'halt2': b2, 'nach_annehmen': c, 'steht_bei_funk': steht, 'tempo_bleibt': abs(b2['speed'] - b1['speed']) < 0.01, 'faehrt_weiter': faehrt, 'fehler': errs, 'ok': steht and faehrt and not errs}, ensure_ascii=False))
        await b.close()
asyncio.run(main())
