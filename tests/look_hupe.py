"""21d: Welt reagiert – Tauben, Sprechblase, Kinder nach Hupe; Gischt bei Regen. Bilder shots/hupe_*.png"""
import asyncio, sys
from playwright.async_api import async_playwright
QS = sys.argv[1] if len(sys.argv) > 1 else ''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        logs = []; pg.on('console', lambda m: logs.append(m.text) if 'Tauben' in m.text else None)
        await pg.goto(f'http://localhost:8765/?test&region=luzern{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate("localStorage.clear(); document.querySelector('#start-btn').click()"); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(5000)
        print(logs)
        c = await pg.evaluate('[window.__dbg.scene().getObjectByName("tauben").count]'); print('Vögel', c)
        await pg.screenshot(path='shots/hupe_0.png')
        r = await pg.evaluate('(() => { const s = window.__dbg.scene().getObjectByName("tauben"); const m = s.instanceMatrix.array; return [m[12], m[13], m[14]]; })()'); print('erster Vogel', r)
        x, y, z = r
        await pg.evaluate(f'window.__cam = [{x + 9}, {y + 3.5}, {z + 9}, {x}, {y + 1}, {z}]'); await pg.wait_for_timeout(2000); await pg.screenshot(path='shots/hupe_tauben_boden.png')
        h = await pg.evaluate(f'window.__dbg.hup({x + 5}, {z + 5})'); print('hup', h); await pg.wait_for_timeout(1800)
        await pg.evaluate(f'window.__cam = [{x + 16}, {y + 3}, {z + 16}, {x}, {y + 9}, {z}]'); await pg.wait_for_timeout(700); await pg.screenshot(path='shots/hupe_tauben_flug.png')
        print('Fehler', errs); await b.close()
asyncio.run(main())
