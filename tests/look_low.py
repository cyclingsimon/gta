"""18a: wie look_at.py, aber Kamera auf Bodenhöhe (unter Brücken): look_low.py PREFIX 'x,z,dist,hoch,winkel;…'  Env QS"""
import asyncio, sys, os, math
from playwright.async_api import async_playwright
PRE = sys.argv[1]; spots = [tuple(float(v) for v in s.split(',')) for s in sys.argv[2].split(';')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(1500000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); logs = []; pg.on('console', lambda m: logs.append(m.text[:120]) if m.text.startswith('[bau]') else None)
        await pg.goto('http://localhost:8765/?test' + os.environ.get('QS', '')); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.evaluate("document.querySelector('#start-btn').click()"); await pg.wait_for_function('window.__luksiReady', timeout=1500000)
        await pg.evaluate("document.querySelectorAll('.radio,#radio,#offer').forEach(e=>e.style.display='none')")
        for i, (x, z, d, up, a) in enumerate(spots):
            cx, cz = x + math.sin(a) * d, z + math.cos(a) * d
            g = (await pg.evaluate(f'window.__dbg.hg({cx},{cz})'))[1]; g0 = (await pg.evaluate(f'window.__dbg.hg({x},{z})'))[1]
            await pg.evaluate(f'window.__cam=[{cx},{g + up},{cz},{x},{g0 + 2},{z}]'); await pg.wait_for_timeout(3500); await pg.screenshot(path=f'shots/{PRE}_{i}.png')
        print('\n'.join(logs)); print('Fehler', errs); await b.close()
asyncio.run(main())
