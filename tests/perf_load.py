"""18a: Bauzeit einer Nachbargegend im Hintergrund zerlegen ([bau]-Meldungen + lange Aufgaben). Aufruf: perf_load.py [port] [qs] [gegend] [echt-upgrade 0/1]"""
import asyncio, json, sys, time
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
QS = sys.argv[2] if len(sys.argv) > 2 else '&q=leicht'
G = sys.argv[3] if len(sys.argv) > 3 else 'west'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 640, 'height': 360}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        logs = []; t0 = [time.time()]; on = [False]
        pg.on('console', lambda m: logs.append(f'{time.time() - t0[0]:6.1f} {m.text[:150]}') if on[0] and ('[bau]' in m.text or '[welt]' in m.text or '[perf]' in m.text) else None)
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&region=luzern{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        await pg.wait_for_timeout(3000)
        await pg.evaluate('''window.__lt=[]; window.__t0=performance.now(); new PerformanceObserver(l=>{for(const e of l.getEntries()) window.__lt.push([Math.round(e.startTime-window.__t0), Math.round(e.duration)])}).observe({type:'longtask'});
          window.__fr=[]; let last=performance.now(); (function f(){const n=performance.now(); window.__fr.push(Math.round(n-last)); last=n; requestAnimationFrame(f)})();''')
        on[0] = True; t0[0] = time.time()
        await pg.evaluate(f'window.__weltLoad("{G}")')
        logs.append(f'{time.time() - t0[0]:6.1f} geladen')
        await pg.wait_for_timeout(2000)
        lt = await pg.evaluate('window.__lt'); fr = await pg.evaluate('window.__fr')
        fr.sort()
        print('\n'.join(logs))
        print(json.dumps({'longtasks': sorted(lt, key=lambda e: -e[1])[:12], 'summe': sum(d for _, d in lt), 'frames_n': len(fr), 'frame_median': fr[len(fr)//2], 'frame_max5': fr[-5:], 'fehler': errs}))
        await b.close()
asyncio.run(main())
