"""Dreiecke je Gruppe an mehreren Orten. Aufruf: perf_q.py"""
import asyncio, json, sys
CALLS = len(sys.argv) > 1 and sys.argv[1] == 'calls'
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
        for n, x, z in [('start', None, None), ('schwanen', 86, -151), ('vhs', 2086, -127)]:
            if x is not None: await pg.evaluate(f'window.__dbg.tp({x},{z})')
            await pg.wait_for_timeout(3000)
            r = await pg.evaluate('window.__dbg.perf(' + ('true' if CALLS else 'false') + ')')
            print(n, json.dumps({k: v for k, v in sorted(r.items(), key=lambda kv: -kv[1]) if v > (5 if CALLS else 15)}))
        await b.close()
asyncio.run(main())
