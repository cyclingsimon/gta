import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1100,'height':700}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible', timeout=120000)
        await pg.click('#start-btn'); await pg.wait_for_timeout(800)
        await pg.keyboard.press('Tab'); await pg.wait_for_timeout(1000); await pg.screenshot(path='shots/t_map.png')
        await b.close()
asyncio.run(main())
