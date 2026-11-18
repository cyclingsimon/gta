"""18a: Tunnelzellen und Boden entlang einer Polylinie. Aufruf: tun_probe.py port qs region 'x,z;…' [schritt]"""
import asyncio, json, sys, math
from playwright.async_api import async_playwright
PORT, QS, REG = sys.argv[1], sys.argv[2], sys.argv[3]
PTS = [tuple(map(float, q.split(','))) for q in sys.argv[4].split(';')]; ST = float(sys.argv[5]) if len(sys.argv) > 5 else 4
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 800, 'height': 450}); pg.set_default_timeout(1500000)
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&notraffic&nostream&region={REG}{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate("localStorage.clear(); document.querySelector('#start-btn').click()"); await pg.wait_for_function('window.__luksiReady')
        out = []
        for i in range(len(PTS) - 1):
            (ax, az), (bx, bz) = PTS[i], PTS[i + 1]; L = math.hypot(bx - ax, bz - az); n = max(1, int(L / ST))
            for k in range(n):
                x, z = ax + (bx - ax) * k / n, az + (bz - az) * k / n
                r = await pg.evaluate(f'(() => {{ const h = window.__dbg.hgt({x},{z}); return [h.g, h.h, h.b]; }})()')
                t = await pg.evaluate(f'window.__dbg.tun({x},{z})')
                out.append([round(x), round(z), round(r[0], 1), t])
        print(json.dumps(out))
        await b.close()
asyncio.run(main())
