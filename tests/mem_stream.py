"""14zj: Speicher mit 1–3 geladenen Gegenden (JS-Heap + Geometrien/Texturen)."""
import asyncio, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'; Q = sys.argv[2] if len(sys.argv) > 2 else 'leicht'
M = "(window.gc && gc(), Math.round(performance.memory.usedJSHeapSize/1e6))"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--expose-gc', '--enable-precise-memory-info'])
        pg = await b.new_page(viewport={'width': 640, 'height': 360}); pg.set_default_timeout(1500000)
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&notraffic&q={Q}&region=luzern'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(2000)
        print('luzern', await pg.evaluate(M), 'MB', flush=True)
        for r in (sys.argv[3].split(',') if len(sys.argv) > 3 else ['west', 'a8']):
            info = await pg.evaluate(f"window.__weltLoad('{r}')"); await pg.wait_for_timeout(2000)
            print('+', r, await pg.evaluate(M), 'MB', info, flush=True)
        await b.close()
asyncio.run(main())
