import asyncio, sys
from playwright.async_api import async_playwright
views=[('pilatus',[0,40,200,-1500,300,4500]),('rigi',[300,40,0,5000,300,-800]),('see_sued',[200,30,-200,1500,100,2500]),('fahrer',None)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':960,'height':540}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible', timeout=300000)
        await pg.evaluate('localStorage.clear()')
        await pg.click('#start-btn'); await pg.wait_for_timeout(500); await pg.evaluate('window.__dbg.quiet()')
        for n,c in views:
            if c: await pg.evaluate(f'window.__dbg.cam({c})')
            else: await pg.evaluate('window.__dbg.cam(null); window.__dbg.tp(150,-60)')
            await pg.wait_for_timeout(8000)
            await pg.screenshot(path=f'shots/{sys.argv[1]}_{n}.png')
        await b.close()
asyncio.run(main())
