"""13i Schnellreise: Karte öffnen (T bzw. Pause-Menü), Ziel in derselben Region (Teleport), Ziel in anderer Region (Neuladen mit ?region=),
graue «kommt bald»-Ziele. Screenshots shots/travel_*. Aufruf: travel.py [url]"""
import asyncio, sys, json
from playwright.async_api import async_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/?test&noshadow&q=leicht'
A = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
async def run(b, vp, tag, touch):
    ctx = await b.new_context(viewport=vp, has_touch=touch, is_mobile=touch)
    pg = await ctx.new_page(); pg.set_default_timeout(60000); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    await pg.goto(U); await pg.wait_for_selector('#start-btn', state='visible', timeout=900000)
    await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
    await pg.wait_for_timeout(1500)
    p0 = await pg.evaluate('[window.__dbg.car().x, window.__dbg.car().z]') if await pg.evaluate('!!(window.__dbg && window.__dbg.car)') else None
    if touch:
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600)
        await pg.click('#menu-items button:has-text("Schnellreise")')
    else:
        await pg.keyboard.press('KeyT')
    await pg.wait_for_selector('.mg.tr'); await pg.wait_for_timeout(800)
    await pg.screenshot(path=f'shots/travel_{tag}_karte.png')
    n = await pg.evaluate("document.querySelectorAll('.tr-list button').length"); off = await pg.evaluate("document.querySelectorAll('.tr-list button.off').length")
    # graues Ziel
    await pg.click('.tr-list button.off >> nth=0'); await pg.wait_for_timeout(300)
    soon = await pg.inner_text('.tr-msg')
    # Teleport in derselben Region (Bahnhof Luzern)
    await pg.click('.tr-list button:has-text("Bahnhof Luzern")'); await pg.wait_for_timeout(3500)
    still = await pg.evaluate("!!document.querySelector('.mg.tr')")
    p1 = await pg.evaluate('[window.__dbg.car().x, window.__dbg.car().z]') if p0 else None
    await pg.screenshot(path=f'shots/travel_{tag}_bahnhof.png')
    # Reise in andere Region
    await pg.keyboard.press('KeyT') if not touch else (await pg.keyboard.press('Escape'), await pg.wait_for_timeout(500), await pg.click('#menu-items button:has-text("Schnellreise")'))
    await pg.wait_for_selector('.mg.tr')
    await pg.click('.tr-list button:has-text("Spital Nidwalden")')
    await pg.wait_for_url('**region=sued**', timeout=60000, wait_until='commit')
    url = pg.url; sv = await pg.evaluate("JSON.parse(localStorage.getItem('luksiRescue.v1')||'{}')")
    print(tag, json.dumps({'ziele': n, 'grau': off, 'grau_msg': soon, 'teleport_von': p0, 'nach': p1, 'overlay_offen': still, 'url': url, 'save_region': sv.get('region'), 'save_pos': sv.get('pos'), 'fehler': errs}, ensure_ascii=False))
    await ctx.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=A)
        await run(b, {'width': 1280, 'height': 720}, 'pc', False)
        await run(b, {'width': 800, 'height': 380}, 'handy', True)
        await b.close()
asyncio.run(main())
