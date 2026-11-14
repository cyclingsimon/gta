"""14s: Wechsel a13 Willisau ↔ a4 Buttisholz (Stettenbach).
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
    for _ in range(60):
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
        await pg.goto(f'http://localhost:{PORT}/?test&edge&noshadow&q=leicht&region=a13'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await ready(pg)
        async def st(): s = json.loads(await pg.evaluate("localStorage.getItem('luksiRescue.v1')")); return s.get('region'), await pg.evaluate('JSON.stringify(window.__dbg.car())')
        q = await cross(pg, -19885, -7801, 0.78, 'a4'); await ready(pg); print('a13→a4:', q, '|', *await st())
        q = await cross(pg, -19930, -7846, -2.36, 'a13'); await ready(pg); print('a4→a13:', q, '|', *await st())
        print('Fehler', errs); await b.close()
asyncio.run(main())
