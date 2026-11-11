import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':640,'height':360}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible', timeout=120000)
        await pg.click('#start-btn')
        await pg.evaluate('window.__dbg.tp(-649,-690)')
        await pg.evaluate('window.__dbg.goHospital()'); await pg.evaluate('window.__dbg.drive(true)')
        for i in range(30):
            await pg.wait_for_timeout(2000)
            c = await pg.evaluate('window.__luksi'); 
            print(i, round(c['car']['x'],1), round(c['car']['z'],1), round(c['car']['speed'],1), round(c['car']['heading'],2), c['phase'])
            if c['phase']=='handover': break
            if i==8: await pg.screenshot(path='shots/dbg2.png')
        await b.close()
asyncio.run(main())
