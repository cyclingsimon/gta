"""18a: sichtbarer Boden minus terrain.height im Raster (Ambulanz schwebt / fährt im Boden). Aufruf: surf.py port region qs x z r st [warp-to x z]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
PORT, REG, QS = sys.argv[1], sys.argv[2], sys.argv[3]
X, Z, R, ST = map(float, sys.argv[4:8])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 640, 'height': 360}); pg.set_default_timeout(1200000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&notraffic&region={REG}{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        await pg.evaluate(f'window.__dbg.tp({X},{Z})'); await pg.wait_for_timeout(3000)
        r = await pg.evaluate(f'window.__dbg.surfGrid({X},{Z},{R},{ST})')
        pts = r['pts']; d = sorted(q[2] for q in pts)
        bad = [q for q in pts if abs(q[2]) > 1.0]
        print(json.dumps({'meshes': r['n'], 'names': r['names'][:30], 'n': len(pts), 'p5': d[len(d)//20] if d else None, 'median': d[len(d)//2] if d else None, 'p95': d[-len(d)//20] if d else None, 'bad>1m': len(bad), 'worst': sorted(bad, key=lambda q: -abs(q[2]))[:30], 'fehler': errs}))
        json.dump(pts, open('/tmp/surf.json', 'w'))
        await b.close()
asyncio.run(main())
