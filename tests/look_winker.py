"""21b: winkende Kinder – Ambulanz neben den ersten Platz setzen, Bild bei Schön und Schnee, Abend+Schnee."""
import asyncio, sys
from playwright.async_api import async_playwright
QS = sys.argv[1] if len(sys.argv) > 1 else ''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        logs = []; pg.on('console', lambda m: logs.append(m.text) if 'Winkende' in m.text else None)
        await pg.goto(f'http://localhost:8765/?test&region=luzern{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate("localStorage.clear(); document.querySelector('#start-btn').click()"); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(4000)
        k = await pg.evaluate('window.__dbg.winker()'); print(logs, 'sichtbar', len(k), k[:4])
        if k:
            x, z = k[0]; await pg.evaluate(f'window.__dbg.tp({x + 12}, {z + 6})'); await pg.wait_for_timeout(2500)
            c = await pg.evaluate('window.__dbg.pos ? window.__dbg.pos() : null'); print('auto', c)
            y = (await pg.evaluate(f'window.__dbg.hg({x},{z})'))[0]
            for w, eve in [('sonne', False), ('schnee', False), ('schnee', True)]:
                await pg.evaluate(f"window.__dbg.evening({'true' if eve else 'false'})"); await pg.evaluate(f"window.__dbg.wetter('{w}')")
                await pg.evaluate(f'window.__cam = [{x - 7}, {y + 6}, {z - 8}, {x}, {y + 0.8}, {z}]'); await pg.wait_for_timeout(2500); await pg.screenshot(path=f"shots/winker_{w}{'_abend' if eve else ''}.png")
        print('Fehler', errs); await b.close()
asyncio.run(main())
