"""Regionswechsel Luzern → Nord → Luzern (Nachladen am Nordrand). Aufruf: region.py"""
import asyncio, json
from playwright.async_api import async_playwright
async def ready(pg):
    await pg.wait_for_selector('#start-btn', state='visible', timeout=900000)
    txt = await pg.inner_text('#start-btn'); await pg.click('#start-btn')
    await pg.wait_for_function('window.__luksiReady', timeout=900000)
    return txt
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/?test&edge'); await pg.evaluate('localStorage.clear()'); await pg.reload()
        await ready(pg)
        # Bahnhofstrasse Maihof Richtung Norden: knapp über die Linie z = −1000
        await pg.evaluate('window.__dbg.tp(560,-1040,Math.PI)')
        await pg.wait_for_url('**region=nord**', timeout=60000)
        t = await ready(pg)
        s = json.loads(await pg.evaluate("localStorage.getItem('luksiRescue.v1')"))
        pos = await pg.evaluate('[window.__dbg.car().x, window.__dbg.car().z]') if await pg.evaluate('!!(window.__dbg && window.__dbg.car)') else None
        print('Nord geladen, Knopf:', t, '| Region im Spielstand:', s.get('region'), '| Position:', s.get('pos'), pos)
        await pg.screenshot(path='shots/region_nord.png')
        await pg.evaluate('window.__dbg.tp(560,-600,0)')
        await pg.wait_for_url('**region=luzern**', timeout=60000)
        t = await ready(pg)
        s = json.loads(await pg.evaluate("localStorage.getItem('luksiRescue.v1')"))
        print('Luzern geladen, Knopf:', t, '| Region:', s.get('region'), '| Position:', s.get('pos'))
        await pg.screenshot(path='shots/region_luzern.png')
        print('Fehler', errs); await b.close()
asyncio.run(main())
