import asyncio, sys
from playwright.async_api import async_playwright
spots=[(-700,250,'guetsch',0),(-300,-300,'musegg',0),(-560,-760,'spital',0),(-250,60,'reuss_oben',1)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':960,'height':540}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible', timeout=120000)
        await pg.evaluate('localStorage.clear()')
        await pg.click('#start-btn'); await pg.wait_for_timeout(500)
        for x,z,n,cam in spots:
            await pg.evaluate(f'window.__dbg.tp({x},{z})')
            if cam: await pg.keyboard.press('KeyC')
            await pg.wait_for_timeout(6000)
            await pg.screenshot(path=f'shots/t_{n}.png')
            print(n, await pg.evaluate('window.__luksi.car'))
            if cam: await pg.keyboard.press('KeyC'); await pg.keyboard.press('KeyC')
        await b.close()
asyncio.run(main())
