import asyncio, sys
from playwright.async_api import async_playwright
# (Name, Auto x,z, Kamera)
views=[('inseli',[420,25,210,330,0,120]),('schwanenplatz',[110,18,-60,100,4,-25]),('kapellplatz',[-10,14,-70,10,2,-30])]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':960,'height':540}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible', timeout=300000)
        await pg.evaluate('localStorage.clear()')
        await pg.click('#start-btn'); await pg.wait_for_timeout(500); await pg.evaluate('window.__dbg.quiet()')
        for n,c in views:
            await pg.evaluate(f'window.__dbg.cam({c})'); await pg.wait_for_timeout(8000)
            await pg.screenshot(path=f'shots/{sys.argv[1]}_{n}.png')
        print(await pg.evaluate('window.__dbg.tris()'))
        await b.close()
asyncio.run(main())
