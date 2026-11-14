"""14u: Wechsel a15 Triengen ↔ a1 Sursee (Surentalstrasse), ↔ a2 (Geuensee/Sempach) und ↔ a14 Wauwil (Kantonsstrasse).
Aufruf: region_a.py [port]"""
import asyncio, json, sys, re
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
    await pg.keyboard.press('Enter'); await pg.wait_for_url(re.compile(r'region=' + want + r'(&|$)'), timeout=90000)
    return q.replace('\n', ' ')[:80]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto(f'http://localhost:{PORT}/?test&edge&noshadow&q=leicht&region=a15'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await ready(pg)
        async def st(): s = json.loads(await pg.evaluate("localStorage.getItem('luksiRescue.v1')")); return s.get('region'), await pg.evaluate('JSON.stringify(window.__dbg.car())')
        q = await cross(pg, -14885, -14500, -0.24, 'a1'); await ready(pg); print('a15→a1:', q, '|', *await st())
        q = await cross(pg, -14878, -14470, 2.93, 'a15'); await ready(pg); print('a1→a15:', q, '|', *await st())
        q = await cross(pg, -13930, -14530, 0.61, 'a2'); await ready(pg); print('a15→a2:', q, '|', *await st())
        q = await cross(pg, -13905, -14497, -2.53, 'a15'); await ready(pg); print('a2→a15:', q, '|', *await st())
        q = await cross(pg, -19880, -16905, -1.84, 'a14'); await ready(pg); print('a15→a14:', q, '|', *await st())
        q = await cross(pg, -19880, -16904, 1.30, 'a15'); await ready(pg); print('a14→a15:', q, '|', *await st())
        print('Fehler', errs); await b.close()
asyncio.run(main())
