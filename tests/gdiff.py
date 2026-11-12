"""Vergleicht sichtbares Gelände (Bodenmeshes) mit world.groundAt. Aufruf: gdiff.py [qs]"""
import asyncio, sys, json
from playwright.async_api import async_playwright
QS = sys.argv[1] if len(sys.argv) > 1 else ''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 640, 'height': 360}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test' + QS); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn')
        await pg.wait_for_function('window.__luksiReady', timeout=900000)
        for spot in (sys.argv[2] if len(sys.argv) > 2 else '').split(';'):
            if spot: await pg.evaluate(f'window.__dbg.tp({spot})'); await pg.wait_for_timeout(3000)
        r = await pg.evaluate('window.__dbg.gdiff(1.5)')
        print(json.dumps({k: r[k] for k in ('n', 'bad', 'byMesh')}))
        w = sorted(r['worst'], key=lambda a: -abs(a[2]))[:40]; print(w)
        json.dump(r, open('/tmp/gdiff.json', 'w'))
        await b.close()
asyncio.run(main())
