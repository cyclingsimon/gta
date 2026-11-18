"""18a: Ambulanz fährt einer Tunnel-Polylinie entlang (Lenkhilfe per head) und meldet, wo sie hängen bleibt. Aufruf: tunnel_drive.py port qs region 'x,z;x,z;…'"""
import asyncio, json, sys, math
from playwright.async_api import async_playwright
PORT, QS, REG = sys.argv[1], sys.argv[2], sys.argv[3]
PTS = [tuple(map(float, q.split(','))) for q in sys.argv[4].split(';')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 800, 'height': 450}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&notraffic&nostream&region={REG}{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.evaluate("document.querySelector('#start-btn').click()"); await pg.wait_for_function('window.__luksiReady')
        x0, z0 = PTS[0]; h0 = math.atan2(PTS[1][0] - x0, PTS[1][1] - z0)
        await pg.evaluate(f'window.__dbg.tp({x0},{z0},{h0})'); await pg.wait_for_timeout(1500)
        print('start', await pg.evaluate('JSON.stringify(window.__dbg.blk())'))
        k = 1; stuck = 0; last = None; log = []
        for it in range(int(__import__('os').environ.get('IT', '400'))):
            c = await pg.evaluate('window.__dbg.car()')
            while k < len(PTS) - 1 and math.hypot(PTS[k][0] - c['x'], PTS[k][1] - c['z']) < 25: k += 1
            if k == len(PTS) - 1 and math.hypot(PTS[k][0] - c['x'], PTS[k][1] - c['z']) < 25: log.append('ziel'); break
            h = math.atan2(PTS[k][0] - c['x'], PTS[k][1] - c['z'])
            await pg.evaluate(f'window.__dbg.head({h}); window.__dbg.speed(' + __import__('os').environ.get('V', '12') + ')'); await pg.wait_for_timeout(250)
            if last and math.hypot(c['x'] - last[0], c['z'] - last[1]) < 0.5:
                stuck += 1
                if stuck == 3: log.append(['haengt', round(c['x']), round(c['z']), json.loads(await pg.evaluate('JSON.stringify(window.__dbg.blk())'))])
                if stuck > 6: break
            else: stuck = 0
            last = (c['x'], c['z'])
        c = await pg.evaluate('window.__dbg.car()'); await pg.screenshot(path='shots/tunnel_drive.png')
        print(json.dumps({'ende': [round(c['x']), round(c['z'])], 'k': k, 'n': len(PTS), 'log': log, 'blk': json.loads(await pg.evaluate('JSON.stringify(window.__dbg.blk())')), 'fehler': errs}))
        await b.close()
asyncio.run(main())
