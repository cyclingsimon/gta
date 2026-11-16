"""Objekte ansehen, deren Standorte in userData.pos eines benannten Netzes stehen: look_ud.py NAME [anzahl] – je Standort zwei Blicke aus 8 m (vier Richtungen verteilt)."""
import asyncio, sys, os, math
from playwright.async_api import async_playwright
NAME = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 3
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; logs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('console', lambda m: logs.append(m.text) if m.text.startswith('[bau]') else None)
        await pg.goto('http://localhost:8765/?test' + os.environ.get('QS', '')); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
        await pg.evaluate("document.querySelectorAll('.radio,#radio,#offer,#minimap,.minimap').forEach(e=>e.style.display='none')")
        pos = (await pg.evaluate(f"window.__dbg.ud('{NAME}')") or {}).get('pos', []); print(NAME, len(pos), 'Standorte')
        pos = sorted(pos, key=lambda q: abs(q[0]) + abs(q[1]))[:N]; k = 0
        for (x, z) in pos:
            g = (await pg.evaluate(f'window.__dbg.hg({x},{z})'))[0]
            for a in (0, 1.57, 3.14, 4.71):
                await pg.evaluate(f'window.__cam=[{x + math.sin(a) * 8},{g + 2.6},{z + math.cos(a) * 8},{x},{g + 1.5},{z}]'); await pg.wait_for_timeout(1500); await pg.screenshot(path=f'shots/ud_{NAME}_{k}.png'); k += 1
        print([l for l in logs if NAME[:5].lower() in l.lower()][:2]); print('Fehler', errs); await b.close()
asyncio.run(main())
