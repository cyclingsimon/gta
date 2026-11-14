"""14zk: Navi zu einem Ziel in der Nachbargegend (Luzern -> West, Luzern -> Nord)."""
import asyncio, json, math, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
CASES = [('west', (-2900, 1900), (-5965, 361)), ('nord', (-500, -300), (-1929, -2086))]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 800, 'height': 450}); pg.set_default_timeout(600000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        logs = []; pg.on('console', lambda m: logs.append(m.text) if '[welt]' in m.text else None)
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&notraffic&nobus&region=luzern'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        ok = True
        for nb, (cx, cz), (tx, tz) in CASES:
            await pg.evaluate(f'window.__weltLoad("{nb}")')
            await pg.evaluate(f'window.__dbg.warp({cx},{cz},0); window.__dbg.tgt({tx},{tz})'); await pg.wait_for_timeout(4000)
            i = json.loads(await pg.evaluate('JSON.stringify(window.__dbg.info())'))
            pts = i['routePts'] or []
            last = pts[-2] if len(pts) > 1 else None
            d = round(math.dist(last, (tx, tz))) if last else None
            good = i['route'] > 5 and d is not None and d < 80 and i['routeLen'] < 3 * math.dist((cx, cz), (tx, tz)) + 800
            ok &= good
            print(nb, 'Punkte', i['route'], 'Länge', i['routeLen'], 'Luftlinie', round(math.dist((cx, cz), (tx, tz))), 'letzter Knoten zum Ziel', d, 'OK' if good else 'FEHLER')
        print('LOG', logs[-6:]); print('Fehler', errs); print('ALLES OK' if ok and not errs else 'NICHT OK')
        await b.close()
asyncio.run(main())
