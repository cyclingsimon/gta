"""15a: Durchgehende Welt am Stück – Luzern → West → a8 → a7 entlang einer Geraden (z fest), in Schritten per warp.
Prüft: Nachladen startet, Wechsel der aktiven Gegend, Baustellen-Bremse (vcap) vor ungeladener Gegend, Ambulanz nie ausserhalb
der geladenen Welt, höchstens 3 Gegenden im Speicher, keine Seitenfehler. Aufruf: stream_chain.py [port] [z] [x0] [x1] [qs]"""
import asyncio, json, sys, math, time
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
Z = float(sys.argv[2]) if len(sys.argv) > 2 else 1200
X0 = float(sys.argv[3]) if len(sys.argv) > 3 else -3000
X1 = float(sys.argv[4]) if len(sys.argv) > 4 else -15200
QS = sys.argv[5] if len(sys.argv) > 5 else '&q=leicht'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        nav = []; pg.on('framenavigated', lambda f: nav.append(f.url) if f == pg.main_frame else None)
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&notraffic&region=luzern{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        import os
        if os.environ.get('WETTER'): print('wetter', await pg.evaluate(f"window.__dbg.wetter('{os.environ['WETTER']}')"))
        n0 = len(nav); H = -math.pi / 2 if X1 < X0 else math.pi / 2; d = -1 if X1 < X0 else 1
        x = X0; seq = []; draussen = 0; capped = 0; maxslots = 0; t0 = time.time(); log = []
        await pg.evaluate(f'window.__dbg.warp({x},{Z},{H}); window.__dbg.speed(20)')
        while (x - X1) * d < 0 and time.time() - t0 < 2400:
            await pg.wait_for_timeout(700)
            w = json.loads(await pg.evaluate('JSON.stringify(window.__welt())'))
            if not seq or seq[-1] != w['aktiv']: seq.append(w['aktiv']); log.append([round(x), w['aktiv'], round(time.time() - t0)])
            if not w['drin']: draussen += 1
            maxslots = max(maxslots, len(w['geladen']))
            cap = w['vcap']
            if cap is not None: capped += 1
            step = 60 if cap is None else max(1.5, min(60, cap * 0.7))
            x += d * step
            await pg.evaluate(f'window.__dbg.warp({x},{Z},{H}); window.__dbg.speed(20)')
        await pg.wait_for_timeout(1500); await pg.screenshot(path='shots/stream_chain.png')
        w = json.loads(await pg.evaluate('JSON.stringify(window.__welt())'))
        res = {'folge': seq, 'wechsel': log, 'ende_x': round(x), 'draussen_ticks': draussen, 'gebremst_ticks': capped, 'max_gegenden': maxslots, 'neu_geladen': len(nav) > n0, 'welt': w, 'dauer_s': round(time.time() - t0), 'fehler': errs}
        res['ok'] = draussen == 0 and len(w['geladen']) <= 3 and not errs and len(nav) == n0 and (x - X1) * d >= 0 and maxslots <= 3
        print(json.dumps(res, ensure_ascii=False)); await b.close()
asyncio.run(main())
