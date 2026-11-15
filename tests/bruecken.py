"""16a: Überführungen messen. Aufruf: bruecken.py [region] – listet je Brücke über Bahn/Strasse: Name, Art darunter, Ort,
lichte Höhe (Deck − Boden am Kreuzungspunkt), Boden an den beiden Brückenenden relativ zum Kreuzungspunkt."""
import asyncio, sys, json, os
from playwright.async_api import async_playwright
R = sys.argv[1] if len(sys.argv) > 1 else 'luzern'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 800, 'height': 450}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto(f'http://localhost:8765/?test&noshadow&notraffic&q=leicht&region={R}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
        L = await pg.evaluate('window.__bruecken()')
        print(json.dumps(L, ensure_ascii=False)); print('Fehler', errs); await b.close()
asyncio.run(main())
