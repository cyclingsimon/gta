"""13m: Wechsel alte Region West ↔ a8 Malters mit Bestätigungsdialog.
Aufruf: region_a.py [port]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
async def ready(pg):
    await pg.wait_for_selector('#start-btn', state='visible', timeout=900000)
    txt = await pg.inner_text('#start-btn'); await pg.click('#start-btn')
    await pg.wait_for_function('window.__luksiReady', timeout=900000)
    return txt
async def cross(pg, x, z, h, want):
    await pg.evaluate(f'window.__dbg.tp({x},{z},{h})'); await pg.wait_for_timeout(300)
    for _ in range(30):
        await pg.evaluate('window.__dbg.speed(8)'); await pg.wait_for_timeout(200)
        if await pg.evaluate("!!document.querySelector('.mg-card.ask')"): break
    q = await pg.evaluate("document.querySelector('.mg-card.ask')?.innerText || ''")
    await pg.keyboard.press('Enter'); await pg.wait_for_url(f'**region={want}**', timeout=90000)
    return q.replace('\n', ' ')[:80]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto(f'http://localhost:{PORT}/?test&edge&noshadow&q=leicht&region=west'); await pg.evaluate('localStorage.clear()'); await pg.reload()
        await ready(pg)
        # Hauptstrasse Sursee → Oberkirch nahe dem Ostrand (x −14300), Richtung Osten
        q = await cross(pg, -8462, 1259, -1.193, 'a8')
        t = await ready(pg); s = json.loads(await pg.evaluate("localStorage.getItem('luksiRescue.v1')"))
        print('west→a8 Dialog:', q, '| Knopf:', t, '| Region:', s.get('region'), '| Pos:', s.get('pos'), '| Auto:', await pg.evaluate('JSON.stringify(window.__dbg.car())'))
        q = await cross(pg, -8438, 1253, 1.949, 'west')
        t = await ready(pg); s = json.loads(await pg.evaluate("localStorage.getItem('luksiRescue.v1')"))
        print('a8→west Dialog:', q, '| Region:', s.get('region'), '| Auto:', await pg.evaluate('JSON.stringify(window.__dbg.car())'))
        print('Fehler', errs); await b.close()
asyncio.run(main())
