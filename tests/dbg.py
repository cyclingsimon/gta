import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':800,'height':450}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible', timeout=120000)
        await pg.click('#start-btn')
        await pg.evaluate('window.__dbg.tp(-645,-716)')
        print(await pg.evaluate('window.__dbg.grid(-645,-735,40)'))
        print(json.dumps(await pg.evaluate('window.__dbg.rt()')))
        await pg.keyboard.press('KeyC'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='shots/dbg.png')
        await b.close()
asyncio.run(main())
