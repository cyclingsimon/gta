import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':800,'height':450}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.click('#start-btn'); await pg.evaluate('window.__dbg.quiet()'); await pg.evaluate('window.__dbg.tp(418,206)'); await pg.wait_for_timeout(5000)
        await pg.screenshot(path='shots/l1.png')
        await pg.evaluate('window.__dbg.hide("edges-buildings")'); await pg.wait_for_timeout(4000)
        await pg.screenshot(path='shots/l2.png')
        await b.close()
asyncio.run(main())
