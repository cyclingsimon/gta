"""Punkt ansehen mit freier Kamera auf richtiger Höhe: look_at.py PREFIX 'x,z,dist,hoch,winkel;…' (winkel = Richtung, AUS der die Kamera schaut, Bogenmass; Höhe über Boden). Env QS, CAR='x,z' setzt vorher die Ambulanz."""
import asyncio, sys, os, math
from playwright.async_api import async_playwright
PRE = sys.argv[1]; spots = [tuple(float(v) for v in s.split(',')) for s in sys.argv[2].split(';')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; logs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('console', lambda m: logs.append(m.text) if m.text.startswith('[bau]') else None)
        await pg.goto('http://localhost:8765/?test' + os.environ.get('QS', '')); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
        await pg.evaluate("document.querySelectorAll('.radio,#radio,#offer').forEach(e=>e.style.display='none')")
        for i, (x, z, d, up, a) in enumerate(spots):
            if os.environ.get('TP'): await pg.evaluate(f'window.__dbg.tp({x},{z},0)'); await pg.wait_for_timeout(1500)
            g = (await pg.evaluate(f'window.__dbg.hg({x},{z})'))[0]
            await pg.evaluate(f'window.__cam=[{x + math.sin(a) * d},{g + up},{z + math.cos(a) * d},{x},{g + 1.5},{z}]'); await pg.wait_for_timeout(3500); await pg.screenshot(path=f'shots/{PRE}_{i}.png')
        print([l for l in logs if os.environ.get('LOG', 'Bahnsignale') in l][:3]); print('Fehler', errs); await b.close()
asyncio.run(main())
