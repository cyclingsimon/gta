import asyncio, time
from playwright.async_api import async_playwright
M = "(window.gc && gc(), Math.round(performance.memory.usedJSHeapSize/1e6))"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--expose-gc', '--enable-precise-memory-info'])
        pg = await b.new_page(viewport={'width': 640, 'height': 360}); pg.set_default_timeout(1500000)
        t = time.time(); await pg.goto('http://localhost:8765/?test&free'); await pg.wait_for_selector('#start-btn', state='visible')
        print('A', round(time.time()-t), await pg.evaluate(M), await pg.evaluate('window.__dbg.mem()'), flush=True)
        await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(3000)
        print('B', round(time.time()-t), await pg.evaluate(M), await pg.evaluate('window.__mem'), flush=True)
        await b.close()
asyncio.run(main())
