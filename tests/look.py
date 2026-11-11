import asyncio, sys
from playwright.async_api import async_playwright
spots = [('kapell', 40, 30, 1.9), ('altstadt', -150, 40, 0.5), ('spital', None, None, None), ('see', 230, -60, 2.6)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1280,'height':720}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible', timeout=120000)
        await pg.evaluate('localStorage.clear()')
        await pg.click('#start-btn'); await pg.wait_for_timeout(500)
        await pg.keyboard.press('F3')
        for name,x,z,h in spots:
            if x is not None:
                await pg.evaluate(f'window.__dbg.tp({x},{z})')
            await pg.wait_for_timeout(2500)
            await pg.screenshot(path=f'shots/look_{name}.png')
        print(await pg.inner_text('#fps'))
        await b.close()
asyncio.run(main())
