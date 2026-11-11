import asyncio, sys
from playwright.async_api import async_playwright
x,z=float(sys.argv[1]),float(sys.argv[2])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':960,'height':540}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible', timeout=120000)
        await pg.click('#start-btn'); await pg.wait_for_timeout(500)
        await pg.evaluate(f'window.__dbg.tp({x},{z})'); await pg.wait_for_timeout(4000)
        print(await pg.evaluate('window.__luksi.car'))
        await pg.screenshot(path='shots/look2.png')
        await b.close()
asyncio.run(main())
