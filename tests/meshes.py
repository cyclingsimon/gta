"""20c: Inventar der Weltnetze (Name, Anzahl, Dreiecke, grösster Radius). Aufruf: meshes.py [qs]"""
import asyncio, sys, json
from playwright.async_api import async_playwright
QS = sys.argv[1] if len(sys.argv) > 1 else ''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 800, 'height': 450}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test&noshadow&notraffic' + QS); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(3000)
        L = await pg.evaluate('window.__dbg.meshes()'); tot = sum(e[2] for e in L)
        print('Summe', tot, 'in', sum(e[1] for e in L), 'Netzen')
        for e in L[:70]: print(f'{e[2]:>9} {e[1]:>4} r{e[3]:>5} {e[0]}')
        await b.close()
asyncio.run(main())
