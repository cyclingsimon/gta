import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test&q=leicht'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.evaluate('window.__dbg.quiet()')
        await pg.evaluate('window.__dbg.tp(250,60)'); await pg.wait_for_timeout(15000)
        n = 0
        for ref in ['1', '2', '8', '4', '5', '6', '7']:
            r = await pg.evaluate(f"window.__dbg.busCam('{ref}')")
            if r is None: continue
            await pg.wait_for_timeout(2500); await pg.screenshot(path=f'shots/trolley_{ref}.png'); n += 1
            if n >= 2: break
        for k in range(3):
            r = await pg.evaluate(f'window.__dbg.busRear({k})')
            if r is None: continue
            await pg.wait_for_timeout(1200); await pg.screenshot(path=f'shots/busheck_{k}.png')
        print('Trolley-Bilder', n, await pg.evaluate('window.__dbg.buses()'))
        await b.close()
asyncio.run(main())
