import asyncio, time
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 800, 'height': 450}); pg.set_default_timeout(1500000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        t = time.time(); await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); print('start', round(time.time()-t), flush=True); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(1500)
        print('ready', round(time.time()-t), errs, flush=True)
        print(await pg.evaluate('window.__dbg.styles()'), flush=True)
        print(await pg.evaluate('window.__dbg.perf()'), await pg.evaluate('performance.memory ? Math.round(performance.memory.usedJSHeapSize/1e6) : 0'), flush=True)
        rep = await pg.evaluate('window.__dbg.qa()')
        print([ (c['id'], round(c['value'],3), c['ok']) for c in rep['checks'] ], round(time.time()-t), errs)
        for name, x, z in [('Kriens', -2130, 2001), ('Horw', 216, 3668), ('Bireggwald', 600, 2400), ('Sonnenberg', -2200, -600)]:
            await pg.evaluate(f'window.__dbg.tp({x},{z})'); await pg.wait_for_timeout(6000); await pg.screenshot(path=f'shots/j_{name}.png')
        await b.close()
asyncio.run(main())
