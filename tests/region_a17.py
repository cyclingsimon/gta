"""14w: Wechsel a17 Beromünster/Gunzwil ↔ a3 (Luzernerstrasse), ↔ a2 (Strasse bei x −10860) und ↔ a15 (Krumbacherstrasse).
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
        await pg.goto(f'http://localhost:{PORT}/?test&edge&noshadow&q=leicht&region=a17'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await ready(pg)
        async def st(): s = json.loads(await pg.evaluate("localStorage.getItem('luksiRescue.v1')")); return s.get('region'), await pg.evaluate('JSON.stringify(window.__dbg.car())')
        q = await cross(pg, -7486, -14480, 0.24, 'a3'); await ready(pg); print('a17→a3:', q, '|', *await st())
        q = await cross(pg, -7494, -14515, -2.91, 'a17'); await ready(pg); print('a3→a17:', q, '|', *await st())
        q = await cross(pg, -10864, -14480, 0.15, 'a2'); await ready(pg); print('a17→a2:', q, '|', *await st())
        q = await cross(pg, -10860, -14515, -2.99, 'a17'); await ready(pg); print('a2→a17:', q, '|', *await st())
        q = await cross(pg, -13615, -17673, -0.89, 'a15'); await ready(pg); print('a17→a15:', q, '|', *await st())
        q = await cross(pg, -13590, -17669, 2.25, 'a17'); await ready(pg); print('a15→a17:', q, '|', *await st())
        print('Fehler', errs); await b.close()
asyncio.run(main())
