"""20d: Wo geht die Ladezeit hin? Start im gewünschten Modus (QS), sammelt «[perf] rechnen … ms bis: …» (reine Rechenzeit je Bauabschnitt, ohne Zwischenbilder),
«[bau]   <Teil> ms» und die Zeitpunkte Startknopf/bereit. Aufruf: perf_bau.py [qs]  (z. B. '&perf' = Echt, '&perf&q=leicht')"""
import asyncio, sys, time, re, json
from playwright.async_api import async_playwright
QS = sys.argv[1] if len(sys.argv) > 1 else '&perf'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 800, 'height': 450}); pg.set_default_timeout(1500000); t0 = time.time(); L = []
        pg.on('console', lambda m: L.append((round(time.time() - t0, 1), m.text[:110])) if m.text.startswith(('[bau]', '[perf]')) else None)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/?test' + QS); await pg.wait_for_selector('#start-btn', state='visible'); tk = round(time.time() - t0)
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); tr = round(time.time() - t0)
        agg = {}; 
        for t, s in L:
            m = re.match(r'\[perf\] rechnen (\d+) ms bis: (.*)', s)
            if m:
                k = re.sub(r' \d+$', '', m.group(2)).strip(); agg[k] = agg.get(k, 0) + int(m.group(1))
        print('Startknopf', tk, 's · bereit', tr, 's · Fehler', errs)
        print('Rechenzeit je Abschnitt (ms, endet bei …):'); tot = 0
        for k, v in agg.items(): print(f'  {v:>7}  {k}'); tot += v
        print('  Summe', tot)
        print('Einzelteile:'); [print('  ', s) for t, s in L if s.startswith('[bau]   ')]
        await b.close()
asyncio.run(main())
