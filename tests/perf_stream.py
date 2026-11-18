"""18a: Ruckeln beim Gegendwechsel messen. Fährt per warp von Luzern nach Westen (wie stream_chain) und zeichnet lange Aufgaben
(longtask ≥ 50 ms) mit den [welt]/[bau]-Meldungen auf. Aufruf: perf_stream.py [port] [qs] [x1]"""
import asyncio, json, sys, math, time
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
QS = sys.argv[2] if len(sys.argv) > 2 else '&q=leicht'
X1 = float(sys.argv[3]) if len(sys.argv) > 3 else -9500
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        logs = []; t0 = [time.time()]
        pg.on('console', lambda m: logs.append([round(time.time() - t0[0], 1), m.text[:140]]) if ('[welt]' in m.text or '[perf]' in m.text) else None)
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&region=luzern{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        await pg.evaluate('''window.__lt=[]; new PerformanceObserver(l=>{for(const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)])}).observe({type:'longtask', buffered:false});''')
        t0[0] = time.time(); x = -3000; Z = 1200; H = -math.pi / 2; seq = []
        await pg.evaluate(f'window.__dbg.warp({x},{Z},{H}); window.__dbg.speed(20)')
        tp0 = await pg.evaluate('performance.now()')
        while x > X1 and time.time() - t0[0] < 1500:
            await pg.wait_for_timeout(700)
            w = json.loads(await pg.evaluate('JSON.stringify(window.__welt())'))
            if not seq or seq[-1][1] != w['aktiv']: seq.append([round(x), w['aktiv'], round(time.time() - t0[0])])
            cap = w['vcap']; step = 60 if cap is None else max(1.5, min(60, cap * 0.7)); x -= step
            await pg.evaluate(f'window.__dbg.warp({x},{Z},{H}); window.__dbg.speed(20)')
        await pg.wait_for_timeout(4000)
        lt = await pg.evaluate('window.__lt')
        lt = [[round((a - tp0) / 1000, 1), d] for a, d in lt]
        big = sorted(lt, key=lambda e: -e[1])[:15]
        print(json.dumps({'folge': seq, 'dauer': round(time.time() - t0[0]), 'longtasks_n': len(lt), 'summe_ms': sum(d for _, d in lt), 'groesste': big, 'ueber1s': [e for e in lt if e[1] > 1000], 'log': logs[:60], 'fehler': errs}, ensure_ascii=False, indent=0))
        await b.close()
asyncio.run(main())
