import asyncio, sys
from playwright.async_api import async_playwright
x,z=float(sys.argv[1]),float(sys.argv[2])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':800,'height':600}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible', timeout=120000)
        await pg.click('#start-btn')
        await pg.evaluate(f'window.__dbg.tp({x},{z})'); await pg.evaluate('window.__dbg.goHospital()')
        await pg.keyboard.press('KeyC'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='shots/dbg3.png')
        await b.close()
asyncio.run(main())
