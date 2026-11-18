"""18a: Fahrzeughöhe gegen sichtbare Fahrbahn. Aufruf: road_y.py [port] [qs] [x,z ...]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
QS = sys.argv[2] if len(sys.argv) > 2 else '&q=echt'
PTS = sys.argv[3] if len(sys.argv) > 3 else ''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 640, 'height': 360}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&region=luzern{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        await pg.wait_for_timeout(5000)
        r = await pg.evaluate('''() => { const T = window.__dbg.trafficRaw(); const out = []; for (const c of T.cars) { if (!c.alive || c.bus) continue; const ry = window.__dbg.roadY(c.x, c.z); out.push([Math.round(c.x), Math.round(c.z), Math.round((c.ty||0)*100)/100, ry]); if (out.length > 25) break; } return out; }''')
        d = [ (c[3][0][1] - c[2]) for c in r if c[3] ]
        print(json.dumps({'autos': r, 'diff_road_minus_car': sorted(round(x, 2) for x in d), 'fehler': errs}))
        await b.close()
asyncio.run(main())
