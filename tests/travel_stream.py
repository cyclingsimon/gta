"""14zi: Schnellreise ohne Neuladen (Ziel in anderer Gegend wird im Hintergrund gebaut)."""
import asyncio, json, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 1280, 'height': 720}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        nav = []; pg.on('framenavigated', lambda f: nav.append(f.url) if f == pg.main_frame else None)
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&q=leicht&notraffic&region=luzern'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        n0 = len(nav)
        await pg.keyboard.press('KeyT'); await pg.wait_for_selector('.mg.tr')
        await pg.click('.tr-list button:has-text("Spital Nidwalden")')
        await pg.wait_for_function("window.__welt().aktiv === 'sued'", timeout=600000); await pg.wait_for_timeout(2000)
        c = await pg.evaluate('JSON.stringify(window.__dbg.car())'); w = await pg.evaluate('JSON.stringify(window.__welt())')
        await pg.screenshot(path='shots/travel_stream.png')
        print(json.dumps({'neu_geladen': len(nav) > n0, 'auto': json.loads(c), 'welt': json.loads(w), 'overlay': await pg.evaluate("!!document.querySelector('.mg.tr')"), 'fehler': errs}, ensure_ascii=False))
        await b.close()
asyncio.run(main())
