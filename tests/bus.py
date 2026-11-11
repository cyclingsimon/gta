# Bus-Test: echte Linien aktiv, halten an Haltestellen, Bilder von 3 Bussen
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':960,'height':540}); pg.set_default_timeout(900000)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/?test&q=leicht'); await pg.wait_for_selector('#start-btn', state='visible', timeout=300000)
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.evaluate('window.__dbg.quiet()')
        await pg.evaluate('window.__dbg.tp(60,-160)')
        await pg.wait_for_timeout(25000)
        print(json.dumps(await pg.evaluate('window.__dbg.buses()'), ensure_ascii=False))
        for k in range(3):
            ref = await pg.evaluate(f'window.__dbg.busCam({k})'); await pg.wait_for_timeout(3000); await pg.screenshot(path=f'shots/bus_{k}.png'); print('Bild', k, 'Linie', ref)
        await pg.wait_for_timeout(30000)
        print(json.dumps(await pg.evaluate('window.__dbg.buses()'), ensure_ascii=False))
        print('Fehler:', errs)
        await b.close()
asyncio.run(main())
